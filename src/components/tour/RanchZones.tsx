'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tour — Phase 4. Bento layout of the six distinct "zones" on the
 * ranch. Flagship tile (The Land) spans the full top row with a big
 * photo and overlay copy. Five smaller tiles underneath cover
 * Residences, Common Spaces, Therapy Rooms, Equine Arena, and
 * Ceremonial Spaces. Stagger-in on scroll.
 */

type Zone = {
  title: string;
  eyebrow: string;
  body: string;
  image: string;
};

const flagship: Zone = {
  title: 'The land',
  eyebrow: 'All Around You',
  body: 'Sonoran desert, yucca and ocotillo, red-rock ridgelines running to the horizon. 160 private acres to walk, ride, sit, or just breathe. The working perimeter of the ranch is part of every day here.',
  image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776855931921-5a0akvko2vg-arizona-desert-mountain-stronghold-vista.jpg',
};

const zones: Zone[] = [
  {
    title: 'Residences',
    eyebrow: 'Where you live',
    body: 'Home-like shared rooms, real linens, windows that open onto the desert. Nothing institutional.',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1777067193683-8nc4pns8cot-twin-beds-southwest-guest-room.webp',
  },
  {
    title: 'Common spaces',
    eyebrow: 'Where community happens',
    body: 'Warm gathering rooms for meals, groups, evenings on the couch, and the quieter conversations you didn’t plan.',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776855995762-iqhxljba2g9-southwestern-lounge-bison-mount-fireplace.jpg',
  },
  {
    title: 'Therapy rooms',
    eyebrow: 'Where the work happens',
    body: 'Light-filled, intimate spaces for individual and small-group clinical sessions — trauma-informed and fully private.',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776856087391-y07h8u1n6bp-group-therapy-room-blue-chairs-circle.jpg',
  },
  {
    title: 'The equine arena',
    eyebrow: 'Where the horses are',
    body: 'Working arena for equine-assisted psychotherapy. Every client partners 1:1 with a horse for the duration of their stay.',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776807547175-5jxd8z6mulv-equine-therapy-woman-resting-head-on-horse.jpg',
  },
  {
    title: 'Ceremonial spaces',
    eyebrow: 'Where spirit is welcome',
    body: 'Sweat lodge, talking-circle grounds, and indoor ceremony space for the Indigenous healing practices woven through our program.',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776856020399-q7cxjll1t0s-circular-stone-fire-pit-gathering-space-at-dusk.jpg',
  },
  {
    title: 'Porches & perimeter',
    eyebrow: 'Where you process',
    body: 'Covered porches wrap the residences — rocking chairs, desert views, and the shade that makes the hardest conversations finally possible.',
    image: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776856102755-lbylphm7vpr-covered-porch-rocking-chairs-desert-view.jpg',
  },
];

export default function RanchZones() {
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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(22px)',
    transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-white overflow-hidden" aria-labelledby="zones-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 lg:mb-20" style={style(0.05)}>
          <p className="section-label mb-5">Zones of the Ranch</p>
          <h2
            id="zones-heading"
            className="text-foreground font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.9vw, 3.1rem)', lineHeight: 1.05 }}
          >
            Six spaces. One place. <em className="not-italic text-primary">Built for healing.</em>
          </h2>
          <p className="text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Every building, porch, and paddock was designed for a specific
            kind of work &mdash; clinical, experiential, or the quiet in-between.
          </p>
        </div>

        {/* Flagship tile — full-width photo + overlaid copy */}
        <article
          className="relative rounded-3xl overflow-hidden mb-5 lg:mb-6 aspect-[16/7] lg:aspect-[21/8] bg-dark-section"
          style={style(0.12)}
        >
          <img
            src={flagship.image}
            alt={flagship.title}
            className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-[2000ms] ease-out"
            loading="lazy"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(10,5,3,0.82) 0%, rgba(10,5,3,0.4) 45%, rgba(10,5,3,0.08) 100%)',
            }}
          />
          <div className="relative h-full flex items-end lg:items-center p-7 lg:p-14 text-white">
            <div className="max-w-xl">
              <p
                className="text-[11px] font-semibold tracking-[0.22em] uppercase text-accent mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {flagship.eyebrow}
              </p>
              <h3
                className="font-bold tracking-tight mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.2rem, 4.2vw, 3.6rem)',
                  lineHeight: 1.02,
                }}
              >
                {flagship.title}.
              </h3>
              <p className="text-white/85 leading-relaxed text-lg" style={{ fontFamily: 'var(--font-body)' }}>
                {flagship.body}
              </p>
            </div>
          </div>
        </article>

        {/* 3-col zone grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {zones.map((z, i) => (
            <article
              key={z.title}
              className="relative rounded-2xl overflow-hidden aspect-[4/5] bg-dark-section group"
              style={style(0.18 + i * 0.08)}
            >
              <img
                src={z.image}
                alt={z.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05]"
                loading="lazy"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(10,5,3,0.05) 30%, rgba(10,5,3,0.55) 65%, rgba(10,5,3,0.92) 100%)',
                }}
              />
              <div className="absolute inset-x-6 bottom-6 text-white">
                <p
                  className="text-[10.5px] font-semibold tracking-[0.22em] uppercase text-accent mb-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {z.eyebrow}
                </p>
                <h3
                  className="font-bold mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1.1 }}
                >
                  {z.title}
                </h3>
                <p className="text-white/85 text-[14px] leading-snug max-w-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  {z.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
