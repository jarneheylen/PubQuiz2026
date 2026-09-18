/**
 * De spelersinterface: mobile-first, want dit staat op de gsm van je vrienden.
 * Eerst het aanmeldscherm (enkel een naam), daarna volgt het scherm live mee
 * met wat de quizmaster doet.
 */

import { useQuiz } from '../state/QuizProvider';
import { ConnectionBadge, StatusBadge } from '../components/StatusBadge';
import { PlayerList } from '../components/PlayerList';
import { RoundInfo, DrinkResult } from '../components/RoundInfo';
import { Wheel } from '../components/Wheel';
import { getRoundType } from '../rounds';
import { getMinigameType } from '../minigames';

export function PlayerScreen() {
  const { state, connected, me, joinAsPlayer, leaveRole, leaveQuiz, serverOffset, sendRoundAction, sendMinigameAction } =
    useQuiz();

  if (!state) {
    return <div className="loading">Verbinden met de quiz...</div>;
  }

  // ------------------------------------------------------------- aanmelden
  if (!me) {
    return (
      <div className="player player--join">
        <div className="player__top">
          <ConnectionBadge connected={connected} />
          <StatusBadge phase={state.phase} status={state.status} />
        </div>

        <header className="join__header">
          <h1 className="join__title neon-flicker">🍻 Wie ben jij?</h1>
          <p className="join__subtitle">{state.quiz.name}</p>
        </header>

        <div className="join__picker">
          {state.players.map((player) => (
            <button
              key={player.id}
              type="button"
              className="join__picker-btn neon-ring"
              disabled={!connected || player.connected}
              onClick={() => joinAsPlayer(player.name)}
            >
              {player.name}
              {player.connected && <span className="join__picker-tag">al binnen</span>}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn--ghost" onClick={leaveRole}>
          Terug naar start
        </button>
      </div>
    );
  }

  // ------------------------------------------------------- aangemeld speler

  // Een extra spel (bv. Fuck the Dealer) loopt los van de rondevolgorde en
  // neemt het scherm volledig over zolang het draait.
  if (state.minigame) {
    const minigameType = getMinigameType(state.minigame.type);
    const MinigamePlayerView = minigameType?.PlayerView;
    return (
      <div className="player player--minigame">
        <header className="player__header">
          <div className="player__me">
            <span className="player__me-label">Speler</span>
            <strong className="player__me-name">{me.name}</strong>
          </div>
          <ConnectionBadge connected={connected} />
        </header>
        {MinigamePlayerView ? (
          <MinigamePlayerView minigame={state.minigame} state={state} me={me} sendAction={sendMinigameAction} />
        ) : (
          <p className="panel__text">Onbekend spel "{state.minigame.type}".</p>
        )}
      </div>
    );
  }

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
            👥 Spelers <span className="card__count">{state.players.length}</span>
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
          <p className="panel__text">🍻 Bedankt voor het spelen, {me.name}!</p>
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
            👥 Mee aan het spelen <span className="card__count">{state.players.length}</span>
          </h3>
          <PlayerList players={state.players} meId={me.id} />
        </section>
      )}
    </div>
  );
}
