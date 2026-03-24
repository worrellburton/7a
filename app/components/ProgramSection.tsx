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
              <Link href="/our-program" className="btn-outline">
                Our Program
              </Link>
            </div>
          </div>

          {/* Center video thumbnail */}
          <div className="lg:col-span-4">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-warm-card">
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(180deg, #c9a88a 0%, #a07050 50%, #806040 100%)',
                }}
              />
              {/* Play button overlay */}
              <button
                className="absolute inset-0 flex items-center justify-center group"
                aria-label="Play video about Seven Arrows Recovery"
              >
                <div className="w-16 h-16 bg-black/60 rounded-xl flex items-center justify-center group-hover:bg-black/80 transition-colors">
                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Right sunset image */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-warm-card mb-4">
              <div
                className="w-full h-full"
                style={{
                  background: 'linear-gradient(180deg, #f0a050 0%, #e08040 30%, #c06030 60%, #604030 100%)',
                }}
              />
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
