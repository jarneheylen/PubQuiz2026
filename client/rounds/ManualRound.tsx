/**
 * Rondetype 'manual' - de basis.
 *
 * De quizmaster leidt de ronde mondeling: hij stelt de vragen, de spelers
 * schrijven op papier of roepen door elkaar. De app zorgt enkel voor het kader
 * (thema, uitleg, spelregels, de drank van het rad).
 *
 * Dit is tegelijk het voorbeeld waarop latere rondetypes gebouwd worden.
 */

import { registerRoundType, type PlayerRoundProps, type QuizmasterRoundProps } from './registry';

function QuizmasterView({ round, players }: QuizmasterRoundProps) {
  return (
    <div className="round-body">
      <p className="round-body__lead">
        Deze ronde leid je zelf. De spelers zien het thema, je uitleg en de drank
        van het rad op hun gsm.
      </p>
      <div className="round-body__facts">
        <div>
          <span className="round-body__fact-label">Thema</span>
          <strong>{round.theme}</strong>
        </div>
        <div>
          <span className="round-body__fact-label">Spelers aan tafel</span>
          <strong>{players.length}</strong>
        </div>
        <div>
          <span className="round-body__fact-label">Shot deze ronde</span>
          <strong>
            {round.wheelResult
              ? `${round.wheelResult.drinkEmoji} ${round.wheelResult.drinkName}`
              : 'nog niet gedraaid'}
          </strong>
        </div>
      </div>
    </div>
  );
}

function PlayerView({ round }: PlayerRoundProps) {
  return (
    <div className="round-body round-body--player">
      <p className="round-body__lead">
        De quizmaster stelt de vragen. Goed luisteren, en veel succes!
      </p>
      <p className="round-body__hint">
        Thema van deze ronde: <strong>{round.theme}</strong>
      </p>
    </div>
  );
}

registerRoundType({
  id: 'manual',
  label: 'Klassiek (quizmaster leidt)',
  description: 'Vragen worden mondeling gesteld, de app toont enkel het kader.',
  QuizmasterView,
  PlayerView,
});
