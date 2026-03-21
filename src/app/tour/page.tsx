import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/PageHero';

export const metadata: Metadata = {
  title: 'Tour Our Campus',
  description:
    'Take a virtual tour of Seven Arrows Recovery, nestled at the base of the Swisshelm Mountains in Cochise County, Arizona. Explore our sweat lodge, equine area, living quarters, and more.',
};

const campusHighlights = [
  {
    title: 'Sweat Lodge',
    description:
      'A sacred space for ceremonial healing and spiritual renewal, guided by experienced practitioners.',
    gradient: 'from-amber-700 via-amber-600 to-yellow-500',
  },
  {
    title: 'Equine Area',
    description:
      'Our equine-assisted therapy grounds provide a powerful setting for building trust, empathy, and emotional awareness.',
    gradient: 'from-green-800 via-green-600 to-emerald-400',
  },
  {
    title: 'Swisshelm Mountains',
    description:
      'Surrounded by the dramatic Swisshelm Mountain range, our campus offers breathtaking views and a profound sense of peace.',
    gradient: 'from-slate-700 via-stone-500 to-amber-300',
  },
  {
    title: 'Living Quarters',
    description:
      'Comfortable, well-appointed private and semi-private rooms designed to feel like home during your stay.',
    gradient: 'from-primary via-amber-600 to-yellow-400',
  },
  {
    title: 'Common Areas',
    description:
      'Warm gathering spaces for group sessions, peer connection, and relaxation between therapeutic activities.',
    gradient: 'from-stone-600 via-warm-card to-warm-bg',
  },
  {
    title: 'Dining Facilities',
    description:
      'Nutritious, chef-prepared meals served in a communal dining space that fosters fellowship and healthy habits.',
    gradient: 'from-orange-700 via-orange-500 to-yellow-400',
  },
];

export default function TourPage() {
  return (
    <>
      <PageHero
        label="Virtual Tour"
        title="Tour Our Campus"
        description="Explore the grounds of Seven Arrows Recovery, a boutique treatment center set at the base of Arizona's Swisshelm Mountains. Every detail of our campus was designed to support healing, reflection, and renewal."
      />

      {/* Virtual Tour Placeholder */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label justify-center mb-4">Experience Our Facility</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Virtual Tour
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our full interactive virtual tour is coming soon. In the meantime, explore the
              highlights of our campus below or{' '}
              <Link href="/contact" className="text-primary underline hover:text-primary-dark">
                schedule an in-person visit
              </Link>
              .
            </p>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, #a0522d 0%, #c67a4a 40%, #ede4da 100%)',
            }}
          >
            <div className="flex items-center justify-center h-72 lg:h-96">
              <div className="text-center text-white/90">
                <svg
                  className="mx-auto mb-4 w-16 h-16 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  360° Virtual Tour Coming Soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Highlights Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label justify-center mb-4">Our Grounds</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Campus Highlights
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Nestled in Cochise County at the base of the Swisshelm Mountains, every corner
              of our campus is purposefully designed to nurture recovery and personal growth.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campusHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl overflow-hidden bg-warm-card shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Gradient image placeholder */}
                <div
                  className={`h-48 bg-gradient-to-br ${item.gradient}`}
                  aria-label={`Photo of ${item.title}`}
                />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Swisshelm Mountains Setting */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label mb-4">Our Setting</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                The Swisshelm Mountains
              </h2>
              <p
                className="text-foreground/70 leading-relaxed mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Seven Arrows Recovery sits at the base of Arizona&apos;s majestic Swisshelm
                Mountains in Cochise County. The rugged, unspoiled landscape provides a
                naturally therapeutic environment — far removed from the triggers and stressors
                of everyday life.
              </p>
              <p
                className="text-foreground/70 leading-relaxed mb-8"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Wide-open skies, desert sunsets, and mountain vistas create the ideal backdrop
                for reflection, healing, and rediscovery. Our clients consistently describe the
                setting as one of the most powerful parts of their recovery journey.
              </p>
              <Link href="/contact" className="btn-primary">
                Schedule a Visit
              </Link>
            </div>
            <div
              className="rounded-2xl h-80 lg:h-96"
              style={{
                background:
                  'linear-gradient(160deg, #4a6741 0%, #8b7355 40%, #c4956a 70%, #e8c9a0 100%)',
              }}
              aria-label="Scenic view of the Swisshelm Mountains"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            See It for Yourself
          </h2>
          <p
            className="text-foreground/70 mb-8 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Nothing compares to experiencing our campus in person. Contact our admissions team
            to arrange a private tour or start the admissions process today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admissions" className="btn-primary">
              Start Admissions
            </Link>
            <Link href="/contact" className="btn-outline">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
