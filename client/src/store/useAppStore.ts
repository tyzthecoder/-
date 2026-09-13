import { create } from 'zustand';
import type { PublicUser, Rarity } from '../api/client';

export interface BadgeToast {
  id: string;
  templateId: string;
  rarity: Rarity;
}

interface AppState {
  user: PublicUser | null;
  authChecked: boolean;
  commentsUsedThisMonth: number;
  commentQuota: number;
  muted: boolean;
  reducedMotion: boolean;
  depthIndex: number;
  maxDepthReached: number;
  badgeToasts: BadgeToast[];

  setUser: (user: PublicUser | null) => void;
  setAuthChecked: (v: boolean) => void;
  setCommentsUsed: (n: number) => void;
  setCommentQuota: (n: number) => void;
  toggleMuted: () => void;
  setMuted: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setDepthIndex: (n: number) => void;
  pushBadgeToast: (toast: Omit<BadgeToast, 'id'>) => void;
  dismissBadgeToast: (id: string) => void;
}

function readStoredBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  authChecked: false,
  commentsUsedThisMonth: 0,
  commentQuota: 100,
  muted: readStoredBool('unknown_signal_muted', false),
  reducedMotion: readStoredBool('unknown_signal_reduced_motion', prefersReducedMotion()),
  depthIndex: 0,
  maxDepthReached: 0,
  badgeToasts: [],

  setUser: (user) => set({ user }),
  setAuthChecked: (v) => set({ authChecked: v }),
  setCommentsUsed: (n) => set({ commentsUsedThisMonth: n }),
  setCommentQuota: (n) => set({ commentQuota: n }),
  toggleMuted: () => {
    const next = !get().muted;
    try {
      localStorage.setItem('unknown_signal_muted', String(next));
    } catch {
      /* private browsing / storage disabled — non-fatal */
    }
    set({ muted: next });
  },
  setMuted: (v) => {
    try {
      localStorage.setItem('unknown_signal_muted', String(v));
    } catch {
      /* ignore */
    }
    set({ muted: v });
  },
  setReducedMotion: (v) => {
    try {
      localStorage.setItem('unknown_signal_reduced_motion', String(v));
    } catch {
      /* ignore */
    }
    set({ reducedMotion: v });
  },
  setDepthIndex: (n) =>
    set((state) => ({
      depthIndex: n,
      maxDepthReached: Math.max(state.maxDepthReached, n),
    })),
  pushBadgeToast: (toast) =>
    set((state) => ({
      badgeToasts: [...state.badgeToasts, { ...toast, id: `${toast.templateId}-${Date.now()}` }],
    })),
  dismissBadgeToast: (id) =>
    set((state) => ({ badgeToasts: state.badgeToasts.filter((t) => t.id !== id) })),
}));
