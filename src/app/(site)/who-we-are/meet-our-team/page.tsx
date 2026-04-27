import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meet Our Team',
  description:
    'Meet the team at Seven Arrows Recovery — clinicians, medical staff, holistic facilitators, and the admissions team you will actually talk to when you call.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';
import TeamGrid from '@/components/TeamGrid';
import MissionVision from '@/components/MissionVision';
import TeamStatBand from '@/components/team/TeamStatBand';
import TeamQuoteCarousel from '@/components/team/TeamQuoteCarousel';
import HowWeHire from '@/components/team/HowWeHire';
import { fetchPublicTeam } from '@/lib/team';

// Dynamic so visibility flips in the admin Team Page Order modal
// take effect on the next page load instead of waiting up to a
// minute for ISR revalidation. The page is a single small Supabase
// query — well within the budget of a per-request render.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MeetOurTeamPage() {
  const team = await fetchPublicTeam();

  // Try to surface Lindsay Rothschild's avatar next to the "Our Vision"
  // block below the hero. Matching loosely so "Lindsay Rothschild" or
  // "Lindsay Rothchild" (the spelling variant the admissions team
  // sometimes uses) both land. Falls back to the default vision photo
  // when no match or no avatar_url is present.
  const lindsay = team.find((m) =>
    /lindsay/i.test(m.full_name) && /roth/i.test(m.full_name),
  );
  const directorImage = lindsay?.avatar_url || '/images/equine-therapy-portrait.jpg';

  return (
    <>
      <PageHero
        label="Our Team"
        title={[
          { text: 'Meet ' },
          { text: 'our team', accent: true },
          { text: '.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Meet Our Team' },
        ]}
        description="Behind every successful recovery is a dedicated team of professionals. At Seven Arrows Recovery, our clinicians, therapists, and support staff bring expertise, empathy, and genuine care to everything they do."
        image="/images/equine-therapy-portrait.jpg"
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Admissions · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      <MissionVision directorImage={directorImage} />

      <TeamStatBand team={team} />

      {/* Team Intro */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">The people you will meet</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Individualized care, <em className="not-italic text-primary">built into the structure.</em>
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows is intentionally designed as a small, highly attuned
              treatment environment where individualized care is built into the
              structure. Our entire team, from admissions to discharge, is highly
              trained and specialized in trauma-informed care and nervous system
              regulation. This means every interaction, not just therapy sessions,
              supports safety, resilience, and meaningful growth.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg mt-5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              From your first call through discharge and beyond, you are supported
              by a cohesive team committed to reducing shame, fostering connection,
              and helping you move forward with purpose.
            </p>
          </div>

          <TeamGrid team={team} />
        </div>
      </section>

      <TeamQuoteCarousel team={team} />

      <HowWeHire />

      {/* CTA Section — refined dark slab matching the brand admissions
          phone-pill pattern used elsewhere on the site. */}
      <section className="relative py-20 lg:py-28 bg-dark-section text-white overflow-hidden">
        {/* Soft warm glow behind the headline so the slab doesn't read
            as a flat rectangle. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(216,137,102,0.18) 0%, rgba(216,137,102,0) 55%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p
            className="flex items-center justify-center gap-3 text-[11px] tracking-[0.22em] uppercase font-semibold text-white/70 mb-5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span aria-hidden="true" className="block w-8 h-px bg-white/60" />
            Talk to a real person
            <span aria-hidden="true" className="block w-8 h-px bg-white/60" />
          </p>
          <h2
            className="text-3xl lg:text-5xl font-bold tracking-tight mb-5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The team you&rsquo;ve just met is the team that{' '}
            <em className="not-italic" style={{ color: 'var(--color-accent)' }}>picks up</em>.
          </h2>
          <p
            className="text-white/75 text-base lg:text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            One call — answered 24/7 by a compassionate admissions team
            member. No phone trees, no scripted intake; just a 15-to-30
            minute conversation about whether Seven Arrows is the right fit.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
            <a
              href="tel:+18669964308"
              className="inline-flex items-center gap-3 bg-primary hover:bg-primary-dark transition-colors rounded-full pl-3.5 pr-5 py-3 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
            >
              <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/12 ring-1 ring-white/15">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-primary" />
                </span>
              </span>
              <span className="flex flex-col items-start leading-tight text-left">
                <span
                  className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/75"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Admissions · 24/7
                </span>
                <span
                  className="text-white font-bold text-base sm:text-lg tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  (866) 996-4308
                </span>
              </span>
            </a>
            <Link
              href="/contact"
              className="text-white text-[12px] font-semibold tracking-[0.22em] uppercase border-b border-white/40 hover:border-white pb-1 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Contact us online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
