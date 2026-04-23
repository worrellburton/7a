'use client';

import { useId } from 'react';
import { EASE_OUT_QUART, useReducedMotion } from './motion';

/**
 * Seven Arrows brand mark, drawn inline as animated SVG. This is the
 * logo's graphic half: the medallion ring, the interior cross, the
 * four cardinal dots, and the seven dangling arrow/feather shapes.
 *
 * The component is purpose-built for the team-member page system, so
 * it exposes three things the page actually needs:
 *
 *  - `size`        — rendered pixel size (width = height, the SVG
 *                    viewBox is 1:1).
 *  - `animated`    — when true, the mark draws itself on mount
 *                    (ring first, then cross, then dots, then
 *                    arrows fan in) and the arrow chain sways.
 *  - `tone`        — `warm` uses the on-cream palette (used as a
 *                    page watermark and on the light bio background).
 *                    `white` uses soft white strokes suitable for
 *                    the dark hero gradient.
 *
 * When `prefers-reduced-motion` is set, all animation is disabled
 * and the mark renders in its final resting pose.
 */
export default function SevenArrowsMark({
  size = 160,
  animated = true,
  tone = 'warm',
  strokeWidth = 1.25,
  ariaLabel,
  className,
  style,
}: {
  size?: number;
  animated?: boolean;
  tone?: 'warm' | 'white';
  strokeWidth?: number;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = useReducedMotion();
  const active = animated && !reduced;
  const uid = useId();
  const gradTop = `${uid}-top`;
  const gradBot = `${uid}-bot`;
  const swayId = `${uid}-sway`;

  // Tone swap — the ring + cross are stroke-based, so we parameterize
  // color via CSS variables that the surrounding component's theme
  // owns. Defaults fall back to the warm brand palette.
  const toneStyle: React.CSSProperties =
    tone === 'white'
      ? {
          // Soft white, no gradient — reads as a single glyph on a
          // dark gradient without fighting the hero artwork.
          ['--mark-stroke' as string]: 'rgba(255,255,255,0.9)',
          ['--mark-dot' as string]: 'rgba(255,255,255,0.95)',
          ['--mark-arrow-a' as string]: 'rgba(255,255,255,0.85)',
          ['--mark-arrow-b' as string]: 'rgba(255,255,255,0.45)',
        }
      : {
          // Warm brand gradient — matches the real logo's brown-to-
          // copper vertical gradient on the ring.
          ['--mark-stroke' as string]: 'url(#' + gradTop + ')',
          ['--mark-dot' as string]: '#bc6b4a',
          ['--mark-arrow-a' as string]: '#bc6b4a',
          ['--mark-arrow-b' as string]: '#d88966',
        };

  // Coordinate geometry — viewBox is 0..200 square. Medallion ring
  // center at (100, 90) radius 72, giving headroom for the 7 arrows
  // that hang off the bottom arc.
  const cx = 100;
  const cy = 90;
  const r = 72;
  const ringCircumference = 2 * Math.PI * r; // ≈ 452.4

  // Arrow placements — 7 arrows, fanned across the bottom half of
  // the ring. Angles in degrees measured from the downward axis;
  // symmetric around 0°. Spacing is denser at the center.
  const arrowAngles = [-54, -36, -18, 0, 18, 36, 54];

  return (
    <svg
      viewBox="0 0 200 230"
      width={size}
      height={(size * 230) / 200}
      className={className}
      style={{ ...toneStyle, ...style }}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <defs>
        {/* Ring gradient — brown at the top, copper at the bottom,
            matching the brand logo. */}
        <linearGradient id={gradTop} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a6a5e" />
          <stop offset="55%" stopColor="#bc6b4a" />
          <stop offset="100%" stopColor="#d88966" />
        </linearGradient>
        {/* Arrow fill gradient — copper top, lighter coral tip. */}
        <linearGradient id={gradBot} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bc6b4a" />
          <stop offset="100%" stopColor="#e59a77" />
        </linearGradient>
      </defs>

      {/* Animated pendulum sway for the arrow chain — gentle ±1.8°
          rotation about the ring center, 6s loop, ease-in-out for
          that hanging-jewelry feel. Disabled when reduced-motion. */}
      <style>{`
        @keyframes ${swayId} {
          0%, 100% { transform: rotate(-1.8deg); }
          50%      { transform: rotate( 1.8deg); }
        }
        .sa-mark-${uid}-ring { stroke-dasharray: ${ringCircumference.toFixed(2)}; stroke-dashoffset: ${active ? ringCircumference.toFixed(2) : 0}; ${active ? `animation: sa-ring-${uid} 1.6s ${EASE_OUT_QUART} 0.05s forwards;` : ''} }
        @keyframes sa-ring-${uid} { to { stroke-dashoffset: 0; } }
        .sa-mark-${uid}-cross line { stroke-dasharray: 200; stroke-dashoffset: ${active ? 200 : 0}; ${active ? `animation: sa-cross-${uid} 0.9s ${EASE_OUT_QUART} 0.85s forwards;` : ''} }
        @keyframes sa-cross-${uid} { to { stroke-dashoffset: 0; } }
        .sa-mark-${uid}-dot { opacity: ${active ? 0 : 1}; transform-origin: center; ${active ? `animation: sa-dot-${uid} 0.6s ${EASE_OUT_QUART} forwards;` : ''} }
        @keyframes sa-dot-${uid} { from { opacity: 0; transform: scale(0.2); } to { opacity: 1; transform: scale(1); } }
        .sa-mark-${uid}-arrow { opacity: ${active ? 0 : 1}; transform-origin: 100px 90px; ${active ? `animation: sa-arrow-${uid} 0.9s ${EASE_OUT_QUART} forwards;` : ''} }
        @keyframes sa-arrow-${uid} { from { opacity: 0; transform: scale(0.85) translateY(-6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .sa-mark-${uid}-chain { transform-origin: 100px 90px; ${active ? `animation: ${swayId} 6s ease-in-out infinite;` : ''} }
      `}</style>

      {/* Ring — stroked circle that draws itself in on mount. */}
      <circle
        className={`sa-mark-${uid}-ring`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--mark-stroke)"
        strokeWidth={strokeWidth * 2.2}
        strokeLinecap="round"
      />

      {/* Interior cross — vertical + horizontal diameters. */}
      <g className={`sa-mark-${uid}-cross`} stroke="var(--mark-stroke)" strokeWidth={strokeWidth * 1.6} strokeLinecap="round">
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
      </g>

      {/* Four cardinal dots where the cross meets the ring. Stagger
          each so they pop in a rotating cadence. */}
      {[
        { x: cx, y: cy - r, delay: 1.55 },
        { x: cx + r, y: cy, delay: 1.65 },
        { x: cx, y: cy + r, delay: 1.75 },
        { x: cx - r, y: cy, delay: 1.85 },
      ].map((d, i) => (
        <circle
          key={i}
          className={`sa-mark-${uid}-dot`}
          cx={d.x}
          cy={d.y}
          r={3.2}
          fill="var(--mark-dot)"
          style={{ animationDelay: active ? `${d.delay}s` : undefined }}
        />
      ))}

      {/* Swinging arrow chain — the seven dangling arrows below the
          ring. Each arrow is a small feather-like shape with a stem
          and a leaf body, pointing straight down from its ring
          anchor. */}
      <g className={`sa-mark-${uid}-chain`}>
        {arrowAngles.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          // Anchor point on the bottom arc of the ring.
          const ax = cx + Math.sin(rad) * r;
          const ay = cy + Math.cos(rad) * r;
          // Arrow length scales slightly with |angle| so the fan
          // looks natural (middle arrows hang longest).
          const length = 50 - Math.abs(deg) * 0.2;
          const tipX = ax + Math.sin(rad) * length;
          const tipY = ay + Math.cos(rad) * length;
          // Leaf body anchored 22% down the stem from the ring.
          const leafTop = 0.22;
          const leafBot = 0.92;
          const bodyTopX = ax + Math.sin(rad) * (length * leafTop);
          const bodyTopY = ay + Math.cos(rad) * (length * leafTop);
          const bodyBotX = ax + Math.sin(rad) * (length * leafBot);
          const bodyBotY = ay + Math.cos(rad) * (length * leafBot);
          // Perpendicular offset for the leaf's width.
          const nx = Math.cos(rad);
          const ny = -Math.sin(rad);
          const halfWidth = 4.2;
          const midX = (bodyTopX + bodyBotX) / 2;
          const midY = (bodyTopY + bodyBotY) / 2;
          const leftMidX = midX + nx * halfWidth;
          const leftMidY = midY + ny * halfWidth;
          const rightMidX = midX - nx * halfWidth;
          const rightMidY = midY - ny * halfWidth;

          return (
            <g
              key={i}
              className={`sa-mark-${uid}-arrow`}
              style={{ animationDelay: active ? `${1.2 + i * 0.06}s` : undefined }}
            >
              {/* Stem from ring anchor to tip. */}
              <line
                x1={ax}
                y1={ay}
                x2={tipX}
                y2={tipY}
                stroke="var(--mark-arrow-a)"
                strokeWidth={1}
                strokeLinecap="round"
              />
              {/* Leaf body — quadratic-curve pointed ellipse. */}
              <path
                d={`M ${bodyTopX.toFixed(2)} ${bodyTopY.toFixed(2)}
                    Q ${leftMidX.toFixed(2)} ${leftMidY.toFixed(2)}, ${bodyBotX.toFixed(2)} ${bodyBotY.toFixed(2)}
                    Q ${rightMidX.toFixed(2)} ${rightMidY.toFixed(2)}, ${bodyTopX.toFixed(2)} ${bodyTopY.toFixed(2)}
                    Z`}
                fill={tone === 'white' ? 'var(--mark-arrow-a)' : `url(#${gradBot})`}
                opacity={tone === 'white' ? 0.75 : 1}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
