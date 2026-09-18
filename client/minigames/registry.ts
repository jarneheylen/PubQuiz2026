/**
 * Register voor extra spelletjes (bv. Fuck the Dealer) aan clientzijde.
 *
 * Anders dan een rondetype hangt een minigame niet aan een plek in
 * config/quiz.config.js: de quizmaster start/stopt het los van de
 * rondevolgorde, zo vaak hij wil (zie `state.minigame` in shared/types.ts).
 *
 * Een nieuw minigame toevoegen:
 *
 *   1. maak client/minigames/mijnSpel/ met een QuizmasterView, PlayerView en
 *      (optioneel) ScreenView
 *   2. registreer het in dat mapje met registerMinigameType({...})
 *   3. importeer het bestand in client/minigames/index.ts
 *   4. registreer de serverkant in server/minigames/ (zie die README-comment)
 */

import type { ComponentType } from 'react';
import type { MinigameState, Player, QuizState } from '../../shared/types';

export interface MinigameViewProps {
  minigame: MinigameState;
  state: QuizState;
}

export interface MinigameQuizmasterProps extends MinigameViewProps {
  players: Player[];
}

export interface MinigamePlayerProps extends MinigameViewProps {
  me: Player | null;
  /** Stuur een spel-specifieke actie naar de server. */
  sendAction: (action: string, payload?: unknown) => void;
}

export interface MinigameTypeModule {
  id: string;
  /** Korte naam, zichtbaar bij de start-knop op het quizmaster-dashboard. */
  label: string;
  description?: string;
  QuizmasterView?: ComponentType<MinigameQuizmasterProps>;
  PlayerView?: ComponentType<MinigamePlayerProps>;
  ScreenView?: ComponentType<MinigameViewProps>;
}

const registry = new Map<string, MinigameTypeModule>();

export function registerMinigameType(module: MinigameTypeModule): void {
  registry.set(module.id, module);
}

export function getMinigameType(id: string): MinigameTypeModule | null {
  return registry.get(id) || null;
}

export function listMinigameTypes(): MinigameTypeModule[] {
  return [...registry.values()];
}
