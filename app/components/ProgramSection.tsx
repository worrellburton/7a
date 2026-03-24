import { Link } from '@remix-run/react';

export default function ProgramSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" aria-labelledby="program-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left content card */}
          <div className="lg:col-span-5">
            <div className="bg-warm-card rounded-2xl p-8 lg:p-12">
              <p className="section-label mb-4">Seven Arrows</p>
              <h2
                id="program-heading"
                className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-6"
              >
                A Program Unlike the Rest
              </h2>
              <p className="text-foreground/70 leading-relaxed mb-8" style={{ fontFamily: 'var(--font-body)' }}>
                Seven Arrows Recovery is truly unlike any other drug &amp; alcohol program in
                the country. From our historic land to a staff that cares about the outcomes we
                are the treatment center you&apos;ve been looking for. Our individualized
                approach and unique combination of evidence-based, holistic, experiential
                and traditional therapies offers you a transformative experience in healing.
              </p>
              <Link to="/our-program" className="btn-outline">
                Our Program
              </Link>
            </div>
          </div>

          {/* Center video thumbnail */}
          <div className="lg:col-span-4">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-warm-card">
              <img src="/7a/images/equine-therapy-portrait.jpg" alt="Seven Arrows Recovery program" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>

          {/* Right sunset image */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-warm-card mb-4">
              <img src="/7a/images/group-sunset-desert.jpg" alt="A place to find yourself" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <p className="text-center text-sm tracking-[0.15em] text-foreground/60 uppercase" style={{ fontFamily: 'var(--font-sans)' }}>
              A Place to Find Yourself
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
