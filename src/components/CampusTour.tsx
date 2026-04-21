import Link from 'next/link';

// Expanded image pool — the marquee ticker needs enough tiles that the
// loop still feels full at wide viewports.
const tiles = [
  { src: '/images/facility-exterior-mountains.jpg', alt: 'Facility exterior with mountains' },
  { src: '/images/covered-porch-desert-view.jpg', alt: 'Covered porch with desert view' },
  { src: '/images/bedroom-shared.jpg', alt: 'Shared bedroom' },
  { src: '/images/group-gathering-pavilion.jpg', alt: 'Group gathering under pavilion at dusk' },
  { src: '/images/sound-healing-session.jpg', alt: 'Sound healing session' },
  { src: '/images/group-sunset-desert.jpg', alt: 'Group at sunset in the desert' },
  { src: '/images/horses-grazing.jpg', alt: 'Horses grazing' },
  { src: '/images/campfire-ceremony-circle.webp', alt: 'Campfire ceremony circle' },
];

export default function CampusTour() {
  return (
    <section className="py-20 lg:py-28 bg-white overflow-hidden" aria-labelledby="campus-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="section-label justify-center mb-4">Explore</p>
          <h2
            id="campus-heading"
            className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4"
          >
            Our Stunning Campus
          </h2>
          <p
            className="text-foreground/60 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Nestled at the base of the Swisshelm Mountains, our facility offers
            a serene environment for mind, body, and spirit healing.
          </p>
        </div>
      </div>

      {/* Marquee — two copies of the tile list slide left at a constant rate.
          Pauses on hover so visitors can actually focus on a shot. */}
      <div className="relative group">
        <div className="flex gap-5 animate-ticker group-hover:[animation-play-state:paused] w-max">
          {[...tiles, ...tiles].map((img, i) => (
            <div
              key={`${img.src}-${i}`}
              className="shrink-0 w-[280px] sm:w-[340px] lg:w-[420px] aspect-[4/3] rounded-2xl overflow-hidden bg-warm-bg shadow-sm"
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {/* Edge fades so tiles dissolve into the section rather than
            jump-cut against the margin. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
          style={{ background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0) 100%)' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
          style={{ background: 'linear-gradient(270deg, #fff 0%, rgba(255,255,255,0) 100%)' }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-12 text-center">
        <Link href="/tour" className="btn-outline">
          Tour Campus
        </Link>
      </div>
    </section>
  );
}
