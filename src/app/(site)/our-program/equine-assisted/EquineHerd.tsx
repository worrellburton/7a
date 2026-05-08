'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import HorseGallery from './HorseGallery';

/**
 * Phase 4 — Meet the herd.
 *
 * Editorial frame around the live HorseGallery. The gallery itself
 * pulls from /api/public/horses (our internal roster). Wrapping it in
 * GEO-friendly copy ("160-acre private ranch in Cochise County,
 * Arizona") gives both humans and crawlers a sense of place and
 * specificity that generic stock pages miss. A herd-care subsection
 * follows the gallery so visitors see how the horses are supported as
 * co-regulators and healers — not just used as therapeutic tools.
 */
export default function EquineHerd() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="meet-herd"
      ref={ref}
      className="scroll-mt-20 py-24 lg:py-32 bg-warm-bg"
      aria-labelledby="herd-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Meet the herd</p>
          <h2
            id="herd-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Fifteen teachers on{' '}
            <em className="not-italic text-primary">160 acres</em>.
          </h2>
          <p
            className="text-foreground/70 text-[16.5px] leading-relaxed mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our herd lives full-time at the ranch in the high desert of Cochise
            County, Arizona, ten minutes from the town of Elfrida, at the base
            of the Swisshelm Mountains. They&rsquo;re not rotated in from an
            outside barn for sessions. They know the rhythm of the property,
            the staff, and the clients who come through it.
          </p>
          <p
            className="text-foreground/70 text-[16.5px] leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Every horse in our program has a specific temperament and a
            specific therapeutic role. Some do equine-assisted psychotherapy
            only. Some carry clients under saddle, and some do both.
          </p>
        </div>

        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s',
          }}
        >
          <HorseGallery />
        </div>

        <HerdCare visible={visible} />
      </div>
    </section>
  );
}

/**
 * Sub-section under the gallery that documents how the herd is
 * matched, monitored, and cared for. Modeled as a "what we practice
 * and model" panel so the welfare commitment reads as continuous
 * with what we offer clients, not a separate compliance line.
 */
