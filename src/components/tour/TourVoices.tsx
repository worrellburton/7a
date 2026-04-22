'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Tour — Phase 9. Editorial voices section, specifically about the
 * physical setting. Four big serif pull-quotes laid out in an
 * asymmetric 2-column grid, each with a small round photo chip next
 * to the attribution. Cream background, tight typography, stagger-in
 * on scroll. Distinct from the other photo-heavy sections on the
 * page — this one is about words.
 */

type Voice = {
  quote: string;
  name: string;
  tag: string;
  photo: string;
  /** Visual column assignment for the masonry feel — `left` drops a
      little further down than `right` so the grid feels composed
      rather than gridded. */
  column: 'left' | 'right';
  delay: number;
};

const voices: Voice[] = [
  {
    quote:
      'The first night I looked up and saw the Milky Way, I cried. I hadn’t seen a sky like that since I was a child. That sky started the work for me.',
    name: 'James R.',
    tag: 'Alumnus · 18 months sober',
    photo: '/images/sign-night-sky-milky-way.jpg',
    column: 'left',
    delay: 0.1,
  },
  {
    quote:
      'Being out of my city, away from the bars and the friends and the habit — I didn’t realize until I got here how much the land was doing for me just by being far.',
    name: 'Michael T.',
    tag: 'Alumnus · 2 years sober',
    photo: '/images/facility-exterior-mountains.jpg',
    column: 'right',
    delay: 0.22,
  },
  {
    quote:
      'My horse recognized me before my therapist did. That sounds funny but it’s true. He knew when I was lying about how I was.',
    name: 'Rachel M.',
    tag: 'Alumna · equine program',
    photo: '/images/equine-therapy-portrait.jpg',
    column: 'left',
    delay: 0.3,
  },
  {
    quote:
      'We finally have our son back. The ranch gave him space to stop running. We visit every year now, just to sit on that porch again.',
    name: 'Sarah K.',
    tag: 'Family member',
    photo: '/images/covered-porch-desert-view.jpg',
    column: 'right',
    delay: 0.42,
  },
];

export default function TourVoices() {
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

  const leftVoices = voices.filter((v) => v.column === 'left');
  const rightVoices = voices.filter((v) => v.column === 'right');

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-warm-bg overflow-hidden"
      aria-labelledby="voices-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 85% 20%, rgba(216,137,102,0.1) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 45% 50% at 10% 80%, rgba(188,107,74,0.08) 0%, rgba(188,107,74,0) 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-16 lg:mb-24"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">What the Place Did For Them</p>
          <h2
            id="voices-heading"
            className="text-foreground font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 4.3vw, 3.4rem)',
              lineHeight: 1.02,
            }}
          >
            Alumni don&rsquo;t talk about <em className="not-italic text-primary">the program</em>.
            They talk about <em className="not-italic text-primary">the land</em>.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-x-8 lg:gap-x-14 gap-y-10 lg:gap-y-16">
          {/* Left column — slightly indented top margin to create the
              staggered, editorial feel. */}
          <div className="space-y-14 lg:space-y-20 lg:pr-4">
            {leftVoices.map((v) => (
              <VoiceCard key={v.name} voice={v} visible={visible} />
            ))}
          </div>
          <div className="space-y-14 lg:space-y-20 lg:mt-20 lg:pl-4">
            {rightVoices.map((v) => (
              <VoiceCard key={v.name} voice={v} visible={visible} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VoiceCard({ voice, visible }: { voice: Voice; visible: boolean }) {
  return (
    <figure
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `all 1s cubic-bezier(0.16,1,0.3,1) ${voice.delay}s`,
      }}
    >
      <span
        aria-hidden="true"
        className="block text-accent leading-none mb-2"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}
      >
        &ldquo;
      </span>
      <blockquote
        className="text-foreground leading-[1.2] mb-6"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.35rem, 2vw, 1.75rem)',
        }}
      >
        {voice.quote}
      </blockquote>
      <figcaption className="flex items-center gap-4">
        <img
          src={voice.photo}
          alt=""
          aria-hidden="true"
          className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
          loading="lazy"
        />
        <div>
          <p
            className="text-foreground font-bold"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}
          >
            {voice.name}
          </p>
          <p
            className="text-foreground/55 text-[11px] uppercase tracking-[0.22em] font-semibold mt-0.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {voice.tag}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
