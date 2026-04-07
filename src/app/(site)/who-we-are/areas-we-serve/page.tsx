import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Areas We Serve',
  description:
    'Seven Arrows Recovery serves individuals and families across Arizona, including Tucson, Phoenix, Cochise County, and statewide. Located at the base of the Swisshelm Mountains.',
};

import PageHero from '@/components/PageHero';
import Link from 'next/link';

const areas = [
  {
    name: 'Tucson',
    description:
      'As the closest major city to our campus, Tucson is home to many of the individuals and families we serve. Our southeastern Arizona location offers Tucson residents a retreat from urban triggers while remaining within driving distance for family visits and therapy sessions.',
    distance: 'Approximately 90 miles',
  },
  {
    name: 'Phoenix Metropolitan Area',
    description:
      'Many of our clients come from the greater Phoenix area, including Scottsdale, Tempe, Mesa, Chandler, and Gilbert. The physical distance from the Valley provides the separation many people need to focus entirely on their recovery without the distractions of home.',
    distance: 'Approximately 220 miles',
  },
  {
    name: 'Cochise County',
    description:
      'Our facility is located in Cochise County, and we are proud to serve our local community. Residents of Sierra Vista, Bisbee, Douglas, and Willcox have access to world-class addiction treatment right in their own county.',
    distance: 'Local',
  },
  {
    name: 'Statewide Arizona',
    description:
      'From Flagstaff to Yuma, we welcome clients from every corner of Arizona. Our admissions team can help coordinate travel logistics, and our setting in the Swisshelm Mountains provides a powerful change of environment regardless of where in the state you call home.',
    distance: 'Statewide',
  },
  {
    name: 'Out-of-State Clients',
    description:
      'While our primary service area is Arizona, we regularly welcome clients from across the country. For many, traveling out of state for treatment provides the distance and fresh perspective needed to break free from old patterns.',
    distance: 'Nationwide',
  },
];

export default function AreasWeServePage() {
  return (
    <>
      <PageHero
        label="Areas We Serve"
        title="Areas We Serve"
        description="Seven Arrows Recovery is located in southeastern Arizona at the base of the Swisshelm Mountains. We serve individuals and families across Arizona and beyond."
        image="/images/sign-night-sky-milky-way.jpg"
      />

      {/* Areas Grid */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">Service Areas</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Serving Arizona and Beyond
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our boutique campus in Cochise County provides a healing environment far from the
              triggers of everyday life. Whether you are in Tucson, Phoenix, or anywhere in Arizona,
              our admissions team will help you get here safely and seamlessly.
            </p>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {areas.map((area) => (
              <div
                key={area.name}
                className="bg-warm-bg rounded-2xl p-8 hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h3 className="text-xl font-bold text-foreground">{area.name}</h3>
                  <span
                    className="text-primary text-sm font-semibold uppercase tracking-wider shrink-0"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {area.distance}
                  </span>
                </div>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Location Matters */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-4">Why Location Matters</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Healing Starts With a Change of Environment
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Research shows that removing oneself from familiar environments, people, and routines
            associated with substance use significantly improves treatment outcomes. Our location at
            the base of the Swisshelm Mountains provides exactly that: a serene, distraction-free
            setting where the desert landscape itself becomes part of the healing process.
          </p>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            At the same time, we are accessible. Tucson International Airport is within driving
            distance, and our admissions team can arrange transportation for clients arriving from
            anywhere in the state or across the country.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            No Matter Where You Are, Help Is Available
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team can help with insurance verification, travel coordination, and
            getting you to our campus quickly and comfortably. Call us today.
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
