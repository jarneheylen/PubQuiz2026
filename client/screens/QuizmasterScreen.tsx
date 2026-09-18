/**
 * Het quizmaster-dashboard: het bedieningspaneel van de avond.
 * Per fase van de quiz toont het "podium" (midden) precies de knoppen die op
 * dat moment zinvol zijn; de zijkolom houdt spelers en voortgang in het oog.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuiz } from '../state/QuizProvider';
import { ConnectionBadge, StatusBadge } from '../components/StatusBadge';
import { PlayerList } from '../components/PlayerList';
import { RoundInfo, DrinkResult } from '../components/RoundInfo';
import { RoundProgress } from '../components/RoundProgress';
import { JoinInfo } from '../components/JoinInfo';
import { Scoreboard } from '../components/Scoreboard';
import { DrinkManager } from '../components/DrinkManager';
import { Wheel } from '../components/Wheel';
import { getRoundType } from '../rounds';
import { getMinigameType } from '../minigames';
import { storage } from '../lib/storage';
import { playRoundStart } from '../lib/sound';

export function QuizmasterScreen() {
  const { state, connected, actions, leaveRole, serverOffset } = useQuiz();
  const [sound, setSound] = useState(() => storage.getSound());
  const lastPhase = useRef<string | null>(null);

  const phase = state?.phase ?? null;
  useEffect(() => {
    if (phase && lastPhase.current && lastPhase.current !== phase && phase === 'round_active') {
      if (sound) playRoundStart();
    }
    lastPhase.current = phase;
  }, [phase, sound]);

  if (!state) {
    return <div className="loading">Verbinden met de quizserver...</div>;
  }

  const round = state.currentRound;
  const roundType = round ? getRoundType(round.type) : null;
  const QuizmasterView = roundType?.QuizmasterView;
  const nextRound = state.rounds[state.currentRoundIndex + 1] || null;
  const playedRounds = state.rounds.filter((item) => item.status === 'ended').length;
  const onlineCount = state.players.filter((player) => player.connected).length;

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    storage.setSound(next);
  };

  const confirmReset = () => {
    const question =
      state.phase === 'lobby'
        ? 'Nieuwe quizsessie starten? De rondes worden opnieuw klaargezet.'
        : 'Nieuwe quizsessie starten? De huidige quiz gaat verloren, spelers blijven verbonden.';
    if (window.confirm(question)) actions.resetQuiz();
  };

  // Een extra spel (bv. Fuck the Dealer) loopt los van de rondevolgorde: zodra
  // het draait, neemt het scherm volledig over. De quiz zelf blijft ondertussen
  // precies staan waar hij was.
  if (state.minigame) {
    const minigameType = getMinigameType(state.minigame.type);
    const MinigameQuizmasterView = minigameType?.QuizmasterView;
    return (
      <div className="qm qm--minigame">
        <div className="qm__grid">
          <main className="qm__stage qm__stage--minigame">
            {MinigameQuizmasterView ? (
              <MinigameQuizmasterView minigame={state.minigame} state={state} players={state.players} />
            ) : (
              <p className="stage__text">Onbekend spel "{state.minigame.type}".</p>
            )}
          </main>
          <aside className="qm__side">
            <Scoreboard players={state.players} drinkLog={state.drinkLog} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="qm">
      <header className="qm__header">
        <div className="qm__identity">
          <span className="qm__eyebrow">🎙️ Quizmaster</span>
          <h1 className="qm__title">{state.quiz.name}</h1>
        </div>
        <div className="qm__header-actions">
          <StatusBadge
            phase={state.phase}
            status={state.status}
            live={state.phase === 'round_active'}
          />
          <ConnectionBadge connected={connected} />
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={toggleSound}
            title={sound ? 'Geluid uitzetten' : 'Geluid aanzetten'}
          >
            {sound ? '🔊' : '🔇'}
          </button>
          <a className="btn btn--ghost" href="/scherm" target="_blank" rel="noopener">
            🖥️ Groot scherm
          </a>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => actions.startMinigame('fuck-the-dealer')}
          >
            🃏 Fuck the Dealer
          </button>
          <button type="button" className="btn btn--ghost" onClick={confirmReset}>
            Nieuwe quiz
          </button>
          <button type="button" className="btn btn--ghost" onClick={leaveRole}>
            Terug
          </button>
        </div>
      </header>

      <section className="qm__stats" aria-label="Overzicht">
        <div className="stat">
          <span className="stat__label">👥 Spelers</span>
          <span className="stat__value">{state.players.length}</span>
          <span className="stat__note">
            {state.players.filter((player) => player.connected).length} online
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">🎯 Huidige ronde</span>
          <span className="stat__value">
            {round ? round.number : '-'}
            <small>/{state.rounds.length}</small>
          </span>
          <span className="stat__note">{round ? round.theme : 'nog niet gestart'}</span>
        </div>
        <div className="stat">
          <span className="stat__label">📢 Status</span>
          <span className="stat__value stat__value--text">{state.status}</span>
          <span className="stat__note">{playedRounds} ronde(s) afgerond</span>
        </div>
        <div className="stat stat--shot">
          <span className="stat__label">🥃 Shot deze ronde</span>
          <span className="stat__value stat__value--text">
            {round?.wheelResult
              ? `${round.wheelResult.drinkEmoji} ${round.wheelResult.drinkName}`
              : '-'}
          </span>
          <span className="stat__note">
            {round?.wheelResult ? 'door het rad gekozen' : 'rad nog niet gedraaid'}
          </span>
        </div>
      </section>

      <div className="qm__grid">
        <main className="qm__stage">
          {state.phase === 'lobby' && (
            <div className="stage stage--lobby">
              <span className="stage__eyebrow">Lobby</span>
              <h2 className="stage__title">QUIZ LOBBY</h2>
              <p className="stage__text">
                {onlineCount === 0
                  ? 'Wachten op spelers. Zodra iemand zijn naam aantikt, zie je dat hier.'
                  : 'Iedereen binnen? Dan mag de quiz beginnen.'}
              </p>
              <PlayerList players={state.players} onKick={actions.kickPlayer} />
              <button
                type="button"
                className="btn btn--primary btn--huge"
                onClick={actions.startQuiz}
                disabled={onlineCount === 0}
              >
                🍻 START QUIZ
              </button>
              {onlineCount === 0 && (
                <p className="stage__hint">Er is minstens een speler nodig om te starten.</p>
              )}
            </div>
          )}

          {state.phase === 'round_intro' && round && (
            <div className="stage stage--intro">
              <RoundInfo round={round} />
              <div className="stage__wheel">
                <Wheel
                  drinks={state.drinks}
                  wheel={state.wheel}
                  serverOffset={serverOffset}
                  sound={sound}
                />
              </div>

              {state.wheel.status === 'idle' && (
                <>
                  <p className="stage__text">
                    Eerst het rad: het bepaalt welke sterke drank deze ronde op tafel komt.
                  </p>
                  <button type="button" className="btn btn--primary btn--huge" onClick={actions.spinWheel}>
                    🎡 DRAAI HET RAD
                  </button>
                </>
              )}

              {state.wheel.status === 'spinning' && (
                <p className="stage__spinning">Het rad draait...</p>
              )}

              {state.wheel.status === 'result' && state.wheel.result && (
                <>
                  <DrinkResult result={state.wheel.result} />
                  <div className="stage__actions">
                    <button type="button" className="btn btn--ghost" onClick={actions.spinWheel}>
                      🎡 Opnieuw draaien
                    </button>
                    <button type="button" className="btn btn--primary btn--huge" onClick={actions.startRound}>
                      ▶️ START RONDE {round.number}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {state.phase === 'round_active' && round && (
            <div className="stage stage--active">
              <RoundInfo round={round} compact />
              {state.wheel.status === 'spinning' ? (
                <Wheel drinks={state.drinks} wheel={state.wheel} serverOffset={serverOffset} sound={sound} size={220} />
              ) : (
                <>
                  {round.wheelResult && <DrinkResult result={round.wheelResult} size="small" />}
                  <button type="button" className="btn btn--ghost btn--small" onClick={actions.spinWheel}>
                    🎡 Rad opnieuw draaien
                  </button>
                </>
              )}
              {QuizmasterView ? (
                <QuizmasterView round={round} state={state} players={state.players} />
              ) : (
                <p className="stage__text">
                  Rondetype "{round.type}" heeft nog geen quizmaster-weergave.
                </p>
              )}
              <button type="button" className="btn btn--primary btn--huge" onClick={actions.endRound}>
                🏁 BEEINDIG RONDE
              </button>
            </div>
          )}

          {state.phase === 'round_ended' && round && (
            <div className="stage stage--ended">
              <span className="stage__eyebrow">{round.name} afgelopen</span>
              <h2 className="stage__title">{round.theme}</h2>
              {round.wheelResult && (
                <DrinkResult result={round.wheelResult} label="Deze ronde ging op" size="small" />
              )}
              <p className="stage__text">
                {nextRound
                  ? 'Tijd om de antwoorden te overlopen. Klaar voor de volgende ronde?'
                  : 'Dat was de laatste ronde van de avond.'}
              </p>
              <button type="button" className="btn btn--primary btn--huge" onClick={actions.nextRound}>
                {nextRound ? `➡️ VOLGENDE RONDE: ${nextRound.theme.toUpperCase()}` : '🏁 QUIZ AFSLUITEN'}
              </button>
            </div>
          )}

          {state.phase === 'quiz_finished' && (
            <div className="stage stage--finished">
              <span className="stage__eyebrow">Einde</span>
              <h2 className="stage__title">🎉 QUIZ AFGELOPEN</h2>
              <p className="stage__text">
                {state.rounds.length} rondes gespeeld met {state.players.length} spelers. 🍻
              </p>
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
              <button type="button" className="btn btn--primary btn--huge" onClick={confirmReset}>
                🔄 NIEUWE QUIZ
              </button>
            </div>
          )}
        </main>

        <aside className="qm__side">
          {state.phase === 'lobby' && (
            <div className="card">
              <JoinInfo />
            </div>
          )}

          {state.phase !== 'lobby' && (
            <div className="card">
              <h3 className="card__title">
                👥 Spelers <span className="card__count">{state.players.length}</span>
              </h3>
              <PlayerList players={state.players} onKick={actions.kickPlayer} />
            </div>
          )}

          <Scoreboard players={state.players} drinkLog={state.drinkLog} />

          <DrinkManager drinks={state.drinks} onAdd={actions.addDrink} onRemove={actions.removeDrink} />

          <div className="card">
            <h3 className="card__title">📋 Verloop van de quiz</h3>
            <RoundProgress rounds={state.rounds} currentRoundIndex={state.currentRoundIndex} />
          </div>

          {roundType && (
            <div className="card card--muted">
              <h3 className="card__title">🎲 Rondetype</h3>
              <p className="card__text">
                <strong>{roundType.label}</strong>
                {roundType.description ? ` — ${roundType.description}` : ''}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
