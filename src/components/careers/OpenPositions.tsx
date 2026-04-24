'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Open-positions section on /careers.
 *
 * Reduced to the two buckets we actually recruit through right now:
 *
 *   • BHTs — the role we hire for most often and want the widest
 *     possible pipeline on.
 *   • Other — everything else (clinical, medical, holistic,
 *     admissions, interns). Openings shift often enough that a live
 *     bulleted list goes stale fast; a single "tell us about
 *     yourself" path captures more qualified applicants with less
 *     maintenance.
 *
 * Each card offers two parallel ways to submit interest:
 *   - tap-to-email (for recruiters / applicants with a resume ready)
 *   - inline short form that drops a structured message into our
 *     careers inbox without making anyone attach a CV.
 */

type Bucket = 'bht' | 'other';

interface BucketConfig {
  id: Bucket;
  eyebrow: string;
  title: string;
  body: string;
  emailSubject: string;
  placeholder: string;
}

const buckets: BucketConfig[] = [
  {
    id: 'bht',
    eyebrow: 'Behavioral Health Technicians',
    title: 'BHTs — always hiring.',
    body: 'The spine of day-to-day residential life. Supports clients through meals, groups, ranch activities, and evening milieu. No clinical license required — warmth, steadiness, and good boundaries are the job. On-the-job training provided.',
    emailSubject: 'BHT application — Seven Arrows Recovery',
    placeholder: 'Tell us about yourself — any BHT or CNA experience, shift preferences, and why Seven Arrows feels like the right place.',
  },
  {
    id: 'other',
    eyebrow: 'Everything else',
    title: 'Clinical, medical, holistic, admissions, interns.',
    body: "Openings rotate — clinicians (LCSW / LPC / LMFT / LISAC), nurses, admissions, holistic facilitators, and intern pathways (masters-level clinical, holistic, and admissions tracks). If you're qualified and interested, we'd rather hear from you than have you guess whether we're hiring.",
    emailSubject: 'Careers inquiry — Seven Arrows Recovery',
    placeholder: 'Tell us your background, your license or training (if any), and the kind of role you\'re looking for. We\'ll get back to you.',
  },
];

export default function OpenPositions() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
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
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="openings"
      ref={ref}
      className="scroll-mt-20 py-24 lg:py-32 bg-white"
      aria-labelledby="openings-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-3xl mb-12 lg:mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s',
          }}
        >
          <p className="section-label mb-5">Open positions</p>
          <h2
            id="openings-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.2vw, 3rem)',
              lineHeight: 1.04,
            }}
          >
            Two ways to <em className="not-italic text-primary">tell us you&rsquo;re interested</em>.
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            We hire BHTs constantly — apply below. For everything else,
            drop us a short note so the right person can call you back.
            The list is never the whole list.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {buckets.map((b, i) => (
            <BucketCard key={b.id} bucket={b} visible={visible} delay={0.15 + i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BucketCard({
  bucket,
  visible,
  delay,
}: {
  bucket: BucketConfig;
  visible: boolean;
  delay: number;
}) {
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      // The role/track distinction (BHT vs Everything Else) lives in
      // bucket.emailSubject; prefix the message body so the admin
      // Careers list shows which track at a glance.
      const messageWithTrack = `[${bucket.emailSubject}]\n\n${message}`;
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'careers',
          firstName: name,
          email,
          message: messageWithTrack,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setSubmitError('Could not send. Please email info@sevenarrowsrecovery.com directly.');
        return;
      }
      setSent(true);
    } catch {
      setSubmitError('Could not send. Please email info@sevenarrowsrecovery.com directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article
      className="rounded-3xl bg-warm-bg border border-black/5 p-7 lg:p-9 flex flex-col"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `all 0.95s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      <p
        className="text-[11px] tracking-[0.22em] uppercase font-semibold text-primary mb-3"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {bucket.eyebrow}
      </p>
      <h3
        className="text-foreground font-bold mb-3"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 2vw, 1.75rem)', lineHeight: 1.1 }}
      >
        {bucket.title}
      </h3>
      <p
        className="text-foreground/70 leading-relaxed mb-6"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {bucket.body}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 mb-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/15 text-sm bg-white focus:border-primary focus:outline-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/15 text-sm bg-white focus:border-primary focus:outline-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
        <textarea
          required
          rows={4}
          placeholder={bucket.placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-black/15 text-sm bg-white focus:border-primary focus:outline-none resize-y"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        {submitError && (
          <p className="text-red-600 text-xs">{submitError}</p>
        )}
        <button
          type="submit"
          disabled={submitting || sent}
          className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl px-5 py-3 text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {sent ? 'Sent — we’ll be in touch' : submitting ? 'Sending…' : 'Send it to careers'}
        </button>
      </form>

      <div className="mt-auto pt-4 border-t border-black/10 text-center">
        <p
          className="text-[12px] text-foreground/50 mb-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Or email us directly with a resume attached
        </p>
        <a
          href={`mailto:info@sevenarrowsrecovery.com?subject=${encodeURIComponent(bucket.emailSubject)}`}
          className="inline-flex items-center gap-1.5 text-primary font-semibold border-b border-primary/40 pb-0.5 tracking-[0.1em] uppercase text-[11px] hover:text-primary-dark hover:border-primary transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          info@sevenarrowsrecovery.com
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
            <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
    </article>
  );
}
