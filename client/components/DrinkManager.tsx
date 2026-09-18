/**
 * Beheer van de dranken op het rad: de quizmaster vult deze lijst zelf aan
 * tijdens de avond (bv. iets is uitverkocht), meteen zichtbaar op het rad
 * van de volgende ronde. Kleur kiest de server (vast palet) - dat blijft
 * hier bewust weg om het simpel te houden.
 */

import { useState, type FormEvent } from 'react';
import type { Drink } from '../../shared/types';

interface DrinkManagerProps {
  drinks: Drink[];
  onAdd: (drink: { name: string; emoji?: string; abv?: number }) => void;
  onRemove: (drinkId: string) => void;
}

export function DrinkManager({ drinks, onAdd, onRemove }: DrinkManagerProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [abv, setAbv] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), emoji: emoji.trim() || undefined, abv: abv ? Number(abv) : undefined });
    setName('');
    setEmoji('');
    setAbv('');
  };

  return (
    <div className="card">
      <h3 className="card__title">
        🥃 Dranken <span className="card__count">{drinks.length}</span>
      </h3>
      <ul className="drink-manager__list">
        {drinks.map((drink) => (
          <li className="drink-manager__item" key={drink.id}>
            <span className="drink-manager__label">
              {drink.emoji} {drink.name} <span className="drink-manager__abv">{drink.abv}%</span>
            </span>
            <button
              type="button"
              className="drink-manager__remove"
              onClick={() => onRemove(drink.id)}
              disabled={drinks.length <= 1}
              title="Verwijderen"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form className="drink-manager__form" onSubmit={submit}>
        <input
          className="drink-manager__input drink-manager__input--emoji"
          value={emoji}
          onChange={(event) => setEmoji(event.target.value)}
          placeholder="🍺"
          maxLength={4}
          aria-label="Emoji"
        />
        <input
          className="drink-manager__input drink-manager__input--name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Naam"
          aria-label="Naam van de drank"
        />
        <input
          className="drink-manager__input drink-manager__input--abv"
          value={abv}
          onChange={(event) => setAbv(event.target.value)}
          placeholder="%"
          type="number"
          min="0"
          max="100"
          step="0.5"
          aria-label="Alcoholpercentage"
        />
        <button type="submit" className="btn btn--primary btn--small" disabled={!name.trim()}>
          + Toevoegen
        </button>
      </form>
    </div>
  );
}
