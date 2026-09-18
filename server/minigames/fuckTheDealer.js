/**
 * Minigame 'fuck-the-dealer': het digitale kaartendrankspel.
 *
 * Dit is GEEN vaste ronde: de quizmaster start en stopt dit los van de
 * rondevolgorde, zo vaak hij wil tijdens de avond (zie server/quizStore.js
 * `startMinigame`/`stopMinigame`). Daarom bepaalt dit spel bij elke start ook
 * zelf welke shot erbij hoort (een eigen drankrad), in plaats van mee te
 * liften op het drankrad van een ronde.
 *
 * Verloop: drankrad -> delersrad -> om de beurt kaarten gokken. Een deler
 * wordt via een rad gekozen. Daarna trekt de "kaartentafel" elke beurt in het
 * geheim één kaart die enkel de deler ziet. De speler die aan de beurt is gokt
 * een waarde (1-13); is dat niet meteen juist, dan zegt de tafel automatisch
 * HOGER of LAGER en krijgt de speler nog één tweede gok. Alles gaat automatisch
 * (geen bevestigingen): de quizmaster bepaalt enkel het tempo tussen het
 * resultaat en de volgende beurt.
 *
 * De getrokken kaart en de nog niet onthulde gok blijven hier lokaal (nooit in
 * minigame.data, dat naar iedereen gebroadcast wordt). De deler krijgt de
 * kaart apart, rechtstreeks naar zijn eigen toestel (Events.ROUND_PRIVATE),
 * zodat niemand anders ze ooit te zien krijgt.
 */

import { randomInt } from 'node:crypto';
import { registerMinigameType, getActiveStore, getActiveIo } from './registry.js';
import { wheelSpinDurationMs } from '../../config/quiz.config.js';
import { Events } from '../../shared/protocol.js';

const WHEEL_TURNS = 5;

const RANKS = [
  { rank: 'A', value: 1 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
];
const SUITS = ['harten', 'ruiten', 'klaveren', 'schoppen'];

/** Aantal slokken bier voor de deler wanneer iemand pas de tweede gok juist heeft. */
const DEALER_BEER_ON_SECOND_GUESS = 3;
/** Aantal foute gokken voor een speler de nieuwe deler wordt. */
const ERRORS_BEFORE_DEALER_CHANGE = 3;

/** minigame.id -> { deck: Card[], drawnCard: Card|null } - nooit gebroadcast. */
const secrets = new Map();

function ok() {
  return { ok: true };
}

function fail(error) {
  return { ok: false, error };
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const { rank, value } of RANKS) cards.push({ rank, suit, value });
  }
  return shuffled(cards);
}

function idleWheel() {
  return {
    status: 'idle',
    spinId: 0,
    resultIndex: null,
    result: null,
    startedAt: null,
    durationMs: wheelSpinDurationMs,
    turns: WHEEL_TURNS,
  };
}

function freshData() {
  return {
    status: 'selecting_drink',
    drinkWheel: idleWheel(),
    shot: null,
    dealerCandidates: [],
    dealerWheel: idleWheel(),
    dealerId: null,
    turnOrder: [],
    currentPlayerId: null,
    currentCard: null,
    playedCards: [],
    remainingCount: 0,
    guess1: null,
    hint: null,
    guess2: null,
    lastResult: null,
    errors: {},
    totalMistakes: {},
    finished: false,
    loserId: null,
    finalDrinkWheel: null,
  };
}

/** Volgende speler in de vaste volgorde, met de huidige deler overgeslagen. */
function nextNonDealer(turnOrder, dealerId, fromIndex) {
  for (let step = 1; step <= turnOrder.length; step += 1) {
    const index = (fromIndex + step) % turnOrder.length;
    if (turnOrder[index] !== dealerId) return { id: turnOrder[index], index };
  }
  return null;
}

function registerMistake(map, playerId) {
  const entry = map[playerId] || { count: 0, lastMistakeAt: 0 };
  entry.count += 1;
  entry.lastMistakeAt = Date.now();
  map[playerId] = entry;
  return entry.count;
}

