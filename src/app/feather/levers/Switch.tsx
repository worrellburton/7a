'use client';

import { useEffect, useState } from 'react';

// Single switch on the console row — the counterpart to Lever.tsx.
// Where a lever is a momentary brass pull (slot-machine grip
// sliding DOWN a track), a switch is a wall-switch paddle that
// flips between UP and DOWN.
//
// Behaviour: click → paddle rotates DOWN, side-effect fires, the
// paddle stays down while the action is in flight, then snaps back
// UP when the parent flips `flipping` false. Single momentary
// action — there's no persistent "on/off" state because the
// switches we ship (tournament resets, etc.) are one-shot actions
// that take effect at the moment of flip.
//
// Visual anatomy (top to bottom):
//   - faceplate: same warm-charcoal panel the lever sits in so a
//     switch + lever can share the same console row visually
//   - top + bottom labels (UP / DOWN) printed on the faceplate so
//     the paddle's two positions read as deliberate
//   - paddle: a rectangular brass tile that rotates around its
//     centre between -25deg (up) and +25deg (down). Inset shadow
//     gives it the depth of a real toggle paddle
//   - label slot at the bottom — name + one-line status

interface SwitchProps {
  /** Short label, e.g. "RESET TOURNEY". Rendered uppercase. */
  name: string;
  /** True while the action is in flight after the flip. The
   *  paddle stays DOWN until flipping flips back to false. */
  flipping: boolean;
  /** Disabled when the switch shouldn't fire (e.g. already
   *  flipping, or a sibling control is busy). */
  disabled?: boolean;
  /** Called when the admin flips the paddle. */
  onFlip: () => void;
  /** Optional small caption below the name, e.g. "ready" or
   *  "wipes brackets · matches · 🏆 tally". */
  hint?: string | null;
  /** Paddle tint — distinguishes one switch from another at a
   *  glance once we have a row of them. Defaults to amber. */
  tone?: 'amber' | 'rose' | 'copper';
}

const TONE_PADDLE: Record<NonNullable<SwitchProps['tone']>, string> = {
  amber:
    'linear-gradient(180deg, #fde68a 0%, #f59e0b 50%, #92400e 100%)',
  rose:
    'linear-gradient(180deg, #fda4af 0%, #e11d48 50%, #881337 100%)',
  copper:
    'linear-gradient(180deg, #f4a373 0%, #d4794a 50%, #8c4a2c 100%)',
};

