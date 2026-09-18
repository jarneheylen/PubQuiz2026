/**
 * Hier worden alle rondetypes van de server geregistreerd.
 * Nieuw rondetype? Maak een bestand in deze map en importeer het hieronder.
 */

import './manual.js';

export {
  getRoundTypeHandler,
  listRoundTypes,
  setActiveStore,
  getActiveStore,
  setActiveIo,
  getActiveIo,
} from './registry.js';
