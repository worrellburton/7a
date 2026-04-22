'use client';

import { useEffect, useRef, useState } from 'react';

interface Do {
  title: string;
  body: string;
}

const dos: Do[] = [
  {
    title: 'Rest, actually.',
    body: 'You have probably been in crisis mode for longer than you realize. Sleep. Eat. See your doctor. The nervous system you bring to family support sessions needs to be regulated enough to do the work.',
  },
  {
    title: 'Start your own therapy.',
    body: 'This is the single highest-yield thing family members do. Your own provider, your own hour, your own work — separate from the work happening in residential and separate from the family sessions.',
  },
  {
    title: 'Learn the vocabulary.',
    body: 'Enabling, codependency, attachment trauma, co-regulation. Books, podcasts, and our family education groups will give you a shared language for the work ahead.',
  },
  {
    title: 'Attend your loved one\'s groups.',
    body: 'Al-Anon, Nar-Anon, and trauma-informed family groups like ACA are free, widely available, and quietly transformative. Show up before you think you need to.',
  },
  {
    title: 'Don\'t perform wellness.',
    body: 'Your loved one doesn\'t need you to be "fine" when they come home. They need you to be honest about where you are. Performing stability often reads as emotional unavailability.',
  },
  {
    title: 'Let us handle the logistics.',
    body: 'Insurance calls, visitation paperwork, travel. Our admissions and clinical teams help shoulder that load — don\'t waste bandwidth on operations when you could be spending it on the clinical work.',
  },
];

export default function WhileTheyAreIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => { for (const e of es) if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-24 lg:py-32 bg-dark-section text-white overflow-hidden"
      aria-labelledby="while-they-are-in-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 55% 45% at 85% 15%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 65%), radial-gradient(ellipse 50% 50% at 10% 85%, rgba(107,42,20,0.28) 0%, rgba(107,42,20,0) 65%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-14 lg:mb-18"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-accent mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            While they&rsquo;re in treatment
          </p>
          <h2
            id="while-they-are-in-heading"
            className="font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Six things to do with the <em className="not-italic" style={{ color: 'var(--color-accent)' }}>quiet</em>.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            The house gets quieter when a loved one goes to residential. Use
            the window. This is when your recovery starts too.
          </p>
        </div>

        <ol className="grid md:grid-cols-2 gap-4 lg:gap-5">
          {dos.map((d, i) => (
            <li
              key={d.title}
              className="relative rounded-2xl p-6 lg:p-7 bg-white/[0.04] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(18px)',
                transition: `all 0.9s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s`,
              }}
            >
              <div className="flex items-start gap-5">
                <span
                  aria-hidden="true"
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-accent/60 text-accent font-bold text-[13px]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3
                    className="font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1.15 }}
                  >
                    {d.title}
                  </h3>
                  <p
                    className="text-white/70 leading-relaxed text-[15px]"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {d.body}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
