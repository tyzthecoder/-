/** A subtle darkening at the screen edges that only appears once you've scrolled deep — reinforces the "eerie" turn without any extra JS per frame (pure CSS var). */
export function Vignette() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-1000"
      style={{
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 140%)',
        opacity: 'var(--signal-vignette)',
      }}
    />
  );
}
