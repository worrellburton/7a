import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Meet Our Team',
  description:
    'Meet the compassionate clinical team at Seven Arrows Recovery. Our therapists, counselors, and medical professionals are dedicated to guiding you through every step of recovery.',
};

const teamMembers = [
  {
    name: 'Clinical Director',
    role: 'Clinical Director, LISAC, LPC',
    bio: 'With over 15 years in addiction medicine, our Clinical Director leads the treatment team with a focus on trauma-informed, evidence-based care.',
    gradient: 'from-primary/30 to-accent/20',
  },
  {
    name: 'Lead Therapist',
    role: 'Lead Therapist, LCSW',
    bio: 'Specializing in EMDR and somatic experiencing, our Lead Therapist brings deep expertise in treating co-occurring trauma and substance use disorders.',
    gradient: 'from-accent/30 to-primary/20',
  },
  {
    name: 'Medical Director',
    role: 'Medical Director, MD',
    bio: 'Board-certified in addiction medicine, our Medical Director oversees all medical protocols, detox management, and medication-assisted treatment.',
    gradient: 'from-primary/20 to-warm-card',
  },
  {
    name: 'Holistic Therapist',
    role: 'Holistic Therapist, RYT-500',
    bio: 'Our Holistic Therapist integrates yoga, mindfulness, breathwork, and equine-assisted therapy into each client\'s individualized treatment plan.',
    gradient: 'from-warm-card to-primary/20',
  },
  {
    name: 'Family Program Coordinator',
    role: 'Family Program Coordinator, LMFT',
    bio: 'Our Family Program Coordinator facilitates family therapy sessions and educational workshops designed to rebuild trust and strengthen support systems.',
    gradient: 'from-primary/30 to-warm-card',
  },
  {
    name: 'Admissions Counselor',
    role: 'Admissions Counselor',
    bio: 'Compassionate and knowledgeable, our Admissions Counselor guides clients and families through the intake process with care and confidentiality.',
    gradient: 'from-accent/20 to-primary/30',
  },
];

export default function MeetOurTeamPage() {
  return (
    <>
      <PageHero
        label="Our Team"
        title="Meet Our Team"
        description="Behind every successful recovery is a dedicated team of professionals. At Seven Arrows Recovery, our clinicians, therapists, and support staff bring expertise, empathy, and genuine care to everything they do."
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.role}
                className="bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                {/* Photo Placeholder */}
                <div
                  className={`h-64 bg-gradient-to-br ${member.gradient} flex items-center justify-center`}
                >
                  <div className="w-24 h-24 rounded-full bg-white/40 flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-primary/50"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-1">{member.name}</h3>
                  <p
                    className="text-primary font-semibold text-sm mb-3"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {member.role}
                  </p>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
