'use client';

// Celebratory fireworks overlay. Mounts when a campaign finishes
// sending; auto-unmounts after ~6 seconds. Pure DOM / CSS so it
// works without canvas or external libraries. Multiple burst
// origins fire on staggered delays; each burst emits ~14 particles
// at random angles + distances + warm-palette colors. The whole
// overlay is pointer-events-none so it never blocks the page
// underneath, and aria-hidden so screen readers ignore it.

import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#b87333', '#d4a874', '#f6c177', '#7a8b6f', '#ffffff', '#e7c69b'];
const BURST_COUNT = 9;
const PARTICLES_PER_BURST = 16;
const TOTAL_MS = 6000;

interface Burst {
  id: number;
  left: number;
  top: number;
  delay: number;
  particles: Array<{
    id: number;
    dx: number;
    dy: number;
    color: string;
    size: number;
  }>;
}

function makeBursts(): Burst[] {
  const bursts: Burst[] = [];
  for (let i = 0; i < BURST_COUNT; i += 1) {
    const particles: Burst['particles'] = [];
    for (let j = 0; j < PARTICLES_PER_BURST; j += 1) {
      const angle = (Math.PI * 2 * j) / PARTICLES_PER_BURST + Math.random() * 0.4;
      const distance = 60 + Math.random() * 160;
      particles.push({
        id: j,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 4,
      });
    }
    bursts.push({
      id: i,
      left: 10 + Math.random() * 80,
      top: 10 + Math.random() * 70,
      delay: Math.random() * 2400,
      particles,
    });
  }
  return bursts;
}

export function Fireworks({ onDone }: { onDone?: () => void }) {
  const bursts = useMemo(() => makeBursts(), []);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setMounted(false);
      onDone?.();
    }, TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      <style>{`
        @keyframes fw-particle {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
        }
        @keyframes fw-flash {
          0%   { transform: scale(0.2); opacity: 0; }
          20%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{ left: `${b.left}%`, top: `${b.top}%` }}
        >
          {/* Center flash */}
          <span
            className="absolute block rounded-full"
            style={{
              width: 24,
              height: 24,
              marginLeft: -12,
              marginTop: -12,
              background: 'radial-gradient(circle, rgba(255,255,255,0.85), rgba(184,115,51,0.15) 60%, transparent 70%)',
              animation: `fw-flash 900ms ${b.delay}ms ease-out both`,
            }}
          />
          {b.particles.map((p) => (
            <span
              key={p.id}
              className="absolute block rounded-full"
              style={{
                width: p.size,
                height: p.size,
                marginLeft: -p.size / 2,
                marginTop: -p.size / 2,
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                ['--dx' as string]: `${p.dx}px`,
                ['--dy' as string]: `${p.dy}px`,
                animation: `fw-particle 1800ms ${b.delay}ms cubic-bezier(0.15, 0.65, 0.35, 1) both`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
