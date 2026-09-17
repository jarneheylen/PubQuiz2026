/**
 * De spelersinterface: mobile-first, want dit staat op de gsm van je vrienden.
 * Eerst het aanmeldscherm (enkel een naam), daarna volgt het scherm live mee
 * met wat de quizmaster doet.
 */

import { useState } from 'react';
import { useQuiz } from '../state/QuizProvider';
import { ConnectionBadge, StatusBadge } from '../components/StatusBadge';
import { PlayerList } from '../components/PlayerList';
import { RoundInfo, DrinkResult } from '../components/RoundInfo';
import { Wheel } from '../components/Wheel';
import { getRoundType } from '../rounds';
import { storage } from '../lib/storage';

export function PlayerScreen() {
  const { state, connected, me, joinAsPlayer, leaveRole, leaveQuiz, serverOffset, sendRoundAction } =
    useQuiz();
  const [name, setName] = useState(() => storage.getPlayerName() || '');

  if (!state) {
    return <div className="loading">Verbinden met de quiz...</div>;
  }

  // ------------------------------------------------------------- aanmelden
  if (!me) {
    const trimmed = name.trim();
    const canJoin = trimmed.length >= 2 && connected;
    const submit = () => {
      if (canJoin) joinAsPlayer(trimmed);
    };

    return (
      <div className="player player--join">
        <div className="player__top">
          <ConnectionBadge connected={connected} />
          <StatusBadge phase={state.phase} status={state.status} />
        </div>

        <header className="join__header">
          <h1 className="join__title">Doe mee</h1>
          <p className="join__subtitle">{state.quiz.name}</p>
        </header>

        <form
          className="join__form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="join__label" htmlFor="player-name">
            Hoe heet je?
          </label>
          <input
            id="player-name"
            className="join__input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              // Niet elke gsm-toetsenbord stuurt het formulier zelf door.
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Je naam"
            maxLength={20}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="go"
          />
          <button type="submit" className="btn btn--primary btn--huge" disabled={!canJoin}>
            DEELNEMEN
          </button>
        </form>

        <div className="join__players">
          <h2 className="join__players-title">
            Al aan tafel <span className="card__count">{state.players.length}</span>
          </h2>
          <PlayerList players={state.players} emptyText="Jij kan de eerste zijn." />
        </div>

        <button type="button" className="btn btn--ghost" onClick={leaveRole}>
          Terug naar start
        </button>
      </div>
    );
  }

  // ------------------------------------------------------- aangemeld speler
  const round = state.currentRound;
  const roundType = round ? getRoundType(round.type) : null;
  const PlayerView = roundType?.PlayerView;

  return (
    <div className="player">
      <header className="player__header">
        <div className="player__me">
          <span className="player__me-label">Speler</span>
          <strong className="player__me-name">{me.name}</strong>
        </div>
        <div className="player__header-right">
          <ConnectionBadge connected={connected} />
          <button type="button" className="btn btn--ghost btn--small" onClick={leaveQuiz}>
            Afmelden
          </button>
        </div>
      </header>

      <div className="player__status">
        <StatusBadge
          phase={state.phase}
          status={state.status}
          live={state.phase === 'round_active'}
        />
      </div>

      {state.phase === 'lobby' && (
        <section className="panel panel--lobby">
          <div className="panel__check" aria-hidden="true">
            ✓
          </div>
          <h2 className="panel__title">Je bent binnen!</h2>
          <p className="panel__text">
            Leun achterover. Zodra de quizmaster start, verschijnt de eerste ronde hier.
          </p>
          <h3 className="panel__subtitle">
            Spelers <span className="card__count">{state.players.length}</span>
          </h3>
          <PlayerList players={state.players} meId={me.id} />
        </section>
      )}

      {state.phase === 'round_intro' && round && (
        <section className="panel">
          <RoundInfo round={round} />
          <div className="panel__wheel">
            <Wheel
              drinks={state.drinks}
              wheel={state.wheel}
              serverOffset={serverOffset}
              size={300}
            />
          </div>
          {state.wheel.status === 'idle' && (
            <p className="panel__text">De quizmaster gaat het rad draaien...</p>
          )}
          {state.wheel.status === 'spinning' && <p className="stage__spinning">Het rad draait...</p>}
          {state.wheel.status === 'result' && state.wheel.result && (
            <DrinkResult result={state.wheel.result} />
          )}
        </section>
      )}

      {state.phase === 'round_active' && round && (
        <section className="panel">
          <RoundInfo round={round} compact />
          {round.wheelResult && <DrinkResult result={round.wheelResult} size="small" />}
          {PlayerView ? (
            <PlayerView round={round} state={state} me={me} sendAction={sendRoundAction} />
          ) : (
            <p className="panel__text">De quizmaster leidt deze ronde.</p>
          )}
        </section>
      )}

      {state.phase === 'round_ended' && round && (
        <section className="panel">
          <span className="panel__eyebrow">{round.name} afgelopen</span>
          <h2 className="panel__title">{round.theme}</h2>
          <p className="panel__text">
            De quizmaster overloopt de antwoorden. Even wachten op de volgende ronde.
          </p>
          {round.wheelResult && (
            <DrinkResult result={round.wheelResult} label="Deze ronde ging op" size="small" />
          )}
        </section>
      )}

      {state.phase === 'quiz_finished' && (
        <section className="panel">
          <div className="panel__check" aria-hidden="true">
            🏁
          </div>
          <h2 className="panel__title">Quiz afgelopen</h2>
          <p className="panel__text">Bedankt voor het spelen, {me.name}!</p>
          <ul className="finish-list">
            {state.rounds.map((item) => (
              <li key={item.id}>
                <span>
                  Ronde {item.number} · {item.theme}
                </span>
                <strong>
                  {item.wheelResult
                    ? `${item.wheelResult.drinkEmoji} ${item.wheelResult.drinkName}`
                    : '-'}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.phase !== 'lobby' && (
        <section className="panel panel--muted">
          <h3 className="panel__subtitle">
            Mee aan het spelen <span className="card__count">{state.players.length}</span>
          </h3>
          <PlayerList players={state.players} meId={me.id} />
        </section>
      )}
    </div>
  );
}
