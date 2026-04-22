'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Phase 6 — "a day at the ranch."
 *
 * Two-column scroll-coupled layout. On desktop, the left column is a
 * sticky image/video well; the right column is an hour-by-hour
 * timeline of the day. As the visitor scrolls through the timeline,
 * the image well cross-fades between the photo that belongs to the
 * currently-anchored hour — giving a vivid, concrete sense of what
 * the day actually looks like.
 *
 * On mobile, the image collapses into an inline thumbnail per row
 * so the layout still reads without depending on the sticky pattern.
 *
 * Removing the biggest unknown ("what does it actually look like")
 * is the single best move you can make to convert research-stage
 * visitors to call-stage ones.
 */

type Beat = {
  time: string;
  title: string;
  body: string;
  image: string;
};

const beats: Beat[] = [
  {
    time: '6:45 am',
    title: 'Quiet start on the porch',
    body: 'Coffee in hand, sunrise over the Swisshelms. No programming yet. The day begins by actually arriving in it.',
    image: '/images/covered-porch-desert-view.jpg',
  },
  {
    time: '7:30 am',
    title: 'Morning practice',
    body: 'Invitational yoga, breathwork, or a walking meditation in the arena. Twenty minutes of nervous-system tuning before the clinical work begins.',
    image: '/images/sound-healing-session.jpg',
  },
  {
    time: '8:30 am',
    title: 'Breakfast, together',
    body: 'Shared meal on-site. Protein, real food, actual nourishment — often the first meal in a long time that gets full attention.',
    image: '/images/group-gathering-pavilion.jpg',
  },
  {
    time: '9:15 am',
    title: 'Primary-clinician session',
    body: 'Individual therapy with your primary — EMDR, ART, IFS, or Forward-Facing Freedom® as clinically indicated. The hour that anchors the day.',
    image: '/images/individual-therapy-session.jpg',
  },
  {
    time: '11:00 am',
    title: 'Group therapy',
    body: 'Small-group process work. Six clients, one facilitator, a room that has become unusually honest over the past week.',
    image: '/images/group-therapy-room.jpg',
  },
  {
    time: '12:30 pm',
    title: 'Lunch and open time',
    body: 'A walk, journaling, a nap, a conversation. Integration time is programmed, not an afterthought.',
    image: '/images/embrace-connection.jpg',
  },
  {
    time: '2:00 pm',
    title: 'Equine session',
    body: 'An hour in the arena with the horses. Nervous-system feedback from a 1,200-pound animal that responds to what your body is actually doing, without judgment.',
    image: '/images/equine-therapy-portrait.jpg',
  },
  {
    time: '4:00 pm',
    title: 'Movement or holistic',
    body: 'Hike, strength work, sound-bath session, or sweat-lodge ceremony depending on the day and the client. Body-level medicine.',
    image: '/images/facility-exterior-mountains.jpg',
  },
  {
    time: '6:30 pm',
    title: 'Dinner and circle',
    body: 'Shared meal, then evening circle — the day gets named, hard moments get witnessed, wins get marked. Lights-out comes from a settled nervous system, not exhaustion.',
    image: '/images/group-sunset-desert.jpg',
  },
];

export default function DayAtRanch() {
  const [activeIdx, setActiveIdx] = useState(0);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
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

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    rowRefs.current.forEach((row, idx) => {
      if (!row) return;
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) setActiveIdx(idx);
          }
        },
        { threshold: [0.5, 0.75], rootMargin: '-30% 0px -30% 0px' },
      );
      io.observe(row);
      observers.push(io);
    });
    return () => observers.forEach((io) => io.disconnect());
  }, []);

  const sticky = useMemo(() => beats[activeIdx] ?? beats[0], [activeIdx]);

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-warm-bg relative overflow-hidden"
      aria-labelledby="day-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">A day at the ranch</p>
          <h2
            id="day-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.05,
            }}
          >
            The rhythm, hour by hour —{' '}
            <em className="not-italic text-primary">before you ever set foot on the property.</em>
          </h2>
          <p
            className="text-foreground/65 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Most residential-treatment pages tell you what they offer.
            We&rsquo;d rather show you what your Tuesday will look
            like.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Sticky image column (desktop only) */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-xl">
              {beats.map((b, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={b.image}
                  src={b.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: i === activeIdx ? 1 : 0,
                    transition: 'opacity 700ms ease',
                  }}
                />
              ))}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0) 55%, rgba(20,10,6,0.75) 100%)',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p
                  className="text-[11px] tracking-[0.22em] uppercase font-bold text-accent mb-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {sticky.time}
                </p>
                <p
                  className="font-bold leading-tight"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 1.6vw, 1.5rem)' }}
                >
                  {sticky.title}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline column */}
          <div className="lg:col-span-7">
            <ol className="relative pl-8 lg:pl-10 space-y-8 lg:space-y-10 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-primary/20">
              {beats.map((b, i) => (
                <li
                  key={b.time}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  className="relative"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-8px)',
                    transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.06}s`,
                  }}
                >
                  <span
                    className={`absolute -left-[30px] top-1 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      i === activeIdx ? 'bg-primary scale-110 shadow-[0_0_0_6px_rgba(188,107,74,0.15)]' : 'bg-primary/30'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </span>

                  {/* Mobile-only inline image */}
                  <div className="lg:hidden mb-4 rounded-2xl overflow-hidden aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>

                  <p
                    className="text-[11px] tracking-[0.22em] uppercase font-bold text-primary mb-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {b.time}
                  </p>
                  <h3
                    className="text-foreground font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 1.4vw, 1.3rem)', lineHeight: 1.15 }}
                  >
                    {b.title}
                  </h3>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {b.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
