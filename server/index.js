/**
 * De quizserver.
 *
 *  - houdt de volledige quiz-state bij (server is de baas)
 *  - stuurt wijzigingen realtime naar quizmaster en spelers (Socket.IO)
 *  - serveert de gebouwde webapp (na `npm run build`)
 *
 * Starten:
 *   npm run dev    -> server + Vite dev server (twee poorten, hot reload)
 *   npm run quiz   -> bouwt de app en serveert alles op een poort (quizavond)
 */

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';

import { createQuizStore } from './quizStore.js';
import { attachSocketHandlers } from './socket.js';
import { getJoinUrls, createQrDataUrl } from './network.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const PORT = Number(process.env.PORT) || 3001;

const app = express();
// Achter de proxy van een hostingdienst (bv. Render) klopt het protocol enkel
// als we die proxy vertrouwen.
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
  // Nodig zodat de Vite dev server (andere poort) mag verbinden.
  cors: { origin: true, credentials: true },
});

const store = createQuizStore();
attachSocketHandlers(io, store);

/**
 * Adressen + QR-codes voor spelers.
 *
 * Draait de app op een publiek adres (online gehost of via een tunnel), dan is
 * dat adres het juiste: spelers hebben dan geen wifi van de quizmaster nodig.
 * Enkel wanneer de quizmaster de app op localhost heeft staan, hebben we de
 * netwerkadressen van deze computer nodig; de client geeft dan mee op welke
 * poort hij draait.
 */
app.get('/api/join-info', async (req, res) => {
  const host = String(req.headers.host || '');
  const hostname = host.replace(/:\d+$/, '').toLowerCase();
  const isLocal = hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

  let urls;
  if (isLocal) {
    const port = Number(req.query.port) || PORT;
    urls = getJoinUrls(port);
  } else {
    // Achter een proxy (hosting, tunnel) staat het echte protocol in de header.
    const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwarded || req.protocol || 'http';
    urls = [`${protocol}://${host}/`];
  }

  const addresses = await Promise.all(
    urls.map(async (url) => ({ url, qr: await createQrDataUrl(url) })),
  );
  res.json({ addresses });
});

app.get('/api/health', (_req, res) => {
  const state = store.getState();
  res.json({ ok: true, phase: state.phase, players: state.players.length });
});

// De gebouwde app serveren (bestaat pas na `npm run build`).
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        '<h1>Quizserver draait</h1>' +
          '<p>De webapp is nog niet gebouwd. Gebruik <code>npm run dev</code> ' +
          'en open de Vite-URL, of <code>npm run quiz</code> om alles op deze poort te serveren.</p>',
      );
  });
}

server.listen(PORT, '0.0.0.0', () => {
  const urls = getJoinUrls(PORT);
  console.log('');
  console.log('  🍻  Pubquiz-server draait');
  console.log(`      lokaal   : http://localhost:${PORT}/`);
  for (const url of urls) {
    console.log(`      netwerk  : ${url}`);
  }
  if (!fs.existsSync(distDir)) {
    console.log('');
    console.log('      Nog niets gebouwd: gebruik `npm run dev` (development)');
    console.log('      of `npm run quiz` (quizavond, alles op een poort).');
  }
  console.log('');
});
