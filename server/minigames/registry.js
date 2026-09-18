/**
 * Register voor extra spelletjes (bv. Fuck the Dealer) die de quizmaster los
 * van de rondevolgorde kan starten en stoppen, zo vaak hij wil tijdens de
 * avond. Dit is bewust een apart register van server/rounds/registry.js: een
 * minigame heeft geen vast plekje in de rondevolgorde en leeft in
 * `QuizState.minigame` in plaats van in een `Round`.
 *
 * Een nieuw minigame toevoegen:
 *
 *   // server/minigames/dobbelspel.js
 *   import { registerMinigameType } from './registry.js';
 *
 *   registerMinigameType({
 *     id: 'dobbelspel',
 *     onStart({ minigame }) { minigame.data.worp = null; },
 *     onPlayerAction({ minigame, player, action, payload }) { ... },
 *   });
 *
 * en importeer het bestand onderaan in server/minigames/index.js.
 */

import { getActiveStore, setActiveStore, getActiveIo, setActiveIo } from '../rounds/registry.js';

/** @type {Map<string, MinigameTypeHandler>} */
const registry = new Map();

/**
 * @typedef {Object} MinigameTypeHandler
 * @property {string} id
 * @property {(ctx: { minigame: any, state: any }) => void} [onStart]
 * @property {(ctx: { minigame: any }) => void} [onEnd]
 * @property {(ctx: { minigame: any, state: any, player: any, action: string, payload: any }) => void} [onPlayerAction]
 * @property {(ctx: { minigame: any, state: any, action: string, payload: any }) => ({ ok: true } | { ok: false, error: string })} [onQuizmasterAction]
 * @property {(ctx: { minigame: any, state: any, player: any }) => (unknown | null)} [getPrivateState]
 */

/** @param {MinigameTypeHandler} handler */
export function registerMinigameType(handler) {
  if (!handler || !handler.id) {
    throw new Error('Een minigame heeft een id nodig.');
  }
  registry.set(handler.id, handler);
}

/** @returns {MinigameTypeHandler | null} */
export function getMinigameTypeHandler(id) {
  return registry.get(id) || null;
}

export function listMinigameTypes() {
  return [...registry.keys()];
}

// Zelfde store/io-verwijzing als de rondetypes: er draait toch maar één quiz
// per serverproces, dus geen reden om dit een tweede keer bij te houden.
export { getActiveStore, setActiveStore, getActiveIo, setActiveIo };
