'use client';

import { useEffect, useState } from 'react';

// Single lever in the console row. Pure-CSS animation: the
// shaft+grip slide DOWN the track when the admin clicks ("pulling
// it down" — slot-machine / circuit-breaker metaphor), linger at
// the bottom long enough for the eye to register, then snap back
// up to ready. The actual onPull side-effect fires as soon as the
// pulled class lands so the underlying API call and the visual
// feel simultaneous.
//
// Visual anatomy (top to bottom):
//   - faceplate: dark warm-charcoal panel the lever sits in, with
//     inset shadow so it reads as recessed into the console
//   - top cap: brass slot at the top where the shaft enters from;
//     stays fixed while the shaft moves below it
//   - track: thin vertical channel running down the bay with
//     position ticks on either side
//   - shaft+grip: the moving group. Translates Y from 0 (idle,
//     grip near the top) to ~80px (engaged, grip near the bottom)
//   - label slot: name + cohort count, set into the faceplate
//     below the bay so the lever's full motion isn't blocked

interface LeverProps {
  /** Short label, e.g. "JD REMINDER". Rendered uppercase. */
  name: string;
  /** Live count of recipients. Renders as "×N" inside the slot. */
  count: number;
  /** True while the API call is in flight after the pull. The
   *  visual stays engaged until pulling flips back to false. */
  pulling: boolean;
  /** Disabled when count===0 or while a sibling lever is firing. */
  disabled?: boolean;
  onPull: () => void;
  /** Optional small caption below the count, e.g. "no pending JDs". */
  hint?: string | null;
  /** Tone — used for the grip color so different levers can be
   *  distinguished at a glance once we have more than one. */
  tone?: 'copper' | 'amber' | 'rose';
}

const TONE_GRIP: Record<NonNullable<LeverProps['tone']>, string> = {
  copper:
    'radial-gradient(circle at 30% 25%, #f4a373 0%, #d4794a 40%, #8c4a2c 90%)',
  amber:
    'radial-gradient(circle at 30% 25%, #fde68a 0%, #f59e0b 40%, #92400e 90%)',
  rose:
    'radial-gradient(circle at 30% 25%, #fda4af 0%, #e11d48 40%, #881337 90%)',
};

export default function Lever({
  name,
  count,
  pulling,
  disabled,
  onPull,
  hint,
  tone = 'copper',
}: LeverProps) {
  const [engaged, setEngaged] = useState(false);

  // When the parent flips `pulling` true (request in flight), drive
  // the engaged class. When the parent flips it back (response /
  // error), snap to upright. Local engaged state also fires from a
  // click for the case where the parent needs a tick to react.
  useEffect(() => {
    if (pulling) setEngaged(true);
    else {
      const t = setTimeout(() => setEngaged(false), 200);
      return () => clearTimeout(t);
    }
  }, [pulling]);

  const handleClick = () => {
    if (disabled || pulling) return;
    setEngaged(true);
    onPull();
    // Safety net: if pulling never flips on (shouldn't happen but
    // keeps the visual sane if onPull errors synchronously), reset
    // after a beat.
    setTimeout(() => setEngaged((prev) => (pulling ? prev : false)), 700);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pulling}
      aria-label={`Pull ${name} lever`}
      aria-pressed={engaged}
      className="group/lever relative inline-flex flex-col items-center select-none focus:outline-none disabled:cursor-not-allowed"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Faceplate — the recessed bay each lever sits in. */}
      <div
        className="relative rounded-2xl px-5 pt-4 pb-3 transition-transform duration-200 group-hover/lever:scale-[1.015] group-active/lever:scale-[0.985] disabled:group-hover/lever:scale-100"
        style={{
          width: 140,
          height: 240,
          background:
            'linear-gradient(180deg, #2a1812 0%, #1c100b 55%, #14090a 100%)',
          boxShadow:
            'inset 0 2px 6px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.04), 0 8px 22px -10px rgba(0,0,0,0.6)',
        }}
      >
        {/* Brass pivot cap at the top of the bay. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-10 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #f5d27e 0%, #c08e3c 50%, #6b4a1a 90%)',
            boxShadow:
              '0 2px 4px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.4)',
          }}
        >
          {/* Center pin */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ background: 'radial-gradient(circle, #2a1812 0%, #050304 100%)' }}
          />
        </div>

        {/* Shaft + grip group. Translates down when engaged so the
            grip slides toward the bottom of the bay — vertical
            "pulling it down" motion (slot-machine / breaker
            metaphor) instead of a sideways tilt. The shaft itself
            stays oriented vertically; only its Y offset changes. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 28,
            width: 12,
            height: 110,
            transform: engaged ? 'translateY(60px)' : 'translateY(0)',
            transition: 'transform 360ms cubic-bezier(0.5, 1.6, 0.4, 1)',
            background:
              'linear-gradient(90deg, #6b4a1a 0%, #c08e3c 35%, #f5d27e 50%, #c08e3c 65%, #6b4a1a 100%)',
            borderRadius: 6,
            boxShadow:
              '0 2px 6px rgba(0,0,0,0.5), inset 0 0 1px rgba(255,255,255,0.25)',
          }}
        >
          {/* Grip ball at the bottom of the shaft. Squashes
              vertically a touch when engaged so the pull lands
              with a tactile beat. */}
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: -18,
              width: 38,
              height: 38,
              background: TONE_GRIP[tone],
              boxShadow:
                '0 4px 8px rgba(0,0,0,0.55), inset 0 2px 2px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.4)',
              transition: 'transform 360ms cubic-bezier(0.5, 1.6, 0.4, 1), box-shadow 300ms ease, filter 300ms ease',
              transform: engaged ? 'scaleY(0.9) scaleX(1.05)' : 'scale(1)',
              filter: pulling ? 'brightness(1.15)' : 'brightness(1)',
            }}
          />
        </div>

        {/* Slot indicator marks — subtle ticks on the side that
            reinforce "this thing moves on a track" without being
            visually heavy. */}
        <div
          aria-hidden="true"
          className="absolute left-3 top-16 bottom-20 flex flex-col justify-between"
        >
          <span className="block w-2 h-px bg-white/12" />
          <span className="block w-2 h-px bg-white/12" />
          <span className="block w-2 h-px bg-white/12" />
        </div>
        <div
          aria-hidden="true"
          className="absolute right-3 top-16 bottom-20 flex flex-col justify-between"
        >
          <span className="block w-2 h-px bg-white/12" />
          <span className="block w-2 h-px bg-white/12" />
          <span className="block w-2 h-px bg-white/12" />
        </div>

        {/* Engraved-style label panel pinned to the bottom of the
            bay. The number to the right of the name reads as a
            cohort badge. */}
        <div className="absolute left-3 right-3 bottom-3 rounded-md bg-black/40 px-2 py-1.5 ring-1 ring-white/8 text-center">
          <p
            className="text-[9px] font-semibold tracking-[0.22em] uppercase text-amber-200/85"
          >
            {name}
          </p>
          <p
            className={`mt-0.5 text-[15px] font-bold tabular-nums ${
              count > 0 ? 'text-white' : 'text-white/35'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ×{count}
          </p>
        </div>

        {/* Pull hint — sits above the bay, fading in on hover. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.22em] text-amber-200/0 group-hover/lever:text-amber-200/80 transition-colors"
        >
          Pull
        </span>
      </div>

      {hint && (
        <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
          {hint}
        </p>
      )}
    </button>
  );
}
