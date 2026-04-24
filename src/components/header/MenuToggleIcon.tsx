'use client';

/**
 * Animated hamburger ↔ X toggle. Three rounded <line> elements:
 *
 *   closed  (hamburger)      open  (X)
 *   ─                        ╲
 *   ─             →           ╳
 *   ─                        ╱
 *
 * On open, the top line rotates 45° about the icon center, the
 * bottom line rotates -45°, and the middle line fades to zero
 * opacity with a quick scale-down on its horizontal axis. On close,
 * everything reverses. All three animate on the same eased curve so
 * the motion reads as one gesture rather than three separate bars.
 */
export default function MenuToggleIcon({ open }: { open: boolean }) {
  const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
  const duration = '360ms';
  // Each line uses transform-box: fill-box so the transform-origin
  // resolves against its own geometry — letting us rotate each bar
  // about the center of the icon (12, 12 in our 24x24 viewBox).
  const common: React.CSSProperties = {
    stroke: 'currentColor',
    strokeWidth: 2.5,
    strokeLinecap: 'round',
    transition: `transform ${duration} ${EASE}, opacity ${duration} ${EASE}`,
    transformOrigin: '12px 12px',
  };
  return (
    <svg
      className="w-6 h-6 overflow-visible"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Lines run from x=3 to x=21 (slightly wider than the viewBox
          margins of the old 4–20 range) so the rotated diagonals of
          the open "X" reach close to the icon corners and read as a
          proper X rather than a small cross. */}
      <line
        x1={3}
        x2={21}
        y1={6}
        y2={6}
        style={{
          ...common,
          transform: open ? 'translateY(6px) rotate(45deg)' : 'translateY(0) rotate(0)',
        }}
      />
      <line
        x1={3}
        x2={21}
        y1={12}
        y2={12}
        style={{
          ...common,
          transform: open ? 'scaleX(0)' : 'scaleX(1)',
          opacity: open ? 0 : 1,
        }}
      />
      <line
        x1={3}
        x2={21}
        y1={18}
        y2={18}
        style={{
          ...common,
          transform: open ? 'translateY(-6px) rotate(-45deg)' : 'translateY(0) rotate(0)',
        }}
      />
    </svg>
  );
}
