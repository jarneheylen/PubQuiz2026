/**
 * Register voor rondetypes aan clientzijde.
 *
 * Elke ronde in config/quiz.config.js heeft een `type`. Dat type bepaalt welke
 * module de inhoud van de ronde tekent: een voor de quizmaster, een voor de
 * spelers. De algemene omkadering (thema, uitleg, spelregels, drank van het rad,
 * statusbalk) wordt door de schermen zelf getekend; een rondemodule vult enkel
 * het ronde-specifieke deel in.
 *
 * Een nieuw rondetype toevoegen:
 *
 *   1. maak client/rounds/MijnRonde.tsx met een QuizmasterView en PlayerView
 *   2. registreer het onderaan dat bestand met registerRoundType({...})
 *   3. importeer het bestand in client/rounds/index.ts
 *   4. zet `type: 'mijn-ronde'` bij de ronde in config/quiz.config.js
 *
 * Meer hoeft er niet te gebeuren: de rest van de app blijft onaangeroerd.
 */

import type { ComponentType } from 'react';
import type { Player, QuizState, Round } from '../../shared/types';

export interface RoundViewProps {
  round: Round;
  state: QuizState;
}

export interface QuizmasterRoundProps extends RoundViewProps {
  /** Spelers, handig voor rondes waarin per speler iets opgevolgd wordt. */
  players: Player[];
}

export interface PlayerRoundProps extends RoundViewProps {
  me: Player | null;
  /** Stuur een rondetype-specifieke actie naar de server. */
  sendAction: (action: string, payload?: unknown) => void;
}

export interface RoundTypeModule {
  id: string;
  /** Korte naam, zichtbaar in het quizmaster-dashboard. */
  label: string;
  /** Eventuele extra toelichting voor de quizmaster. */
  description?: string;
  QuizmasterView?: ComponentType<QuizmasterRoundProps>;
  PlayerView?: ComponentType<PlayerRoundProps>;
}

const registry = new Map<string, RoundTypeModule>();

export function registerRoundType(module: RoundTypeModule): void {
  registry.set(module.id, module);
}

/** Het rondetype, of het 'manual'-type als fallback bij een onbekend type. */
export function getRoundType(id: string): RoundTypeModule {
  return (
    registry.get(id) ||
    registry.get('manual') || {
      id,
      label: 'Onbekend rondetype',
      description: `Er is nog geen module voor rondetype "${id}".`,
    }
  );
}

export function listRoundTypes(): RoundTypeModule[] {
  return [...registry.values()];
}