function computeLoser(data) {
  let loserId = null;
  let best = null;
  for (const [playerId, entry] of Object.entries(data.totalMistakes)) {
    if (!best || entry.count > best.count || (entry.count === best.count && entry.lastMistakeAt > best.lastMistakeAt)) {
      best = entry;
      loserId = playerId;
    }
  }
  return loserId;
}

function scheduleWheelReveal({ getWheel, setResult, spinId }) {
  setTimeout(() => {
    const wheel = getWheel();
    if (!wheel || wheel.spinId !== spinId || wheel.status !== 'spinning') return;
    setResult();
    getActiveStore()?.touch();
  }, wheelSpinDurationMs);
}

/** Stuurt de geheime kaart rechtstreeks naar het toestel van de deler. */
function sendDealerCard(minigame) {
  const store = getActiveStore();
  const io = getActiveIo();
  const secret = secrets.get(minigame.id);
  if (!store || !io || !secret?.drawnCard) return;
  const socketId = store.getSocketIdForPlayer(minigame.data.dealerId);
  if (!socketId) return;
  io.to(socketId).emit(Events.ROUND_PRIVATE, { type: 'fuck-the-dealer-card', card: secret.drawnCard });
}

/** Trekt de kaart voor de huidige beurt en zet de gok-status klaar. */
function drawCardForCurrentTurn(minigame) {
  const data = minigame.data;
  const secret = secrets.get(minigame.id);
  const card = secret.deck.shift();
  secret.drawnCard = card;
  data.remainingCount = secret.deck.length;
  data.guess1 = null;
  data.hint = null;
  data.guess2 = null;
  data.status = 'awaiting_guess';
  sendDealerCard(minigame);
}

/** Verwerkt het resultaat van een beurt: onthullen, drinken, delerwissel. */
function finishTurn(minigame, card, outcome) {
  const data = minigame.data;
  const secret = secrets.get(minigame.id);
  const playerId = data.currentPlayerId;
  const store = getActiveStore();

  let drinker = 'none';
  let drinkAmount = 0;
  let shot = null;

  if (outcome === 'exact-hit') {
    // Meteen juist: de deler drinkt de shot die het rad bij de start koos.
    drinker = 'dealer';
    drinkAmount = 1;
    shot = data.shot;
    store?.recordDrink({
      playerId: data.dealerId,
      kind: 'shot',
      amount: 1,
      drinkId: shot?.drinkId,
      drinkName: shot?.drinkName,
      drinkEmoji: shot?.drinkEmoji,
      abv: shot?.abv,
      reason: 'Speler gokte in 1x juist',
    });
  } else if (outcome === 'correct') {
    // Pas de tweede gok juist: de deler drinkt bier, geen shot.
    drinker = 'dealer';
    drinkAmount = DEALER_BEER_ON_SECOND_GUESS;
    store?.recordDrink({
      playerId: data.dealerId,
      kind: 'beer',
      amount: drinkAmount,
      reason: 'Speler gokte pas de tweede keer juist',
    });
  } else if (outcome === 'wrong') {
    drinker = 'guesser';
    drinkAmount = Math.max(1, Math.abs(card.value - data.guess2) - 1);
    store?.recordDrink({
      playerId,
      kind: 'beer',
      amount: drinkAmount,
      reason: 'Foute gok',
    });
  }

  let dealerChange = null;
  if (drinker === 'guesser' && drinkAmount > 0) {
    registerMistake(data.totalMistakes, playerId);
    const strikes = registerMistake(data.errors, playerId);
    if (strikes >= ERRORS_BEFORE_DEALER_CHANGE) {
      dealerChange = { fromId: data.dealerId, toId: playerId };
      data.dealerId = playerId;
      // Het geleden hebben van deler is de "straf": de teller start terug op 0.
      data.errors[playerId] = { count: 0, lastMistakeAt: 0 };
    }
  }

  data.currentCard = card;
  data.playedCards.push(card);
  data.lastResult = {
    playerId,
    guess1: data.guess1,
    hint: data.hint,
    guess2: data.guess2,
    card,
    outcome,
    drinker,
    drinkAmount,
    shot,
    dealerChange,
  };
  data.status = 'result';
  if (secret) secret.drawnCard = null;
}

