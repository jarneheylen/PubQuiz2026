import { useQuiz } from '../../state/QuizProvider';
import type { MinigameQuizmasterProps } from '../registry';
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

export function QuizmasterView({ minigame, state, players }: MinigameQuizmasterProps) {
  const { sendQuizmasterMinigameAction, actions, serverOffset } = useQuiz();
  const data = minigame.data as unknown as FtdData;
  const showIntro = useMinigameIntro(minigame.id);

  const nameOf = (id: string | null) => players.find((player) => player.id === id)?.name || '-';
  const send = (action: string) => sendQuizmasterMinigameAction(action);

  if (showIntro) return <LoadingScreen />;

  return (
    <div className="ftd ftd--quizmaster">
      <div className="ftd__header">
        <h2 className="ftd__title">🃏 Fuck the Dealer</h2>
        <button type="button" className="btn btn--ghost" onClick={actions.stopMinigame}>
          Spel sluiten
        </button>
      </div>

      {data.status === 'selecting_drink' && (
        <div className="ftd-phase ftd-phase--drink">
          <p className="ftd-phase__subtitle">Welke shot spelen we vanavond?</p>
          <Wheel drinks={state.drinks} wheel={data.drinkWheel} serverOffset={serverOffset} size={320} />
          {data.drinkWheel.status === 'idle' && (
            <button type="button" className="btn btn--primary btn--huge" onClick={() => send('spin-drink-wheel')}>
              DRAAI HET RAD
            </button>
          )}
          {data.drinkWheel.status === 'spinning' && <p className="stage__spinning">Het rad draait...</p>}
          {data.drinkWheel.status === 'result' && data.drinkWheel.result && (
            <>
              <DrinkResult result={data.drinkWheel.result} />
              <div className="stage__actions">
                <button type="button" className="btn btn--ghost" onClick={() => send('spin-drink-wheel')}>
                  Opnieuw draaien
                </button>
                <button type="button" className="btn btn--primary btn--huge" onClick={() => send('confirm-drink')}>
                  BEVESTIG SHOT
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {data.status === 'selecting_dealer' && (
        <div className="ftd-phase ftd-phase--dealer">
          <p className="ftd-phase__subtitle">Wie wordt de deler?</p>
          <Wheel
            drinks={candidatesToWheelSegments(data.dealerCandidates)}
            wheel={data.dealerWheel}
            serverOffset={serverOffset}
            size={320}
          />
          {data.dealerWheel.status === 'idle' && (
            <button type="button" className="btn btn--primary btn--huge" onClick={() => send('spin-dealer-wheel')}>
              DRAAI HET RAD
            </button>
          )}
          {data.dealerWheel.status === 'spinning' && <p className="stage__spinning">Het rad draait...</p>}
          {data.dealerWheel.status === 'result' && (
            <>
              <p className="ftd-phase__result">
                {nameOf(data.dealerCandidates[data.dealerWheel.resultIndex ?? -1]?.id ?? null)} IS DE DELER
              </p>
              <div className="stage__actions">
                <button type="button" className="btn btn--ghost" onClick={() => send('spin-dealer-wheel')}>
                  Opnieuw draaien
                </button>
                <button type="button" className="btn btn--primary btn--huge" onClick={() => send('confirm-dealer')}>
                  START HET SPEL
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {(data.status === 'awaiting_guess' || data.status === 'awaiting_second_guess' || data.status === 'result') && (
        <div className="ftd-phase ftd-phase--playing">
          {data.shot && (
            <p className="ftd-phase__shot">
              {data.shot.drinkEmoji} Vanavond spelen we met <strong>{data.shot.drinkName}</strong> ({data.shot.abv}%)
            </p>
          )}
          <div className="ftd-table">
            <PlayingCard card={data.currentCard} />
          </div>
          <CardRow cards={data.playedCards} remainingCount={data.remainingCount} />
          <TurnOrderList
            players={players}
            turnOrder={data.turnOrder}
            currentPlayerId={data.currentPlayerId}
            dealerId={data.dealerId}
            errors={data.errors}
          />

          {data.status === 'awaiting_guess' && (
            <p className="ftd-phase__status">{nameOf(data.currentPlayerId)} kiest een kaart...</p>
          )}
          {data.status === 'awaiting_second_guess' && (
            <p className="ftd-phase__status">
              {nameOf(data.currentPlayerId)} gokte <strong>{rankLabel(data.guess1 ?? 0)}</strong> - de tafel zegt{' '}
              <strong>{data.hint?.toUpperCase()}</strong>. Tweede gok...
            </p>
          )}

          {data.status === 'result' && data.lastResult && (
            <>
              <ResultBanner result={data.lastResult} players={players} />
              <button type="button" className="btn btn--primary btn--huge" onClick={() => send('next-turn')}>
                VOLGENDE SPELER
              </button>
            </>
          )}
        </div>
      )}

      {data.status === 'finished' && (
        <div className="ftd-phase ftd-phase--finished">
          <h3 className="ftd-phase__title">FUCK THE DEALER AFGELOPEN!</h3>
          <p className="ftd-phase__result">
            🏆 Verliezer: {nameOf(data.loserId)} ({data.totalMistakes[data.loserId || '']?.count ?? 0} fouten)
          </p>

          {!data.finalDrinkWheel && (
            <button
              type="button"
              className="btn btn--primary btn--huge"
              onClick={() => send('spin-final-drink-wheel')}
            >
              START FINALE DRANKRAD
            </button>
          )}

          {data.finalDrinkWheel && (
            <>
              <Wheel drinks={state.drinks} wheel={data.finalDrinkWheel} serverOffset={serverOffset} size={320} />
              {data.finalDrinkWheel.status === 'spinning' && <p className="stage__spinning">Het rad draait...</p>}
              {data.finalDrinkWheel.status === 'result' && data.finalDrinkWheel.result && (
                <DrinkResult result={data.finalDrinkWheel.result} label={`${nameOf(data.loserId)} drinkt`} />
              )}
            </>
          )}

          <button type="button" className="btn btn--ghost" onClick={actions.stopMinigame}>
            Spel sluiten
          </button>
        </div>
      )}
    </div>
  );
}
