import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meet Our Team',
  description:
    'Meet the compassionate clinical team at Seven Arrows Recovery. Our therapists, counselors, and medical professionals are dedicated to guiding you through every step of recovery.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';
import { fetchPublicTeam } from '@/lib/team';

export const revalidate = 60;

export default async function MeetOurTeamPage() {
  const team = await fetchPublicTeam();

  return (
    <>
      <PageHero
        label="Our Team"
        title="Meet Our Team"
        description="Behind every successful recovery is a dedicated team of professionals. At Seven Arrows Recovery, our clinicians, therapists, and support staff bring expertise, empathy, and genuine care to everything they do."
        image="/images/equine-therapy-portrait.jpg"
      />

      {/* Team Intro */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">Compassionate Professionals</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Expertise Meets Empathy
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our multidisciplinary team includes licensed therapists, board-certified physicians,
              certified addiction counselors, and holistic practitioners. Many of our staff members
              are in recovery themselves, bringing a unique understanding and authenticity to the
              therapeutic relationship.
            </p>
          </div>

          {/* Team Grid */}
          {team.length === 0 ? (
            <p
              className="text-center text-foreground/50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Team profiles are being updated. Please check back soon.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {team.map((member) => (
                <Link
                  key={member.id}
                  href={`/who-we-are/meet-our-team/${member.slug}`}
                  className="group bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-warm-bg">
                    {member.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-primary/40 text-6xl font-bold">
                        {(member.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {member.full_name}
                    </h3>
                    {member.job_title && (
                      <p
                        className="text-primary/80 font-semibold text-sm mt-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {member.job_title}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
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
