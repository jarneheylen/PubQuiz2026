import type { QuizPhase } from '../../shared/types';

const PHASE_CLASS: Record<QuizPhase, string> = {
  lobby: 'status--lobby',
  round_intro: 'status--intro',
  round_active: 'status--active',
  round_ended: 'status--ended',
  quiz_finished: 'status--finished',
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
