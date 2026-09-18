import type { Drink } from '../../../shared/types';
import type { DealerCandidate } from './types';

/** Kleuren voor het delersrad; het bestaande drankrad heeft er zelf al genoeg. */
const PALETTE = ['#c9583a', '#3a7dc9', '#3ac97a', '#c9a83a', '#8a3ac9', '#c93a8f', '#3ac9c3', '#c9743a'];

/** Laat spelers meedraaien op het bestaande <Wheel>-component (dat drankjes verwacht). */
export function candidatesToWheelSegments(candidates: DealerCandidate[]): Drink[] {
  return candidates.map((candidate, index) => ({
    id: candidate.id,
    name: candidate.name,
    emoji: '🙋',
    color: PALETTE[index % PALETTE.length],
    abv: 0,
  }));
}
