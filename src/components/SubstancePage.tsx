import PageHero from '@/components/PageHero';
import Link from 'next/link';

/**
 * Shared template for substance-specific "What We Treat" pages that
 * don't need a bespoke layout. Keeps the structure consistent across
 * Inhalants / Ketamine / Cocaine / Methamphetamine / Benzodiazepine so
 * Google sees a clean sibling set, and saves us from hand-authoring
 * the same three-section scaffold five times.
 */

export interface SubstancePageData {
  /** Page-level metadata should live on the Next route's metadata
      export; these two are accepted only for legacy callers that pass
      the whole record to this template. */
  metaTitle?: string;
  metaDescription?: string;
  /** Hero label (eyebrow) — usually the parent section name. */
  heroLabel?: string;
  /** Display title in the hero + breadcrumb tail. */
  heroTitle: string;
  /** Hero one-liner. */
  heroDescription: string;
  /** Optional still poster for the hero video. */
  heroImage?: string;

  /** Left column of the "Understanding the Risks" section. */
  overview: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  /** Right column card list. */
  symptoms: {
    title: string;
    items: string[];
  };

  /** 2nd section — treatment approach grid. */
  approach: {
    eyebrow: string;
    title: string;
    intro: string;
    items: { title: string; description: string }[];
  };

  /** Closing CTA card. */
  cta: {
    title: string;
    body: string;
  };
}

export default function SubstancePage(data: SubstancePageData) {
  return (
    <>
      <PageHero
        label={data.heroLabel ?? 'What We Treat'}
        title={data.heroTitle}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'What We Treat', href: '/what-we-treat' },
          { label: data.heroTitle },
        ]}
        description={data.heroDescription}
        image={data.heroImage}
      />

      {/* Understanding the risks */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="section-label mb-4">{data.overview.eyebrow}</p>
              <h2
                className="font-bold tracking-tight text-foreground mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)',
                  lineHeight: 1.08,
                }}
              >
                {data.overview.title}
              </h2>
              <div
                className="space-y-4 text-foreground/75 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {data.overview.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <h3
                className="text-xl font-bold text-foreground mb-6"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {data.symptoms.title}
              </h3>
              <ul
                className="space-y-4 text-foreground/75"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {data.symptoms.items.map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="text-primary mt-1 font-bold">&#10003;</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Treatment approach */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label justify-center mb-4">{data.approach.eyebrow}</p>
            <h2
              className="font-bold tracking-tight text-foreground mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
                lineHeight: 1.05,
              }}
            >
              {data.approach.title}
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {data.approach.intro}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.approach.items.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 border border-black/5">
                <h3
                  className="text-xl font-bold text-foreground mb-3"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="font-bold tracking-tight text-foreground mb-6"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
              lineHeight: 1.05,
            }}
          >
            {data.cta.title}
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {data.cta.body}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/admissions#verify" className="btn-primary">
              Verify My Insurance
            </Link>
            <a href="tel:+18669964308" className="btn-outline">
              Call (866) 996-4308
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
