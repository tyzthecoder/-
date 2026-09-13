import { useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { depthProgress } from '../content/depth';
import { computeTheme, applyThemeToDocument } from '../content/palette';
import { audioEngine } from '../audio/AudioEngine';

/** Keeps the document's CSS theme variables and the audio mix in sync with scroll depth. */
export function useDepthTheme() {
  const depthIndex = useAppStore((s) => s.depthIndex);
  const depth = useMemo(() => depthProgress(depthIndex), [depthIndex]);

  useEffect(() => {
    const theme = computeTheme(depth);
    applyThemeToDocument(theme);
    audioEngine.setDepth(depth);
  }, [depth]);

  return depth;
}
