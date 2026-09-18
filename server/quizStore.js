/**
 * De centrale quiz-state. Dit is de enige plek waar de quizstatus leeft.
 * De server is de baas: clients tonen enkel wat hier beslist wordt.
 *
 * De store is bewust "in memory": een quizavond duurt een avond, en zo is er
 * geen database nodig. Bij het herstarten van de server begin je opnieuw.
 */

import { randomInt, randomUUID } from 'node:crypto';
import {
  QuizPhase,
  RoundStatus,
  WheelStatus,
  statusLabel,
} from '../shared/protocol.js';
import {
  quizName,
  players as playerRoster,
  drinks as drinkConfig,
  rounds as roundConfig,
  wheelSpinDurationMs,
} from '../config/quiz.config.js';
import { getRoundTypeHandler } from './rounds/index.js';
import { getMinigameTypeHandler } from './minigames/index.js';

/** Aantal volledige omwentelingen van de radanimatie. */
const WHEEL_TURNS = 5;

/** Stabiele, leesbare id op basis van de naam (blijft gelijk over herstarts heen). */
function slugify(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'speler'
  );
}

function buildPlayers() {
  return playerRoster.map((name) => ({
    id: slugify(name),
    name,
    connected: false,
    joinedAt: 0,
    score: 0,
  }));
}

function buildRounds() {
  return roundConfig.map((round, index) => ({
    id: `round-${index + 1}`,
    number: index + 1,
    name: round.name || `Ronde ${index + 1}`,
    theme: round.theme || '',
    explanation: round.explanation || '',
    rules: Array.isArray(round.rules) ? [...round.rules] : [],
    type: round.type || 'manual',
    status: RoundStatus.PENDING,
    wheelResult: null,
    data: {},
  }));
}

function buildDrinks() {
  return drinkConfig.map((drink, index) => ({
    id: drink.id || `drink-${index + 1}`,
    name: drink.name || `Drank ${index + 1}`,
    emoji: drink.emoji || '',
    color: drink.color || '#c98a2b',
    abv: typeof drink.abv === 'number' ? drink.abv : 0,
  }));
}

function idleWheel(spinId = 0) {
  return {
    status: WheelStatus.IDLE,
    spinId,
    resultIndex: null,
    result: null,
    startedAt: null,
    durationMs: wheelSpinDurationMs,
    turns: WHEEL_TURNS,
  };
}

