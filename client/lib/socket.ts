import { io, type Socket } from 'socket.io-client';

/**
 * Eén socketverbinding voor de hele app.
 * In development draait de client op poort 5173 en de server op 3001; de proxy
 * in vite.config.ts zorgt dat dit zonder aanpassing werkt.
 */
export const socket: Socket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnectionDelay: 500,
  reconnectionDelayMax: 2000,
});
