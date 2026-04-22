import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tour Our Campus | Seven Arrows Recovery',
  description:
    'A cinematic tour of Seven Arrows Recovery — 160 private acres at the base of the Swisshelm Mountains in Cochise County, Arizona. Explore the residences, equine arena, ceremonial spaces, and the Arizona night sky.',
};

import TourHero from '@/components/tour/TourHero';
import TourStats from '@/components/tour/TourStats';
import RanchIntro from '@/components/tour/RanchIntro';
import RanchZones from '@/components/tour/RanchZones';
import TourGallery from '@/components/tour/TourGallery';
import DayOnTheRanch from '@/components/tour/DayOnTheRanch';
import TheHorses from '@/components/tour/TheHorses';
import NightSky from '@/components/tour/NightSky';
import TourVoices from '@/components/tour/TourVoices';

export default function TourPage() {
  return (
    <>
      {/* Phase 1 — cinematic video hero */}
      <TourHero />

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

      {/* Phase 8 — night sky feature */}
      <NightSky />

      {/* Phase 9 — alumni voices about the setting */}
      <TourVoices />

      {/* Phase 10 coming next — closing CTA. */}
    </>
  );
}
