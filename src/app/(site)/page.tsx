import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Addiction & Trauma Treatment Center in Arizona | Seven Arrows Recovery',
  description:
    'Residential addiction and trauma treatment on a 161-acre ranch at the base of the Swisshelm Mountains in Arizona. Call (866) 718-1665.',
};

// Re-render the homepage at most every 60s so a Set-live / timeline
// edit on /feather/landing propagates without the page going fully
// dynamic. The set-live + timeline-save API routes also call
// revalidatePath('/') for instant invalidation when an admin acts.
export const revalidate = 60;


import dynamic from "next/dynamic";
import Hero from "@/components/Hero";
import { fetchLiveHeroSources } from "@/lib/landing-hero";
import PlaceToHeal from "@/components/PlaceToHeal";
import ProgramSection from "@/components/ProgramSection";
import TreatmentServices from "@/components/TreatmentServices";
// Phase 8 — Heavy below-the-fold client sections lazy-imported so
// the homepage's initial JS payload skips them; they hydrate when
// the browser actually scrolls into range. ~830 LOC of client code
// (InsuranceCarousel 207 + CampusTour 393 + FAQSection 232) shifted
// out of the LCP-blocking bundle.
const InsuranceCarousel = dynamic(() => import("@/components/InsuranceCarousel"));
const CampusTour = dynamic(() => import("@/components/CampusTour"));

import DailyLifeSection from "@/components/DailyLifeSection";
import AboutSection from "@/components/AboutSection";
const FAQSection = dynamic(() => import("@/components/FAQSection"));
import GoogleReviewsCinema from "@/components/GoogleReviewsCinema";
import OutingsSection from "@/components/outings/OutingsSection";
import { JsonLd } from "@/components/JsonLd";
import {
  buildMedicalBusinessSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
  RANCH_GOOGLE_MAP_URL,
} from "@/lib/seo/schema";

// Five top reviews surfaced in the home-page schema. Editing the
// list adds/removes reviews from Google's rich-results card without
// touching JSX. Keep at five — that's the validator sweet spot.
const HOME_INLINE_REVIEWS = [
  {
    authorName: "Kelly Jameson",
    ratingValue: 5,
    reviewBody:
      "Five stars aren't enough to express that going to treatment at Seven Arrows made me want to live my life again. Before I admitted to treatment there I was struggling with severe alcoholism, anxiety, and PTSD. I thought my life would always be filled with flashbacks, intrusive/racing thoughts, and low self-esteem.",
  },
  {
    authorName: "Jessica Collins",
    ratingValue: 5,
    reviewBody:
      "Life changing. Completely and totally changed my entire life. I came to 7 Arrows with little will to live, overwhelmed with my past trauma and my addictions ruining me. These people and this place infiltrated my heart and soul. I really cannot put into words what those 41 days did for me.",
  },
  {
    authorName: "Josh",
    ratingValue: 5,
    reviewBody:
      "Seven Arrows is a very special place to rest and recover. The remote setting is peaceful, with desert and mountain views on a large property. Incorporating equine therapy as well as native American traditions, the experience is a departure from what one might expect in an urban rehab center.",
  },
  {
    authorName: "Boots",
    ratingValue: 5,
    reviewBody:
      "I called 24 other facilities in the United States, but this one called to me, spiritually the most. I am a dual diagnosis. The moment I got the call back that I was admitted and arrival date, I had little idea of what was going to happen next. I arrived to find the most genuine humans that walk this earth.",
  },
  {
    authorName: "Roger McGehee",
    ratingValue: 5,
    reviewBody:
      "This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful thing. I would recommend Seven Arrows to anyone struggling with addiction.",
  },
];

const HOME_FAQ = [
  {
    question: "What types of addiction does Seven Arrows Recovery treat?",
    answer:
      "Seven Arrows Recovery treats alcohol addiction, drug addiction (including opioids, methamphetamine, cocaine, and prescription drugs), dual diagnosis (co-occurring mental health and substance use disorders), and trauma-related conditions through our proprietary Forward-Facing® Accelerated Recovery approach.",
  },
  {
    question: "Does Seven Arrows accept insurance?",
    answer:
      "Yes, Seven Arrows Recovery accepts most major insurance plans including Aetna, Blue Cross Blue Shield, Cigna, Humana, UnitedHealthcare, and TRICARE. We offer free insurance verification—our admissions team can check your benefits within 15 minutes.",
  },
  {
    question: "How long is the treatment program?",
    answer:
      "Treatment length is individualized based on each person’s needs. Residential programs typically range from 30 to 90 days. Our clinical team works with you to determine the right duration for lasting recovery.",
  },
  {
    question: "What makes Seven Arrows different from other rehab centers?",
    answer:
      "Seven Arrows Recovery is a treatment center with small group sizes, nestled at the base of the Swisshelm Mountains in Arizona. We offer a unique combination of evidence-based clinical treatment, holistic therapies, and our specialty Forward-Facing® Accelerated Recovery approach that addresses trauma and addiction simultaneously.",
  },
  {
    question: "Is my information kept confidential?",
    answer:
      "Absolutely. Seven Arrows Recovery is fully HIPAA compliant. All patient information is protected by federal law. Your privacy is our priority throughout the admissions process and treatment.",
  },
  {
    question: "What should I expect during the admissions process?",
    answer:
      "The admissions process is simple and compassionate. Call us at (866) 718-1665 or fill out our contact form. We’ll verify your insurance, discuss your situation, and guide you through every step. Many clients begin treatment within 24–48 hours of their first call.",
  },
];


export default async function Home() {
  // Read whichever landing_heros row is flagged is_live (curated by
  // /feather/landing) and shape its video_urls as HeroSource[]. Falls
  // back to Hero's own hardcoded set if nothing is live or the
  // anon read fails.
  const heroSources = await fetchLiveHeroSources();
  return (
    <>
      <JsonLd
        data={[
          buildMedicalBusinessSchema({
            aggregateRating: { ratingValue: 4.8, reviewCount: 27 },
            hasMap: RANCH_GOOGLE_MAP_URL,
            reviews: HOME_INLINE_REVIEWS,
          }),
          buildFAQSchema(HOME_FAQ),
          buildBreadcrumbSchema([{ name: 'Home', url: '/' }]),
        ]}
      />
      <Hero sources={heroSources} />
      <AboutSection />
      <TreatmentServices />
      <PlaceToHeal />
      <ProgramSection />
      <CampusTour />
      <InsuranceCarousel />
      <GoogleReviewsCinema />
      <DailyLifeSection />
      <FAQSection />
      <OutingsSection variant="landing" />
    </>
  );
}
