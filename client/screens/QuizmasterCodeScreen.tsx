/**
 * Codescherm voor de quizmaster.
 *
 * Wordt enkel getoond wanneer de server een code vraagt (dus wanneer de app
 * online gehost staat met QUIZMASTER_CODE ingesteld). Thuis op je eigen laptop
 * zie je dit scherm niet.
 */

import { useState } from 'react';
import { useQuiz } from '../state/QuizProvider';
import { ConnectionBadge } from '../components/StatusBadge';

export function QuizmasterCodeScreen() {
  const { connected, quizmasterCodeError, submitQuizmasterCode, leaveRole } = useQuiz();
  const [code, setCode] = useState('');

  const canSubmit = code.trim().length > 0 && connected;
  const submit = () => {
    if (canSubmit) submitQuizmasterCode(code);
  };

  return (
    <div className="player player--join">
      <div className="player__top">
        <ConnectionBadge connected={connected} />
      </div>

      <header className="join__header">
        <h1 className="join__title">Quizmaster</h1>
        <p className="join__subtitle">Geef je code in om het dashboard te openen.</p>
      </header>

      <form
        className="join__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="join__label" htmlFor="quizmaster-code">
          Quizmastercode
        </label>
        <input
          id="quizmaster-code"
          className="join__input"
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="code"
          autoComplete="current-password"
          autoCapitalize="none"
          enterKeyHint="go"
        />
        {quizmasterCodeError && <p className="join__error">{quizmasterCodeError}</p>}
        <button type="submit" className="btn btn--primary btn--huge" disabled={!canSubmit}>
          OPEN DASHBOARD
        </button>
      </form>

      <button type="button" className="btn btn--ghost" onClick={leaveRole}>
        Terug naar start
      </button>
    </div>
  );
}
