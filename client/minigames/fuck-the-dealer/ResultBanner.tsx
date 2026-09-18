import type { Player } from '../../../shared/types';
import type { LastResult } from './types';
import { rankLabel } from './ranks';
import { PlayingCard } from './PlayingCard';

function playerName(players: Player[], id: string): string {
  return players.find((player) => player.id === id)?.name || '???';
}

const HEADLINE: Record<LastResult['outcome'], { text: string; tone: string }> = {
  'exact-hit': { text: '🎯 DIRECT JUIST!', tone: 'exact' },
  correct: { text: '✅ JUIST!', tone: 'good' },
  wrong: { text: '❌ FOUT!', tone: 'bad' },
};

/** Grote, duidelijke uitslag van een beurt: wie, wat, en hoeveel slokken. */
export function ResultBanner({ result, players }: { result: LastResult; players: Player[] }) {
  const guesser = playerName(players, result.playerId);
  const { text: headline, tone } = HEADLINE[result.outcome];
  const drinkerName = result.drinker === 'dealer' ? 'DE DELER' : guesser.toUpperCase();

  return (
    <div className={`ftd-result ftd-result--${tone}${tone === 'exact' ? ' neon-ring neon-ring--on' : ''}`}>
      <span className="ftd-result__headline">{headline}</span>
      <PlayingCard card={result.card} size="small" />
      <p className="ftd-result__reason">
        {guesser} gokte <strong>{rankLabel(result.guess1)}</strong>.
        {result.hint && (
          <>
            {' '}
            De tafel zei <strong>{result.hint.toUpperCase()}</strong>, tweede gok:{' '}
            <strong>{result.guess2 !== null ? rankLabel(result.guess2) : '-'}</strong>.
          </>
        )}
      </p>
      {result.shot ? (
        <p className="ftd-result__drink">
          {result.shot.drinkEmoji} <strong>{drinkerName}</strong> DRINKT 1 SHOT {result.shot.drinkName.toUpperCase()}{' '}
          ({result.shot.abv}%)
        </p>
      ) : result.drinkAmount > 0 ? (
        <p className="ftd-result__drink">
          🍺 <strong>{drinkerName}</strong> DRINKT {result.drinkAmount}{' '}
          {result.drinkAmount === 1 ? 'SLOK BIER' : 'SLOKKEN BIER'}
        </p>
      ) : (
        <p className="ftd-result__none">🎉 GEEN SLOKKEN</p>
      )}
      {result.dealerChange && (
        <p className="ftd-result__dealer-change">
          🔄 {playerName(players, result.dealerChange.toId)} heeft 3 keer fout gegokt en is vanaf nu de deler.
        </p>
      )}
    </div>
  );
}
