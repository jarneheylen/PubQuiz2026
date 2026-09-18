/**
 * Doorloopt de volledige quiz via sockets en controleert elke overgang.
 * Gebruik: node flow-test.mjs   (server moet draaien op 3001)
 */
import { io } from 'socket.io-client';
import { Events } from '../shared/protocol.js';

const URL = 'http://localhost:3001';
const failures = [];
const log = (...args) => console.log(...args);

/** Laatst ontvangen state per socket, zodat wachten ook werkt als we er al zijn. */
const latest = new Map();

function connect(name) {
  return new Promise((resolve) => {
    const socket = io(URL, { transports: ['websocket'] });
    socket.on(Events.STATE, (state) => latest.set(socket, state));
    socket.on('connect', () => resolve(socket));
    socket.on(Events.ERROR, (payload) => log(`  [${name}] fout van server: ${payload.message}`));
  });
}

/** Wacht tot de state aan een voorwaarde voldoet (met timeout). */
function waitFor(socket, predicate, label, timeoutMs = 12000) {
  const known = latest.get(socket);
  if (known && predicate(known)) return Promise.resolve(known);

  return new Promise((resolve, reject) => {
    const check = (state) => {
      if (predicate(state)) {
        socket.off(Events.STATE, check);
        clearTimeout(timer);
        resolve(state);
      }
    };
    const timer = setTimeout(() => {
      socket.off(Events.STATE, check);
      reject(new Error(`timeout bij: ${label}`));
    }, timeoutMs);
    socket.on(Events.STATE, check);
  });
}

function expect(condition, label) {
  if (condition) {
    log(`  ok   ${label}`);
  } else {
    failures.push(label);
    log(`  FOUT ${label}`);
  }
}

const quizmasterCode = process.env.QUIZMASTER_CODE || '';

const qm = await connect('quizmaster');
const qmJoin = await new Promise((resolve) => {
  qm.emit(Events.QM_JOIN, { code: quizmasterCode }, resolve);
  setTimeout(() => resolve({ ok: false, error: 'geen antwoord' }), 4000);
});
if (!qmJoin.ok) {
  log(`Kan geen quizmaster worden: ${qmJoin.error}`);
  log('Draait de server met een QUIZMASTER_CODE? Zet die dan ook in deze omgeving.');
  process.exit(1);
}

// Met een code ingesteld mag een verkeerde code er niet door.
if (quizmasterCode) {
  const indringer = await connect('indringer');
  const poging = await new Promise((resolve) => {
    indringer.emit(Events.QM_JOIN, { code: 'fout-fout-fout' }, resolve);
    setTimeout(() => resolve({ ok: true, error: 'geen antwoord' }), 4000);
  });
  expect(!poging.ok, 'verkeerde quizmastercode wordt geweigerd');
  indringer.disconnect();
}

// Twee spelers uit de vaste gastenlijst laten binnenkomen.
const NAAM1 = 'Yentl Stroobants';
const NAAM2 = 'Franc Balliu';
const p1 = await connect('speler1');
p1.emit(Events.PLAYER_JOIN, { name: NAAM1 });
const p2 = await connect('speler2');
p2.emit(Events.PLAYER_JOIN, { name: NAAM2 });

// Een naam die al bezet is (ook met andere hoofdletters) moet geweigerd worden.
const p3 = await connect('speler3');
const duplicatePromise = new Promise((resolve) => {
  p3.once(Events.ERROR, () => resolve(true));
  setTimeout(() => resolve(false), 3000);
});
p3.emit(Events.PLAYER_JOIN, { name: NAAM1.toLowerCase() });

// Een naam die niet op de vaste lijst staat moet geweigerd worden.
const p4 = await connect('speler4');
const onbekendePromise = new Promise((resolve) => {
  p4.once(Events.ERROR, () => resolve(true));
  setTimeout(() => resolve(false), 3000);
});
p4.emit(Events.PLAYER_JOIN, { name: 'Iemand Onbekend' });

log('\n1. Lobby');
qm.emit(Events.QM_RESET, { keepPlayers: true });
let state = await waitFor(
  qm,
  (s) => s.phase === 'lobby' && s.players.filter((p) => p.connected).length >= 2,
  'lobby met spelers',
);
expect(state.status === 'Quiz klaar om te starten', `status: "${state.status}"`);
expect(state.players.length === 8, `vaste gastenlijst van 8 spelers (${state.players.length})`);
expect(await duplicatePromise, 'al bezette naam wordt geweigerd');
expect(await onbekendePromise, 'naam buiten de vaste lijst wordt geweigerd');
log(`  aangemeld: ${state.players.filter((p) => p.connected).map((p) => p.name).join(', ')}`);

log('\n2. Quiz starten');
qm.emit(Events.QM_START_QUIZ);
state = await waitFor(qm, (s) => s.phase === 'round_intro', 'ronde 1 intro');
expect(state.currentRound.number === 1, 'ronde 1 is actief');
expect(state.wheel.status === 'idle', 'rad staat klaar (idle)');

