import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tour Our Campus | Seven Arrows Recovery',
  description:
    'A cinematic tour of Seven Arrows Recovery — 160 private acres at the base of the Swisshelm Mountains in Cochise County, Arizona. Walk the land before you call.',
};

import PageHero from '@/components/PageHero';
import TourStats from '@/components/tour/TourStats';
import RanchIntro from '@/components/tour/RanchIntro';
import RanchZones from '@/components/tour/RanchZones';
import TourGallery from '@/components/tour/TourGallery';
import DayOnTheRanch from '@/components/tour/DayOnTheRanch';
import TheHorses from '@/components/tour/TheHorses';
import NightSky from '@/components/tour/NightSky';
import LiveReviewsBand from '@/components/LiveReviewsBand';
import { RanchAddress, RanchMap } from '@/components/RanchAddress';
import TourCTA from '@/components/tour/TourCTA';

export default function TourPage() {
  return (
    <>
      {/* Phase 1 — cinematic video hero */}
      <PageHero
        label="Campus Tour"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Campus Tour' }]}
        title={[
          'Step onto ',
          { text: 'the ranch', accent: true },
          '.',
        ]}
        description="A visual walk through Seven Arrows — our residences, therapy spaces, the herd, and the Arizona sky that made us choose this land."
      />

      {/* Phase 2 — stats strip */}
      <TourStats />

      {/* Phase 3 — full-bleed intro photo + overlay card */}
      <RanchIntro />

      {/* Phase 4 — bento of the six zones of the ranch */}
      <RanchZones />

      {/* Phase 5 — big editorial gallery with lightbox */}
      <TourGallery />

      {/* Phase 6 — a day on the ranch, sunrise → milky way */}
      <DayOnTheRanch />

      {/* Phase 7 — the equine program feature */}
      <TheHorses />

      {/* "Where the ranch sits" — physical address + Google Map.
          Tour visitors are typically planning a real drive, so the
          map is more important here than anywhere else on the
          public site. */}
      <section className="bg-warm-bg py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),minmax(0,1.6fr)] gap-8 lg:gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-foreground/55 mb-2">Find us</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              ~1 hour southeast of Tucson, in Cochise County.
            </h2>
            <p className="text-foreground/70 leading-relaxed mb-5">
              The closest commercial airport is Tucson International (TUS).
              We meet most clients at the gate by appointment — let us know
              your arrival window when you book.
            </p>
            <RanchAddress />
          </div>
          <RanchMap className="aspect-video lg:aspect-square" ariaLabel="Map of Seven Arrows Recovery near Tucson, Arizona" />
        </div>
      </section>

      {/* Phase 8 — night sky feature */}
      <NightSky />

      {/* Phase 9 — alumni voices. Pulled live from our public Google
           listing via the Places API (server-cached 1hr). Falls back
           to editorial stubs if the API is unavailable. */}
      <LiveReviewsBand
        eyebrow="What the Place Did For Them"
        headlineLead="Alumni don't talk about"
        headlineAccent="the program"
        headlineTail={'. They talk about the land.'}
      />

      {/* Phase 10 — closing cinematic CTA */}
      <TourCTA />
    </>
  );
}
