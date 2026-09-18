/**
 * De enige plek waar de client de quiz-state bijhoudt.
 *
 * De server stuurt bij elke wijziging de volledige QuizState door; dit component
 * bewaart die en geeft alle schermen toegang via de `useQuiz()` hook.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { socket } from '../lib/socket';
import { storage } from '../lib/storage';
import { Events } from '../../shared/protocol.js';
import type { Player, QuizmasterJoinResult, QuizState, Role } from '../../shared/types';

interface QuizContextValue {
  /** null zolang de eerste state nog niet binnen is. */
  state: QuizState | null;
  connected: boolean;
  role: Role | null;
  /** De eigen speler (enkel gevuld wanneer je als speler meedoet). */
  me: Player | null;
  message: { kind: 'error' | 'info'; text: string } | null;
  clearMessage: () => void;
  /** Verschil tussen serverklok en eigen klok, voor het synchroon tonen van het rad. */
  serverOffset: number;
  /** Geheime data enkel voor dit toestel, uit een ronde of minigame (bv. de kaart van de deler). */
  roundPrivate: unknown;

  chooseRole: (role: Role) => void;
  leaveRole: () => void;
  joinAsPlayer: (name: string) => void;
  /** Speler meldt zich af en gaat terug naar het startscherm. */
  leaveQuiz: () => void;

  /**
   * Mag dit toestel het quizmaster-dashboard zien? Vraagt de server geen code,
   * dan is dit meteen waar zodra je de rol kiest.
   */
  quizmasterReady: boolean;
  quizmasterCodeError: string | null;
  submitQuizmasterCode: (code: string) => void;

  /** Acties van de quizmaster. */
  actions: {
    startQuiz: () => void;
    spinWheel: () => void;
    startRound: () => void;
    endRound: () => void;
    nextRound: () => void;
    resetQuiz: () => void;
    kickPlayer: (playerId: string) => void;
    /** Start een extra spel (bv. Fuck the Dealer), los van de rondevolgorde. */
    startMinigame: (type: string) => void;
    stopMinigame: () => void;
  };
  /** Rondetype-specifieke actie van een speler (voor latere rondetypes). */
  sendRoundAction: (action: string, payload?: unknown) => void;
  /** Rondetype-specifieke actie van de quizmaster. */
  sendQuizmasterRoundAction: (action: string, payload?: unknown) => void;
  /** Speler-actie binnen het lopende extra spel. */
  sendMinigameAction: (action: string, payload?: unknown) => void;
  /** Quizmaster-actie binnen het lopende extra spel. */
  sendQuizmasterMinigameAction: (action: string, payload?: unknown) => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuizState | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [role, setRole] = useState<Role | null>(() => storage.getRole());
  const [playerId, setPlayerId] = useState<string | null>(() => storage.getPlayerId());
  const [message, setMessage] = useState<QuizContextValue['message']>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [quizmasterReady, setQuizmasterReady] = useState(false);
  const [quizmasterCodeError, setQuizmasterCodeError] = useState<string | null>(null);
  const [roundPrivate, setRoundPrivate] = useState<unknown>(null);

  // In refs zodat de socket-listeners altijd de actuele waarde zien.
  const roleRef = useRef(role);
  const playerIdRef = useRef(playerId);
  roleRef.current = role;
  playerIdRef.current = playerId;

  /** Quizmaster worden, met de onthouden code (indien de server er een vraagt). */
  const claimQuizmaster = useCallback((code: string | null, showError: boolean) => {
    socket.emit(Events.QM_JOIN, { code: code ?? '' }, (result: QuizmasterJoinResult) => {
      if (result?.ok) {
        setQuizmasterReady(true);
        setQuizmasterCodeError(null);
        if (code) storage.setQuizmasterCode(code);
        return;
      }
      // Code nodig of fout: terug naar het codescherm.
      setQuizmasterReady(false);
      setQuizmasterCodeError(showError ? result?.error || 'Die code is niet juist.' : null);
      if (code) storage.setQuizmasterCode(null);
    });
  }, []);

  /** Opnieuw aanmelden na (her)verbinden, zodat een refresh niets kost. */
  const announce = useCallback(() => {
    const currentRole = roleRef.current;
    if (currentRole === 'quizmaster') {
      claimQuizmaster(storage.getQuizmasterCode(), false);
      return;
    }
    if (currentRole === 'player') {
      const name = storage.getPlayerName();
      if (name) {
        socket.emit(Events.PLAYER_JOIN, { name, playerId: playerIdRef.current });
      }
    }
  }, [claimQuizmaster]);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      announce();
    };
    const onDisconnect = () => setConnected(false);

    const onState = (next: QuizState) => {
      setState(next);
      setServerOffset(next.serverTime - Date.now());
    };

    const onError = (payload: { message?: string }) => {
      setMessage({ kind: 'error', text: payload?.message || 'Er ging iets mis.' });
    };

    const onJoined = (payload: { playerId: string; name: string }) => {
      setPlayerId(payload.playerId);
      storage.setPlayerId(payload.playerId);
      storage.setPlayerName(payload.name);
      storage.setRole('player');
      setRole('player');
      setMessage(null);
    };

    const onKicked = (payload: { message?: string }) => {
      storage.setPlayerId(null);
      storage.setRole(null);
      setPlayerId(null);
      setRole(null);
      setMessage({
        kind: 'info',
        text: payload?.message || 'Je bent uit de quiz verwijderd.',
      });
    };

    const onRoundPrivate = (payload: unknown) => setRoundPrivate(payload);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(Events.STATE, onState);
    socket.on(Events.ERROR, onError);
    socket.on(Events.JOINED, onJoined);
    socket.on(Events.KICKED, onKicked);
    socket.on(Events.ROUND_PRIVATE, onRoundPrivate);

    if (socket.connected) announce();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(Events.STATE, onState);
      socket.off(Events.ERROR, onError);
      socket.off(Events.JOINED, onJoined);
      socket.off(Events.KICKED, onKicked);
      socket.off(Events.ROUND_PRIVATE, onRoundPrivate);
    };
  }, [announce]);

  const chooseRole = useCallback(
    (next: Role) => {
      setRole(next);
      storage.setRole(next);
      setMessage(null);
      if (next === 'quizmaster') {
        setQuizmasterCodeError(null);
        claimQuizmaster(storage.getQuizmasterCode(), false);
      }
    },
    [claimQuizmaster],
  );

  const submitQuizmasterCode = useCallback(
    (code: string) => {
      claimQuizmaster(code.trim(), true);
    },
    [claimQuizmaster],
  );

  const leaveRole = useCallback(() => {
    setRole(null);
    storage.setRole(null);
    setMessage(null);
    setQuizmasterReady(false);
    setQuizmasterCodeError(null);
  }, []);

  const joinAsPlayer = useCallback((name: string) => {
    storage.setPlayerName(name);
    socket.emit(Events.PLAYER_JOIN, { name, playerId: playerIdRef.current });
  }, []);

  const leaveQuiz = useCallback(() => {
    storage.setPlayerId(null);
    storage.setRole(null);
    setPlayerId(null);
    setRole(null);
    setMessage(null);
    // Even opnieuw verbinden: de server weet dan dat deze speler weg is.
    socket.disconnect();
    socket.connect();
  }, []);

  const actions = useMemo(
    () => ({
      startQuiz: () => socket.emit(Events.QM_START_QUIZ),
      spinWheel: () => socket.emit(Events.QM_SPIN_WHEEL),
      startRound: () => socket.emit(Events.QM_START_ROUND),
      endRound: () => socket.emit(Events.QM_END_ROUND),
      nextRound: () => socket.emit(Events.QM_NEXT_ROUND),
      resetQuiz: () => socket.emit(Events.QM_RESET),
      kickPlayer: (id: string) => socket.emit(Events.QM_KICK_PLAYER, { playerId: id }),
      startMinigame: (type: string) => socket.emit(Events.QM_START_MINIGAME, { type }),
      stopMinigame: () => socket.emit(Events.QM_STOP_MINIGAME),
    }),
    [],
  );

  const sendRoundAction = useCallback((action: string, payload?: unknown) => {
    socket.emit(Events.ROUND_ACTION, { action, payload });
  }, []);

  const sendQuizmasterRoundAction = useCallback((action: string, payload?: unknown) => {
    socket.emit(Events.QM_ROUND_ACTION, { action, payload });
  }, []);

  const sendMinigameAction = useCallback((action: string, payload?: unknown) => {
    socket.emit(Events.MINIGAME_ACTION, { action, payload });
  }, []);

  const sendQuizmasterMinigameAction = useCallback((action: string, payload?: unknown) => {
    socket.emit(Events.QM_MINIGAME_ACTION, { action, payload });
  }, []);

  const me = useMemo(() => {
    if (!state || !playerId) return null;
    return state.players.find((player) => player.id === playerId) || null;
  }, [state, playerId]);

  const value = useMemo<QuizContextValue>(
    () => ({
      state,
      connected,
      role,
      me,
      message,
      clearMessage: () => setMessage(null),
      serverOffset,
      roundPrivate,
      chooseRole,
      leaveRole,
      joinAsPlayer,
      leaveQuiz,
      quizmasterReady,
      quizmasterCodeError,
      submitQuizmasterCode,
      actions,
      sendRoundAction,
      sendQuizmasterRoundAction,
      sendMinigameAction,
      sendQuizmasterMinigameAction,
    }),
    [
      state,
      connected,
      role,
      me,
      message,
      serverOffset,
      roundPrivate,
      chooseRole,
      leaveRole,
      joinAsPlayer,
      leaveQuiz,
      quizmasterReady,
      quizmasterCodeError,
      submitQuizmasterCode,
      actions,
      sendRoundAction,
      sendQuizmasterRoundAction,
      sendMinigameAction,
      sendQuizmasterMinigameAction,
    ],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz(): QuizContextValue {
  const value = useContext(QuizContext);
  if (!value) throw new Error('useQuiz moet binnen <QuizProvider> gebruikt worden.');
  return value;
}
