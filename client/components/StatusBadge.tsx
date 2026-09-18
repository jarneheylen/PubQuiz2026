import type { QuizPhase } from '../../shared/types';

const PHASE_CLASS: Record<QuizPhase, string> = {
  lobby: 'status--lobby',
  round_intro: 'status--intro',
  round_active: 'status--active',
  round_ended: 'status--ended',
  quiz_finished: 'status--finished',
};

const PHASE_ICON: Record<QuizPhase, string> = {
  lobby: '🍻',
  round_intro: '🎡',
  round_active: '🎯',
  round_ended: '🍺',
  quiz_finished: '🎉',
};

/** De leesbare quizstatus, bv. "Ronde 1 actief". */
export function StatusBadge({
  phase,
  status,
  live = false,
}: {
  phase: QuizPhase;
  status: string;
  /** Toont een kloppend bolletje (gebruikt tijdens een actieve ronde). */
  live?: boolean;
}) {
  return (
    <span className={`status ${PHASE_CLASS[phase] || ''}`}>
      <span className={`status__dot${live ? ' status__dot--live' : ''}`} aria-hidden="true" />
      <span aria-hidden="true">{PHASE_ICON[phase] || '🍺'}</span>
      {status}
    </span>
  );
}

/** Klein lampje dat toont of de realtime verbinding er is. */
export function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`conn${connected ? ' conn--on' : ' conn--off'}`}>
      <span className="conn__dot" aria-hidden="true" />
      {connected ? 'Verbonden' : 'Verbinding zoeken...'}
    </span>
  );
}
