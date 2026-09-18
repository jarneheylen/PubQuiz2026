import { RANKS } from './ranks';
import type { Card } from './types';

/** Hoeveel kaarten van elke waarde nog niet gespeeld zijn (van de 4 per waarde). */
function remainingCountsByValue(playedCards: Card[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const { value } of RANKS) counts[value] = 4;
  for (const card of playedCards) {
    counts[card.value] = Math.max(0, (counts[card.value] ?? 4) - 1);
  }
  return counts;
}

/**
 * Kans (0-100, afgerond) dat de geheime kaart van de deler exact `value` is,
 * op basis van welke kaarten al gespeeld zijn. `eligibleValues` beperkt de
 * berekening tot wat nog mogelijk is (bv. enkel waarden boven de eerste gok,
 * na een HOGER-hint) - de kans wordt dan herverdeeld over enkel die waarden.
 */
export function guessProbabilities(playedCards: Card[], eligibleValues: number[]): Record<number, number> {
  const counts = remainingCountsByValue(playedCards);
  const total = eligibleValues.reduce((sum, value) => sum + (counts[value] ?? 0), 0);
  const result: Record<number, number> = {};
  for (const value of eligibleValues) {
    result[value] = total > 0 ? Math.round((100 * (counts[value] ?? 0)) / total) : 0;
  }
  return result;
}
