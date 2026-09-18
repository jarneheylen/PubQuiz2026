/**
 * Register voor rondetypes aan serverzijde.
 *
 * Elk rondetype kan (optioneel) serverlogica hebben, bijvoorbeeld het
 * verzamelen van antwoorden of het bijhouden van een timer. Zolang een ronde
 * enkel thema + uitleg nodig heeft, is hier niets voor nodig ('manual').
 *
 * Een nieuw rondetype toevoegen:
 *
 *   // server/rounds/pubTrivia.js
 *   import { registerRoundType } from './registry.js';
 *
 *   registerRoundType({
 *     id: 'pub-trivia',
 *     onRoundStart({ round }) { round.data.answers = {}; },
 *     onPlayerAction({ round, player, action, payload }) {
 *       if (action === 'answer') round.data.answers[player.id] = payload;
 *     },
 *   });
 *
 * en importeer het bestand onderaan in server/rounds/index.js.
 */

/** @type {Map<string, RoundTypeHandler>} */
const registry = new Map();

/**
 * @typedef {Object} RoundTypeHandler
 * @property {string} id
 * @property {(ctx: { round: any, state: any }) => void} [onRoundStart]
 * @property {(ctx: { round: any, state: any }) => void} [onRoundEnd]
 * @property {(ctx: { round: any, state: any, player: any, action: string, payload: any }) => void} [onPlayerAction]
 * @property {(ctx: { round: any, state: any, action: string, payload: any }) => ({ ok: true } | { ok: false, error: string })} [onQuizmasterAction]
 * @property {(ctx: { round: any, state: any, player: any }) => (unknown | null)} [getPrivateState]
 */

/** @param {RoundTypeHandler} handler */
export function registerRoundType(handler) {
  if (!handler || !handler.id) {
    throw new Error('Een rondetype heeft een id nodig.');
  }
  registry.set(handler.id, handler);
}

/** @returns {RoundTypeHandler | null} */
export function getRoundTypeHandler(id) {
  return registry.get(id) || null;
}

export function listRoundTypes() {
  return [...registry.keys()];
}

/**
 * Er draait maar één quiz per serverproces. Rondetypes met een eigen timer
 * (bv. een rad dat na een paar seconden vanzelf stopt) hebben soms een manier
 * nodig om buiten een socket-event om een broadcast te forceren; dit geeft ze
 * een verwijzing naar de ene actieve store zonder dat elke module hem zelf
 * moet doorgeven.
 */
let activeStore = null;
let activeIo = null;

export function setActiveStore(store) {
  activeStore = store;
}

export function getActiveStore() {
  return activeStore;
}

/** Nodig wanneer een rondetype rechtstreeks (dus niet als broadcast) iets naar
 * één specifiek toestel wil sturen, bv. een geheime kaart naar de deler. */
export function setActiveIo(io) {
  activeIo = io;
}

export function getActiveIo() {
  return activeIo;
}
