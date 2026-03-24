import { Link } from '@remix-run/react';

const posts = [
  {
    title: 'When Drinking Stops Working: Recognizing the Signs of Addiction',
    excerpt: 'A compassionate guide to understanding when substance use has crossed from choice to compulsion.',
    category: 'Recovery Roadmap',
    date: 'March 24, 2026',
    image: '/7a/images/resident-reading-window.jpg',
    href: '/who-we-are/blog/when-drinking-stops-working',
  },
  {
    title: 'Your First Week in Treatment',
    excerpt: 'A day-by-day guide to what really happens when you arrive — written for anyone afraid to make the call.',
    category: 'Recovery Roadmap',
    date: 'March 24, 2026',
    image: '/7a/images/covered-porch-desert-view.jpg',
    href: '/who-we-are/blog/what-happens-when-you-walk-through-the-door',
  },
  {
    title: 'Understanding the Connection Between Trauma and Addiction',
    excerpt: 'Learn how our TraumAddiction\u2122 approach addresses trauma and addiction simultaneously.',
    category: 'Trauma & Recovery',
    date: 'March 15, 2026',
    image: '/7a/images/embrace-connection.jpg',
  },
];

export default function BlogPreview() {
  return (
    <section className="py-16 lg:py-20 bg-warm-bg" aria-labelledby="blog-preview-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="section-label mb-3">From Our Blog</p>
            <h2
              id="blog-preview-heading"
              className="text-2xl lg:text-3xl font-bold text-foreground"
            >
              Recovery Resources
            </h2>
          </div>
          <Link
            href="/who-we-are/blog"
            className="hidden sm:inline-flex text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            View All Posts &rarr;
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post) => {
            const Tag = post.href ? Link : 'div';
            const tagProps = post.href ? { href: post.href } : {};
            return (
              <Tag
                key={post.title}
                {...tagProps}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group block no-underline"
              >
                <img src={post.image} alt={post.title} className="h-40 w-full object-cover" loading="lazy" />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-primary text-[10px] font-semibold uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {post.category}
                    </span>
                    <span className="text-foreground/30 text-[10px]" style={{ fontFamily: 'var(--font-body)' }}>
                      {post.date}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p
                    className="text-foreground/60 text-sm leading-relaxed line-clamp-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {post.excerpt}
                  </p>
                </div>
              </Tag>
            );
          })}
        </div>

        <div className="sm:hidden text-center mt-6">
          <Link
            href="/who-we-are/blog"
            className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            View All Posts &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
