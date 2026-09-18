/**
 * De realtime laag: verbindt socket-events met de quiz-state.
 * Bij elke wijziging van de state gaat de volledige QuizState naar alle clients.
 */

import { Events } from '../shared/protocol.js';
import { getRoundTypeHandler } from './rounds/index.js';
import { getMinigameTypeHandler } from './minigames/index.js';
import { isCodeRequired, isCodeValid } from './quizmasterCode.js';

/**
 * @param {import('socket.io').Server} io
 * @param {ReturnType<import('./quizStore.js').createQuizStore>} store
 */
export function attachSocketHandlers(io, store) {
  /** De clients moeten weten of er een quizmastercode gevraagd wordt. */
  const publicState = (state) => ({ ...state, quizmasterCodeRequired: isCodeRequired() });

  // Eén abonnement: elke state-wijziging wordt naar iedereen gestuurd.
  store.subscribe((state) => io.emit(Events.STATE, publicState(state)));

  io.on('connection', (socket) => {
    socket.data.role = null;
    socket.data.playerId = null;

    // Meteen de huidige stand meegeven, ook voor wie enkel het startscherm ziet.
    socket.emit(Events.STATE, publicState(store.getState()));

    const guardQuizmaster = () => {
      if (socket.data.role !== 'quizmaster') {
        socket.emit(Events.ERROR, { message: 'Enkel de quizmaster kan dit doen.' });
        return false;
      }
      return true;
    };

    const runQuizmasterAction = (action) => {
      if (!guardQuizmaster()) return;
      const result = action();
      if (result && !result.ok) {
        socket.emit(Events.ERROR, { message: result.error });
      }
    };

    // ------------------------------------------------------------- aanmelden

    socket.on(Events.QM_JOIN, (payload = {}, ack) => {
      const reply = (result) => {
        if (typeof ack === 'function') ack(result);
      };

      if (!isCodeValid(payload.code)) {
        socket.data.role = null;
        reply({
          ok: false,
          codeRequired: true,
          error: payload.code ? 'Die code is niet juist.' : 'Geef de quizmastercode in.',
        });
        return;
      }

      socket.data.role = 'quizmaster';
      socket.data.playerId = null;
      store.joinAsQuizmaster(socket.id);
      reply({ ok: true });
    });

    socket.on(Events.PLAYER_JOIN, (payload = {}) => {
      const result = store.joinAsPlayer({
        name: payload.name,
        playerId: payload.playerId,
        socketId: socket.id,
      });
      if (!result.ok) {
        socket.emit(Events.ERROR, { message: result.error });
        return;
      }
      socket.data.role = 'player';
      socket.data.playerId = result.player.id;
      socket.emit(Events.JOINED, {
        playerId: result.player.id,
        name: result.player.name,
      });

      // Sommige rondetypes/minigames hebben speler-specifieke geheimen (bv. de
      // kaart van de deler in Fuck the Dealer); die missen anders een herlaadbeurt.
      const state = store.getState();
      const round = state.currentRound;
      const roundHandler = round ? getRoundTypeHandler(round.type) : null;
      let privatePayload = roundHandler?.getPrivateState?.({ round, state, player: result.player });
      if (privatePayload == null && state.minigame) {
        const minigameHandler = getMinigameTypeHandler(state.minigame.type);
        privatePayload = minigameHandler?.getPrivateState?.({
          minigame: state.minigame,
          state,
          player: result.player,
        });
      }
      if (privatePayload != null) {
        socket.emit(Events.ROUND_PRIVATE, privatePayload);
      }
    });

    // -------------------------------------------------- quizmaster-bediening

    socket.on(Events.QM_START_QUIZ, () => runQuizmasterAction(() => store.startQuiz()));
    socket.on(Events.QM_SPIN_WHEEL, () => runQuizmasterAction(() => store.spinWheel()));
    socket.on(Events.QM_START_ROUND, () => runQuizmasterAction(() => store.startRound()));
    socket.on(Events.QM_END_ROUND, () => runQuizmasterAction(() => store.endRound()));
    socket.on(Events.QM_NEXT_ROUND, () => runQuizmasterAction(() => store.nextRound()));

    socket.on(Events.QM_RESET, () => runQuizmasterAction(() => store.resetQuiz()));

    socket.on(Events.QM_KICK_PLAYER, (payload = {}) => {
      if (!guardQuizmaster()) return;
      const playerId = payload.playerId;
      const result = store.kickPlayer(playerId);
      if (!result.ok) {
        socket.emit(Events.ERROR, { message: result.error });
        return;
      }
      // De verwijderde speler terug naar het aanmeldscherm sturen.
      for (const client of io.sockets.sockets.values()) {
        if (client.data.playerId === playerId) {
          client.data.role = null;
          client.data.playerId = null;
          client.emit(Events.KICKED, {
            message: 'De quizmaster heeft je uit de quiz verwijderd.',
          });
        }
      }
    });

    // ------------------------------------------ rondetype-specifieke acties

    socket.on(Events.QM_ROUND_ACTION, (payload = {}) => {
      if (!guardQuizmaster()) return;
      const state = store.getState();
      const round = state.currentRound;
      if (!round) return;

      const handler = getRoundTypeHandler(round.type);
      if (!handler || typeof handler.onQuizmasterAction !== 'function') return;

      const result = handler.onQuizmasterAction({
        round,
        state,
        action: payload.action,
        payload: payload.payload,
      });
      if (result && !result.ok) {
        socket.emit(Events.ERROR, { message: result.error });
        return;
      }
      store.touch();
    });

    socket.on(Events.ROUND_ACTION, (payload = {}) => {
      const state = store.getState();
      const round = state.currentRound;
      if (!round) return;

      const handler = getRoundTypeHandler(round.type);
      if (!handler || typeof handler.onPlayerAction !== 'function') return;

      const player = store.getPlayerBySocket(socket.id);
      if (!player) return;

      handler.onPlayerAction({
        round,
        state,
        player,
        action: payload.action,
        payload: payload.payload,
      });
      store.touch();
    });

    // ------------------------------------------------------ extra spelletjes

    socket.on(Events.QM_START_MINIGAME, (payload = {}) =>
      runQuizmasterAction(() => store.startMinigame(payload.type)),
    );

    socket.on(Events.QM_STOP_MINIGAME, () => runQuizmasterAction(() => store.stopMinigame()));

    socket.on(Events.QM_MINIGAME_ACTION, (payload = {}) => {
      if (!guardQuizmaster()) return;
      const state = store.getState();
      const minigame = state.minigame;
      if (!minigame) return;

      const handler = getMinigameTypeHandler(minigame.type);
      if (!handler || typeof handler.onQuizmasterAction !== 'function') return;

      const result = handler.onQuizmasterAction({
        minigame,
        state,
        action: payload.action,
        payload: payload.payload,
      });
      if (result && !result.ok) {
        socket.emit(Events.ERROR, { message: result.error });
        return;
      }
      store.touch();
    });

    socket.on(Events.MINIGAME_ACTION, (payload = {}) => {
      const state = store.getState();
      const minigame = state.minigame;
      if (!minigame) return;

      const handler = getMinigameTypeHandler(minigame.type);
      if (!handler || typeof handler.onPlayerAction !== 'function') return;

      const player = store.getPlayerBySocket(socket.id);
      if (!player) return;

      handler.onPlayerAction({
        minigame,
        state,
        player,
        action: payload.action,
        payload: payload.payload,
      });
      store.touch();
    });

    socket.on('disconnect', () => {
      store.handleDisconnect(socket.id);
    });
  });
}
