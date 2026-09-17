/**
 * Ontwikkelen in EEN proces en op EEN poort.
 *
 *  - bouwt de client en blijft daarna naar wijzigingen kijken (herbouwt zelf)
 *  - start de quizserver, die de gebouwde app en de sockets serveert
 *
 * Handig omdat alles (quizmaster, spelers, sockets) via hetzelfde adres loopt:
 * http://localhost:3001/ . Na een wijziging in de client: pagina verversen.
 *
 * Wil je hot reload tijdens UI-werk, gebruik dan `npm run dev:hot` (Vite op
 * 5173 met een proxy naar de server op 3001).
 */

import { build } from 'vite';

console.log('Client bouwen...');

const watcher = await build({
  build: { watch: {} },
  logLevel: 'warn',
});

// Wachten tot de eerste build klaar is, zodat de server meteen iets te serveren heeft.
await new Promise((resolve) => {
  if (!watcher || typeof watcher.on !== 'function') {
    resolve();
    return;
  }
  watcher.on('event', (event) => {
    if (event.code === 'END' || event.code === 'ERROR') resolve();
  });
});

console.log('Client gebouwd. Server starten...');
console.log('(client wordt bij elke wijziging opnieuw gebouwd - pagina verversen volstaat)');

await import('../server/index.js');
