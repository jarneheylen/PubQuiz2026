import type { CSSProperties } from 'react';
import type { Card } from './types';
import { TOTAL_CARDS } from './types';
import { RANKS } from './ranks';
import { PlayingCard } from './PlayingCard';

/**
 * De reeds gespeelde kaarten, gegroepeerd per waarde (alle 2en samen, alle 3en
 * samen, ...) zodat in één oogopslag te zien is welke waarden al gevallen zijn.
 */
export function CardRow({ cards, remainingCount }: { cards: Card[]; remainingCount: number }) {
  const byValue = new Map<number, Card[]>();
  for (const card of cards) {
    const group = byValue.get(card.value);
    if (group) group.push(card);
    else byValue.set(card.value, [card]);
  }

  return (
    <div className="ftd-card-row">
      <div className="ftd-card-row__groups">
        {RANKS.map(({ rank, value }) => {
          const group = byValue.get(value) ?? [];
          return (
            <div className="ftd-card-row__group" key={rank}>
              <div className="ftd-card-row__group-stack">
                {group.length === 0 ? (
                  <span className="ftd-card-row__group-empty" aria-hidden="true">
                    –
                  </span>
                ) : (
                  <>
                    {group.map((card, index) => (
                      <div
                        className="ftd-card-row__group-card"
                        key={index}
                        style={{ '--stack-index': index } as CSSProperties}
                      >
                        <PlayingCard card={card} size="small" />
                      </div>
                    ))}
                    <span className="ftd-card-row__group-count">{group.length}</span>
                  </>
                )}
              </div>
              <span className="ftd-card-row__group-label">{rank}</span>
            </div>
          );
        })}
      </div>
      <div className="ftd-card-row__count">
        <span className="ftd-card-row__count-value">
          {cards.length} / {TOTAL_CARDS}
        </span>
        <span className="ftd-card-row__count-label">{remainingCount} kaarten over</span>
      </div>
    </div>
  );
}
