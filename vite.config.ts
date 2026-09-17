import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Tijdens development draaien er twee processen:
 *  - de quizserver (Express + Socket.IO) op poort 3001
 *  - deze Vite dev server op poort 5173
 * De proxy hieronder stuurt alle socket- en api-verkeer door naar de quizserver.
 *
 * Voor een echte quizavond gebruik je `npm run quiz`: dan wordt de client gebouwd
 * en serveert de quizserver alles op één poort (handig voor gsm's op wifi).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
