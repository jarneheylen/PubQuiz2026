/**
 * Vorm van `minigame.data` voor 'fuck-the-dealer'. Dit is enkel de clientkant
 * van de afspraak met de server (zie server/minigames/fuckTheDealer.js);
 * `MinigameState.data` zelf blijft generiek getypeerd in shared/types.ts.
 */

import type { WheelState } from '../../../shared/types';

export type Suit = 'harten' | 'ruiten' | 'klaveren' | 'schoppen';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
  value: number;
}

export type Hint = 'hoger' | 'lager';
export type Outcome = 'correct' | 'wrong' | 'exact-hit';
export type Drinker = 'guesser' | 'dealer' | 'none';

export interface DealerCandidate {
  id: string;
  name: string;
}

export interface ShotInfo {
  drinkId: string;
  drinkName: string;
  drinkEmoji: string;
  abv: number;
}

export interface LastResult {
  playerId: string;
  guess1: number;
  hint: Hint | null;
  guess2: number | null;
  card: Card;
  outcome: Outcome;
  drinker: Drinker;
  drinkAmount: number;
  /** Enkel gevuld bij een meteen juiste gok: de shot van het rad, niet bier. */
  shot: ShotInfo | null;
  dealerChange: { fromId: string; toId: string } | null;
}

export type FtdStatus =
  | 'selecting_drink'
  | 'selecting_dealer'
  | 'awaiting_guess'
  | 'awaiting_second_guess'
  | 'result'
  | 'finished';

export interface FtdData {
  status: FtdStatus;
  drinkWheel: WheelState;
  /** De shot die het rad bij de start van dit spel koos. */
  shot: ShotInfo | null;
  dealerCandidates: DealerCandidate[];
  dealerWheel: WheelState;
  dealerId: string | null;
  turnOrder: string[];
  currentPlayerId: string | null;
  currentCard: Card | null;
  playedCards: Card[];
  remainingCount: number;
  guess1: number | null;
  hint: Hint | null;
  guess2: number | null;
  lastResult: LastResult | null;
  /** Fouten sinds de laatste keer deler-worden (bepaalt wanneer iemand opnieuw deler wordt). */
  errors: Record<string, { count: number; lastMistakeAt: number }>;
  /** Totaal aantal fouten dit spel (bepaalt de verliezer op het einde). */
  totalMistakes: Record<string, { count: number; lastMistakeAt: number }>;
  finished: boolean;
  loserId: string | null;
  finalDrinkWheel: WheelState | null;
}

/** Geheime data die enkel de deler krijgt via Events.ROUND_PRIVATE. */
export interface DealerCardPayload {
  type: 'fuck-the-dealer-card';
  card: Card;
}

export const TOTAL_CARDS = 52;
/** Aantal foute gokken voor een speler de nieuwe deler wordt (zie server/minigames/fuckTheDealer.js). */
export const ERRORS_BEFORE_DEALER_CHANGE = 3;
