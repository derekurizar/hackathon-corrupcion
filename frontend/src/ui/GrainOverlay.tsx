/**
 * Fixed full-viewport film-grain overlay.
 * - position:fixed, pointer-events:none, mix-blend-mode:overlay (in CSS)
 * - drift is a transform-only keyframe animation (no layout props)
 * - prefers-reduced-motion: drift stops, texture stays visible (see tokens.css)
 */
export function GrainOverlay() {
  return <div className="grain-overlay" aria-hidden="true" />;
}
