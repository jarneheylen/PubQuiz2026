import { useQuiz } from '../../state/QuizProvider';
import type { MinigamePlayerProps } from '../registry';
import type { DealerCardPayload, FtdData } from './types';
import { PlayingCard } from './PlayingCard';
import { ResultBanner } from './ResultBanner';
import { RankPicker } from './RankPicker';
import { RANKS, rankLabel } from './ranks';
import { guessProbabilities } from './probability';
import { useMinigameIntro } from './useIntro';
import { LoadingScreen } from './LoadingScreen';

function isDealerCard(payload: unknown): payload is DealerCardPayload {
  return !!payload && typeof payload === 'object' && (payload as { type?: unknown }).type === 'fuck-the-dealer-card';
}

export function PlayerView({ minigame, state, me, sendAction }: MinigamePlayerProps) {
  const { roundPrivate } = useQuiz();
  const data = minigame.data as unknown as FtdData;
  const showIntro = useMinigameIntro(minigame.id);

  const isDealer = me?.id === data.dealerId;
  const isMyTurn = me?.id === data.currentPlayerId;
  const secretCard = isDealerCard(roundPrivate) ? roundPrivate.card : null;

  const nameOf = (id: string | null) => state.players.find((player) => player.id === id)?.name || '???';

  if (showIntro) return <LoadingScreen />;

  if (data.status === 'selecting_drink') {
    return (
      <div className="round-body round-body--player ftd-player">
        <p className="round-body__lead">De quizmaster draait het drankrad...</p>
      </div>
    );
  }

  if (data.status === 'selecting_dealer') {
    return (
      <div className="round-body round-body--player ftd-player">
        <p className="round-body__lead">De quizmaster draait het delersrad...</p>
      </div>
    );
  }

  if (data.status === 'finished') {
    return (
      <div className="round-body round-body--player ftd-player">
        <h2 className="ftd-player__title">FUCK THE DEALER AFGELOPEN</h2>
        <p className="round-body__lead">
          🏆 Verliezer: <strong>{nameOf(data.loserId)}</strong>
        </p>
      </div>
    );
  }

  if (data.status === 'result' && data.lastResult) {
    return (
      <div className="ftd-player">
        <ResultBanner result={data.lastResult} players={state.players} />
      </div>
    );
  }

  // status === 'awaiting_guess' | 'awaiting_second_guess'
  if (isDealer) {
    return (
      <div className="round-body round-body--player ftd-player">
        <span className="ftd-player__tag">🃏 JIJ BENT DE DELER</span>
        <p className="round-body__lead">Enkel jij ziet deze kaart. Niet verklappen!</p>
        <div className="ftd-player__card">
          <PlayingCard card={secretCard} />
        </div>
        {data.status === 'awaiting_guess' && (
          <p className="ftd-player__hint">{nameOf(data.currentPlayerId)} kiest een kaart...</p>
        )}
        {data.status === 'awaiting_second_guess' && (
          <p className="ftd-player__hint">
            {nameOf(data.currentPlayerId)} gokte {rankLabel(data.guess1 ?? 0)} - de tafel zei{' '}
            {data.hint?.toUpperCase()}. Wacht op de tweede gok...
          </p>
        )}
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="round-body round-body--player ftd-player">
        <span className="ftd-player__tag">WACHTEN</span>
        <p className="round-body__lead">
          <strong>{nameOf(data.currentPlayerId)}</strong> is aan de beurt.
        </p>
        {data.status === 'awaiting_second_guess' && (
          <p className="ftd-player__hint">
            Gokte {rankLabel(data.guess1 ?? 0)} - de tafel zegt {data.hint?.toUpperCase()}.
          </p>
        )}
        <div className="ftd-player__card">
          <PlayingCard card={null} />
        </div>
      </div>
    );
  }

  const predict = (value: number) => sendAction('predict', { value });

  if (data.status === 'awaiting_second_guess') {
    const eligible = RANKS.map((entry) => entry.value).filter((value) =>
      data.hint === 'hoger' ? value > (data.guess1 ?? 0) : value < (data.guess1 ?? 0),
    );
    const percentages = guessProbabilities(data.playedCards, eligible);
    return (
      <div className="round-body round-body--player ftd-player">
        <span className="ftd-player__tag ftd-player__tag--turn">🎯 JIJ BENT AAN DE BEURT</span>
        <p className="ftd-player__question">
          Je gokte {rankLabel(data.guess1 ?? 0)}. De tafel zegt: <strong>{data.hint?.toUpperCase()}</strong>
        </p>
        <p className="round-body__lead">Nog één kans (% = kans op basis van gespeelde kaarten):</p>
        <RankPicker
          onPick={predict}
          min={data.hint === 'hoger' ? data.guess1 ?? undefined : undefined}
          max={data.hint === 'lager' ? data.guess1 ?? undefined : undefined}
          percentages={percentages}
        />
      </div>
    );
  }

  const percentages = guessProbabilities(
    data.playedCards,
    RANKS.map((entry) => entry.value),
  );

  return (
    <div className="round-body round-body--player ftd-player">
      <span className="ftd-player__tag ftd-player__tag--turn">🎯 JIJ BENT AAN DE BEURT</span>
      <p className="ftd-player__question">De deler houdt een kaart vast. Welke waarde gok je?</p>
      <p className="round-body__lead">% = kans op basis van gespeelde kaarten</p>
      <RankPicker onPick={predict} percentages={percentages} />
    </div>
  );
}
