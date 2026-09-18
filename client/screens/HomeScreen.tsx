/** Startscherm met de twee keuzes: quizmaster of speler. */

import { useQuiz } from '../state/QuizProvider';
import { ConnectionBadge, StatusBadge } from '../components/StatusBadge';

export function HomeScreen() {
  const { state, connected, chooseRole } = useQuiz();

  return (
    <div className="home">
      <div className="home__top">
        <ConnectionBadge connected={connected} />
        {state && <StatusBadge phase={state.phase} status={state.status} />}
      </div>

      <header className="home__header">
        <h1 className="home__title">
          <span className="home__title-line">DE</span>
          <span className="home__title-line home__title-line--big neon-flicker">PUBQUIZ</span>
        </h1>
        <p className="home__subtitle">
          {state ? state.quiz.name : 'Quiz wordt geladen...'}
        </p>
        <div className="home__cheers" aria-hidden="true">
          <span>🍺</span>
          <span>🥃</span>
          <span>🍻</span>
          <span>🥂</span>
        </div>
      </header>

      <div className="home__choices">
        <button type="button" className="choice choice--master neon-ring" onClick={() => chooseRole('quizmaster')}>
          <span className="choice__icon" aria-hidden="true">
            🎙️
          </span>
          <span className="choice__label">Quizmaster</span>
          <span className="choice__text">
            Jij bestuurt de avond: rondes, het rad en de spelers.
          </span>
          <span className="choice__cta">Naar het dashboard</span>
        </button>

        <button type="button" className="choice choice--player neon-ring" onClick={() => chooseRole('player')}>
          <span className="choice__icon" aria-hidden="true">
            🍻
          </span>
          <span className="choice__label">Speler</span>
          <span className="choice__text">
            Geef je naam in en doe mee met de actieve quiz.
          </span>
          <span className="choice__cta">Deelnemen</span>
        </button>
      </div>

      <footer className="home__footer">
        {state && state.players.some((player) => player.connected) ? (
          <span>
            🍻 Al aan tafel:{' '}
            <strong>
              {state.players
                .filter((player) => player.connected)
                .map((player) => player.name)
                .join(', ')}
            </strong>
          </span>
        ) : (
          <span>🍺 Nog niemand aangemeld. Wie is de eerste?</span>
        )}
      </footer>
    </div>
  );
}
