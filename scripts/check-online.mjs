/**
 * Controleert een online gezette quiz (bv. op Render).
 *
 * Gebruik:
 *   npm run check:online -- https://pubquiz-xxxx.onrender.com
 *
 * Het script kijkt na of de dienst antwoordt, of de realtime verbinding werkt,
 * of de QR-code naar het publieke adres verwijst, of de quizmastercode gevraagd
 * wordt en of spelers zonder code kunnen meedoen. Er wordt niets gewijzigd aan
 * een lopende quiz: de testspeler meldt zich meteen weer af.
 */

import { io } from 'socket.io-client';
import { Events } from '../shared/protocol.js';

const target = (process.argv[2] || '').replace(/\/+$/, '');
if (!target) {
  console.error('Geef het adres mee, bv: npm run check:online -- https://pubquiz-xxxx.onrender.com');
  process.exit(1);
}

const failures = [];

function check(ok, label) {
  console.log(`  ${ok ? 'ok  ' : 'FOUT'} ${label}`);
  if (!ok) failures.push(label);
}

function ask(socket, event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
    setTimeout(() => resolve(null), 6000);
  });
}

console.log(`\nControle van ${target}\n`);

// ------------------------------------------------------------------ http
console.log('1. Bereikbaarheid');
const start = Date.now();
let health;
try {
  const response = await fetch(`${target}/api/health`);
  health = await response.json();
} catch (error) {
  console.log(`  FOUT dienst niet bereikbaar: ${error.message}`);
  process.exit(1);
}
const seconds = ((Date.now() - start) / 1000).toFixed(1);
check(health?.ok === true, `dienst antwoordt (${seconds}s, fase: ${health?.phase})`);
if (Number(seconds) > 10) {
  console.log('       (dat was een koude start: de gratis dienst lag in slaapstand)');
}

const page = await fetch(`${target}/`);
const html = await page.text();
check(page.ok && html.includes('<div id="root">'), 'de webapp wordt geserveerd');

console.log('\n2. Deelname-adres en QR');
const joinInfo = await (await fetch(`${target}/api/join-info`)).json();
const first = joinInfo?.addresses?.[0];
check(first?.url?.startsWith(target), `QR wijst naar het publieke adres (${first?.url})`);
check(Boolean(first?.qr), 'QR-afbeelding wordt gegenereerd');

// --------------------------------------------------------------- realtime
console.log('\n3. Realtime verbinding');
const socket = io(target, { transports: ['websocket'] });
let state;
try {
  state = await new Promise((resolve, reject) => {
    socket.on(Events.STATE, resolve);
    socket.on('connect_error', (error) => reject(new Error(error.message)));
    setTimeout(() => reject(new Error('geen antwoord binnen 20 seconden')), 20000);
  });
} catch (error) {
  check(false, `websocketverbinding mislukt: ${error.message}`);
  console.log(`\n${failures.length} FOUT(EN)\n`);
  process.exit(1);
}
check(true, 'websocketverbinding werkt');
check(
  state.rounds.length > 0 && state.drinks.length > 0,
  `quiz geladen: "${state.quiz.name}", ${state.rounds.length} rondes, ${state.drinks.length} dranken`,
);

// ------------------------------------------------------------ beveiliging
console.log('\n4. Quizmastercode');
check(state.quizmasterCodeRequired === true, 'de server vraagt een quizmastercode');

const zonderCode = await ask(socket, Events.QM_JOIN, {});
check(zonderCode?.ok === false, `zonder code geen dashboard (${zonderCode?.error || 'geen antwoord'})`);

const foutieveCode = await ask(socket, Events.QM_JOIN, { code: 'zomaar-proberen' });
check(foutieveCode?.ok === false, `verkeerde code geweigerd (${foutieveCode?.error || 'geen antwoord'})`);

// ---------------------------------------------------------------- speler
console.log('\n5. Spelers kunnen meedoen (zonder code)');
const spelers = state.players.length;
const player = io(target, { transports: ['websocket'] });
await new Promise((resolve) => player.on('connect', resolve));
const joined = await new Promise((resolve) => {
  player.on(Events.JOINED, resolve);
  player.on(Events.ERROR, () => resolve(null));
  player.emit(Events.PLAYER_JOIN, { name: 'Controle' });
  setTimeout(() => resolve(null), 8000);
});
check(Boolean(joined), joined ? `testspeler "${joined.name}" is binnen` : 'testspeler kon niet meedoen');

player.disconnect();
const after = await new Promise((resolve) => {
  socket.once(Events.STATE, resolve);
  setTimeout(() => resolve(null), 6000);
});
if (after) {
  check(after.players.length === spelers, `testspeler netjes weer weg (${after.players.length} speler(s) over)`);
}

console.log(`\n${failures.length === 0 ? 'ALLES OK - de quiz staat klaar online.' : `${failures.length} FOUT(EN): ${failures.join(' / ')}`}\n`);

socket.disconnect();
process.exit(failures.length === 0 ? 0 : 1);
