import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { marijuanaContent } from '@/lib/substances/marijuana';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Marijuana Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Residential cannabis use disorder treatment in Arizona. Somatic-CBT, sleep architecture rebuilding, anxiety-direct therapy, and dual-diagnosis care for high-potency cannabis dependence, concentrate users, and anxiety self-medicators.',
};

// MedicalWebPage + LocalBusiness (with aggregateRating + reviews)
// schema blocks. Stored as literal strings so the SEO team can paste
// updates verbatim without serializer drift.
const MEDICAL_WEB_PAGE_LD = `{
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/marijuana-addiction#webpage",
    "url": "https://sevenarrowsrecoveryarizona.com/what-we-treat/marijuana-addiction",
    "name": "Marijuana Addiction Treatment | Seven Arrows Recovery",
    "description": "Residential cannabis use disorder treatment in Arizona. Somatic-CBT, sleep architecture rebuilding, anxiety-direct therapy, and dual-diagnosis care for high-potency cannabis dependence, concentrate users, and anxiety self-medicators.",
    "inLanguage": "en-US",
    "isPartOf": {
        "@type": "WebSite",
        "@id": "https://sevenarrowsrecoveryarizona.com/#website",
        "url": "https://sevenarrowsrecoveryarizona.com",
        "name": "Seven Arrows Recovery"
    },
    "about": {
        "@type": "MedicalCondition",
        "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/marijuana-addiction#condition",
        "name": "Cannabis Use Disorder",
        "alternateName": [
            "Marijuana Addiction",
            "Cannabis Dependence",
            "Marijuana Dependence",
            "THC Dependence",
            "Weed Addiction",
            "High-Potency Cannabis Dependence",
            "Cannabis Withdrawal Syndrome"
        ],
        "associatedAnatomy": { "@type": "AnatomicalSystem", "name": "Endocannabinoid System" },
        "possibleTreatment": [
            { "@type": "MedicalTherapy", "name": "Somatic-Cognitive Behavioral Therapy for Cannabis Use Disorder", "description": "A house-integrated CBT variant that tracks the body and the thought together. Clients learn to distinguish genuine anxiety from craving-anxiety and interrupt the pattern before reflex takes over." },
            { "@type": "MedicalTherapy", "name": "Sleep Architecture Rebuilding", "description": "Structured sleep-hygiene work, light-cycle restoration, and nervous-system training that restore the body's own sleep mechanism after heavy cannabis disruption of REM sleep." },
            { "@type": "MedicalTherapy", "name": "Anxiety-Direct CBT", "description": "Cognitive and somatic work targeting the underlying anxiety cannabis was managing, so the symptom does not require the plant to be tolerable." },
            { "@type": "MedicalTherapy", "name": "Trauma-Informed Therapy", "description": "Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — sequenced after the first few weeks when the nervous system has quieted enough to begin processing work." },
            { "@type": "MedicalTherapy", "name": "Equine-Assisted Therapy", "description": "Horses mirror nervous-system states. Clients who have been smoothing edges with cannabis experience an honest down-regulation baseline — often for the first time in years." },
            { "@type": "MedicalTherapy", "name": "Breathwork, Yoga, and Sound Therapy", "description": "Parasympathetic-activating practices that restore the nervous system tools cannabis was performing, rebuilding natural self-regulation capacity." },
            { "@type": "MedicalTherapy", "name": "Dual-Diagnosis Care", "description": "Integrated treatment for anxiety, ADHD, PTSD, and depression — the conditions most commonly underneath heavy cannabis use." }
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
        "healthCondition": { "@type": "MedicalCondition", "name": "Cannabis Use Disorder" }
    },
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://sevenarrowsrecoveryarizona.com/" },
            { "@type": "ListItem", "position": 2, "name": "What We Treat", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat" },
            { "@type": "ListItem", "position": 3, "name": "Marijuana Addiction", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat/marijuana-addiction" }
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

export default function MarijuanaAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: MEDICAL_WEB_PAGE_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LOCAL_BUSINESS_LD }} />
      <SubstancePage10Phase content={marijuanaContent} />
    </>
  );
}
