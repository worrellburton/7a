'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Evidence-Based — Phase 4. "Regulated presence as the miracle
 * intervention" card on warm-bg. Two columns: prose on the left,
 * an animated polyvagal waveform on the right showing the nervous
 * system settling from a dysregulated high-amplitude line into a
 * calmer rhythm. The waveform is SMIL-driven so it keeps breathing
 * after the scroll-in animation finishes — the clinician never
 * stops doing this work.
 */
export default function RegulatedPresence() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="presence-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 78% 55%, rgba(216,137,102,0.12) 0%, rgba(216,137,102,0) 65%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <p className="section-label mb-5">The Miracle Intervention</p>
            <h2
              id="presence-heading"
              className="text-foreground font-bold tracking-tight mb-7"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
                lineHeight: 1.05,
              }}
            >
              A regulated clinician is the <em className="not-italic text-primary">intervention</em>.
            </h2>
            <div
              className="space-y-4 text-foreground/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <p>
                When a clinician is grounded in their own body, their nervous
                system co-regulates the client&rsquo;s. Heart rate slows,
                breathing deepens, threat response eases &mdash; all before a
                single word has been spoken about what brought them here.
              </p>
              <p>
                Our team actively practices what we teach: breathwork, somatic
                awareness, interoception, and daily nervous-system hygiene. So
                when you sit across from one of our clinicians, the room itself
                is doing some of the work.
              </p>
            </div>

            {/* Three pillars of regulated presence */}
            <ul className="mt-10 space-y-3">
              {[
                { t: 'Presence', b: 'Fully here, not half in yesterday.' },
                { t: 'Attunement', b: 'Tracking your body as well as your words.' },
                { t: 'Authenticity', b: 'Regulated, real, and not performing safety.' },
              ].map((p, i) => (
                <li
                  key={p.t}
                  className="flex items-start gap-4"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-10px)',
                    transition: `all 0.8s cubic-bezier(0.16,1,0.3,1) ${0.5 + i * 0.12}s`,
                  }}
                >
                  <span
                    className="shrink-0 mt-1.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <svg className="w-2.5 h-2.5 text-primary" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <p
                      className="text-foreground font-bold"
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}
                    >
                      {p.t}
                    </p>
                    <p
                      className="text-foreground/65 text-[15px] leading-snug mt-0.5"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {p.b}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 1.05s cubic-bezier(0.16,1,0.3,1) 0.3s',
            }}
          >
            <NervousSystemWaveform active={visible} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * NervousSystemWaveform — two stacked strokes representing
 * dysregulated and regulated states. The dysregulated line starts
 * high-amplitude and spiky; on scroll-in it fades while the lower
 * calm waveform brightens and continues its slow breathing motion.
 * Gridlines ghost in behind so the whole thing reads as a clinical
 * chart.
 */
function NervousSystemWaveform({ active }: { active: boolean }) {
  return (
    <div className="w-full relative aspect-[5/4] lg:aspect-[6/5] rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-warm-card)', border: '1px solid rgba(0,0,0,0.05)' }}>
      <svg viewBox="0 0 600 500" className="absolute inset-0 w-full h-full" role="img" aria-label="Nervous system waveform settling from dysregulated to regulated states.">
        <defs>
          <linearGradient id="nswCalmStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="nswSpikyStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c0392b" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#c0392b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#c0392b" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {[100, 200, 300, 400].map((y) => (
          <line
            key={y}
            x1="30"
            y1={y}
            x2="570"
            y2={y}
            stroke="rgba(0,0,0,0.06)"
            strokeDasharray="2 6"
          />
        ))}

        {/* Y-axis labels */}
        <text x="42" y="115" fill="rgba(0,0,0,0.4)" fontFamily="var(--font-body)" fontSize="9" fontWeight="700" letterSpacing="2.5" style={{ textTransform: 'uppercase' }}>Dysregulated</text>
        <text x="42" y="315" fill="rgba(0,0,0,0.4)" fontFamily="var(--font-body)" fontSize="9" fontWeight="700" letterSpacing="2.5" style={{ textTransform: 'uppercase' }}>Regulated</text>

        {/* X-axis breathing hint */}
        <text x="300" y="470" textAnchor="middle" fill="rgba(0,0,0,0.35)" fontFamily="var(--font-body)" fontSize="10" fontStyle="italic">the session progresses</text>

        {/* Dysregulated line — starts prominent, fades out */}
        <path
          d="M 30 150 L 70 80 L 100 200 L 140 90 L 170 180 L 200 100 L 240 190 L 270 110 L 310 170 L 340 130 L 380 160 L 420 140 L 470 155 L 520 150 L 570 150"
          fill="none"
          stroke="url(#nswSpikyStroke)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: active ? 0.25 : 1,
            transition: 'opacity 2.4s cubic-bezier(0.22,1,0.36,1) 0.8s',
          }}
        />

        {/* Calm regulated waveform — fades in, then keeps breathing */}
        <g
          style={{
            opacity: active ? 1 : 0.1,
            transition: 'opacity 1.6s ease 0.8s',
          }}
        >
          <path fill="none" stroke="url(#nswCalmStroke)" strokeWidth="2.5" strokeLinecap="round">
            <animate
              attributeName="d"
              dur="7s"
              repeatCount="indefinite"
              values="
                M 30 320 Q 120 290 210 320 T 390 315 T 570 320;
                M 30 320 Q 120 340 210 310 T 390 325 T 570 320;
                M 30 320 Q 120 300 210 330 T 390 310 T 570 320;
                M 30 320 Q 120 290 210 320 T 390 315 T 570 320
              "
            />
          </path>
          <path fill="none" stroke="var(--color-accent)" strokeOpacity="0.4" strokeWidth="1.25" strokeLinecap="round">
            <animate
              attributeName="d"
              dur="9s"
              repeatCount="indefinite"
              values="
                M 30 340 Q 120 315 210 340 T 390 335 T 570 340;
                M 30 340 Q 120 360 210 325 T 390 345 T 570 340;
                M 30 340 Q 120 320 210 350 T 390 330 T 570 340;
                M 30 340 Q 120 315 210 340 T 390 335 T 570 340
              "
            />
          </path>
          {/* Interoception ball — drifts up and down gently with breath */}
          <circle r="5" fill="var(--color-accent)" stroke="white" strokeWidth="1.5">
            <animate attributeName="cx" dur="14s" repeatCount="indefinite" values="120;300;470;300;120" />
            <animate attributeName="cy" dur="7s" repeatCount="indefinite" values="322;315;325;320;322" />
          </circle>
        </g>

        {/* Legend */}
        <g transform="translate(360, 445)">
          <rect x="0" y="-10" width="12" height="2" fill="#c0392b" opacity="0.5" />
          <text x="18" y="-6" fill="rgba(0,0,0,0.55)" fontFamily="var(--font-body)" fontSize="10">before presence</text>
          <rect x="115" y="-10" width="12" height="2" fill="var(--color-primary)" />
          <text x="133" y="-6" fill="rgba(0,0,0,0.55)" fontFamily="var(--font-body)" fontSize="10">with presence</text>
        </g>
      </svg>
    </div>
  );
}
