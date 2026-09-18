import { RANKS } from './ranks';

/**
 * De 13 waarden om een gok mee te doen. `min`/`max` (exclusief) beperken de
 * knoppen tot wat nog mogelijk is na de hoger/lager-hint van de tweede gok.
 * `percentages` toont per waarde de kans dat de kaart van de deler dat precies
 * is, op basis van de reeds gespeelde kaarten (kaarten tellen).
 */
export function RankPicker({
  onPick,
  min,
  max,
  percentages,
}: {
  onPick: (value: number) => void;
  min?: number;
  max?: number;
  percentages?: Record<number, number>;
}) {
  return (
    <div className="ftd-rank-picker">
      {RANKS.map(({ rank, value }) => {
        const disabled = (min !== undefined && value <= min) || (max !== undefined && value >= max);
        const percent = percentages?.[value];
        return (
          <button
            key={rank}
            type="button"
            className="ftd-rank-picker__btn"
            disabled={disabled}
            onClick={() => onPick(value)}
          >
            <span className="ftd-rank-picker__rank">{rank}</span>
            {!disabled && percent !== undefined && (
              <span className="ftd-rank-picker__percent">{percent}%</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
