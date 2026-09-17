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
  drinks as drinkConfig,
  rounds as roundConfig,
  wheelSpinDurationMs,
} from '../config/quiz.config.js';

/** Aantal volledige omwentelingen van de radanimatie. */
const WHEEL_TURNS = 5;

const MAX_NAME_LENGTH = 20;

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
  const players = new Map();
  /** socket.id -> playerId */
  const socketToPlayer = new Map();
  /** playerId -> socket.id van de meest recente verbinding van die speler */
  const playerToSocket = new Map();
  /** sockets die de quizmaster-rol claimen */
  const quizmasterSockets = new Set();

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
      players: [...players.values()].sort((a, b) => a.joinedAt - b.joinedAt),
      rounds,
      currentRoundIndex,
      currentRound: currentRound(),
      drinks,
      wheel,
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

  function joinAsPlayer({ name, playerId, socketId }) {
    const cleanName = String(name || '').trim().slice(0, MAX_NAME_LENGTH);
    if (cleanName.length < 2) {
      return fail('Geef een naam van minstens 2 tekens in.');
    }

    // Terugkerende speler (herladen pagina of even geen netwerk).
    const existing = playerId ? players.get(playerId) : null;
    if (existing) {
      existing.name = cleanName;
      existing.connected = true;
      socketToPlayer.set(socketId, existing.id);
      playerToSocket.set(existing.id, socketId);
      emit();
      return { ok: true, player: existing };
    }

    const sameName = [...players.values()].find(
      (player) => player.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (sameName) {
      // Zelfde naam, maar die speler is offline: dan is dit wellicht dezelfde
      // persoon op een nieuw toestel. Laat hem die plaats overnemen.
      if (sameName.connected) {
        return fail(`De naam "${cleanName}" is al in gebruik. Kies een andere.`);
      }
      sameName.connected = true;
      socketToPlayer.set(socketId, sameName.id);
      playerToSocket.set(sameName.id, socketId);
      emit();
      return { ok: true, player: sameName };
    }

    const player = {
      id: randomUUID(),
      name: cleanName,
      connected: true,
      joinedAt: Date.now(),
      score: 0,
    };
    players.set(player.id, player);
    socketToPlayer.set(socketId, player.id);
    playerToSocket.set(player.id, socketId);
    emit();
    return { ok: true, player };
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
        // In de lobby verdwijnt een speler die weggaat volledig; tijdens de
        // quiz blijft de naam staan (de verbinding kan zo terugkomen).
        if (phase === QuizPhase.LOBBY) {
          players.delete(playerId);
        } else {
          player.connected = false;
        }
      }
    }
    emit();
  }

  function kickPlayer(playerId) {
    const player = players.get(playerId);
    if (!player) return fail('Die speler bestaat niet (meer).');
    players.delete(playerId);
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
    if (players.size === 0) return fail('Er zijn nog geen spelers aangemeld.');
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
    emit();
    return ok();
  }

  function endRound() {
    if (phase !== QuizPhase.ROUND_ACTIVE) return fail('Er loopt geen ronde.');
    const round = currentRound();
    if (!round) return fail('Geen actieve ronde.');
    round.status = RoundStatus.ENDED;
    phase = QuizPhase.ROUND_ENDED;
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

  /** Nieuwe quizsessie: alles terug naar de lobby, spelers blijven verbonden. */
  function resetQuiz({ keepPlayers = true } = {}) {
    clearSpinTimer();
    quiz = { id: randomUUID(), name: quizName, createdAt: Date.now() };
    rounds = buildRounds();
    currentRoundIndex = -1;
    phase = QuizPhase.LOBBY;
    wheel = idleWheel();
    if (!keepPlayers) {
      players.clear();
      socketToPlayer.clear();
      playerToSocket.clear();
    } else {
      for (const player of players.values()) player.score = 0;
    }
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
    // quizverloop
    startQuiz,
    spinWheel,
    startRound,
    endRound,
    nextRound,
    resetQuiz,
  };
}
