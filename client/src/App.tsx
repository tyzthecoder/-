import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { NavBar } from './components/Layout/NavBar';
import { Vignette } from './components/Layout/Vignette';
import { BadgeUnlockToasts } from './components/Badges/BadgeUnlockToast';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { useAppStore } from './store/useAppStore';
import { useDepthTheme } from './hooks/useDepthTheme';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useDiveHeartbeat } from './hooks/useDiveHeartbeat';
import { fetchMe } from './api/client';

export default function App() {
  const setUser = useAppStore((s) => s.setUser);
  const setAuthChecked = useAppStore((s) => s.setAuthChecked);
  const setCommentsUsed = useAppStore((s) => s.setCommentsUsed);
  const setCommentQuota = useAppStore((s) => s.setCommentQuota);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const depth = useDepthTheme();
  useAudioEngine();
  useDiveHeartbeat();

  useEffect(() => {
    fetchMe()
      .then((res) => {
        setUser(res.user);
        if (res.commentsUsedThisMonth !== undefined) setCommentsUsed(res.commentsUsedThisMonth);
        if (res.commentMonthlyLimit !== undefined) setCommentQuota(res.commentMonthlyLimit);
      })
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, [setUser, setAuthChecked, setCommentsUsed, setCommentQuota]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  return (
    <div className="min-h-screen">
      <NavBar depth={depth} />
      <Vignette />
      <BadgeUnlockToasts />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </div>
  );
}
