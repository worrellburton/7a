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
import { fetchPublicTeam } from '@/lib/team';

export const revalidate = 60;

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
        title="Meet Our Team"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Who We Are', href: '/who-we-are' },
          { label: 'Meet Our Team' },
        ]}
        description="Behind every successful recovery is a dedicated team of professionals. At Seven Arrows Recovery, our clinicians, therapists, and support staff bring expertise, empathy, and genuine care to everything they do."
        image="/images/equine-therapy-portrait.jpg"
      />

      <MissionVision directorImage={directorImage} />

      {/* Team Intro */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">The people you will meet</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              A small team, <em className="not-italic text-primary">on purpose.</em>
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows runs on a 6:1 client-to-staff ratio for a reason — it is
              how individual attention becomes structural instead of aspirational.
              Our clinicians, admissions team, medical staff, and holistic
              facilitators are the people you will actually talk to on the phone,
              meet on your first day, and keep in touch with after discharge.
              Many of us are in recovery ourselves.
            </p>
          </div>

          <TeamGrid team={team} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Let Our Team Guide Your Recovery
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Reach out today to speak with our admissions team. We are here to answer your questions
            and help you take the first step toward lasting change.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link href="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
