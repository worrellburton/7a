import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const openings = [
  {
    title: 'Licensed Clinical Social Worker (LCSW)',
    type: 'Full-Time',
    description:
      'Provide individual and group therapy using evidence-based modalities. Experience with trauma-informed care and substance use disorders preferred.',
  },
  {
    title: 'Registered Nurse (RN)',
    type: 'Full-Time',
    description:
      'Deliver medical care and medication management in our residential detox and inpatient programs. Current Arizona RN license required.',
  },
  {
    title: 'Behavioral Health Technician',
    type: 'Full-Time',
    description:
      'Support clients through daily activities, monitor safety, and provide compassionate residential oversight. CNA or BHT certification a plus.',
  },
  {
    title: 'Holistic Therapist (Yoga / Mindfulness)',
    type: 'Part-Time',
    description:
      'Lead yoga sessions, meditation groups, and breathwork practices as part of our holistic treatment programming. RYT-200 or higher required.',
  },
  {
    title: 'Admissions Coordinator',
    type: 'Full-Time',
    description:
      'Serve as the first point of contact for prospective clients and families. Handle insurance verification, intake assessments, and admissions logistics.',
  },
  {
    title: 'Equine-Assisted Therapy Facilitator',
    type: 'Part-Time',
    description:
      'Facilitate equine-assisted therapy sessions as part of our experiential programming. Certification in equine-assisted psychotherapy required.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Careers" },
  { name: "description", content: "Join the team at Seven Arrows Recovery. We are hiring compassionate clinicians, therapists, and support staff dedicated to making a difference in addiction treatment." },
];

export default function CareersPage() {
  return (
    <>
      <PageHero
        label="Careers"
        title="Careers"
        description="At Seven Arrows Recovery, our team is the heart of everything we do. If you are passionate about helping others heal, we want to hear from you."
        image="/images/covered-porch-desert-view.jpg"
      />

      {/* Why Work Here */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">Why Seven Arrows</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              More Than a Job. A Mission.
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Working at Seven Arrows means being part of a close-knit team that genuinely changes
              lives. Our boutique setting at the base of the Swisshelm Mountains in southeastern
              Arizona offers a work environment unlike any other in the industry. Small caseloads,
              meaningful clinical work, and a culture of mutual respect make Seven Arrows a place
              where professionals thrive.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: 'Small Caseloads',
                description:
                  'Our boutique model means you can focus deeply on each client rather than managing an overwhelming caseload.',
              },
              {
                title: 'Collaborative Culture',
                description:
                  'Work alongside a multidisciplinary team that values every voice, from clinicians to support staff.',
              },
              {
                title: 'Stunning Location',
                description:
                  'Our campus sits at the base of the Swisshelm Mountains, offering a peaceful, inspiring environment for both clients and staff.',
              },
            ].map((benefit) => (
              <div key={benefit.title} className="bg-warm-bg rounded-2xl p-8">
                <h3 className="text-xl font-bold text-foreground mb-3">{benefit.title}</h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-4">Open Positions</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Current Openings
            </h2>
          </div>
          <div className="space-y-4 max-w-4xl mx-auto">
            {openings.map((position) => (
              <div
                key={position.title}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h3 className="text-xl font-bold text-foreground">{position.title}</h3>
                  <span
                    className="text-primary text-sm font-semibold uppercase tracking-wider shrink-0"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {position.type}
                  </span>
                </div>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {position.description}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p
              className="text-foreground/70 text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Do not see your role listed? We are always looking for talented, compassionate
              individuals. Send your resume to{' '}
              <span className="text-primary font-semibold">careers@sevenarrowsrecovery.com</span>.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Interested in Joining Our Team?
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Reach out to learn more about open positions, our culture, and what it is like to work
            at a boutique treatment center in the heart of Arizona&apos;s high desert.
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
