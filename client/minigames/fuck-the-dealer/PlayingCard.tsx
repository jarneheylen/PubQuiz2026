import type { Card, Suit } from './types';

const SUIT_SYMBOL: Record<Suit, string> = {
  harten: '♥',
  ruiten: '♦',
  klaveren: '♣',
  schoppen: '♠',
};

const RED_SUITS = new Set<Suit>(['harten', 'ruiten']);

export function PlayingCard({
  card,
  size = 'large',
}: {
  card: Card | null;
  size?: 'large' | 'small';
}) {
  if (!card) {
    return (
      <div className={`ftd-card ftd-card--empty ftd-card--${size}`} aria-hidden="true">
        <span className="ftd-card__back">🂠</span>
      </div>
    );
  }

  const red = RED_SUITS.has(card.suit);

  return (
    <div className={`ftd-card ftd-card--${size} ${red ? 'ftd-card--red' : 'ftd-card--black'}`}>
      <span className="ftd-card__rank">{card.rank}</span>
      <span className="ftd-card__suit">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}
