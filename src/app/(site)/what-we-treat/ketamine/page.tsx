import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { ketamineContent } from '@/lib/substances/ketamine';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Ketamine Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Residential ketamine addiction treatment in Arizona. Somatic-first trauma therapy for chronic dissociation, urological assessment, cognitive rehabilitation, and dual-diagnosis care for ketamine use disorder.',
};

const MEDICAL_WEB_PAGE_LD = `{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/ketamine#webpage",
  "url": "https://sevenarrowsrecoveryarizona.com/what-we-treat/ketamine",
  "name": "Ketamine Addiction Treatment | Seven Arrows Recovery",
  "description": "Residential ketamine addiction treatment in Arizona. Somatic-first trauma therapy for chronic dissociation, urological assessment, cognitive rehabilitation, and dual-diagnosis care for ketamine use disorder.",
  "inLanguage": "en-US",
  "isPartOf": {
    "@type": "WebSite",
    "@id": "https://sevenarrowsrecoveryarizona.com/#website",
    "url": "https://sevenarrowsrecoveryarizona.com",
    "name": "Seven Arrows Recovery"
  },
  "about": {
    "@type": "MedicalCondition",
    "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/ketamine#condition",
    "name": "Ketamine Use Disorder",
    "alternateName": [
      "Ketamine Addiction",
      "Ketamine Dependence",
      "Ketamine Cystitis",
      "Dissociative Drug Dependence",
      "Ketamine Abuse",
      "Recreational Ketamine Dependence"
    ],
    "associatedAnatomy": { "@type": "AnatomicalSystem", "name": "Central Nervous System" },
    "possibleTreatment": [
      { "@type": "MedicalTherapy", "name": "Somatic-First Trauma Therapy for Chronic Dissociation", "description": "Forward-Facing® Accelerated Recovery combined with body-based interventions designed to rebuild felt-sense safety. The nervous system learns that the body is a place it can live in again without needing chemical distance." },
      { "@type": "MedicalTherapy", "name": "Urological Assessment", "description": "Baseline urological review for clients with bladder symptoms, with referral to specialist partners when needed. Addresses ketamine-induced cystitis and related physical damage from chronic use." },
      { "@type": "MedicalTherapy", "name": "Cognitive Rehabilitation", "description": "Structured executive-function work, attention training, and memory support while cognitive symptoms recover during abstinence." },
      { "@type": "MedicalTherapy", "name": "Trauma-Informed Therapy", "description": "Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — with careful attention to clients for whom ketamine-assisted therapy previously opened material without containment." },
      { "@type": "MedicalTherapy", "name": "Equine-Assisted Therapy", "description": "Horses require presence. Dissociative clients relearn embodiment through a relationship that demands it — gently and without judgment." },
      { "@type": "MedicalTherapy", "name": "Breathwork, Yoga, and Sound Therapy", "description": "Embodiment practices that restore the felt-sense of being in the body. Central to ketamine recovery rather than peripheral." },
      { "@type": "MedicalTherapy", "name": "Dual-Diagnosis Care", "description": "Integrated treatment for depression, PTSD, anxiety, and dissociative disorders — the conditions most often riding alongside chronic ketamine use." }
    ]
  },
  "provider": {
    "@type": ["MedicalBusiness", "LocalBusiness"],
    "@id": "https://sevenarrowsrecoveryarizona.com/#organization",
    "name": "Seven Arrows Recovery",
    "url": "https://sevenarrowsrecoveryarizona.com",
    "telephone": "+1-866-718-1665",
    "address": { "@type": "PostalAddress", "streetAddress": "2491 W Jefferson Rd", "addressLocality": "Elfrida", "addressRegion": "AZ", "postalCode": "85610", "addressCountry": "US" }
  },
  "audience": {
    "@type": "MedicalAudience",
    "audienceType": "Patient",
    "healthCondition": { "@type": "MedicalCondition", "name": "Ketamine Use Disorder" }
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://sevenarrowsrecoveryarizona.com/" },
      { "@type": "ListItem", "position": 2, "name": "What We Treat", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat" },
      { "@type": "ListItem", "position": 3, "name": "Ketamine Addiction", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat/ketamine" }
    ]
  }
}`;

const LOCAL_BUSINESS_LD = `{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://sevenarrowsrecoveryarizona.com/#organization",
  "name": "Seven Arrows Recovery",
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "27", "bestRating": "5", "worstRating": "1" },
  "review": [
    { "@type": "Review", "author": { "@type": "Person", "name": "Kelly Jameson" }, "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "reviewBody": "Five stars aren't enough to express that going to treatment at Seven Arrows made me want to live my life again. Before I admitted to treatment there I was struggling with severe alcoholism, anxiety, and PTSD. I thought my life would always be filled with flashbacks, intrusive/racing thoughts, and low self-esteem." },
    { "@type": "Review", "author": { "@type": "Person", "name": "Jessica Collins" }, "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "reviewBody": "Life changing. Completely and totally changed my entire life. I came to 7 Arrows with little will to live, overwhelmed with my past trauma and my addictions ruining me. These people and this place infiltrated my heart and soul. I really cannot put into words what those 41 days did for me." },
    { "@type": "Review", "author": { "@type": "Person", "name": "Josh" }, "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "reviewBody": "Seven Arrows is a very special place to rest and recover. The remote setting is peaceful, with desert and mountain views on a large property. Incorporating equine therapy as well as native American traditions, the experience is a departure from what one might expect in an urban rehab center." },
    { "@type": "Review", "author": { "@type": "Person", "name": "Boots" }, "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "reviewBody": "I called 24 other facilities in the United States, but this one called to me, spiritually the most. I am a dual diagnosis. The moment I got the call back that I was admitted and arrival date, I had little idea of what was going to happen next. I arrived to find the most genuine humans that walk this earth." },
    { "@type": "Review", "author": { "@type": "Person", "name": "Roger McGehee" }, "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "reviewBody": "This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful thing. I would recommend Seven Arrows to anyone struggling with addiction." }
  ]
}`;

export default function KetamineAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: MEDICAL_WEB_PAGE_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LOCAL_BUSINESS_LD }} />
      <SubstancePage10Phase content={ketamineContent} />
    </>
  );
}
