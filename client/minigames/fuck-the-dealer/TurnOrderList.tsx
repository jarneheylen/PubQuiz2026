import type { Player } from '../../../shared/types';
import { ERRORS_BEFORE_DEALER_CHANGE } from './types';

function playerName(players: Player[], id: string): string {
  return players.find((player) => player.id === id)?.name || '???';
}

/**
 * De permanente beurtvolgorde. Blijft altijd zichtbaar, verandert nooit van
 * volgorde (enkel welke speler "deler" is kan wisselen). Toont per speler ook
 * hoeveel fouten hij al heeft t.o.v. de 3 die nodig zijn om zelf deler te
 * worden.
 */
export function TurnOrderList({
  players,
  turnOrder,
  currentPlayerId,
  dealerId,
  errors,
}: {
  players: Player[];
  turnOrder: string[];
  currentPlayerId: string | null;
  dealerId: string | null;
  errors: Record<string, { count: number }>;
}) {
  return (
    <ol className="ftd-turn-order">
      {turnOrder.map((id) => {
        const isDealer = id === dealerId;
        const isCurrent = id === currentPlayerId;
        const mistakes = errors[id]?.count ?? 0;
        return (
          <li
            key={id}
            className={`ftd-turn-order__item${isCurrent ? ' ftd-turn-order__item--current' : ''}${
              isDealer ? ' ftd-turn-order__item--dealer' : ''
            }`}
          >
            <span className="ftd-turn-order__marker" aria-hidden="true">
              {isDealer ? '🃏' : isCurrent ? '🎯' : '○'}
            </span>
            <span className="ftd-turn-order__name">{playerName(players, id)}</span>
            {isDealer && <span className="ftd-turn-order__tag">DELER</span>}
            {isCurrent && !isDealer && (
              <span className="ftd-turn-order__tag ftd-turn-order__tag--current">AAN DE BEURT</span>
            )}
            {!isDealer && (
              <span
                className={`ftd-turn-order__mistakes${
                  mistakes >= ERRORS_BEFORE_DEALER_CHANGE - 1 ? ' ftd-turn-order__mistakes--warn' : ''
                }`}
                title="Fouten sinds je laatste keer deler (bij 3 word je opnieuw deler)"
              >
                {mistakes}/{ERRORS_BEFORE_DEALER_CHANGE}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
