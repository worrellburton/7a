import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const posts = [
  {
    title: 'Understanding the Connection Between Trauma and Addiction',
    excerpt:
      'Research consistently shows that unresolved trauma is one of the strongest predictors of substance use disorders. Learn how our TraumAddiction\u2122 approach addresses both simultaneously.',
    category: 'Trauma & Recovery',
    date: 'March 15, 2026',
    image: '/7a/images/embrace-connection.jpg',
  },
  {
    title: '5 Signs It Is Time to Seek Professional Help for Addiction',
    excerpt:
      'Recognizing when casual use has crossed into dependency can be difficult. Here are five warning signs that it may be time to consider professional treatment.',
    category: 'Addiction Education',
    date: 'March 8, 2026',
    image: '/7a/images/horses-grazing.jpg',
  },
  {
    title: 'How Family Involvement Strengthens Recovery Outcomes',
    excerpt:
      'Addiction affects the entire family system. Discover why family therapy and education are essential components of lasting recovery and how Seven Arrows supports families.',
    category: 'Family & Recovery',
    date: 'February 28, 2026',
    image: '/7a/images/sound-healing-session.jpg',
  },
  {
    title: 'The Role of Nature in Healing: Why Our Location Matters',
    excerpt:
      'Situated at the base of the Swisshelm Mountains, our setting is more than scenic. Learn how the desert landscape actively supports the therapeutic process.',
    category: 'Holistic Wellness',
    date: 'February 20, 2026',
    image: '/7a/images/group-sunset-desert.jpg',
  },
  {
    title: 'What to Expect During Medically Supervised Detox',
    excerpt:
      'Detoxification is often the first step in recovery, and it does not have to be frightening. Here is what the process looks like at Seven Arrows Recovery.',
    category: 'Treatment',
    date: 'February 12, 2026',
    image: '/7a/images/covered-porch-desert-view.jpg',
  },
  {
    title: 'Building a Relapse Prevention Plan That Actually Works',
    excerpt:
      'A strong aftercare plan is one of the most important factors in sustaining long-term sobriety. Learn the key elements of an effective relapse prevention strategy.',
    category: 'Aftercare',
    date: 'February 5, 2026',
    image: '/7a/images/group-gathering-pavilion.jpg',
  },
];

export const meta: MetaFunction = () => [
  { title: "Blog" },
  { name: "description", content: "Insights, stories, and resources on addiction recovery, mental health, trauma healing, and holistic wellness from the team at Seven Arrows Recovery." },
];

export default function BlogPage() {
  return (
    <>
      <PageHero
        label="Blog"
        title="Blog"
        description="Insights, stories, and resources from the clinical team at Seven Arrows Recovery. Explore topics on addiction, trauma, mental health, and the journey to lasting recovery."
        image="/7a/images/resident-reading-window.jpg"
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
                <img src={post.image} alt={post.title} className="h-48 w-full object-cover" loading="lazy" />
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
