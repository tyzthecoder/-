import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Same idea as api/client.ts: empty in local dev (same origin via the Vite
// proxy), set to the deployed API's origin when the client is hosted
// separately (e.g. on Vercel) from the Socket.IO server.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || undefined;

/** Lazily-created singleton socket.io client shared across the app. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}
