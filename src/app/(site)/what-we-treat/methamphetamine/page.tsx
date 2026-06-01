import type { Metadata } from 'next';
import SubstancePage10Phase from '@/components/substance/SubstancePage10Phase';
import { methContent } from '@/lib/substances/methamphetamine';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Meth Rehab in Arizona | Seven Arrows Recovery',
  description:
    'Residential methamphetamine addiction treatment in Arizona. Dopamine-first recovery sequencing, cardiac and psychiatric stabilization, contingency management, trauma-informed therapy, and dual-diagnosis care for meth use disorder.',
};

// MedicalWebPage + LocalBusiness (with aggregateRating + reviews)
// schema blocks. Stored as literal strings so the SEO team can paste
// updates verbatim without serializer drift.
const MEDICAL_WEB_PAGE_LD = `{
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/methamphetamine#webpage",
    "url": "https://sevenarrowsrecoveryarizona.com/what-we-treat/methamphetamine",
    "name": "Methamphetamine Addiction Treatment | Seven Arrows Recovery",
    "description": "Residential methamphetamine addiction treatment in Arizona. Dopamine-first recovery sequencing, cardiac and psychiatric stabilization, contingency management, trauma-informed therapy, and dual-diagnosis care for meth use disorder.",
    "inLanguage": "en-US",
    "isPartOf": {
        "@type": "WebSite",
        "@id": "https://sevenarrowsrecoveryarizona.com/#website",
        "url": "https://sevenarrowsrecoveryarizona.com",
        "name": "Seven Arrows Recovery"
    },
    "about": {
        "@type": "MedicalCondition",
        "@id": "https://sevenarrowsrecoveryarizona.com/what-we-treat/methamphetamine#condition",
        "name": "Methamphetamine Use Disorder",
        "alternateName": [
            "Meth Addiction",
            "Methamphetamine Addiction",
            "Meth Dependence",
            "Crystal Meth Addiction",
            "Stimulant Use Disorder",
            "Meth-Induced Psychosis",
            "Psychostimulant Use Disorder"
        ],
        "associatedAnatomy": {
            "@type": "AnatomicalSystem",
            "name": "Central Nervous System"
        },
        "possibleTreatment": [
            { "@type": "MedicalTherapy", "name": "Dopamine-First Residential Treatment", "description": "Sleep restoration, nutritional rehabilitation, and anhedonia-informed psychotherapy as a coordinated package. The biology is treated first, the psychology second, with both receiving full clinical attention." },
            { "@type": "MedicalTherapy", "name": "Cardiac and Psychiatric Stabilization", "description": "Baseline cardiovascular assessment, psychiatric review for persistent symptoms including paranoia and psychosis, and 24/7 medical oversight through the early withdrawal window." },
            { "@type": "MedicalTherapy", "name": "Contingency Management", "description": "Evidence-based positive-reinforcement scaffolding for the anhedonia window. Small structured wins are tracked and rewarded while intrinsic motivation rebuilds during dopamine recovery." },
            { "@type": "MedicalTherapy", "name": "Trauma-Informed Therapy", "description": "Forward-Facing® Accelerated Recovery, EMDR, ART, and IFS — sequenced after sleep and mood have stabilized enough to hold the processing work." },
            { "@type": "MedicalTherapy", "name": "Equine-Assisted Therapy", "description": "Horses mirror nervous-system overactivation without judgment. Clients coming off long periods of stimulation learn what genuine down-regulation feels like." },
            { "@type": "MedicalTherapy", "name": "Breathwork, Yoga, and Sound Therapy", "description": "Parasympathetic practices that restore the tools meth was overriding. Clinical medicine for a nervous system meth spent years overheating." },
            { "@type": "MedicalTherapy", "name": "Dual-Diagnosis Care", "description": "Integrated treatment for ADHD, anxiety, depression, PTSD, and meth-induced psychiatric symptoms under one clinical team and one coordinated plan." }
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
        "healthCondition": { "@type": "MedicalCondition", "name": "Methamphetamine Use Disorder" }
    },
    "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://sevenarrowsrecoveryarizona.com/" },
            { "@type": "ListItem", "position": 2, "name": "What We Treat", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat" },
            { "@type": "ListItem", "position": 3, "name": "Methamphetamine Addiction", "item": "https://sevenarrowsrecoveryarizona.com/what-we-treat/methamphetamine" }
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

export default function MethAddictionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: MEDICAL_WEB_PAGE_LD }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: LOCAL_BUSINESS_LD }} />
      <SubstancePage10Phase content={methContent} />
    </>
  );
}
