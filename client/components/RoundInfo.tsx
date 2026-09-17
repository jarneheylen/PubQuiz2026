import type { Round, WheelResult } from '../../shared/types';

/** Thema, uitleg en spelregels van een ronde. */
export function RoundInfo({ round, compact = false }: { round: Round; compact?: boolean }) {
  return (
    <div className={`round-info${compact ? ' round-info--compact' : ''}`}>
      <span className="round-info__number">Ronde {round.number}</span>
      <h2 className="round-info__theme">{round.theme}</h2>
      {round.explanation && <p className="round-info__text">{round.explanation}</p>}
      {round.rules.length > 0 && (
        <div className="round-info__rules">
          <span className="round-info__rules-title">Spelregels</span>
          <ul>
            {round.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** De drank die het rad aanwees, groot en duidelijk. */
export function DrinkResult({
  result,
  label = 'Het rad koos',
  size = 'large',
}: {
  result: WheelResult;
  label?: string;
  size?: 'large' | 'small';
}) {
  return (
    <div className={`drink-result drink-result--${size}`}>
      <span className="drink-result__label">{label}</span>
      <span className="drink-result__drink">
        <span className="drink-result__emoji">{result.drinkEmoji}</span>
        {result.drinkName}
      </span>
      <span className="drink-result__note">Shot van deze ronde</span>
    </div>
  );
}
