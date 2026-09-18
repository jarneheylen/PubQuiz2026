import { useQuiz } from '../../state/QuizProvider';
import type { MinigameViewProps } from '../registry';
import type { FtdData } from './types';
import { Wheel } from '../../components/Wheel';
import { DrinkResult } from '../../components/RoundInfo';
import { PlayingCard } from './PlayingCard';
import { CardRow } from './CardRow';
import { TurnOrderList } from './TurnOrderList';
import { ResultBanner } from './ResultBanner';
import { rankLabel } from './ranks';
import { candidatesToWheelSegments } from './dealerWheelAdapter';
import { useMinigameIntro } from './useIntro';
import { LoadingScreen } from './LoadingScreen';

/** Groot scherm (HDMI): puur weergave, geen bediening. */
export function ScreenView({ minigame, state }: MinigameViewProps) {
  const { serverOffset } = useQuiz();
  const data = minigame.data as unknown as FtdData;
  const players = state.players;
  const showIntro = useMinigameIntro(minigame.id);

  const nameOf = (id: string | null) => players.find((player) => player.id === id)?.name || '-';

  if (showIntro) return <LoadingScreen />;

  if (data.status === 'selecting_drink') {
    return (
      <div className="ftd ftd--screen ftd-screen">
        <h2 className="ftd-screen__title">FUCK THE DEALER</h2>
        <p className="ftd-screen__subtitle">Welke shot spelen we vanavond?</p>
        <Wheel drinks={state.drinks} wheel={data.drinkWheel} serverOffset={serverOffset} size={440} />
        {data.drinkWheel.status === 'result' && data.drinkWheel.result && (
          <DrinkResult result={data.drinkWheel.result} />
        )}
      </div>
    );
  }

  if (data.status === 'selecting_dealer') {
    return (
      <div className="ftd ftd--screen ftd-screen">
        <h2 className="ftd-screen__title">FUCK THE DEALER</h2>
        <p className="ftd-screen__subtitle">Wie wordt de deler?</p>
        <Wheel
          drinks={candidatesToWheelSegments(data.dealerCandidates)}
          wheel={data.dealerWheel}
          serverOffset={serverOffset}
          size={440}
        />
        {data.dealerWheel.status === 'result' && (
          <p className="ftd-screen__banner">
            {nameOf(data.dealerCandidates[data.dealerWheel.resultIndex ?? -1]?.id ?? null)} IS DE DELER
          </p>
        )}
      </div>
    );
  }

  if (data.status === 'finished') {
    return (
      <div className="ftd ftd--screen ftd-screen">
        <h2 className="ftd-screen__title">FUCK THE DEALER AFGELOPEN!</h2>
        <p className="ftd-screen__banner">🏆 {nameOf(data.loserId)}</p>
        <p className="ftd-screen__subtitle">
          {data.totalMistakes[data.loserId || '']?.count ?? 0} foute voorspellingen
        </p>
        {data.finalDrinkWheel && (
          <>
            <Wheel drinks={state.drinks} wheel={data.finalDrinkWheel} serverOffset={serverOffset} size={380} />
            {data.finalDrinkWheel.status === 'result' && data.finalDrinkWheel.result && (
              <DrinkResult result={data.finalDrinkWheel.result} label={`${nameOf(data.loserId)} drinkt`} />
            )}
          </>
        )}
        <div className="ftd-screen__order">
          <span className="ftd-screen__order-title">SPELERS</span>
          <TurnOrderList
            players={players}
            turnOrder={data.turnOrder}
            currentPlayerId={null}
            dealerId={data.dealerId}
            errors={data.errors}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ftd ftd--screen ftd-screen">
      {data.shot && (
        <p className="ftd-screen__shot">
          {data.shot.drinkEmoji} Vanavond: <strong>{data.shot.drinkName}</strong> ({data.shot.abv}%)
        </p>
      )}
      <div className="ftd-screen__table">
        <PlayingCard card={data.currentCard} size="large" />
      </div>

      {data.status === 'result' && data.lastResult ? (
        <ResultBanner result={data.lastResult} players={players} />
      ) : data.status === 'awaiting_second_guess' ? (
        <p className="ftd-screen__banner">
          {nameOf(data.currentPlayerId)} GOKTE {rankLabel(data.guess1 ?? 0)} - {data.hint?.toUpperCase()}!
        </p>
      ) : (
        <p className="ftd-screen__banner">🎯 {nameOf(data.currentPlayerId)} IS AAN DE BEURT</p>
      )}

      <CardRow cards={data.playedCards} remainingCount={data.remainingCount} />

      <div className="ftd-screen__order">
        <span className="ftd-screen__order-title">SPELERS</span>
        <TurnOrderList
          players={players}
          turnOrder={data.turnOrder}
          currentPlayerId={data.currentPlayerId}
          dealerId={data.dealerId}
          errors={data.errors}
        />
      </div>
    </div>
  );
}
