import type { Round } from '../../shared/types';

const STATUS_TEXT: Record<Round['status'], string> = {
  pending: 'nog te spelen',
  intro: 'uitleg & rad',
  active: 'bezig',
  ended: 'afgerond',
};

/** Overzicht van alle rondes met hun status en de drank die gedraaid werd. */
export function RoundProgress({
  rounds,
  currentRoundIndex,
}: {
  rounds: Round[];
  currentRoundIndex: number;
}) {
  return (
    <ol className="round-progress">
      {rounds.map((round, index) => (
        <li
          key={round.id}
          className={`round-progress__item round-progress__item--${round.status}${
            index === currentRoundIndex ? ' round-progress__item--current' : ''
          }`}
        >
          <span className="round-progress__number">{round.number}</span>
          <span className="round-progress__body">
            <span className="round-progress__theme">{round.theme}</span>
            <span className="round-progress__status">
              {STATUS_TEXT[round.status]}
              {round.wheelResult ? ` · ${round.wheelResult.drinkEmoji} ${round.wheelResult.drinkName}` : ''}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
