/**
 * Hier worden alle extra spelletjes van de server geregistreerd.
 * Nieuw spel? Maak een bestand in deze map en importeer het hieronder.
 */

import './fuckTheDealer.js';

export {
  getMinigameTypeHandler,
  listMinigameTypes,
  setActiveStore,
  getActiveStore,
  setActiveIo,
  getActiveIo,
} from './registry.js';
