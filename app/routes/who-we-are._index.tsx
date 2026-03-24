import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const subPages = [
  {
    title: 'Meet Our Team',
    href: '/who-we-are/meet-our-team',
    description:
      'Get to know the compassionate clinicians, therapists, and support staff dedicated to your recovery.',
  },
  {
    title: 'Why Us?',
    href: '/who-we-are/why-us',
    description:
      'Discover what makes Seven Arrows Recovery different from other treatment centers.',
  },
  {
    title: 'Our Philosophy',
    href: '/who-we-are/our-philosophy',
    description:
      'A mind, body, and spirit approach grounded in seven core principles of lasting recovery.',
  },
  {
    title: 'FAQs',
    href: '/who-we-are/faqs',
    description:
      'Find answers to commonly asked questions about treatment, insurance, and the admissions process.',
  },
  {
    title: 'Blog',
    href: '/who-we-are/blog',
    description:
      'Insights, stories, and resources on addiction recovery, mental health, and holistic wellness.',
  },
  {
    title: 'Careers',
    href: '/who-we-are/careers',
    description:
      'Join our team and make a meaningful difference in the lives of those seeking recovery.',
  },
  {
    title: 'Areas We Serve',
    href: '/who-we-are/areas-we-serve',
    description:
      'We serve individuals and families across Arizona, including Tucson, Phoenix, and Cochise County.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Who We Are" },
  { name: "description", content: "Learn about Seven Arrows Recovery, a boutique drug and alcohol rehab center at the base of the Swisshelm Mountains in Arizona. Discover our team, philosophy, and what sets us apart." },
];

export default function WhoWeArePage() {
  return (
    <>
      <PageHero
        label="About Us"
        title="Who We Are"
        description="Seven Arrows Recovery is a boutique addiction treatment center nestled at the base of the Swisshelm Mountains in southeastern Arizona. We provide personalized, evidence-based care in an intimate setting designed for deep healing."
        image="/7a/images/group-sunset-desert.jpg"
      />

      {/* Intro Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-label mb-4">Our Story</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              A Place to Heal, Grow, and Begin Again
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows Recovery was founded on a simple belief: lasting recovery happens when
              people are treated as whole human beings, not just a diagnosis. Our boutique facility
              sits on a serene stretch of land at the base of Arizona&apos;s Swisshelm Mountains,
              where the desert landscape itself becomes part of the healing process.
            </p>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              With intentionally small group sizes, a world-class clinical team, and our proprietary
              TraumAddiction&#8482; approach, we offer a level of individualized care that larger
              facilities simply cannot match. Here, every client is known by name, and every
              treatment plan is built from the ground up.
            </p>
          </div>
        </div>
      </section>

      {/* Sub-pages Grid */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-4">Explore</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Learn More About Seven Arrows
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {page.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {page.description}
                </p>
                <span
                  className="inline-block mt-4 text-primary font-semibold text-sm tracking-wide uppercase"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Learn More &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Take the First Step?
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team is available around the clock to answer your questions and help you
            begin the journey to recovery. Call us today or reach out online.
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