// Ronde starten zonder rad te draaien moet geweigerd worden.
let refusedWithoutSpin = false;
const onError = (payload) => {
  if (/rad/i.test(payload.message)) refusedWithoutSpin = true;
};
qm.on(Events.ERROR, onError);
qm.emit(Events.QM_START_ROUND);
await new Promise((r) => setTimeout(r, 300));
expect(refusedWithoutSpin, 'ronde starten zonder rad wordt geweigerd');
qm.off(Events.ERROR, onError);

const totalRounds = state.rounds.length;

for (let round = 1; round <= totalRounds; round += 1) {
  log(`\n3.${round} Ronde ${round}`);
  state = await waitFor(qm, (s) => s.phase === 'round_intro' && s.currentRound.number === round, `intro ronde ${round}`);
  log(`  thema: ${state.currentRound.theme}`);

  qm.emit(Events.QM_SPIN_WHEEL);
  state = await waitFor(qm, (s) => s.wheel.status === 'spinning', 'rad draait');
  const spinStart = Date.now();
  state = await waitFor(qm, (s) => s.wheel.status === 'result', 'rad geeft resultaat');
  const spinTime = Date.now() - spinStart;
  expect(spinTime > 5000, `rad draaide ${(spinTime / 1000).toFixed(1)}s (spanning, niet meteen)`);
  expect(!!state.wheel.result, `drank gekozen: ${state.wheel.result?.drinkName}`);
  expect(
    state.currentRound.wheelResult?.drinkId === state.wheel.result?.drinkId,
    'drank staat bij de ronde opgeslagen',
  );

  qm.emit(Events.QM_START_ROUND);
  state = await waitFor(qm, (s) => s.phase === 'round_active', 'ronde actief');
  expect(state.status === `Ronde ${round} actief`, `status: "${state.status}"`);

  qm.emit(Events.QM_END_ROUND);
  state = await waitFor(qm, (s) => s.phase === 'round_ended', 'ronde afgelopen');
  expect(state.status === `Ronde ${round} afgelopen`, `status: "${state.status}"`);

  qm.emit(Events.QM_NEXT_ROUND);
  if (round < totalRounds) {
    await waitFor(qm, (s) => s.phase === 'round_intro' && s.currentRound.number === round + 1, 'volgende ronde');
  }
}

log('\n4. Einde');
state = await waitFor(qm, (s) => s.phase === 'quiz_finished', 'quiz afgelopen');
expect(state.status === 'Quiz afgelopen', `status: "${state.status}"`);
expect(
  state.rounds.every((r) => r.status === 'ended' && r.wheelResult),
  'alle rondes afgerond met een drank',
);
log('  ' + state.rounds.map((r) => `${r.number}:${r.wheelResult.drinkName}`).join(' | '));

log('\n5. Spelers mogen niets besturen');
let playerBlocked = false;
p1.on(Events.ERROR, (payload) => {
  if (/quizmaster/i.test(payload.message)) playerBlocked = true;
});
p1.emit(Events.QM_RESET, {});
p1.emit(Events.QM_START_QUIZ);
await new Promise((r) => setTimeout(r, 400));
expect(playerBlocked, 'speler kan de quiz niet besturen');
state = await new Promise((resolve) => {
  qm.once(Events.STATE, resolve);
  qm.emit(Events.QM_KICK_PLAYER, { playerId: 'bestaat-niet' });
  setTimeout(() => resolve(state), 500);
});
expect(state.phase === 'quiz_finished', 'quiz staat nog op afgelopen (speler kon niets wijzigen)');

log('\n6. Nieuwe quiz');
qm.emit(Events.QM_RESET, { keepPlayers: true });
state = await waitFor(qm, (s) => s.phase === 'lobby', 'terug in lobby');
expect(
  state.players.filter((p) => p.connected).length >= 2,
  'spelers blijven verbonden na reset (vaste lijst, geen nieuwe aanmelding nodig)',
);
expect(state.rounds.every((r) => r.status === 'pending' && !r.wheelResult), 'rondes zijn gereset');

log('\n7. Speler verlaat de lobby');
const beforeConnected = state.players.filter((p) => p.connected).length;
p2.disconnect();
state = await waitFor(
  qm,
  (s) => s.players.filter((p) => p.connected).length === beforeConnected - 1,
  'speler valt weg uit de lobby',
);
expect(
  state.players.some((p) => p.name === NAAM2 && !p.connected),
  `${NAAM2} blijft op de vaste lijst staan, enkel niet meer verbonden`,
);

log(`\n${failures.length === 0 ? 'ALLES OK' : `${failures.length} FOUT(EN): ${failures.join(' / ')}`}`);

qm.disconnect();
p1.disconnect();
p3.disconnect();
p4.disconnect();
process.exit(failures.length === 0 ? 0 : 1);
