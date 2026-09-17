import type { Player } from '../../shared/types';

/** Initialen voor het rondje voor de naam. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface PlayerListProps {
  players: Player[];
  /** Markeert de eigen naam (op de gsm van een speler). */
  meId?: string | null;
  /** Enkel de quizmaster kan spelers verwijderen. */
  onKick?: (playerId: string) => void;
  emptyText?: string;
}

export function PlayerList({ players, meId, onKick, emptyText }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <p className="player-list__empty">
        {emptyText || 'Nog niemand aangemeld. De eerste naam verschijnt hier automatisch.'}
      </p>
    );
  }

  return (
    <ul className="player-list">
      {players.map((player, index) => (
        <li
          key={player.id}
          className={`player-chip${player.id === meId ? ' player-chip--me' : ''}${
            player.connected ? '' : ' player-chip--away'
          }`}
          style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
        >
          <span className="player-chip__avatar">{initials(player.name)}</span>
          <span className="player-chip__name">{player.name}</span>
          {player.id === meId && <span className="player-chip__tag">jij</span>}
          {!player.connected && <span className="player-chip__tag">offline</span>}
          {onKick && (
            <button
              type="button"
              className="player-chip__kick"
              onClick={() => onKick(player.id)}
              title={`${player.name} verwijderen`}
              aria-label={`${player.name} verwijderen`}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
