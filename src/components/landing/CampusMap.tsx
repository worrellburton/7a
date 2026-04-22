'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Phase 5 — interactive campus tour.
 *
 * Stylized SVG map of the 160-acre ranch with hotspots keyed to
 * specific zones (sweat lodge, arena, pool, group room, trails,
 * residences). Hovering / tapping a hotspot lights the zone and
 * surfaces a photo + short description on the side.
 *
 * Deliberately abstract — not a literal aerial photo — so the map
 * reads instantly without demanding cartographic attention. The
 * point is to orient, not to navigate.
 */

type Spot = {
  id: string;
  label: string;
  x: number; // percentage across 1000x600 viewBox
  y: number;
  image: string;
  body: string;
};

const spots: Spot[] = [
  {
    id: 'residences',
    label: 'Residences',
    x: 320,
    y: 240,
    image: '/images/facility-exterior-mountains.jpg',
    body: 'Private and semi-private rooms in a southwestern main house. Covered porches, quiet night sky, morning coffee within steps of the door.',
  },
  {
    id: 'arena',
    label: 'Equine arena',
    x: 620,
    y: 200,
    image: '/images/equine-therapy-portrait.jpg',
    body: 'Where most of the nervous-system-level work happens. Four horses, one equine specialist, a clinical team that reads what the body is saying when words fall short.',
  },
  {
    id: 'lodge',
    label: 'Sweat lodge',
    x: 780,
    y: 370,
    image: '/images/group-sunset-desert.jpg',
    body: 'Traditional sweat-lodge ceremonies held by indigenous carriers on a monthly cadence. Offered, never required.',
  },
  {
    id: 'group-room',
    label: 'Group room',
    x: 420,
    y: 380,
    image: '/images/group-therapy-room.jpg',
    body: 'Small-group process work. Not fluorescent lights and folding chairs — a real room that visitors sometimes describe as a living room with bigger things in it.',
  },
  {
    id: 'porch',
    label: 'Covered porch',
    x: 220,
    y: 350,
    image: '/images/covered-porch-desert-view.jpg',
    body: 'The de-facto integration space. Free time, conversations, journaling, the pause between sessions. Open to the desert and the mountains on three sides.',
  },
  {
    id: 'trails',
    label: 'Trails & land',
    x: 850,
    y: 140,
    image: '/images/facility-exterior-mountains.jpg',
    body: '160 acres backing up to the Swisshelm Mountains. Morning hikes, solo walks, the literal landscape that does a measurable amount of the clinical work.',
  },
];

export default function CampusMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string>(spots[0].id);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = spots.find((s) => s.id === activeId) || spots[0];

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-white relative overflow-hidden"
      aria-labelledby="campus-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">The ranch</p>
          <h2
            id="campus-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            Tap any zone. <em className="not-italic text-primary">Get a real look.</em>
          </h2>
          <p
            className="text-foreground/65 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            A 160-acre private campus at the base of the Swisshelm
            Mountains in southeastern Arizona. Six zones carry the
            day-to-day.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div
            className="lg:col-span-7 rounded-3xl overflow-hidden bg-warm-bg border border-black/5 relative"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.15s',
            }}
          >
            <svg viewBox="0 0 1000 600" className="w-full h-auto block" aria-label="Seven Arrows ranch campus map.">
              <defs>
                <linearGradient id="cm-sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f8d7bf" />
                  <stop offset="100%" stopColor="#f5efe6" />
                </linearGradient>
                <linearGradient id="cm-mountain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b2a14" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#6b2a14" stopOpacity="0.55" />
                </linearGradient>
                <linearGradient id="cm-land" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8dfd0" />
                  <stop offset="100%" stopColor="#d9cebb" />
                </linearGradient>
              </defs>

              {/* Sky */}
              <rect x="0" y="0" width="1000" height="600" fill="url(#cm-sky)" />

              {/* Mountains */}
              <path d="M 0 260 L 180 140 L 320 220 L 470 120 L 640 200 L 820 100 L 1000 220 L 1000 320 L 0 320 Z" fill="url(#cm-mountain)" />
              <path d="M 0 300 L 140 240 L 260 280 L 420 220 L 560 290 L 760 230 L 1000 300 L 1000 360 L 0 360 Z" fill="#6b2a14" fillOpacity="0.35" />

              {/* Land */}
              <rect x="0" y="320" width="1000" height="280" fill="url(#cm-land)" />

              {/* Trails as organic lines */}
              <g stroke="#b45a39" strokeOpacity="0.4" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 6">
                <path d="M 100 500 Q 220 420, 320 430 T 520 440 T 720 400 T 900 430" />
                <path d="M 160 570 Q 320 510, 500 520 T 880 500" />
              </g>

              {/* Hotspots */}
              {spots.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <g
                    key={s.id}
                    onMouseEnter={() => setActiveId(s.id)}
                    onFocus={() => setActiveId(s.id)}
                    onClick={() => setActiveId(s.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${s.label} — tap for details`}
                    style={{ cursor: 'pointer' }}
                  >
                    {isActive && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r="26"
                        fill="#d88966"
                        fillOpacity="0.28"
                        style={{ animation: 'cm-pulse 1.6s ease-in-out infinite' }}
                      />
                    )}
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={isActive ? 14 : 10}
                      fill={isActive ? '#bc6b4a' : '#14100a'}
                      stroke="#fff"
                      strokeWidth="3"
                      style={{ transition: 'all 0.25s ease' }}
                    />
                    <text
                      x={s.x}
                      y={s.y + 34}
                      textAnchor="middle"
                      fontFamily="var(--font-body)"
                      fontSize="13"
                      fontWeight="700"
                      fill="#14100a"
                      style={{ pointerEvents: 'none' }}
                    >
                      {s.label}
                    </text>
                  </g>
                );
              })}
              <style>{`@keyframes cm-pulse{0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.35);opacity:0}}`}</style>
            </svg>

            <div className="flex flex-wrap gap-2 p-4 lg:p-5 border-t border-black/5 bg-white/60">
              {spots.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveId(s.id)}
                  className={`text-[12px] px-3 py-1.5 rounded-full border transition-all ${
                    activeId === s.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-foreground/70 border-black/10 hover:border-primary/40 hover:text-primary'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <aside
            className="lg:col-span-5 rounded-3xl overflow-hidden bg-dark-section text-white"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              {spots.map((s) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={s.id}
                  src={s.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: s.id === activeId ? 1 : 0,
                    transform: s.id === activeId ? 'scale(1.02)' : 'scale(1.08)',
                    transition: 'opacity 700ms ease, transform 1200ms ease',
                  }}
                />
              ))}
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.6) 100%)' }} />
            </div>
            <div className="p-6 lg:p-8">
              <p
                className="text-[11px] tracking-[0.22em] uppercase font-bold text-accent mb-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {active.label}
              </p>
              <p className="text-white/85 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                {active.body}
              </p>
              <a
                href="/tour"
                className="inline-flex items-center gap-2 mt-6 text-accent hover:text-white font-semibold text-sm transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Full virtual tour
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
