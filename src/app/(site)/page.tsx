import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drug Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Premier drug and alcohol rehab in Arizona — residential treatment on a 160-acre ranch at the base of the Swisshelm Mountains. Call (866) 718-1665.',
};

// Re-render the homepage at most every 60s so a Set-live / timeline
// edit on /app/landing propagates without the page going fully
// dynamic. The set-live + timeline-save API routes also call
// revalidatePath('/') for instant invalidation when an admin acts.
export const revalidate = 60;


import Hero from "@/components/Hero";
import { fetchLiveHeroSources } from "@/lib/landing-hero";
import TourStats from "@/components/tour/TourStats";
import PlaceToHeal from "@/components/PlaceToHeal";
import ProgramSection from "@/components/ProgramSection";
import TreatmentServices from "@/components/TreatmentServices";
import ComprehensiveTreatment from "@/components/ComprehensiveTreatment";
import InsuranceCarousel from "@/components/InsuranceCarousel";
import CampusTour from "@/components/CampusTour";

import DailyLifeSection from "@/components/DailyLifeSection";
import AboutSection from "@/components/AboutSection";
import FAQSection from "@/components/FAQSection";
import GoogleReviewsCinema from "@/components/GoogleReviewsCinema";
import BlogPreview from "@/components/BlogPreview";
import OutingsSection from "@/components/outings/OutingsSection";

const structuredData = {
  "@context": "https://schema.org",
  "@type": ["Organization", "MedicalBusiness", "LocalBusiness"],
  "@id": "https://sevenarrowsrecoveryarizona.com/#organization",
  name: "Seven Arrows Recovery",
  url: "https://sevenarrowsrecoveryarizona.com",
  logo: "https://sevenarrowsrecoveryarizona.com/images/logo.png",
  hasMap:
    "https://www.google.com/maps/place/Seven+Arrows+Recovery/@31.6816641,-109.5974003,840m/data=!3m2!1e3!4b1!4m6!3m5!1s0x86d757b12c931e93:0x4359cfcad3b471d5!8m2!3d31.6816641!4d-109.5974003!16s%2Fg%2F11sf3vbq_s",
  geo: {
    "@type": "GeoCoordinates",
    latitude: 31.6816641,
    longitude: -109.5974003,
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "27",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Kelly Jameson" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Five stars aren't enough to express that going to treatment at Seven Arrows made me want to live my life again. Before I admitted to treatment there I was struggling with severe alcoholism, anxiety, and PTSD. I thought my life would always be filled with flashbacks, intrusive/racing thoughts, and low self-esteem.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Jessica Collins" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Life changing. Completely and totally changed my entire life. I came to 7 Arrows with little will to live, overwhelmed with my past trauma and my addictions ruining me. These people and this place infiltrated my heart and soul. I really cannot put into words what those 41 days did for me.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Josh" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "Seven Arrows is a very special place to rest and recover. The remote setting is peaceful, with desert and mountain views on a large property. Incorporating equine therapy as well as native American traditions, the experience is a departure from what one might expect in an urban rehab center.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Boots" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "I called 24 other facilities in the United States, but this one called to me, spiritually the most. I am a dual diagnosis. The moment I got the call back that I was admitted and arrival date, I had little idea of what was going to happen next. I arrived to find the most genuine humans that walk this earth.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Roger McGehee" },
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody:
        "This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful thing. I would recommend Seven Arrows to anyone struggling with addiction.",
    },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-866-718-1665",
    contactType: "admissions",
    areaServed: "US",
    availableLanguage: ["English", "Spanish"],
    hoursAvailable: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "00:00",
      closes: "23:59",
    },
  },
  sameAs: [
    "https://www.facebook.com/sevenarrowsrecovery",
    "https://www.instagram.com/sevenarrowsrecovery",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "2491 W Jefferson Rd",
    addressLocality: "Elfrida",
    addressRegion: "AZ",
    postalCode: "85610",
    addressCountry: "US",
  },
  foundingDate: "2020",
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    minValue: 10,
    maxValue: 50,
  },
  areaServed: [
    { "@type": "State", name: "Arizona" },
    { "@type": "City", name: "Phoenix" },
    { "@type": "City", name: "Scottsdale" },
    { "@type": "City", name: "Tucson" },
    { "@type": "City", name: "Mesa" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What types of addiction does Seven Arrows Recovery treat?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Seven Arrows Recovery treats alcohol addiction, drug addiction (including opioids, methamphetamine, cocaine, and prescription drugs), dual diagnosis (co-occurring mental health and substance use disorders), and trauma-related conditions through our proprietary Forward-Facing\u00ae Accelerated Recovery approach.",
      },
    },
    {
      "@type": "Question",
      name: "Does Seven Arrows accept insurance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Seven Arrows Recovery accepts most major insurance plans including Aetna, Blue Cross Blue Shield, Cigna, Humana, UnitedHealthcare, and TRICARE. We offer free insurance verification\u2014our admissions team can check your benefits within 15 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "How long is the treatment program?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Treatment length is individualized based on each person\u2019s needs. Residential programs typically range from 30 to 90 days. Our clinical team works with you to determine the right duration for lasting recovery.",
      },
    },
    {
      "@type": "Question",
      name: "What makes Seven Arrows different from other rehab centers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Seven Arrows Recovery is a boutique facility with small group sizes, nestled at the base of the Swisshelm Mountains in Arizona. We offer a unique combination of evidence-based clinical treatment, holistic therapies, and our specialty Forward-Facing\u00ae Accelerated Recovery approach that addresses trauma and addiction simultaneously.",
      },
    },
    {
      "@type": "Question",
      name: "Is my information kept confidential?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Seven Arrows Recovery is fully HIPAA compliant. All patient information is protected by federal law. Your privacy is our priority throughout the admissions process and treatment.",
      },
    },
    {
      "@type": "Question",
      name: "What should I expect during the admissions process?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The admissions process is simple and compassionate. Call us at (866) 718-1665 or fill out our contact form. We\u2019ll verify your insurance, discuss your situation, and guide you through every step. Many clients begin treatment within 24\u201348 hours of their first call.",
      },
    },
  ],
};

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://sevenarrowsrecoveryarizona.com",
    },
  ],
};

export default async function Home() {
  // Read whichever landing_heros row is flagged is_live (curated by
  // /app/landing) and shape its video_urls as HeroSource[]. Falls
  // back to Hero's own hardcoded set if nothing is live or the
  // anon read fails.
  const heroSources = await fetchLiveHeroSources();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <Hero sources={heroSources} />
      <TourStats />
      <AboutSection />
      <PlaceToHeal />
      <ProgramSection />
      <TreatmentServices />
      <ComprehensiveTreatment />
      <CampusTour />
      <InsuranceCarousel />
      <GoogleReviewsCinema />
      <DailyLifeSection />
      <BlogPreview />
      <FAQSection />
      <OutingsSection variant="landing" />
    </>
  );
}
