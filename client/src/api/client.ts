// Thin fetch wrapper. Handles the CSRF double-submit-cookie handshake
// transparently: we cache the token from the last response that included
// one, and attach it to every mutating request. The session cookie itself
// is httpOnly and travels automatically via `credentials: 'include'`.

// In local dev, Vite's dev-server proxy (vite.config.ts) forwards relative
// `/api` paths to the backend, so API_BASE is empty. Once the client is
// deployed on its own (e.g. a static build on Vercel) there's no proxy, so
// VITE_API_URL must point at the deployed API's origin.
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let csrfToken: string | null = null;

export function getCachedCsrfToken() {
  return csrfToken;
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const isMutating = method !== 'GET';

  if (isMutating) {
    await ensureCsrfToken();
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (isMutating && csrfToken) headers['x-csrf-token'] = csrfToken;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (data && typeof data.csrfToken === 'string') {
    csrfToken = data.csrfToken;
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

// --- Typed convenience calls -----------------------------------------------

export interface PublicUser {
  id: number;
  username: string;
  isMod: boolean;
  isVerified: boolean;
  seed: string;
  createdAt: string;
}

export function fetchMe() {
  return apiFetch<{
    user: PublicUser | null;
    csrfToken?: string;
    commentsUsedThisMonth?: number;
    commentMonthlyLimit?: number;
  }>('/api/auth/me');
}

export function register(username: string, email: string, password: string) {
  return apiFetch<{ user: PublicUser; csrfToken: string }>('/api/auth/register', {
    method: 'POST',
    body: { username, email, password },
  });
}

export function login(identifier: string, password: string) {
  return apiFetch<{ user: PublicUser; csrfToken: string }>('/api/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export async function logout() {
  try {
    return await apiFetch<{ ok: true }>('/api/auth/logout', { method: 'POST' });
  } finally {
    // Clear *after* the call: logout needs the still-valid pre-logout token
    // to authenticate itself. Clearing afterward forces the next mutating
    // request (e.g. a subsequent login) to fetch a fresh token bound to
    // whatever new (likely anonymous) session comes next, instead of
    // replaying one tied to the session we just destroyed.
    csrfToken = null;
  }
}

export interface Rarity {
  id: string;
  label: string;
  color: string;
  ratio: number;
  discoverCount: number;
  totalUsers: number;
}

export function discoverPortal(templateId: string, tone: string, depthIndex: number) {
  return apiFetch<{ isNewDiscovery: boolean; rarity: Rarity }>(`/api/portals/${templateId}/discover`, {
    method: 'POST',
    body: { tone, depthIndex },
  });
}

export interface CommentDTO {
  id: number;
  body: string;
  created_at: string;
  username: string;
}

export function getComments(templateId: string) {
  return apiFetch<{ comments: CommentDTO[] }>(`/api/portals/${templateId}/comments`);
}

export function postComment(templateId: string, body: string) {
  return apiFetch<{ comment: CommentDTO; commentsUsedThisMonth: number; commentsRemaining: number }>(
    `/api/portals/${templateId}/comments`,
    { method: 'POST', body: { body } }
  );
}

export function reportComment(commentId: number, reason?: string) {
  return apiFetch<{ ok: true }>(`/api/comments/${commentId}/report`, {
    method: 'POST',
    body: { reason },
  });
}

export function sendHeartbeat(seconds: number, depthIndex: number) {
  return apiFetch<{ stats: { total_seconds: number; max_depth_index: number } }>('/api/session/heartbeat', {
    method: 'POST',
    body: { seconds, depthIndex },
  });
}

export interface LeaderboardRow {
  username: string;
  total_seconds: number;
  max_depth_index: number;
}

export function getLeaderboard(kind: 'dive-time' | 'depth') {
  return apiFetch<{ leaderboard: LeaderboardRow[] }>(`/api/leaderboard/${kind}`);
}

export interface Badge {
  templateId: string;
  tone: string;
  depthIndex: number;
  discoveredAt: string;
  rarity: Rarity;
}

export interface Profile {
  username: string;
  createdAt: string;
  totalSeconds: number;
  maxDepthIndex: number;
  badgeCount: number;
  badges: Badge[];
}

export function getProfile(username: string) {
  return apiFetch<{ profile: Profile }>(`/api/profile/${username}`);
}
