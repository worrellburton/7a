'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Phase 6 — Meet the clinical team teaser.
 *
 * A compact two-column block: left has the eyebrow/headline/prose and
 * a CTA; right shows a slow-crossfading stack of team/clinical photos
 * with name+credential chips overlaid. The rotation gives the section
 * life without the commitment of a full team grid on this page — that
 * full view lives at /who-we-are/meet-our-team.
 */

const crossfades = [
  { image: '/images/individual-therapy-session.jpg', name: 'Clinical team', role: 'Trauma-informed therapists & counselors' },
  { image: '/images/equine-therapy-portrait.jpg', name: 'Equine program', role: 'Dedicated 1:1 equine partnership' },
  { image: '/images/group-therapy-room.jpg', name: 'Group therapy', role: 'Intimate peer-connection sessions' },
];

export default function TeamTeaser() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);

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

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % crossfades.length), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="team-teaser-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div
            className="lg:col-span-6"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <p className="section-label mb-5">Expert Team</p>
            <h2
              id="team-teaser-heading"
              className="text-foreground font-bold tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
                lineHeight: 1.05,
              }}
            >
              Meet the experts <em className="not-italic text-primary">guiding your journey</em>.
            </h2>
            <div
              className="space-y-4 text-foreground/75 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <p>
                Our clinical and medical staff hold advanced credentials in addiction
                medicine, trauma therapy, behavioral health, and holistic modalities.
                Every treatment plan is developed and overseen by licensed clinicians.
              </p>
              <p>
                Licensed clinical social workers, licensed professional counselors,
                certified addiction specialists, and medical professionals with experience
                in detoxification and co-occurring disorder management — this depth of
                expertise is what allows us to deliver individualized, evidence-based
                care at the highest standard.
              </p>
            </div>
            <Link href="/who-we-are/meet-our-team" className="btn-primary mt-8">
              Meet our clinical team
            </Link>
          </div>

          <div
            className="lg:col-span-6 relative aspect-[4/5] rounded-2xl overflow-hidden bg-dark-section"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(22px)',
              transition: 'all 0.95s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            {crossfades.map((f, i) => (
              <img
                key={f.image}
                src={f.image}
                alt={f.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                style={{ opacity: active === i ? 1 : 0 }}
              />
            ))}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(10,5,3,0.1) 40%, rgba(10,5,3,0.86) 100%)',
              }}
            />
            <div className="absolute inset-x-6 bottom-6">
              {crossfades.map((f, i) => (
                <div
                  key={f.image}
                  className="absolute inset-x-0 bottom-0 transition-opacity duration-700"
                  style={{ opacity: active === i ? 1 : 0 }}
                >
                  <p
                    className="text-accent text-[11px] font-semibold tracking-[0.22em] uppercase mb-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {f.name}
                  </p>
                  <p className="text-white text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    {f.role}
                  </p>
                </div>
              ))}
            </div>

            {/* Dot indicators */}
            <div className="absolute top-4 right-4 flex gap-1.5">
              {crossfades.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Show slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${active === i ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
