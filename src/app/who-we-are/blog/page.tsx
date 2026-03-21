import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Insights, stories, and resources on addiction recovery, mental health, trauma healing, and holistic wellness from the team at Seven Arrows Recovery.',
};

const posts = [
  {
    title: 'Understanding the Connection Between Trauma and Addiction',
    excerpt:
      'Research consistently shows that unresolved trauma is one of the strongest predictors of substance use disorders. Learn how our TraumAddiction\u2122 approach addresses both simultaneously.',
    category: 'Trauma & Recovery',
    date: 'March 15, 2026',
    gradient: 'from-primary/30 to-accent/20',
  },
  {
    title: '5 Signs It Is Time to Seek Professional Help for Addiction',
    excerpt:
      'Recognizing when casual use has crossed into dependency can be difficult. Here are five warning signs that it may be time to consider professional treatment.',
    category: 'Addiction Education',
    date: 'March 8, 2026',
    gradient: 'from-accent/30 to-primary/20',
  },
  {
    title: 'How Family Involvement Strengthens Recovery Outcomes',
    excerpt:
      'Addiction affects the entire family system. Discover why family therapy and education are essential components of lasting recovery and how Seven Arrows supports families.',
    category: 'Family & Recovery',
    date: 'February 28, 2026',
    gradient: 'from-primary/20 to-warm-card',
  },
  {
    title: 'The Role of Nature in Healing: Why Our Location Matters',
    excerpt:
      'Situated at the base of the Swisshelm Mountains, our setting is more than scenic. Learn how the desert landscape actively supports the therapeutic process.',
    category: 'Holistic Wellness',
    date: 'February 20, 2026',
    gradient: 'from-warm-card to-primary/20',
  },
  {
    title: 'What to Expect During Medically Supervised Detox',
    excerpt:
      'Detoxification is often the first step in recovery, and it does not have to be frightening. Here is what the process looks like at Seven Arrows Recovery.',
    category: 'Treatment',
    date: 'February 12, 2026',
    gradient: 'from-primary/30 to-warm-card',
  },
  {
    title: 'Building a Relapse Prevention Plan That Actually Works',
    excerpt:
      'A strong aftercare plan is one of the most important factors in sustaining long-term sobriety. Learn the key elements of an effective relapse prevention strategy.',
    category: 'Aftercare',
    date: 'February 5, 2026',
    gradient: 'from-accent/20 to-primary/30',
  },
];

export default function BlogPage() {
  return (
    <>
      <PageHero
        label="Blog"
        title="Blog"
        description="Insights, stories, and resources from the clinical team at Seven Arrows Recovery. Explore topics on addiction, trauma, mental health, and the journey to lasting recovery."
      />

      {/* Blog Grid */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <div
                key={post.title}
                className="bg-warm-bg rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group"
              >
                {/* Image Placeholder */}
                <div
                  className={`h-48 bg-gradient-to-br ${post.gradient} flex items-center justify-center`}
                >
                  <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-primary/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                      />
                    </svg>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-primary text-xs font-semibold uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {post.category}
                    </span>
                    <span className="text-foreground/40 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                      {post.date}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p
                    className="text-foreground/70 leading-relaxed text-sm"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {post.excerpt}
                  </p>
                  <span
                    className="inline-block mt-4 text-primary font-semibold text-sm tracking-wide uppercase"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Read More &rarr;
                  </span>
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
            Have Questions About Recovery?
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team is here to provide answers, guidance, and support. Reach out
            today to start a confidential conversation about treatment options.
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
