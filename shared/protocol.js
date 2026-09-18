/**
 * Gedeeld tussen server en client: fases, statussen, socket-events en
 * statuslabels. Zo praten beide kanten gegarandeerd dezelfde taal.
 */

/** De fase waarin de volledige quiz zich bevindt (QuizState.phase). */
export const QuizPhase = {
  /** Spelers kunnen binnenkomen, quiz is nog niet gestart. */
  LOBBY: 'lobby',
  /** Thema + uitleg staan op het scherm, het rad mag gedraaid worden. */
  ROUND_INTRO: 'round_intro',
  /** De ronde loopt. */
  ROUND_ACTIVE: 'round_active',
  /** De ronde is afgelopen, wachten op de volgende ronde. */
  ROUND_ENDED: 'round_ended',
  /** Alle rondes zijn gespeeld. */
  QUIZ_FINISHED: 'quiz_finished',
};

/** Status van een individuele ronde (Round.status). */
export const RoundStatus = {
  PENDING: 'pending',
  INTRO: 'intro',
  ACTIVE: 'active',
  ENDED: 'ended',
};

/** Status van het rad (WheelState.status). */
export const WheelStatus = {
  IDLE: 'idle',
  SPINNING: 'spinning',
  RESULT: 'result',
};

/** Alle socket-events, op een plek. */
export const Events = {
  /** server -> client: volledige QuizState (bij elke wijziging) */
  STATE: 'quiz:state',
  /** server -> client: foutmelding, bv. naam al in gebruik */
  ERROR: 'quiz:error',
  /** server -> client: bevestiging van geslaagde deelname { playerId, name } */
  JOINED: 'player:joined',
  /** server -> client: speler is verwijderd door de quizmaster */
  KICKED: 'player:kicked',

  /** client -> server: deelnemen als speler { name, playerId? } */
  PLAYER_JOIN: 'player:join',
  /**
   * client -> server: deelnemen als quizmaster { code? }
   * Antwoordt via een ack: { ok: true } of { ok: false, error, codeRequired }.
   */
  QM_JOIN: 'quizmaster:join',

  /** client -> server: quizmaster-acties */
  QM_START_QUIZ: 'quizmaster:start-quiz',
  QM_SPIN_WHEEL: 'quizmaster:spin-wheel',
  QM_START_ROUND: 'quizmaster:start-round',
  QM_END_ROUND: 'quizmaster:end-round',
  QM_NEXT_ROUND: 'quizmaster:next-round',
  QM_RESET: 'quizmaster:reset-quiz',
  QM_KICK_PLAYER: 'quizmaster:kick-player',
  /** client -> server: drank toevoegen { name, emoji?, abv? } / verwijderen { drinkId } */
  QM_ADD_DRINK: 'quizmaster:add-drink',
  QM_REMOVE_DRINK: 'quizmaster:remove-drink',
  /** client -> server: rondetype-specifieke quizmaster-actie */
  QM_ROUND_ACTION: 'quizmaster:round-action',

  /** client -> server: rondetype-specifieke actie van een speler */
  ROUND_ACTION: 'round:action',
  /**
   * server -> client: rondetype- of minigame-specifieke info die enkel voor
   * deze speler bestemd is (bv. de geheime kaart van de deler in Fuck the
   * Dealer). Gaat nooit naar iedereen, enkel naar het socket dat het opstuurt.
   */
  ROUND_PRIVATE: 'round:private',

  /**
   * Extra spelletjes (bv. Fuck the Dealer) die de quizmaster los van de
   * rondevolgorde kan starten/stoppen, zoveel keer als hij wil.
   */
  QM_START_MINIGAME: 'quizmaster:start-minigame',
  QM_STOP_MINIGAME: 'quizmaster:stop-minigame',
  /** client -> server: quizmaster-actie binnen het lopende extra spel */
  QM_MINIGAME_ACTION: 'quizmaster:minigame-action',
  /** client -> server: speler-actie binnen het lopende extra spel */
  MINIGAME_ACTION: 'minigame:action',
};

/**
 * Menselijke status, gebruikt door zowel het quizmaster-dashboard als de spelers.
 * @param {{ phase: string, players: Array<unknown>, currentRound: { name: string } | null }} state
 * @returns {string}
 */
export function statusLabel(state) {
  const roundName = state.currentRound ? state.currentRound.name : 'Ronde';

  switch (state.phase) {
    case QuizPhase.LOBBY:
      return state.players.length === 0
        ? 'Wachten op spelers'
        : 'Quiz klaar om te starten';
    case QuizPhase.ROUND_INTRO:
      return `${roundName} - uitleg & rad`;
    case QuizPhase.ROUND_ACTIVE:
      return `${roundName} actief`;
    case QuizPhase.ROUND_ENDED:
      return `${roundName} afgelopen`;
    case QuizPhase.QUIZ_FINISHED:
      return 'Quiz afgelopen';
    default:
      return 'Onbekende status';
  }
}
