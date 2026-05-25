import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import { JsonLd } from '@/components/JsonLd';
import { buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo/schema';

// Insurance section landing — sits at /insurance and consolidates
// the cost + coverage FAQ that previously had no home (the
// per-carrier pages at /insurance/aetna, /insurance/cigna, etc.
// each carry carrier-specific copy but no shared "how does this
// work" FAQ). Drives qualified inquiries by answering the
// objections that stall a family before they pick up the phone.
//
// Accessibility: every Q/A pair is a native <details>/<summary>
// element so keyboard nav + screen readers get expand/collapse
// semantics for free. Heading hierarchy stays H1 (page) → H2
// (section) → <summary> (button-role question) so HeadingsMap and
// axe both report a clean outline.
//
// Schema: matching FAQPage JSON-LD via buildFAQSchema so Google's
// rich-results card surfaces the same Q/A pairs in SERP.

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Insurance & Cost FAQ | Seven Arrows Recovery',
  description:
    'How insurance works at Seven Arrows Recovery — in-network carriers, verification of benefits timing, self-pay rates, scholarships, single-case agreements, and length-of-stay coverage.',
  alternates: { canonical: 'https://sevenarrowsrecoveryarizona.com/insurance' },
  openGraph: {
    type: 'website',
    url: 'https://sevenarrowsrecoveryarizona.com/insurance',
    title: 'Insurance & Cost FAQ | Seven Arrows Recovery',
    description:
      'How insurance works at Seven Arrows Recovery — verification timing, self-pay rates, scholarships, and what your plan typically covers.',
  },
};

const FAQ_PAIRS: Array<{ question: string; answer: string }> = [
  {
    question: 'Is Seven Arrows Recovery in-network with major insurance carriers?',
    answer:
      'Seven Arrows works with most major commercial PPO plans on an in-network or in-network-equivalent basis through negotiated rates. We are actively contracted with several payors directly and accept out-of-network benefits from the rest. The most accurate answer for your specific plan comes from a free verification of benefits — call (866) 718-1665 or use the form on this page.',
  },
  {
    question: 'Does Aetna cover residential treatment at Seven Arrows?',
    answer:
      'Aetna commercial PPO plans typically cover residential substance use disorder treatment when medical necessity criteria are met (DSM-5 SUD diagnosis, failed lower-acuity care, and ASAM-aligned clinical justification). Coverage levels vary by plan and employer; some plans cover 80-100% after deductible, others apply a copay or coinsurance. Our admissions team verifies your specific Aetna plan within 30 minutes.',
  },
  {
    question: 'Does Blue Cross Blue Shield (BCBS) cover treatment?',
    answer:
      'BCBS plans — Anthem, Blue Shield of California, and the various state Blues — generally cover residential treatment at Seven Arrows when medical necessity is documented. BCBS PPO is the most common plan we work with and the most likely to provide robust coverage. HMO plans usually require a single-case agreement (see below). We verify your specific BCBS plan before you commit to anything.',
  },
  {
    question: 'Does Cigna cover treatment?',
    answer:
      'Cigna plans, including those managed through Evernorth Behavioral Health, cover residential SUD treatment at Seven Arrows for most commercial PPO members. Cigna typically pre-authorizes 7-14 days at a time and reviews continued stay against ASAM criteria. We handle every utilization review on your behalf so you focus on treatment, not paperwork.',
  },
  {
    question: 'Does UnitedHealthcare (UHC) / Optum cover treatment?',
    answer:
      'UnitedHealthcare and Optum Behavioral Health cover residential treatment at Seven Arrows for most commercial PPO members. UHC has tightened utilization review for behavioral health in recent years; our clinical team is experienced in documenting medical necessity to satisfy UHC reviewers and routinely secures the full clinically-indicated length of stay.',
  },
  {
    question: 'What does self-pay typically cost?',
    answer:
      'Private-pay rates at Seven Arrows are competitive with other small-census residential programs in the Southwest. The 30-day base program is in the same range as a high-end private school tuition; 60- and 90-day extensions reduce the daily rate. We publish exact figures during admissions rather than online because the right answer depends on level of care, length of stay, and any specialty services (medication-assisted treatment, family program intensives, equine intensive, etc.). Call (866) 718-1665 for current numbers.',
  },
  {
    question: 'What is a single-case agreement (SCA) and when do I need one?',
    answer:
      'A single-case agreement is a one-time contract between Seven Arrows and your insurance company that allows out-of-network or HMO members to access in-network-equivalent benefits for a specific admission. SCAs typically apply when (a) your plan is HMO and Seven Arrows is the closest qualified facility, (b) your plan has no in-network residential SUD provider within reasonable travel distance, or (c) you have clinical needs that match Seven Arrows specifically. Our admissions team negotiates the SCA on your behalf at no additional cost to you.',
  },
  {
    question: 'How long does verification of benefits (VOB) take?',
    answer:
      'A standard VOB takes 15-30 minutes during business hours and up to 2 hours outside of them. We confirm in-network status, deductible status, out-of-pocket maximum, days remaining on annual benefit, pre-authorization requirements, and any specialty carve-outs. You receive a written summary by email or text so you can decide with full information. The VOB is free, confidential, and does not commit you to admission.',
  },
  {
    question: 'How do out-of-pocket maximums work for residential treatment?',
    answer:
      'Once you hit your plan\'s annual out-of-pocket maximum (OOPM), most plans cover 100% of covered services for the rest of the calendar year. Residential treatment days typically apply to OOPM, so if you have significant year-to-date medical spend, your effective cost at Seven Arrows can be lower than you expect. We model your projected OOPM during the VOB so you can see what each week of treatment actually costs you in real dollars.',
  },
  {
    question: 'Does Seven Arrows offer scholarships or sliding-scale rates?',
    answer:
      'Seven Arrows maintains a limited number of scholarship beds each year for individuals with demonstrated financial need and a strong commitment to long-term recovery. Scholarship applications are reviewed by clinical leadership; priority goes to (a) people in active crisis who would not otherwise have access to residential care, (b) first responders, veterans, and clergy, and (c) alumni-referred candidates whose families have been through Seven Arrows before. We also offer payment plans for the self-pay portion of any admission.',
  },
];