export function createQuizStore() {
  const listeners = new Set();

  /** @type {Map<string, { id: string, name: string, connected: boolean, joinedAt: number, score: number }>} */
  const players = new Map(buildPlayers().map((player) => [player.id, player]));
  /** socket.id -> playerId */
  const socketToPlayer = new Map();
  /** playerId -> socket.id van de meest recente verbinding van die speler */
  const playerToSocket = new Map();
  /** sockets die de quizmaster-rol claimen */
  const quizmasterSockets = new Set();

  /** @type {import('../shared/types').DrinkLogEntry[]} */
  let drinkLog = [];

  /** @type {{ id: string, type: string, data: Record<string, unknown> } | null} */
  let minigame = null;

  let spinTimer = null;

  let quiz = {
    id: randomUUID(),
    name: quizName,
    createdAt: Date.now(),
  };
  let phase = QuizPhase.LOBBY;
  let rounds = buildRounds();
  let currentRoundIndex = -1;
  let wheel = idleWheel();
  const drinks = buildDrinks();

  function currentRound() {
    return currentRoundIndex >= 0 ? rounds[currentRoundIndex] || null : null;
  }

  /** Bouwt het object dat naar alle clients gaat. */
  function getState() {
    const base = {
      quiz,
      phase,
      // Vaste volgorde (config/quiz.config.js), niet op aanmeldmoment: de lijst
      // ligt vooraf vast en een Map bewaart de invoegvolgorde toch al correct.
      players: [...players.values()],
      rounds,
      currentRoundIndex,
      currentRound: currentRound(),
      drinks,
      wheel,
      drinkLog,
      minigame,
      quizmasterOnline: quizmasterSockets.size > 0,
      serverTime: Date.now(),
    };
    return { ...base, status: statusLabel(base) };
  }

  function emit() {
    const state = getState();
    for (const listener of listeners) listener(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function ok() {
    return { ok: true };
  }

  function fail(error) {
    return { ok: false, error };
  }

  function clearSpinTimer() {
    if (spinTimer) {
      clearTimeout(spinTimer);
      spinTimer = null;
    }
  }

  // ---------------------------------------------------------------- spelers

  /**
   * De gastenlijst ligt vast (config/quiz.config.js): een speler "joint" dus
   * niet met een vrije naam, maar claimt een van de vaste plekken. Zo kan
   * iedereen na een weggevallen verbinding gewoon opnieuw zijn naam aantikken
   * en verdergaan waar hij gebleven was - ook op een ander toestel.
   */
  function joinAsPlayer({ name, playerId, socketId }) {
    // Terugkerende speler op hetzelfde toestel (herladen, even geen netwerk).
    const byId = playerId ? players.get(playerId) : null;
    if (byId) {
      byId.connected = true;
      socketToPlayer.set(socketId, byId.id);
      playerToSocket.set(byId.id, socketId);
      emit();
      return { ok: true, player: byId };
    }

    const cleanName = String(name || '').trim();
    const match = [...players.values()].find(
      (player) => player.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (!match) {
      return fail(`"${cleanName}" staat niet op de spelerslijst.`);
    }
    if (match.connected) {
      return fail(`${match.name} is al aangemeld op een ander toestel.`);
    }
    match.connected = true;
    match.joinedAt = match.joinedAt || Date.now();
    socketToPlayer.set(socketId, match.id);
    playerToSocket.set(match.id, socketId);
    emit();
    return { ok: true, player: match };
  }

  function handleDisconnect(socketId) {
    quizmasterSockets.delete(socketId);

    const playerId = socketToPlayer.get(socketId);
    if (playerId) {
      socketToPlayer.delete(socketId);
      const player = players.get(playerId);
      // Bij een refresh is de nieuwe verbinding er soms al voor de oude wegvalt.
      // Enkel de meest recente verbinding mag de speler offline zetten.
      const isLatestSocket = playerToSocket.get(playerId) === socketId;
      if (player && isLatestSocket) {
        playerToSocket.delete(playerId);
        // De speler blijft op de vaste lijst staan: enkel de verbinding valt weg,
        // zodat hij zijn naam later gewoon opnieuw kan aantikken.
        player.connected = false;
      }
    }
    emit();
  }

  /** Stuurt een speler naar het aanmeldscherm; zijn plek op de lijst blijft bestaan. */
  function kickPlayer(playerId) {
    const player = players.get(playerId);
    if (!player) return fail('Die speler bestaat niet.');
    player.connected = false;
    playerToSocket.delete(playerId);
    for (const [socketId, id] of socketToPlayer.entries()) {
      if (id === playerId) socketToPlayer.delete(socketId);
    }
    emit();
    return ok();
  }

  function joinAsQuizmaster(socketId) {
    quizmasterSockets.add(socketId);
    emit();
    return ok();
  }

  function getPlayerBySocket(socketId) {
    const playerId = socketToPlayer.get(socketId);
    return playerId ? players.get(playerId) || null : null;
  }

  /** Socket-id van de meest recente verbinding van een speler, of null. */
  function getSocketIdForPlayer(playerId) {
    return playerToSocket.get(playerId) || null;
  }

  // ------------------------------------------------------------ quizverloop

  function enterRoundIntro(index) {
    currentRoundIndex = index;
    const round = rounds[index];
    round.status = RoundStatus.INTRO;
    phase = QuizPhase.ROUND_INTRO;
    clearSpinTimer();
    // Het rad staat klaar maar heeft nog niet gedraaid voor deze ronde.
    wheel = idleWheel(wheel.spinId);
    emit();
  }

  function startQuiz() {
    if (phase !== QuizPhase.LOBBY) return fail('De quiz is al gestart.');
    if ([...players.values()].every((player) => !player.connected)) {
      return fail('Er zijn nog geen spelers aangemeld.');
    }
    if (rounds.length === 0) return fail('Er zijn geen rondes geconfigureerd.');
    enterRoundIntro(0);
    return ok();
  }

  function spinWheel() {
    if (phase !== QuizPhase.ROUND_INTRO) {
      return fail('Het rad draait enkel bij de start van een ronde.');
    }
    if (wheel.status === WheelStatus.SPINNING) {
      return fail('Het rad draait al.');
    }
    if (drinks.length === 0) return fail('Er zijn geen dranken geconfigureerd.');

    clearSpinTimer();
    const resultIndex = randomInt(drinks.length);
    wheel = {
      status: WheelStatus.SPINNING,
      spinId: wheel.spinId + 1,
      resultIndex,
      result: null,
      startedAt: Date.now(),
      durationMs: wheelSpinDurationMs,
      turns: WHEEL_TURNS,
    };
    emit();

    // Pas na de animatie wordt het resultaat officieel: de spanning hoort erbij.
    spinTimer = setTimeout(() => {
      spinTimer = null;
      if (wheel.status !== WheelStatus.SPINNING) return;
      const drink = drinks[resultIndex];
      const result = {
        spinId: wheel.spinId,
        drinkId: drink.id,
        drinkName: drink.name,
        drinkEmoji: drink.emoji,
        decidedAt: Date.now(),
      };
      wheel = { ...wheel, status: WheelStatus.RESULT, result };
      const round = currentRound();
      if (round) round.wheelResult = result;
      emit();
    }, wheelSpinDurationMs);

    return ok();
  }

  function startRound() {
    if (phase !== QuizPhase.ROUND_INTRO) {
      return fail('Er staat geen ronde klaar om te starten.');
    }
    if (wheel.status !== WheelStatus.RESULT) {
      return fail('Draai eerst het rad voor deze ronde.');
    }
    const round = currentRound();
    if (!round) return fail('Geen actieve ronde.');
    round.status = RoundStatus.ACTIVE;
    phase = QuizPhase.ROUND_ACTIVE;
    getRoundTypeHandler(round.type)?.onRoundStart?.({ round, state: getState() });
    emit();
    return ok();
  }

  function endRound() {
    if (phase !== QuizPhase.ROUND_ACTIVE) return fail('Er loopt geen ronde.');
    const round = currentRound();
    if (!round) return fail('Geen actieve ronde.');
    round.status = RoundStatus.ENDED;
    phase = QuizPhase.ROUND_ENDED;
    getRoundTypeHandler(round.type)?.onRoundEnd?.({ round, state: getState() });
    emit();
    return ok();
  }

  function nextRound() {
    if (phase !== QuizPhase.ROUND_ENDED) {
      return fail('Beeindig eerst de huidige ronde.');
    }
    const nextIndex = currentRoundIndex + 1;
    if (nextIndex >= rounds.length) {
      phase = QuizPhase.QUIZ_FINISHED;
      emit();
      return ok();
    }
    enterRoundIntro(nextIndex);
    return ok();
  }

  /** Nieuwe quizsessie: alles terug naar de lobby. De spelerslijst ligt vast. */
  function resetQuiz() {
    clearSpinTimer();
    quiz = { id: randomUUID(), name: quizName, createdAt: Date.now() };
    rounds = buildRounds();
    currentRoundIndex = -1;
    phase = QuizPhase.LOBBY;
    wheel = idleWheel();
    drinkLog = [];
    if (minigame) {
      getMinigameTypeHandler(minigame.type)?.onEnd?.({ minigame });
      minigame = null;
    }
    for (const player of players.values()) player.score = 0;
    emit();
    return ok();
  }

  /** Rondetypes melden hiermee wie iets moest drinken, voor het scorebord. */
  function recordDrink(entry) {
    drinkLog.push({ id: randomUUID(), createdAt: Date.now(), ...entry });
    emit();
  }

  // -------------------------------------------------------- extra spelletjes

  /**
   * Los van de rondevolgorde: de quizmaster kan dit zo vaak starten als hij
   * wil, ongeacht in welke fase de eigenlijke quiz zich bevindt.
   */
  function startMinigame(type) {
    if (minigame) return fail('Er loopt al een extra spel. Sluit dat eerst af.');
    const handler = getMinigameTypeHandler(type);
    if (!handler) return fail(`Onbekend spel "${type}".`);
    minigame = { id: randomUUID(), type, data: {} };
    handler.onStart?.({ minigame, state: getState() });
    emit();
    return ok();
  }

  function stopMinigame() {
    if (!minigame) return fail('Er loopt geen extra spel.');
    const handler = getMinigameTypeHandler(minigame.type);
    handler?.onEnd?.({ minigame });
    minigame = null;
    emit();
    return ok();
  }

  return {
    getState,
    subscribe,
    /** Forceert een broadcast, bv. nadat een rondetype eigen data aanpaste. */
    touch: emit,
    // spelers
    joinAsPlayer,
    joinAsQuizmaster,
    handleDisconnect,
    kickPlayer,
    getPlayerBySocket,
    getSocketIdForPlayer,
    recordDrink,
    // quizverloop
    startQuiz,
    spinWheel,
    startRound,
    endRound,
    nextRound,
    resetQuiz,
    // extra spelletjes
    startMinigame,
    stopMinigame,
  };
}
