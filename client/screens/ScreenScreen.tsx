/**
 * Het publieke scherm: voor de laptop/pc die via HDMI op de tv aangesloten
 * staat. Puur weergave, geen bediening - dat doet de quizmaster op zijn eigen
 * dashboard. Elk verbonden toestel krijgt sowieso de volledige quizstatus, dus
 * dit scherm hoeft zich nergens voor aan te melden.
 */

import { useQuiz } from '../state/QuizProvider';
import { StatusBadge } from '../components/StatusBadge';
import { PlayerList } from '../components/PlayerList';
import { RoundInfo, DrinkResult } from '../components/RoundInfo';
import { Wheel } from '../components/Wheel';
import { JoinInfo } from '../components/JoinInfo';
import { getRoundType } from '../rounds';
import { getMinigameType } from '../minigames';

export function ScreenScreen() {
  const { state, serverOffset } = useQuiz();

  if (!state) {
    return <div className="loading">Verbinden met de quiz...</div>;
  }

  // Een extra spel (bv. Fuck the Dealer) loopt los van de rondevolgorde en
  // neemt het grote scherm volledig over zolang het draait.
  if (state.minigame) {
    const minigameType = getMinigameType(state.minigame.type);
    const MinigameScreenView = minigameType?.ScreenView;
    return (
      <div className="screen screen--minigame">
        {MinigameScreenView ? (
          <MinigameScreenView minigame={state.minigame} state={state} />
        ) : (
          <p className="screen__hint">Onbekend spel "{state.minigame.type}".</p>
        )}
      </div>
    );
  }

  const round = state.currentRound;
  const roundType = round ? getRoundType(round.type) : null;
  const ScreenView = roundType?.ScreenView;

  return (
    <div className="screen">
      <header className="screen__header">
        <span className="screen__eyebrow">{state.quiz.name}</span>
        <StatusBadge phase={state.phase} status={state.status} live={state.phase === 'round_active'} />
      </header>

      {state.phase === 'lobby' && (
        <div className="screen__stage screen__stage--lobby">
          <h1 className="screen__title">DE PUBQUIZ</h1>
          <div className="screen__lobby-grid">
            <JoinInfo />
            <div className="screen__lobby-players">
              <h2 className="screen__subtitle">
                🍻 Al aan tafel <span className="card__count">{state.players.length}</span>
              </h2>
              <PlayerList players={state.players} emptyText="Nog niemand aangemeld." />
            </div>
          </div>
        </div>
      )}

      {state.phase === 'round_intro' && round && (
        <div className="screen__stage">
          <RoundInfo round={round} />
          <Wheel drinks={state.drinks} wheel={state.wheel} serverOffset={serverOffset} size={420} />
          {state.wheel.status === 'result' && state.wheel.result && <DrinkResult result={state.wheel.result} />}
        </div>
      )}

      {state.phase === 'round_active' && round && (
        <div className="screen__stage screen__stage--active">
          {state.wheel.status === 'spinning' ? (
            <>
              <span className="screen__eyebrow">Het rad draait opnieuw...</span>
              <Wheel drinks={state.drinks} wheel={state.wheel} serverOffset={serverOffset} size={420} />
            </>
          ) : ScreenView ? (
            <ScreenView round={round} state={state} />
          ) : (
            <>
              <RoundInfo round={round} />
              <p className="screen__hint">De quizmaster leidt deze ronde mondeling.</p>
            </>
          )}
        </div>
      )}

      {state.phase === 'round_ended' && round && (
        <div className="screen__stage">
          <span className="screen__eyebrow">{round.name} afgelopen</span>
          <h2 className="screen__title">{round.theme}</h2>
          {round.wheelResult && <DrinkResult result={round.wheelResult} label="Deze ronde ging op" />}
        </div>
      )}

      {state.phase === 'quiz_finished' && (
        <div className="screen__stage">
          <h1 className="screen__title">🎉 QUIZ AFGELOPEN</h1>
          <p className="screen__hint">🍻 Bedankt voor het spelen!</p>
        </div>
      )}
    </div>
  );
}
