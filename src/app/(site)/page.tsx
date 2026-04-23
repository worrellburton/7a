import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drug Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery is a premier drug and alcohol rehab center in Arizona. We provide clinical and residential treatment in a small group setting at the base of the Swisshelm Mountains. Call (866) 996-4308.',
};


import Hero from "@/components/Hero";
import TrustBadges from "@/components/TrustBadges";
import PlaceToHeal from "@/components/PlaceToHeal";
import ProgramSection from "@/components/ProgramSection";
import TreatmentServices from "@/components/TreatmentServices";
import HeroStatsBand from "@/components/HeroStatsBand";
import InsuranceVerification from "@/components/InsuranceVerification";
import InsuranceCarousel from "@/components/InsuranceCarousel";
import CampusTour from "@/components/CampusTour";
import SevenArrowsExperience from "@/components/SevenArrowsExperience";
import Amenities from "@/components/Amenities";

import DailyLifeSection from "@/components/DailyLifeSection";
import AboutSection from "@/components/AboutSection";
import FAQSection from "@/components/FAQSection";
import GoogleReviewsCinema from "@/components/GoogleReviewsCinema";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import BlogPreview from "@/components/BlogPreview";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "@id": "https://sevenarrowsrecovery.com/#organization",
  name: "Seven Arrows Recovery",
  description:
    "A boutique drug and alcohol rehab center in Arizona offering clinical and residential treatment with a TraumAddiction\u2122 specialty approach.",
  url: "https://sevenarrowsrecovery.com",
  telephone: "+1-866-996-4308",
  address: {
    "@type": "PostalAddress",
    streetAddress: "2491 W Jefferson Rd",
    addressLocality: "Elfrida",
    addressRegion: "AZ",
    postalCode: "85610",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 31.9,
    longitude: -109.9,
  },
  areaServed: [
    { "@type": "State", name: "Arizona" },
    { "@type": "City", name: "Phoenix" },
    { "@type": "City", name: "Scottsdale" },
    { "@type": "City", name: "Tucson" },
    { "@type": "City", name: "Mesa" },
    { "@type": "City", name: "Tempe" },
    { "@type": "City", name: "Glendale" },
  ],
  medicalSpecialty: "Addiction Medicine",
  isAcceptingNewPatients: true,
  currenciesAccepted: "USD",
  paymentAccepted: "Insurance, Private Pay",
  hasCredential: [
    { "@type": "EducationalOccupationalCredential", credentialCategory: "JCAHO Accredited" },
    { "@type": "EducationalOccupationalCredential", credentialCategory: "LegitScript Certified" },
    { "@type": "EducationalOccupationalCredential", credentialCategory: "HIPAA Compliant" },
  ],
  availableService: [
    {
      "@type": "MedicalTherapy",
      name: "Residential Treatment",
      description: "Inpatient residential drug and alcohol addiction treatment",
    },
    {
      "@type": "MedicalTherapy",
      name: "Clinical Treatment",
      description: "Evidence-based clinical addiction treatment programs",
    },
    {
      "@type": "MedicalTherapy",
      name: "TraumAddiction Treatment",
      description:
        "Specialty treatment combining body-based interventions with traditional psychotherapy for trauma and addiction",
    },
    {
      "@type": "MedicalTherapy",
      name: "Holistic Therapy",
      description: "Holistic and experiential therapies including equine therapy",
    },
    {
      "@type": "MedicalTherapy",
      name: "Dual Diagnosis Treatment",
      description: "Integrated treatment for co-occurring mental health and substance use disorders",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "27",
    bestRating: "5",
  },
  priceRange: "$$$$",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "00:00",
    closes: "23:59",
  },
  sameAs: [
    "https://www.facebook.com/sevenarrowsrecovery",
    "https://www.instagram.com/sevenarrowsrecovery",
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
        text: "Seven Arrows Recovery treats alcohol addiction, drug addiction (including opioids, methamphetamine, cocaine, and prescription drugs), dual diagnosis (co-occurring mental health and substance use disorders), and trauma-related conditions through our proprietary TraumAddiction\u2122 approach.",
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
        text: "Seven Arrows Recovery is a boutique facility with small group sizes, nestled at the base of the Swisshelm Mountains in Arizona. We offer a unique combination of evidence-based clinical treatment, holistic therapies, and our specialty TraumAddiction\u2122 approach that addresses trauma and addiction simultaneously.",
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
        text: "The admissions process is simple and compassionate. Call us at (866) 996-4308 or fill out our contact form. We\u2019ll verify your insurance, discuss your situation, and guide you through every step. Many clients begin treatment within 24\u201348 hours of their first call.",
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
      item: "https://sevenarrowsrecovery.com",
    },
  ],
};

export default function Home() {
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
      <Hero />
      <TrustBadges />
      <HeroStatsBand />
      <PlaceToHeal />
      <ProgramSection />
      <TreatmentServices />
      <CampusTour />
      <InsuranceCarousel />
      <DailyLifeSection />
      <GoogleReviewsCinema />
      <SevenArrowsExperience />
      <Amenities />
      <InsuranceVerification />
      <AboutSection />
      <BlogPreview />
      <FAQSection />
      <StickyMobileCTA />
    </>
  );
}
