import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const teamMembers = [
  {
    name: 'Clinical Director',
    role: 'Clinical Director, LISAC, LPC',
    bio: 'With over 15 years in addiction medicine, our Clinical Director leads the treatment team with a focus on trauma-informed, evidence-based care.',
    image: '/images/equine-therapy-portrait.jpg',
  },
  {
    name: 'Lead Therapist',
    role: 'Lead Therapist, LCSW',
    bio: 'Specializing in EMDR and somatic experiencing, our Lead Therapist brings deep expertise in treating co-occurring trauma and substance use disorders.',
    image: '/images/individual-therapy-session.jpg',
  },
  {
    name: 'Medical Director',
    role: 'Medical Director, MD',
    bio: 'Board-certified in addiction medicine, our Medical Director oversees all medical protocols, detox management, and medication-assisted treatment.',
    image: '/images/covered-porch-desert-view.jpg',
  },
  {
    name: 'Holistic Therapist',
    role: 'Holistic Therapist, RYT-500',
    bio: 'Our Holistic Therapist integrates yoga, mindfulness, breathwork, and equine-assisted therapy into each client\'s individualized treatment plan.',
    image: '/images/sound-healing-session.jpg',
  },
  {
    name: 'Family Program Coordinator',
    role: 'Family Program Coordinator, LMFT',
    bio: 'Our Family Program Coordinator facilitates family therapy sessions and educational workshops designed to rebuild trust and strengthen support systems.',
    image: '/images/group-sunset-desert.jpg',
  },
  {
    name: 'Admissions Counselor',
    role: 'Admissions Counselor',
    bio: 'Compassionate and knowledgeable, our Admissions Counselor guides clients and families through the intake process with care and confidentiality.',
    image: '/images/embrace-connection.jpg',
  },
];

export const meta: MetaFunction = () => [
  { title: "Meet Our Team" },
  { name: "description", content: "Meet the compassionate clinical team at Seven Arrows Recovery. Our therapists, counselors, and medical professionals are dedicated to guiding you through every step of recovery." },
];

export default function MeetOurTeamPage() {
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.role}
                className="bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <img src={member.image} alt={member.name} className="h-64 w-full object-cover" loading="lazy" />
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
            <Link to="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
