import { useAppStore } from '../store/useAppStore';
import { fetchMe } from '../api/client';

/**
 * Re-pulls /api/auth/me and syncs the store. Used right after login/register
 * so an existing account's already-used comment quota for the month shows up
 * immediately, instead of waiting for the next full page load.
 */
export function useRefreshSession() {
  const setUser = useAppStore((s) => s.setUser);
  const setCommentsUsed = useAppStore((s) => s.setCommentsUsed);
  const setCommentQuota = useAppStore((s) => s.setCommentQuota);

  return async function refreshSession() {
    const res = await fetchMe();
    setUser(res.user);
    if (res.commentsUsedThisMonth !== undefined) setCommentsUsed(res.commentsUsedThisMonth);
    if (res.commentMonthlyLimit !== undefined) setCommentQuota(res.commentMonthlyLimit);
    return res;
  };
}