function HerdCare({ visible }: { visible: boolean }) {
  const items: { title: string; body: string; glyph: ReactNode }[] = [
    {
      title: 'Tailored nutrition',
      body: 'Individualized feed plans built around each horse&rsquo;s body condition, age, and workload, reviewed regularly by our barn team.',
      glyph: (
        <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12c2-4 6-6 10-6s8 2 10 6" />
          <path d="M6 12v10c0 2 2 4 4 4h12c2 0 4-2 4-4V12" />
          <path d="M12 16v8M20 16v8" />
        </svg>
      ),
    },
    {
      title: 'Monthly bodywork',
      body: 'Routine bodywork at least monthly to support comfort, mobility, and nervous-system regulation in the horses themselves.',
      glyph: (
        <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22c4-3 8-3 10-3s6 0 10 3" />
          <circle cx="11" cy="13" r="2.5" />
          <circle cx="21" cy="13" r="2.5" />
          <path d="M16 6v3" />
        </svg>
      ),
    },
    {
      title: 'Hoof care every 6 weeks',
      body: 'Consistent farrier work on a six-week cycle, plus routine vaccines and deworming kept on a documented schedule.',
      glyph: (
        <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 8c0-2 2-4 6-4s6 2 6 4v6c0 4-2 8-6 12-4-4-6-8-6-12V8z" />
          <path d="M10 14h12" />
        </svg>
      ),
    },
    {
      title: 'Daily readiness check',
      body: 'Each horse is observed and evaluated daily to ensure they&rsquo;re physically and emotionally ready to participate before any session.',
      glyph: (
        <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="11" />
          <path d="M16 9v7l4 3" />
        </svg>
      ),
    },
    {
      title: 'Honored "no"',
      body: 'A horse showing fatigue, stress, or simply needing time off is respectfully rotated out and given space to rest and reset.',
      glyph: (
        <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16c0-5 4-10 10-10s10 5 10 10-4 10-10 10S6 21 6 16z" />
          <path d="M9 9l14 14" />
        </svg>
      ),
    },
    {
      title: 'Matched to the moment',
      body: 'We are intentional about pairing each horse&rsquo;s temperament, sensitivity, and disposition with the needs of the client in front of them.',
      glyph: (
        <svg viewBox="0 0 32 32" className="w-6 h-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="16" r="5" />
          <circle cx="21" cy="16" r="5" />
          <path d="M14 16h4" />
        </svg>
      ),
    },
  ];

  return (
    <div
      id="herd-care"
      className="mt-20 lg:mt-24 scroll-mt-20"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.4s',
      }}
    >
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-12 lg:mb-14">
        <div className="lg:col-span-5">
          <p
            className="text-[11px] tracking-[0.24em] uppercase font-semibold text-primary mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            How we care for the herd
          </p>
          <h3
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.4vw, 2.4rem)',
              lineHeight: 1.08,
            }}
          >
            We practice and model what we offer{' '}
            <em className="not-italic text-primary">our clients</em>.
          </h3>
          <p
            className="text-foreground/70 text-[16px] leading-relaxed mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our horses are thoughtfully selected based on temperament,
            sensitivity, and their capacity to engage safely and authentically
            in therapeutic work. Each horse brings a unique presence to
            sessions, and we are intentional about matching their strengths
            and disposition to the needs of our clients.
          </p>
          <p
            className="text-foreground/70 text-[16px] leading-relaxed mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Their well-being is a central part of the work, and we also honor
            them as co-regulators and healers in the therapeutic process. We
            practice intentional self-care for the herd, recognizing that
            their ability to show up for clients is directly connected to how
            well they are supported, listened to, and cared for.
          </p>
          <p
            className="text-foreground/70 text-[16px] leading-relaxed mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Each horse receives individualized care, including tailored
            nutrition based on their specific needs, regular bodywork at least
            monthly to support comfort and regulation, routine deworming and
            vaccines, and consistent hoof care every six weeks. They are
            observed and evaluated daily to ensure they are physically and
            emotionally ready to participate. If a horse shows signs of
            fatigue, stress, or simply needs time off, they are respectfully
            taken out of rotation and given space to rest and reset.
          </p>
          <p
            className="text-foreground/70 text-[16px] leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            By prioritizing their care and autonomy, we support the horses in
            remaining regulated, willing, and present, allowing them to offer
            clear, honest, and grounded relational feedback in the therapeutic
            process.
          </p>
        </div>

        <div className="lg:col-span-7">
          <ul className="grid sm:grid-cols-2 gap-5 lg:gap-6">
            {items.map((it, i) => (
              <li
                key={it.title}
                className="relative rounded-2xl bg-white border border-black/5 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(14px)',
                  transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.55 + i * 0.07}s`,
                }}
              >
                <div
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-primary-dark mb-4"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(216,137,102,0.18) 0%, rgba(107,42,20,0.08) 100%)',
                  }}
                  aria-hidden="true"
                >
                  {it.glyph}
                </div>
                <h4
                  className="text-foreground font-bold mb-1.5"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem',
                    lineHeight: 1.2,
                  }}
                >
                  {it.title}
                </h4>
                <p
                  className="text-foreground/70 text-[14px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                  dangerouslySetInnerHTML={{ __html: it.body }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Photo strip under the welfare prose + cards. Pulls 4 horses
          off /api/public/horses (original image_url, not bling) so
          the welfare narrative is anchored to actual animals, not
          generic stock. Visually answers "we practice and model what
          we offer our clients" by showing the horses themselves. */}
      <HerdCarePhotoStrip visible={visible} />
    </div>
  );
}

interface CareStripHorse {
  id: string;
  name: string;
  works_in: string | null;
  image_url: string | null;
}

function HerdCarePhotoStrip({ visible }: { visible: boolean }) {
  const [horses, setHorses] = useState<CareStripHorse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/horses');
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(data?.horses)) {
          // Pick the first four horses with photos. The roster API
          // already filters out anything without image_url, but we
          // re-check defensively in case the contract widens.
          const withPhotos = (data.horses as CareStripHorse[]).filter(
            (h) => !!h.image_url,
          );
          setHorses(withPhotos.slice(0, 4));
        } else {
          setHorses([]);
        }
      } catch {
        if (!cancelled) setHorses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide the strip during fetch + when nobody has a photo yet, so
  // the welfare section never renders an empty band.
  if (!horses || horses.length === 0) return null;

  return (
    <div
      className="mt-14 lg:mt-16"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.85s',
      }}
    >
      <p
        className="text-[11px] tracking-[0.24em] uppercase font-semibold text-primary mb-4"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Some of the herd
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {horses.map((h, i) => (
          <figure
            key={h.id}
            className="group relative overflow-hidden rounded-2xl bg-warm-bg border border-black/5 shadow-sm hover:shadow-lg transition-all duration-500"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(14px)',
              transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${1 + i * 0.08}s, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${1 + i * 0.08}s, box-shadow 500ms`,
            }}
          >
            <div className="relative aspect-[4/5]">
              {h.image_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={h.image_url}
                  alt={`Portrait of ${h.name}, one of the therapy horses cared for at Seven Arrows Recovery`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
              <figcaption className="absolute inset-x-0 bottom-0 p-3.5">
                <p
                  className="text-white font-bold tracking-tight drop-shadow-sm"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem',
                    lineHeight: 1.1,
                  }}
                >
                  {h.name}
                </p>
                {h.works_in && (
                  <p
                    className="text-white/80 text-[11px] font-medium mt-0.5"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {h.works_in}
                  </p>
                )}
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
