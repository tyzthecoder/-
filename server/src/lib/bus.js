import { EventEmitter } from 'node:events';

// Tiny in-process event bus for server-internal signaling (e.g. "the
// leaderboard changed, consider re-broadcasting"). Kept separate from the
// socket.io server instance because io.emit() only ever sends to *clients*,
// it doesn't loop back to server-side listeners.
export const bus = new EventEmitter();