export default function Switch({
  name,
  flipping,
  disabled,
  onFlip,
  hint,
  tone = 'amber',
}: SwitchProps) {
  const [engaged, setEngaged] = useState(false);

  // Mirror the parent's flipping state into the local engaged
  // class. When the parent flips it back, snap to upright after a
  // beat so the animation reads as deliberate.
  useEffect(() => {
    if (flipping) setEngaged(true);
    else {
      const t = setTimeout(() => setEngaged(false), 220);
      return () => clearTimeout(t);
    }
  }, [flipping]);

  const handleClick = () => {
    if (disabled || flipping) return;
    setEngaged(true);
    onFlip();
    // Safety net: if flipping never turns true (caller errored
    // synchronously), reset the paddle so the visual stays sane.
    setTimeout(() => setEngaged((prev) => (flipping ? prev : false)), 800);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || flipping}
      aria-label={`Flip ${name} switch`}
      aria-pressed={engaged}
      className="group/switch relative inline-flex flex-col items-center select-none focus:outline-none disabled:cursor-not-allowed"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Faceplate — same dimensions as the lever bay so a switch
          and a lever can sit side-by-side without one looking like
          the runt of the row. */}
      <div
        className="relative rounded-2xl px-5 pt-4 pb-3 transition-transform duration-200 group-hover/switch:scale-[1.015] group-active/switch:scale-[0.985] disabled:group-hover/switch:scale-100"
        style={{
          width: 140,
          height: 240,
          background:
            'linear-gradient(180deg, #2a1812 0%, #1c100b 55%, #14090a 100%)',
          boxShadow:
            'inset 0 2px 6px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.04), 0 8px 22px -10px rgba(0,0,0,0.6)',
        }}
      >
        {/* UP / DOWN guide labels engraved into the faceplate so
            the paddle's two positions read deliberately. */}
        <span
          aria-hidden="true"
          className={`absolute left-1/2 -translate-x-1/2 top-6 text-[9px] font-bold tracking-[0.22em] uppercase transition-colors ${engaged ? 'text-amber-200/30' : 'text-amber-200/80'}`}
        >
          Ready
        </span>
        <span
          aria-hidden="true"
          className={`absolute left-1/2 -translate-x-1/2 bottom-[88px] text-[9px] font-bold tracking-[0.22em] uppercase transition-colors ${engaged ? 'text-rose-300/85' : 'text-rose-300/25'}`}
        >
          Fire
        </span>

        {/* Brass mounting plate behind the paddle — keeps the
            switch feeling like a real hardware piece. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 rounded-md"
          style={{
            top: 64,
            width: 60,
            height: 82,
            background:
              'radial-gradient(circle at 30% 25%, #f5d27e 0%, #c08e3c 55%, #6b4a1a 95%)',
            boxShadow:
              'inset 0 2px 3px rgba(0,0,0,0.45), inset 0 -2px 3px rgba(255,255,255,0.25)',
          }}
        >
          {/* Tiny screws on the four corners of the plate */}
          {([
            { top: 3, left: 3 },
            { top: 3, right: 3 },
            { bottom: 3, left: 3 },
            { bottom: 3, right: 3 },
          ] as const).map((pos, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                ...pos,
                background: 'radial-gradient(circle, #f5d27e 0%, #6b4a1a 100%)',
              }}
            />
          ))}
        </div>

        {/* The paddle itself — pivots around its centre between
            UP (-25deg) and DOWN (+25deg) when engaged. Filter
            brightens it slightly during the action so the eye
            registers the firing beat. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 70,
            width: 44,
            height: 70,
            transformOrigin: 'center center',
            transform: engaged ? 'rotate(25deg)' : 'rotate(-25deg)',
            transition: 'transform 320ms cubic-bezier(0.45, 1.5, 0.4, 1), filter 220ms ease',
            background: TONE_PADDLE[tone],
            borderRadius: 8,
            boxShadow:
              '0 4px 10px rgba(0,0,0,0.55), inset 0 2px 2px rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.35)',
            filter: flipping ? 'brightness(1.15)' : 'brightness(1)',
          }}
        >
          {/* Grip ridges on the paddle face — three thin lines for
              tactile read-ability. */}
          <div className="absolute inset-x-3 top-3 h-px bg-black/30" />
          <div className="absolute inset-x-3 top-1/2 h-px bg-black/30" />
          <div className="absolute inset-x-3 bottom-3 h-px bg-black/30" />
        </div>

        {/* Engraved-style label panel pinned to the bottom of the
            bay. Same shape as the lever's so a console row of
            mixed switches + levers reads consistently. */}
        <div className="absolute left-3 right-3 bottom-3 rounded-md bg-black/40 px-2 py-1.5 ring-1 ring-white/8 text-center">
          <p className="text-[9px] font-semibold tracking-[0.22em] uppercase text-amber-200/85">
            {name}
          </p>
          <p
            className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${
              flipping ? 'text-rose-200' : 'text-white/70'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {flipping ? 'Firing…' : 'Ready'}
          </p>
        </div>

        {/* Hover hint — sits above the bay, fades in on hover. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.22em] text-amber-200/0 group-hover/switch:text-amber-200/80 transition-colors"
        >
          Flip
        </span>
      </div>

      {hint && (
        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/45 text-center max-w-[140px] leading-snug">
          {hint}
        </p>
      )}
    </button>
  );
}
