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
