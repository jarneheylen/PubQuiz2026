/**
 * Datastructuur van de quiz. Enkel types (geen runtime-code): de server bouwt
 * exact deze objecten op en stuurt ze via Events.STATE naar alle clients.
 */

export type QuizPhase =
  | 'lobby'
  | 'round_intro'
  | 'round_active'
  | 'round_ended'
  | 'quiz_finished';

export type RoundStatus = 'pending' | 'intro' | 'active' | 'ended';

export type WheelStatus = 'idle' | 'spinning' | 'result';

/** Het type ronde; bepaalt welke UI-module gebruikt wordt. */
export type RoundTypeId = string;

export interface Drink {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** Alcoholpercentage, enkel gebruikt voor het scorebord. */
  abv: number;
}

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
  /** Gereserveerd voor later (scoreberekening per ronde). */
  score: number;
}

export interface WheelResult {
  spinId: number;
  drinkId: string;
  drinkName: string;
  drinkEmoji: string;
  decidedAt: number;
}

export interface Round {
  id: string;
  number: number;
  name: string;
  theme: string;
  explanation: string;
  rules: string[];
  type: RoundTypeId;
  status: RoundStatus;
  /** De drank die het rad voor deze ronde aanwees (null zolang er niet gedraaid is). */
  wheelResult: WheelResult | null;
  /** Vrije ruimte voor rondetype-specifieke gegevens (later te gebruiken). */
  data: Record<string, unknown>;
}

export interface WheelState {
  status: WheelStatus;
  /** Loopt op bij elke draai; clients gebruiken dit om de animatie te triggeren. */
  spinId: number;
  /** Index in `drinks` waarop het rad stopt (null zolang er niet gedraaid is). */
  resultIndex: number | null;
  result: WheelResult | null;
  startedAt: number | null;
  durationMs: number;
  /** Aantal volledige omwentelingen van de animatie. */
  turns: number;
}

export interface Quiz {
  id: string;
  name: string;
  createdAt: number;
}

/**
 * Eén moment waarop iemand iets moest drinken, voor het scorebord. Rondetypes
 * melden dit zelf (server/rounds/*.js) - zo blijft het scorebord generiek en
 * werkt het automatisch mee met nieuwe rondetypes.
 */
export interface DrinkLogEntry {
  id: string;
  playerId: string;
  /** Enkel gevuld als de drank uit een genummerde ronde komt, niet uit een extra spel. */
  roundNumber?: number;
  /** 'shot' voor een sterke drank van het rad, 'beer' voor bier bij slokken. */
  kind: 'shot' | 'beer';
  /** Aantal shots (meestal 1) of aantal slokken bier. */
  amount: number;
  drinkId?: string;
  drinkName?: string;
  drinkEmoji?: string;
  /** Alcoholpercentage van de shot (enkel bij kind 'shot'). */
  abv?: number;
  /** Korte, leesbare reden, bv. "Foute gok". */
  reason: string;
  createdAt: number;
}

/**
 * Een extra spel (bv. Fuck the Dealer) dat de quizmaster los van de
 * rondevolgorde start/stopt, onbeperkt vaak. `null` zolang er geen loopt.
 */
export interface MinigameState {
  /** Wisselt bij elke nieuwe start, zodat clients een vers spel herkennen. */
  id: string;
  type: string;
  /** Vrije ruimte voor spel-specifieke gegevens. */
  data: Record<string, unknown>;
}

export interface QuizState {
  quiz: Quiz;
  phase: QuizPhase;
  /** Leesbare status, bv. "Ronde 1 actief". */
  status: string;
  players: Player[];
  rounds: Round[];
  currentRoundIndex: number;
  currentRound: Round | null;
  drinks: Drink[];
  wheel: WheelState;
  /** Alles wat er deze quizavond gedronken is, voor het scorebord. */
  drinkLog: DrinkLogEntry[];
  /** Het extra spel dat nu loopt (bv. Fuck the Dealer), of null. */
  minigame: MinigameState | null;
  quizmasterOnline: boolean;
  /** Vraagt de server een code voor het quizmaster-dashboard? */
  quizmasterCodeRequired: boolean;
  serverTime: number;
}

/** Antwoord van de server op een poging om quizmaster te worden. */
export interface QuizmasterJoinResult {
  ok: boolean;
  error?: string;
  codeRequired?: boolean;
}

export type Role = 'quizmaster' | 'player';

/** Een adres waarop spelers kunnen binnenkomen, met bijhorende QR-code. */
export interface JoinAddress {
  url: string;
  /** QR-code als data-URL, of null als het genereren mislukte. */
  qr: string | null;
}

/** Info voor het deelnemen-kaartje op het quizmaster-dashboard. */
export interface SessionInfo {
  addresses: JoinAddress[];
}