// ------------------------------------------------------------ spel-hooks

function onStart({ minigame, state }) {
  minigame.data = freshData();
  minigame.data.dealerCandidates = state.players
    .filter((player) => player.connected)
    .map((player) => ({ id: player.id, name: player.name }));
  secrets.set(minigame.id, { deck: [], drawnCard: null });
}

function onEnd({ minigame }) {
  secrets.delete(minigame.id);
}

// --------------------------------------------------- quizmaster-acties

function onQuizmasterAction({ minigame, state, action }) {
  const data = minigame.data;

  if (action === 'spin-drink-wheel') {
    if (data.status !== 'selecting_drink') return fail('De shot is al bepaald.');
    if (data.drinkWheel.status === 'spinning') return fail('Het rad draait al.');
    const drinks = state.drinks;
    if (!drinks || drinks.length === 0) return fail('Er zijn geen dranken geconfigureerd.');
    const resultIndex = randomInt(drinks.length);
    const spinId = data.drinkWheel.spinId + 1;
    data.drinkWheel = {
      status: 'spinning',
      spinId,
      resultIndex,
      result: null,
      startedAt: Date.now(),
      durationMs: wheelSpinDurationMs,
      turns: WHEEL_TURNS,
    };
    scheduleWheelReveal({
      getWheel: () => minigame.data.drinkWheel,
      setResult: () => {
        const drink = drinks[resultIndex];
        minigame.data.drinkWheel = {
          ...minigame.data.drinkWheel,
          status: 'result',
          result: {
            spinId,
            drinkId: drink.id,
            drinkName: drink.name,
            drinkEmoji: drink.emoji,
            decidedAt: Date.now(),
          },
        };
      },
      spinId,
    });
    return ok();
  }

  if (action === 'confirm-drink') {
    if (data.status !== 'selecting_drink') return fail('De shot is al bepaald.');
    if (data.drinkWheel.status !== 'result' || !data.drinkWheel.result) return fail('Draai eerst het drankrad.');
    const drink = state.drinks.find((entry) => entry.id === data.drinkWheel.result.drinkId);
    data.shot = {
      drinkId: data.drinkWheel.result.drinkId,
      drinkName: data.drinkWheel.result.drinkName,
      drinkEmoji: data.drinkWheel.result.drinkEmoji,
      abv: drink?.abv ?? 0,
    };
    data.status = 'selecting_dealer';
    return ok();
  }

  if (action === 'spin-dealer-wheel') {
    if (data.status !== 'selecting_dealer') return fail('De deler is al bepaald.');
    if (data.dealerWheel.status === 'spinning') return fail('Het rad draait al.');
    if (data.dealerCandidates.length < 2) {
      return fail('Er zijn minstens 2 spelers nodig om Fuck the Dealer te spelen.');
    }
    const resultIndex = randomInt(data.dealerCandidates.length);
    const spinId = data.dealerWheel.spinId + 1;
    data.dealerWheel = {
      status: 'spinning',
      spinId,
      resultIndex,
      result: null,
      startedAt: Date.now(),
      durationMs: wheelSpinDurationMs,
      turns: WHEEL_TURNS,
    };
    scheduleWheelReveal({
      getWheel: () => minigame.data.dealerWheel,
      setResult: () => {
        minigame.data.dealerWheel = { ...minigame.data.dealerWheel, status: 'result' };
      },
      spinId,
    });
    return ok();
  }

  if (action === 'confirm-dealer') {
    if (data.status !== 'selecting_dealer') return fail('De deler is al bepaald.');
    if (data.dealerWheel.status !== 'result') return fail('Draai eerst het delersrad.');

    const dealer = data.dealerCandidates[data.dealerWheel.resultIndex];
    data.dealerId = dealer.id;
    data.turnOrder = shuffled(data.dealerCandidates.map((candidate) => candidate.id));
    data.errors = Object.fromEntries(data.turnOrder.map((id) => [id, { count: 0, lastMistakeAt: 0 }]));
    data.totalMistakes = Object.fromEntries(data.turnOrder.map((id) => [id, { count: 0, lastMistakeAt: 0 }]));

    secrets.set(minigame.id, { deck: buildDeck(), drawnCard: null });
    data.playedCards = [];

    const first = nextNonDealer(data.turnOrder, data.dealerId, -1);
    data.currentPlayerId = first ? first.id : null;
    drawCardForCurrentTurn(minigame);
    return ok();
  }

  if (action === 'next-turn') {
    if (data.status !== 'result') return fail('Er is geen resultaat om verder te zetten.');
    if (data.remainingCount === 0) {
      data.finished = true;
      data.loserId = computeLoser(data);
      data.status = 'finished';
      return ok();
    }
    const currentIndex = data.turnOrder.indexOf(data.currentPlayerId);
    const next = nextNonDealer(data.turnOrder, data.dealerId, currentIndex);
    data.currentPlayerId = next ? next.id : null;
    drawCardForCurrentTurn(minigame);
    return ok();
  }

  if (action === 'spin-final-drink-wheel') {
    if (data.status !== 'finished' || !data.loserId) return fail('Er is nog geen verliezer.');
    if (data.finalDrinkWheel && data.finalDrinkWheel.status === 'spinning') {
      return fail('Het rad draait al.');
    }
    const drinks = state.drinks;
    if (!drinks || drinks.length === 0) return fail('Er zijn geen dranken geconfigureerd.');
    const resultIndex = randomInt(drinks.length);
    const spinId = (data.finalDrinkWheel?.spinId || 0) + 1;
    data.finalDrinkWheel = {
      status: 'spinning',
      spinId,
      resultIndex,
      result: null,
      startedAt: Date.now(),
      durationMs: wheelSpinDurationMs,
      turns: WHEEL_TURNS,
    };
    scheduleWheelReveal({
      getWheel: () => minigame.data.finalDrinkWheel,
      setResult: () => {
        const drink = drinks[resultIndex];
        minigame.data.finalDrinkWheel = {
          ...minigame.data.finalDrinkWheel,
          status: 'result',
          result: {
            spinId,
            drinkId: drink.id,
            drinkName: drink.name,
            drinkEmoji: drink.emoji,
            decidedAt: Date.now(),
          },
        };
      },
      spinId,
    });
    return ok();
  }

  return fail(`Onbekende actie "${action}".`);
}

