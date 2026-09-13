import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** Lazily-created singleton socket.io client shared across the app. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}