const FAQ_HEADING_ID = 'insurance-faq';
const BREADCRUMBS = [
  { name: 'Home', url: '/' },
  { name: 'Insurance', url: '/insurance' },
];

export default function InsurancePage() {
  return (
    <>
      <JsonLd data={[buildFAQSchema(FAQ_PAIRS), buildBreadcrumbSchema(BREADCRUMBS)]} />

      <PageHero
        label="Cost & Coverage"
        title={[
          { text: 'Insurance and ' },
          { text: 'cost', accent: true },
          { text: ' at Seven Arrows.' },
        ]}
        breadcrumbs={BREADCRUMBS.map((c) => ({ label: c.name, href: c.url }))}
        description="How insurance works here, what your plan typically covers, how long verification takes, and what to expect if you're self-paying. The honest version — not the salesy one."
        image="/hero/facility-exterior-mountains.jpg"
        ctas={[
          { kind: 'phone', display: '(866) 718-1665', eyebrow: 'Verify benefits · 24/7' },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      <section className="py-16 lg:py-24 bg-warm-bg" aria-labelledby={FAQ_HEADING_ID}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            id={FAQ_HEADING_ID}
            className="text-3xl lg:text-4xl font-bold text-foreground mb-3"
          >
            Insurance &amp; cost <em className="not-italic text-primary">FAQ</em>
          </h2>
          <p
            className="text-foreground/65 leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            The questions families call us with most often, answered straight. If
            your specific plan isn&apos;t covered here, call{' '}
            <a href="tel:+18667181665" className="font-semibold text-primary underline">
              (866) 718-1665
            </a>{' '}
            and our admissions team will run a free verification of benefits in under
            30 minutes.
          </p>

          <ul className="space-y-3 list-none p-0">
            {FAQ_PAIRS.map((qa) => (
              <li key={qa.question}>
                <details
                  className="group bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/30"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <summary
                    className="flex items-start justify-between gap-4 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-warm-bg/40 transition-colors"
                  >
                    <span className="font-semibold text-foreground text-[15px] leading-snug">
                      {qa.question}
                    </span>
                    <svg
                      className="w-5 h-5 text-foreground/50 shrink-0 mt-0.5 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 pt-1 text-foreground/75 text-[14.5px] leading-relaxed">
                    {qa.answer}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-white border-t border-black/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Carriers we work with
          </h2>
          <p
            className="text-foreground/65 leading-relaxed mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Tap any carrier for plan-specific details, common coverage levels, and
            what your VOB will surface.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: 'Aetna', href: '/insurance/aetna' },
              { name: 'Blue Cross Blue Shield', href: '/insurance/blue-cross-blue-shield' },
              { name: 'Cigna', href: '/insurance/cigna' },
              { name: 'Humana', href: '/insurance/humana' },
              { name: 'TRICARE', href: '/insurance/tricare' },
              { name: 'UnitedHealthcare', href: '/insurance/united-healthcare' },
            ].map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="block px-4 py-3 rounded-xl border border-black/10 bg-warm-bg/40 hover:bg-warm-bg hover:border-primary/30 text-foreground/80 hover:text-foreground font-semibold text-[13.5px] transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
