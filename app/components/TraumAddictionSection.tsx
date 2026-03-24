import { Link } from '@remix-run/react';

export default function TraumAddictionSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="traumaddiction-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left content card */}
          <div className="lg:col-span-6">
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <p className="section-label mb-4">Not Just Trauma-Focused</p>
              <h2
                id="traumaddiction-heading"
                className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-6"
              >
                TraumAddiction&trade; Specialists
              </h2>
              <p className="text-foreground/70 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-body)' }}>
                While you may hear the term &ldquo;trauma-informed&rdquo; or &ldquo;trauma-focused&rdquo;
              </p>
              <p className="text-foreground/70 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                Seven Arrows Recovery offers our specialty TraumAddiction&trade; treatment approach which offers a
                combination of body-based interventions from ancient wisdom traditions and traditional psychotherapy
                methods to address the psychological, spiritual, emotional and physiological needs of each individual,
                creating a more integrative, effective, and holistic approach to healing.
              </p>
              <Link href="/treatment/traumaddiction" className="btn-dark">
                TraumAddiction&trade;
              </Link>
            </div>
          </div>

          {/* Right image */}
          <div className="lg:col-span-6 lg:mt-8">
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(135deg, #e8d8c8 0%, #c8a888 50%, #a08878 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
