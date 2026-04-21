import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tour Our Campus',
  description:
    'Take a visual tour of Seven Arrows Recovery, nestled at the base of the Swisshelm Mountains in Cochise County, Arizona. Explore our sweat lodge, equine area, living quarters, and more.',
};

import Link from 'next/link';

import PageHero from '@/components/PageHero';

// Ordered for visual rhythm — alternating wide/portrait shots, people/
// landscape/interior so the masonry doesn't clump all horses together
// or all rooms together. CSS columns flow top-to-bottom per column, so
// neighbors in this array end up stacked vertically, not side-by-side.
const galleryImages: { src: string; alt: string }[] = [
  { src: '/images/facility-exterior-mountains.jpg', alt: 'Facility exterior against the Swisshelm Mountains' },
  { src: '/images/horses-grazing.jpg', alt: 'Two horses grazing on the ranch' },
  { src: '/images/group-sunset-desert.jpg', alt: 'Group watching sunset over the desert' },
  { src: '/images/bedroom-shared.jpg', alt: 'Comfortable shared bedroom' },
  { src: '/images/campfire-ceremony-circle.webp', alt: 'Indoor campfire ceremony circle' },
  { src: '/images/covered-porch-desert-view.jpg', alt: 'Covered porch with rocking chairs and desert view' },
  { src: '/images/sound-healing-session.jpg', alt: 'Sound healing session with singing bowls' },
  { src: '/images/equine-therapy-portrait.jpg', alt: 'Portrait with horse during equine-assisted therapy' },
  { src: '/images/common-area-living-room.jpg', alt: 'Warm common-area living room' },
  { src: '/images/group-gathering-pavilion.jpg', alt: 'Evening group gathering under a pavilion' },
  { src: '/images/individual-therapy-session.jpg', alt: 'Individual therapy session' },
  { src: '/images/resident-reading-window.jpg', alt: 'Resident reading quietly by a window' },
  { src: '/images/horse-sketch-artwork.jpg', alt: 'Horse sketch artwork in a common room' },
  { src: '/images/group-therapy-room.jpg', alt: 'Light-filled group therapy room' },
  { src: '/images/embrace-connection.jpg', alt: 'Two people embracing in a moment of connection' },
  { src: '/images/sign-night-sky-milky-way.jpg', alt: 'Seven Arrows sign under the Milky Way' },
];

const quickFacts = [
  { label: '160 Acres', description: 'Private Arizona ranch' },
  { label: 'Swisshelm Mts.', description: 'Direct mountain views' },
  { label: '6:1', description: 'Client-to-staff ratio' },
  { label: 'Chef-Prepared', description: 'Meals on-site daily' },
];

export default function TourPage() {
  return (
    <>
      <PageHero
        label="Campus Tour"
        title="Step Onto the Ranch"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Tour' },
        ]}
        description="A visual walk through Seven Arrows — our residences, therapy spaces, the ranch, the horses, and the Arizona sky that made us choose this land."
        image="/images/facility-exterior-mountains.jpg"
      />

      {/* Quick facts strip — sits right below the hero so the gallery that
          follows isn't the first thing demanding attention. */}
      <section className="bg-warm-bg py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
            {quickFacts.map((fact) => (
              <div key={fact.label} className="text-center sm:text-left">
                <p
                  className="text-2xl lg:text-3xl font-bold text-foreground leading-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {fact.label}
                </p>
                <p
                  className="text-xs lg:text-sm text-foreground/60 mt-1 tracking-wide"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {fact.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Masonry gallery — CSS columns preserve each photo's natural aspect
          ratio without us hand-assigning row spans. break-inside-avoid keeps
          an individual tile from splitting across columns. */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10 lg:mb-14">
            <p className="section-label mb-4">A Visual Tour</p>
            <h2
              className="text-3xl lg:text-[2.75rem] font-bold text-foreground leading-[1.05] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              The Ranch, Room by Room
            </h2>
            <p
              className="text-foreground/70 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Every corner of the property was chosen for a reason — wide skies, direct mountain
              views, quiet rooms to think, and a working ranch that lets equine therapy happen
              every single day.
            </p>
          </div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 lg:gap-4 space-y-3 lg:space-y-4">
            {galleryImages.map((img) => (
              <figure
                key={img.src}
                className="break-inside-avoid overflow-hidden rounded-xl lg:rounded-2xl bg-warm-bg group"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Swisshelm setting — one last editorial moment before the CTA. */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-2">
              <p className="section-label mb-4">Our Setting</p>
              <h2
                className="text-3xl lg:text-[2.5rem] font-bold text-foreground leading-[1.05] mb-6"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                The Swisshelm Mountains
              </h2>
              <p
                className="text-foreground/70 leading-relaxed mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Seven Arrows sits at the base of Arizona&apos;s Swisshelm Mountains in Cochise
                County. The rugged, unspoiled landscape provides a naturally therapeutic
                environment — far removed from the triggers and stressors of everyday life.
              </p>
              <p
                className="text-foreground/70 leading-relaxed mb-8"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Wide-open skies, desert sunsets, and mountain vistas create the backdrop for
                reflection, healing, and rediscovery. Our clients consistently describe the
                setting as one of the most powerful parts of their recovery.
              </p>
              <Link href="/contact" className="btn-primary">
                Schedule a Visit
              </Link>
            </div>
            <div className="lg:col-span-3 grid grid-cols-2 gap-3">
              <div className="col-span-2 aspect-[16/9] rounded-2xl overflow-hidden">
                <img
                  src="/images/facility-exterior-mountains.jpg"
                  alt="Seven Arrows at the base of the Swisshelm Mountains"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden">
                <img
                  src="/images/group-sunset-desert.jpg"
                  alt="Group at sunset"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="aspect-square rounded-2xl overflow-hidden">
                <img
                  src="/images/sign-night-sky-milky-way.jpg"
                  alt="Seven Arrows sign under the Milky Way"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl lg:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            See It for Yourself
          </h2>
          <p
            className="text-foreground/70 mb-8 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Nothing compares to experiencing the campus in person. Contact our admissions team
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
