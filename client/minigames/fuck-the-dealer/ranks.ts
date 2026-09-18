import type { Rank } from './types';

/** Alle 13 waarden, in volgorde - moet overeenkomen met server/minigames/fuckTheDealer.js. */
export const RANKS: { rank: Rank; value: number }[] = [
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

export function rankLabel(value: number): string {
  return RANKS.find((entry) => entry.value === value)?.rank ?? String(value);
}
