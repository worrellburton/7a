import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Cocaine Addiction Rehab In Arizona | Seven Arrows Recovery',
  description:
    'Residential cocaine addiction treatment in Arizona. Nervous-system focused protocols with cardiac-safe stabilization, trauma-informed therapy, somatic-CBT, equine-assisted work, and dual-diagnosis care for stimulant use disorder.',
};

import PageHero from '@/components/PageHero';
import TheReward from '@/components/cocaine/TheReward';
import TheCycle from '@/components/cocaine/TheCycle';
import TheBody from '@/components/cocaine/TheBody';
import WithdrawalTimeline from '@/components/cocaine/WithdrawalTimeline';
import WhoWeSee from '@/components/cocaine/WhoWeSee';
import OurApproach from '@/components/cocaine/OurApproach';
import RewardRewiring from '@/components/cocaine/RewardRewiring';
import CocaineCTA from '@/components/cocaine/CocaineCTA';

// MedicalWebPage + LocalBusiness (with aggregateRating + reviews)
// schema blocks. Stored as literal strings so the SEO team can paste
// updates verbatim without serializer drift.
const MEDICAL_WEB_PAGE_LD = `{
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/cocaine#webpage",
  "url": "https://sevenarrowsrecoveryarizona.com/what-we-treat/cocaine",
  "name": "Cocaine Addiction Treatment | Seven Arrows Recovery",
  "description": "Residential cocaine addiction treatment in Arizona. Nervous-system focused protocols with cardiac-safe stabilization, trauma-informed therapy, somatic-CBT, equine-assisted work, and dual-diagnosis care for stimulant use disorder.",
  "inLanguage": "en-US",
  "isPartOf": {
    "@type": "WebSite",
    "@id": "https://sevenarrowsrecoveryarizona.com/#website",
    "url": "https://sevenarrowsrecoveryarizona.com",
    "name": "Seven Arrows Recovery"
  },
  "about": {
    "@type": "MedicalCondition",
    "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/cocaine#condition",
    "name": "Cocaine Use Disorder",
    "alternateName": [
      "Cocaine Addiction",
      "Stimulant Use Disorder",
      "Cocaine Dependence",
      "Crack Cocaine Addiction",
      "Poly-Substance Stimulant Use"
    ],
    "associatedAnatomy": { "@type": "AnatomicalSystem", "name": "Central Nervous System" },
    "possibleTreatment": [
      { "@type": "MedicalTherapy", "name": "Somatic-Cognitive Behavioral Therapy", "description": "Layering cognitive restructuring over somatic awareness to interrupt the craving loop at the nervous-system level, not just the decision level." },
      { "@type": "MedicalTherapy", "name": "Cardiac & Psychiatric Stabilization", "description": "On-arrival cardiovascular assessment, baseline labs, 24/7 medical oversight, and MAT when clinically indicated for co-occurring conditions." },
      { "@type": "MedicalTherapy", "name": "Contingency-Management Reward Scaffolding", "description": "Evidence-based positive-reinforcement protocols to rebuild the brain's natural reward circuit during the anhedonia window." },
      { "@type": "MedicalTherapy", "name": "Trauma-Informed Therapy", "description": "Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS sequenced after nervous-system regulation has been rebuilt." },
      { "@type": "MedicalTherapy", "name": "Equine-Assisted Work", "description": "Horses mirror nervous-system states and teach clients what safe down-regulation feels like physically." },
      { "@type": "MedicalTherapy", "name": "Breathwork, Yoga, and Sound Therapy", "description": "Cardiac-coherent breath practices, invitational yoga, and sound-bath sessions that restore parasympathetic function." },
      { "@type": "MedicalTherapy", "name": "Dual-Diagnosis Care", "description": "Integrated treatment for ADHD, depression, anxiety, PTSD, and other co-occurring conditions commonly seen with stimulant use disorder." }
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
    "healthCondition": { "@type": "MedicalCondition", "name": "Cocaine Use Disorder" }
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://sevenarrowsrecoveryarizona.com/" },
      { "@type": "ListItem", "position": 2, "name": "What We Treat", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat" },
      { "@type": "ListItem", "position": 3, "name": "Cocaine Addiction", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat/cocaine" }
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
    { "@type": "Review", "author": { "@type": "Person", "name": "Roger McGehee" }, "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }, "reviewBody": "This place is truly special. They focus on healing from within rather than only treating symptoms of addiction. They have changed my life forever and have shown me that life is a beautiful time. I would recommend Seven Arrows to anyone struggling with addiction." }
  ]
}`;

export default function CocaineAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: MEDICAL_WEB_PAGE_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LOCAL_BUSINESS_LD }} />
      <main>
      {/* Phase 1 — video-backdrop hero */}
      <PageHero
        label="Cocaine Addiction Treatment Arizona"
        labelAs="h1"
        titleAs="h2"
        title={[
          { text: 'Cocaine rewires reward. We help you ' },
          { text: 'rebuild it', accent: true },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'What We Treat', href: '/what-we-treat' },
          { label: 'Cocaine Addiction' },
        ]}
        description="At Seven Arrows Recovery, cocaine use disorder is treated as a nervous-system and reward-circuit condition, not a willpower problem. Our residential Cocaine addiction treatment program in Arizona sequences cardiac-safe stabilization, trauma-informed therapy, and body-based work so the brain's natural reward baseline can actually return. Our cocaine addiction rehab services are designed to help you regain control of your life."
        ctas={[
          {
            kind: 'phone',
            display: '(866) 718-1665',
            eyebrow: 'Admissions · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      {/* Phase 2 — Dopamine curve (animated SVG) */}
      <TheReward />

      {/* Phase 3 — Four-stage cycle ring (animated orbit SVG) */}
      <TheCycle />

      {/* Phase 4 — Cardiac & neurological stats with pulsing heart SVG */}
      <TheBody />

      {/* Phase 5 — Four-phase withdrawal timeline with climbing curve */}
      <WithdrawalTimeline />

      {/* Phase 6 — Five realistic client archetypes */}
      <WhoWeSee />

      {/* Phase 7 — Clinical approach bento (flagship + 6 tiles) */}
      <OurApproach />

      {/* Phase 8 — Rebuilding reward: natural-reward climb curve */}
      <RewardRewiring />

      {/* Phase 9 (alumni voices) intentionally omitted — we only
          surface real, verified reviews on the site. Google reviews
          live on the homepage carousel. */}

      {/* Phase 10 — Final CTA with animated aurora backdrop */}
      <CocaineCTA />
      </main>
    </>
  );
}
