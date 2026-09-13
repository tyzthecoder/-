import { useEffect } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { useAppStore } from '../store/useAppStore';

/**
 * Wires the generative audio engine to app state. Browsers require a user
 * gesture before audio can play, so we lazily start the engine on the first
 * interaction rather than on mount — it then keeps running for the rest of
 * the session, crossfading as depth changes.
 */
export function useAudioEngine() {
  const muted = useAppStore((s) => s.muted);

  useEffect(() => {
    const startOnGesture = () => {
      audioEngine.start();
      audioEngine.setMuted(muted);
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, startOnGesture, { once: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, startOnGesture));
    };
    // Only ever want this to attach once; `muted` is read fresh via closure
    // is fine since the listener fires once and we immediately sync below too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    audioEngine.setMuted(muted);
  }, [muted]);
}
