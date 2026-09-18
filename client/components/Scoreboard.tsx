/**
 * Wie heeft er wat gedronken? Volledig afgeleid uit `drinkLog`: elk rondetype
 * meldt zelf een drinkmoment (server/rounds/*.js roept `store.recordDrink`
 * aan), dus dit scorebord werkt automatisch mee met nieuwe rondetypes.
 */

import type { DrinkLogEntry, Player } from '../../shared/types';

interface ShotBreakdown {
  drinkName: string;
  drinkEmoji: string;
  abv: number;
  count: number;
}

interface PlayerSummary {
  playerId: string;
  beerSips: number;
  shotsCount: number;
  shots: ShotBreakdown[];
}

function summarize(players: Player[], drinkLog: DrinkLogEntry[]): PlayerSummary[] {
  const byPlayer = new Map<string, PlayerSummary>();
  for (const player of players) {
    byPlayer.set(player.id, { playerId: player.id, beerSips: 0, shotsCount: 0, shots: [] });
  }
  for (const entry of drinkLog) {
    const summary = byPlayer.get(entry.playerId);
    if (!summary) continue;
    if (entry.kind === 'beer') {
      summary.beerSips += entry.amount;
      continue;
    }
    summary.shotsCount += entry.amount;
    const existing = summary.shots.find((shot) => shot.drinkName === entry.drinkName);
    if (existing) existing.count += entry.amount;
    else {
      summary.shots.push({
        drinkName: entry.drinkName || 'onbekend',
        drinkEmoji: entry.drinkEmoji || '🥃',
        abv: entry.abv ?? 0,
        count: entry.amount,
      });
    }
  }
  return [...byPlayer.values()];
}

export function Scoreboard({ players, drinkLog }: { players: Player[]; drinkLog: DrinkLogEntry[] }) {
  const nameOf = (id: string) => players.find((player) => player.id === id)?.name || '???';
  const rows = summarize(players, drinkLog)
    .filter((summary) => summary.beerSips > 0 || summary.shotsCount > 0)
    .sort((a, b) => b.shotsCount + b.beerSips - (a.shotsCount + a.beerSips));

  return (
    <div className="card">
      <h3 className="card__title">Scorebord</h3>
      {rows.length === 0 ? (
        <p className="card__text">Nog niemand heeft iets moeten drinken.</p>
      ) : (
        <ul className="scoreboard">
          {rows.map((summary) => (
            <li className="scoreboard__row" key={summary.playerId}>
              <span className="scoreboard__name">{nameOf(summary.playerId)}</span>
              <span className="scoreboard__stats">
                {summary.beerSips > 0 && (
                  <span className="scoreboard__stat">
                    🍺 {summary.beerSips} {summary.beerSips === 1 ? 'slok' : 'slokken'} bier
                  </span>
                )}
                {summary.shots.map((shot) => (
                  <span className="scoreboard__stat" key={shot.drinkName}>
                    {shot.drinkEmoji} {shot.count}x {shot.drinkName} ({shot.abv}%)
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
