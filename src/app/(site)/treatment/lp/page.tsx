import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import AdmissionsForm from '@/components/AdmissionsForm';
import StickyMobileCTA from '@/components/StickyMobileCTA';

// Conversion landing page for paid marketing campaigns
// (sevenarrowsrecoveryarizona.com/treatment/lp). Deliberately focused:
// one hero, one primary action (call / verify insurance), a lead form
// high on the page, trust + proof + objection-handling, and a closing
// CTA. Reuses the shared PageHero + AdmissionsForm so it stays on-brand.
//
// NOTE: kept out of the nav and sitemap on purpose (ad traffic only). If
// you want it to stay ad-only, add `robots: { index: false }` below.

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Get Help Today | Trauma-Informed Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Confidential, 24/7 admissions for residential addiction & trauma treatment in Arizona. Verify your insurance in minutes and speak with a real clinician today.',
};

const PHONE_DISPLAY = '(866) 718-1665';
const PHONE_HREF = 'tel:+18667181665';

const VALUE_PROPS: { title: string; body: string }[] = [
  {
    title: 'Speak to a clinician today',
    body: 'No call centers. A licensed member of our clinical team answers, 24/7 — confidential and judgment-free.',
  },
  {
    title: 'Most major insurance accepted',
    body: 'We verify your benefits in minutes and tell you exactly what’s covered before you commit to anything.',
  },
  {
    title: 'Beds available now',
    body: 'Same-week admissions to a private 160-acre ranch at the base of the Swisshelm Mountains in Arizona.',
  },
  {
    title: 'Trauma-informed & dual-diagnosis',
    body: 'We treat addiction and its root — trauma, anxiety, depression — together, with a 1:1 primary clinician.',
  },
];

const TRUST: string[] = [
  'Joint Commission–ready clinical standards',
  'In-network with major insurers',
  'Low client-to-staff ratio',
  '1:1 primary clinician',
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How fast can I get in?',
    a: 'Often the same week. Call now or verify your insurance below and an admissions clinician will call you back today to arrange travel and a bed.',
  },
  {
    q: 'Will my insurance cover it?',
    a: 'Most PPO and many other plans cover residential treatment. Submit the form below and we’ll run a free, no-obligation benefits check and tell you your exact out-of-pocket before you decide.',
  },
  {
    q: 'Is this confidential?',
    a: 'Completely. Your inquiry is protected and private. Nothing is shared without your consent, and there’s never any pressure.',
  },
  {
    q: 'What makes Seven Arrows different?',
    a: 'A private Arizona ranch, a trauma-informed clinical model that treats addiction and its root causes together, and small groups with genuine 1:1 clinician time — not a factory.',
  },
];

export default function CampaignLandingPage() {
  return (
    <>
      <PageHero
        label="Confidential Help · Available 24/7"
        title={[
          { text: 'Recovery starts with ' },
          { text: 'one call', accent: true },
          { text: '.' },
        ]}
        description="Seven Arrows Recovery is a trauma-informed residential program on a private ranch in Arizona. Talk to a real clinician now, verify your insurance in minutes, and get a clear plan for getting in — today."
        ctas={[
          { kind: 'phone', display: PHONE_DISPLAY, eyebrow: 'Admissions · 24/7' },
          { kind: 'link', href: '#verify', label: 'Verify your insurance' },
        ]}
      />

      {/* Trust strip */}
      <section className="border-b border-black/5 bg-warm-bg/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-2 text-[12.5px] font-medium text-foreground/70">
                <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Value props + lead form */}
      <section id="verify" className="scroll-mt-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary mb-3">Why families choose us</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-8" style={{ fontFamily: 'var(--font-display)' }}>
              Real help, without the runaround.
            </h2>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-7">
              {VALUE_PROPS.map((v) => (
                <div key={v.title}>
                  <h3 className="text-[15px] font-bold text-foreground mb-1.5">{v.title}</h3>
                  <p className="text-[14px] leading-relaxed text-foreground/70">{v.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-9 rounded-2xl bg-warm-bg/60 border border-black/5 p-5 flex items-center gap-4">
              <div className="min-w-0">
                <p className="text-[13px] text-foreground/60">Prefer to talk now?</p>
                <a href={PHONE_HREF} className="text-2xl font-bold text-primary" style={{ fontFamily: 'var(--font-display)' }}>{PHONE_DISPLAY}</a>
              </div>
              <span className="ml-auto shrink-0 text-[11px] font-semibold uppercase tracking-wider text-foreground/45">24/7 · Confidential</span>
            </div>
          </div>

          {/* The conversion element */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-3xl border border-black/10 bg-white shadow-[0_24px_60px_-30px_rgba(60,48,42,0.5)] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Verify your insurance &amp; get a call back today
              </h2>
              <p className="mt-2 text-[13.5px] text-foreground/60">
                Free, confidential, no obligation. We’ll check your benefits and call you back — usually within the hour.
              </p>
              <div className="mt-6">
                <AdmissionsForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-warm-bg/40 border-y border-black/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="flex items-center justify-center gap-1 text-primary mb-5" aria-label="5 star rating">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.364 1.118l1.287 3.958c.3.922-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.784.57-1.838-.196-1.539-1.118l1.286-3.958a1 1 0 00-.363-1.118L2.075 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z" />
              </svg>
            ))}
          </div>
          <blockquote className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
            &ldquo;They answered the phone at 11pm and had my brother in a bed two days later. For the first time in years, our family has him back.&rdquo;
          </blockquote>
          <p className="mt-5 text-[13px] font-semibold uppercase tracking-wider text-foreground/50">Family member · Verified review</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 text-center" style={{ fontFamily: 'var(--font-display)' }}>
            Answers, before you call.
          </h2>
          <div className="divide-y divide-black/8">
            {FAQS.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="text-[15.5px] font-bold text-foreground mb-1.5">{f.q}</h3>
                <p className="text-[14px] leading-relaxed text-foreground/70">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-foreground text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            You don’t have to figure this out alone.
          </h2>
          <p className="mt-4 text-white/70 max-w-2xl mx-auto text-[15px] leading-relaxed">
            A clinician is standing by right now. Call for a confidential conversation, or verify your insurance and we’ll come to you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={PHONE_HREF}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-bold text-white shadow-lg hover:brightness-110 transition"
            >
              Call {PHONE_DISPLAY}
            </a>
            <Link
              href="#verify"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-[15px] font-bold text-white hover:bg-white/10 transition"
            >
              Verify my insurance
            </Link>
          </div>
          <p className="mt-5 text-[12px] uppercase tracking-wider text-white/45">Confidential · Available 24/7</p>
        </div>
      </section>

      <StickyMobileCTA />
    </>
  );
}
