/**
 * Rondetype 'manual': de quizmaster leidt de ronde mondeling.
 * Spelers zien enkel thema, uitleg, spelregels en de drank van het rad.
 *
 * Er is geen serverlogica nodig; dit bestand dient als voorbeeld en als
 * vangnet zodat het type altijd bestaat.
 */

import { registerRoundType } from './registry.js';

registerRoundType({
  id: 'manual',
});