// -------------------------------------------------------------- speler-actie

function onPlayerAction({ minigame, player, action, payload }) {
  if (action !== 'predict') return;
  const data = minigame.data;
  if (player.id !== data.currentPlayerId) return;
  if (data.status !== 'awaiting_guess' && data.status !== 'awaiting_second_guess') return;

  const value = Number(payload?.value);
  if (!Number.isInteger(value) || value < 1 || value > 13) return;

  const secret = secrets.get(minigame.id);
  const card = secret?.drawnCard;
  if (!card) return;

  if (data.status === 'awaiting_guess') {
    data.guess1 = value;
    if (value === card.value) {
      finishTurn(minigame, card, 'exact-hit');
      return;
    }
    data.hint = card.value > value ? 'hoger' : 'lager';
    data.status = 'awaiting_second_guess';
    return;
  }

  // status === 'awaiting_second_guess': de tweede gok moet passen bij de hint.
  if (data.hint === 'hoger' && value <= data.guess1) return;
  if (data.hint === 'lager' && value >= data.guess1) return;
  data.guess2 = value;
  finishTurn(minigame, card, value === card.value ? 'correct' : 'wrong');
}

// ------------------------------------------------------- geheime spelerdata

function getPrivateState({ minigame, player }) {
  const data = minigame.data;
  if (!data || player.id !== data.dealerId) return null;
  if (data.status !== 'awaiting_guess' && data.status !== 'awaiting_second_guess') return null;
  const secret = secrets.get(minigame.id);
  if (!secret?.drawnCard) return null;
  return { type: 'fuck-the-dealer-card', card: secret.drawnCard };
}

registerMinigameType({
  id: 'fuck-the-dealer',
  onStart,
  onEnd,
  onQuizmasterAction,
  onPlayerAction,
  getPrivateState,
});
