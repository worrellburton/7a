'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';

// Off-site directory tracker. Listings here are places Seven Arrows
// should claim, monitor, or submit to in order to grow domain
// authority + brand reach. The 100 entries are filled in across
// Phases 2-10 of this build; Phase 1 lays down the scaffolding so
// later phases can append entries without touching layout.
//
// Status is tracked per directory in localStorage so the team can
// share progress on a single laptop without us having to wire a DB
// table. The key is "sa-seo-directories:status" → Record<id, Status>.

export type DirectoryCategory =
  | 'national'        // SAMHSA, Psychology Today, etc.
  | 'insurance'       // BCBS, Aetna, Cigna provider directories
  | 'mental_health'   // GoodTherapy, NAMI
  | 'healthcare'      // Healthgrades, Vitals
  | 'review'          // Google Business, Yelp
  | 'arizona'         // AHCCCS, AZDHS, local
  | 'recovery'        // In The Rooms, Sober Recovery
  | 'specialty'       // LGBTQ, veterans, dual-dx
  | 'professional'    // NAATP, NAADAC, ASAM
  | 'business';       // LinkedIn, BBB, Crunchbase

export interface Directory {
  id: string;
  name: string;
  url: string;
  category: DirectoryCategory;
  /** Why this listing matters in one sentence. */
  why: string;
  /** Rough priority for sequencing the team's outreach. */
  priority: 'high' | 'medium' | 'low';
}

const CATEGORY_LABELS: Record<DirectoryCategory, string> = {
  national: 'National addiction treatment',
  insurance: 'Insurance provider networks',
  mental_health: 'Mental health directories',
  healthcare: 'Healthcare / clinician directories',
  review: 'Review platforms + local business',
  arizona: 'Arizona-specific',
  recovery: 'Recovery community + sober living',
  specialty: 'Specialty (LGBTQ, veterans, dual-dx)',
  professional: 'Professional + accreditation',
  business: 'General business + brand',
};

const CATEGORY_ORDER: DirectoryCategory[] = [
  'national',
  'insurance',
  'mental_health',
  'healthcare',
  'review',
  'arizona',
  'recovery',
  'specialty',
  'professional',
  'business',
];

// Filled across Phases 2-10. Each phase appends ~10 entries with
// real submission URLs, never placeholders.
export const DIRECTORIES: Directory[] = [
  // ── Phase 2: National addiction treatment ───────────────────────
  {
    id: 'samhsa-findtreatment',
    name: 'SAMHSA Treatment Locator',
    url: 'https://findtreatment.gov/',
    category: 'national',
    why: 'Federal directory used by hospitals, EAPs, and 211 referrals. Highest authority listing in the addiction space.',
    priority: 'high',
  },
  {
    id: 'psychology-today-rehab',
    name: 'Psychology Today — Treatment Centers',
    url: 'https://www.psychologytoday.com/us/treatment-rehab',
    category: 'national',
    why: 'High-traffic, paid listing. Generates qualified inquiries from people specifically searching for residential care.',
    priority: 'high',
  },
  {
    id: 'recovery-org',
    name: 'Recovery.org',
    url: 'https://www.recovery.org/treatment-centers/',
    category: 'national',
    why: 'AAC-owned but lets independent centers claim listings. Decent referral volume from organic search.',
    priority: 'high',
  },
  {
    id: 'rehab-com',
    name: 'Rehab.com',
    url: 'https://www.rehab.com/',
    category: 'national',
    why: 'High DA rehab finder with editor-reviewed listings; profile claim is free.',
    priority: 'high',
  },
  {
    id: 'addiction-center',
    name: 'AddictionCenter.com',
    url: 'https://www.addictioncenter.com/treatment/',
    category: 'national',
    why: 'Editorial-style directory. Backlinks from category and condition pages help topical authority.',
    priority: 'high',
  },
  {
    id: 'rehabs-com',
    name: 'Rehabs.com',
    url: 'https://www.rehabs.com/',
    category: 'national',
    why: 'AAC-owned. Free profile, paid premium. Strong organic visibility for state + condition queries.',
    priority: 'medium',
  },
  {
    id: 'detox-com',
    name: 'Detox.com',
    url: 'https://detox.com/',
    category: 'national',
    why: 'Niche directory targeting detox-stage searchers. Useful since we admit people coming off active use.',
    priority: 'medium',
  },
  {
    id: 'rehabcenter-net',
    name: 'RehabCenter.net',
    url: 'https://www.rehabcenter.net/',
    category: 'national',
    why: 'Long-running rehab directory with editorial reviews and state landing pages.',
    priority: 'medium',
  },
  {
    id: 'thefix',
    name: 'The Fix — Rehab Reviews',
    url: 'https://www.thefix.com/rehab-reviews',
    category: 'national',
    why: 'Trusted recovery-journalism brand. Reviews can drive qualified traffic and earn editorial backlinks.',
    priority: 'medium',
  },
  {
    id: 'rehabspot',
    name: 'RehabSpot',
    url: 'https://www.rehabspot.com/',
    category: 'national',
    why: 'Substance-specific landing pages plus state filters. Free claim available.',
    priority: 'medium',
  },
  {
    id: 'addiction-resource',
    name: 'AddictionResource.net',
    url: 'https://www.addictionresource.net/',
    category: 'national',
    why: 'Editorial directory with strong organic rankings on state-level rehab queries.',
    priority: 'medium',
  },
  {
    id: 'ncadd',
    name: 'NCADD Treatment Search',
    url: 'https://www.ncadd.org/get-help/find-help',
    category: 'national',
    why: 'National Council on Alcoholism and Drug Dependence. Lower traffic but high credibility for the field.',
    priority: 'low',
  },

  // ── Phase 3: Insurance provider networks ────────────────────────
  {
    id: 'bcbs-find-doctor',
    name: 'Blue Cross Blue Shield — Find a Doctor',
    url: 'https://www.bcbs.com/find-a-doctor',
    category: 'insurance',
    why: 'Largest commercial network we accept. In-network listing drives most insurance-driven inquiries.',
    priority: 'high',
  },
  {
    id: 'aetna-provider',
    name: 'Aetna — DocFind Provider Directory',
    url: 'https://www.aetna.com/dsepublic/#/contentPage?page=providerSearchLanding',
    category: 'insurance',
    why: 'Required for in-network billing and shows up in member portal searches for "drug rehab near me."',
    priority: 'high',
  },
  {
    id: 'cigna-provider',
    name: 'Cigna — Provider Directory',
    url: 'https://hcpdirectory.cigna.com/web/public/consumer/directory',
    category: 'insurance',
    why: 'Cigna behavioral-health network listing is critical for VOB conversions from Cigna members.',
    priority: 'high',
  },
  {
    id: 'uhc-find-care',
    name: 'UnitedHealthcare — Find Care',
    url: 'https://www.uhc.com/find-a-doctor',
    category: 'insurance',
    why: 'UHC + Optum behavioral covers a large slice of Arizona employer plans.',
    priority: 'high',
  },
  {
    id: 'optum-behavioral',
    name: 'Optum Behavioral Health — Provider Search',
    url: 'https://www.providerexpress.com/content/ope-provexpr/us/en/clinical-resources/findprovider.html',
    category: 'insurance',
    why: 'Behavioral arm of UHC. Manages the SUD network referrals that pre-authorize residential care.',
    priority: 'high',
  },
  {
    id: 'humana-provider',
    name: 'Humana — Find a Doctor',
    url: 'https://finder.humana.com/finder/search',
    category: 'insurance',
    why: 'Smaller commercial book in AZ but Medicare Advantage volume is meaningful.',
    priority: 'medium',
  },
  {
    id: 'tricare-provider',
    name: 'TRICARE — Find a Provider',
    url: 'https://www.tricare.mil/FindDoctor',
    category: 'insurance',
    why: 'Active-duty + dependent network. Required surface for any military-facing outreach.',
    priority: 'medium',
  },
  {
    id: 'magellan-provider',
    name: 'Magellan Health — Find a Provider',
    url: 'https://www.magellanprovider.com/find-a-provider/',
    category: 'insurance',
    why: 'Large behavioral-health managed-care org. Many EAP referrals route through Magellan.',
    priority: 'medium',
  },
  {
    id: 'beacon-provider',
    name: 'Carelon Behavioral Health (formerly Beacon)',
    url: 'https://www.carelonbehavioralhealth.com/find-a-provider',
    category: 'insurance',
    why: 'Public-sector and EAP behavioral network. Listing drives state-funded SUD referrals.',
    priority: 'medium',
  },
  {
    id: 'compsych',
    name: 'ComPsych — Provider Directory',
    url: 'https://www.compsych.com/providers',
    category: 'insurance',
    why: "World's largest EAP. Listed providers receive direct referrals from member assessments.",
    priority: 'medium',
  },

  // ── Phase 4: Mental health directories ──────────────────────────
  {
    id: 'goodtherapy',
    name: 'GoodTherapy.org',
    url: 'https://www.goodtherapy.org/',
    category: 'mental_health',
    why: 'High-DA mental-health directory. Trauma + addiction concentration filters bring qualified searchers.',
    priority: 'high',
  },
  {
    id: 'nami-helpline',
    name: 'NAMI HelpLine + Provider Search',
    url: 'https://www.nami.org/help',
    category: 'mental_health',
    why: 'National Alliance on Mental Illness. Family members of clients in crisis call NAMI before they call us.',
    priority: 'high',
  },
  {
    id: 'mental-health-america',
    name: 'Mental Health America — Find Help',
    url: 'https://mhanational.org/finding-help',
    category: 'mental_health',
    why: 'Trusted nonprofit umbrella. Their referral pages outrank a lot of paid directories.',
    priority: 'high',
  },
  {
    id: 'therapyden',
    name: 'TherapyDen',
    url: 'https://www.therapyden.com/',
    category: 'mental_health',
    why: 'Modern Psychology Today alternative; values-driven filters (BIPOC-affirming, LGBTQ-affirming, etc.).',
    priority: 'medium',
  },
  {
    id: 'open-path-collective',
    name: 'Open Path Collective',
    url: 'https://openpathcollective.org/',
    category: 'mental_health',
    why: 'Sliding-scale therapist directory. Worth claiming for IOP / outpatient referral pipeline.',
    priority: 'medium',
  },
  {
    id: 'inclusive-therapists',
    name: 'Inclusive Therapists',
    url: 'https://www.inclusivetherapists.com/',
    category: 'mental_health',
    why: 'Identity-conscious provider directory. Aligns with our trauma-informed, culturally-responsive positioning.',
    priority: 'medium',
  },
  {
    id: 'therapytribe',
    name: 'TherapyTribe',
    url: 'https://www.therapytribe.com/',
    category: 'mental_health',
    why: 'Older but well-indexed mental-health directory; backlinks help domain authority.',
    priority: 'medium',
  },
  {
    id: 'zencare',
    name: 'Zencare',
    url: 'https://zencare.co/',
    category: 'mental_health',
    why: 'Higher-end therapist directory. Vetted listings; aligns with private-pay client profile.',
    priority: 'medium',
  },
  {
    id: 'choosing-therapy',
    name: 'Choosing Therapy',
    url: 'https://www.choosingtherapy.com/find-a-therapist/',
    category: 'mental_health',
    why: 'Editorial site with strong organic rankings on long-tail mental health queries.',
    priority: 'medium',
  },
  {
    id: 'counseling-directory',
    name: 'Counseling Directory (US)',
    url: 'https://www.counsellingdirectory.com/',
    category: 'mental_health',
    why: 'High-DA UK-rooted but US-friendly counselling directory. Useful crawl signal beyond addiction-only sites.',
    priority: 'low',
  },
  {
    id: 'adaa',
    name: 'ADAA — Find a Therapist',
    url: 'https://members.adaa.org/page/FATMain',
    category: 'mental_health',
    why: 'Anxiety & Depression Association of America. Co-occurring referrals where anxiety is the surface presentation.',
    priority: 'medium',
  },
  {
    id: 'iocdf',
    name: 'International OCD Foundation — Find Help',
    url: 'https://iocdf.org/find-help/',
    category: 'mental_health',
    why: 'Niche but high-trust: clients with OCD-spectrum dual-dx sometimes find us via this surface.',
    priority: 'low',
  },

  // ── Phase 5: Healthcare / clinician directories ─────────────────
  {
    id: 'healthgrades',
    name: 'Healthgrades',
    url: 'https://www.healthgrades.com/find-a-doctor',
    category: 'healthcare',
    why: 'Highest-traffic doctor-finder in the US. Listing each clinician individually compounds organic reach.',
    priority: 'high',
  },
  {
    id: 'vitals',
    name: 'Vitals',
    url: 'https://www.vitals.com/',
    category: 'healthcare',
    why: 'Major review-driven physician directory. Strong organic rankings on individual clinician searches.',
    priority: 'high',
  },
  {
    id: 'webmd-physician',
    name: 'WebMD — Physician Directory',
    url: 'https://doctor.webmd.com/',
    category: 'healthcare',
    why: 'Trust signal that funnels into the WebMD content ecosystem. Critical for clinician-level pages.',
    priority: 'high',
  },
  {
    id: 'zocdoc',
    name: 'Zocdoc',
    url: 'https://www.zocdoc.com/',
    category: 'healthcare',
    why: 'Booking-first directory. Outpatient + assessment-stage referrals route through here.',
    priority: 'medium',
  },
  {
    id: 'ratemds',
    name: 'RateMDs',
    url: 'https://www.ratemds.com/',
    category: 'healthcare',
    why: 'Review-driven directory. Useful for individual clinician reputation surfacing.',
    priority: 'medium',
  },
  {
    id: 'doctor-com',
    name: 'Doctor.com',
    url: 'https://www.doctor.com/',
    category: 'healthcare',
    why: 'Aggregator that syndicates listings to dozens of downstream sites in one claim.',
    priority: 'medium',
  },
  {
    id: 'caredash',
    name: 'CareDash',
    url: 'https://www.caredash.com/',
    category: 'healthcare',
    why: 'Mid-tier doctor directory with editorial content. Backlinks help authority more than direct conversions.',
    priority: 'low',
  },
  {
    id: 'usnews-doctors',
    name: 'U.S. News — Find a Doctor',
    url: 'https://health.usnews.com/doctors',
    category: 'healthcare',
    why: 'Trusted brand. Inclusion adds credibility on landing pages and press kit.',
    priority: 'medium',
  },
  {
    id: 'sharecare',
    name: 'Sharecare — Find a Doctor',
    url: 'https://www.sharecare.com/find-a-doctor',
    category: 'healthcare',
    why: 'Aggregator with growing organic visibility on health-condition queries.',
    priority: 'low',
  },
  {
    id: 'wellness-com',
    name: 'Wellness.com',
    url: 'https://www.wellness.com/',
    category: 'healthcare',
    why: 'Older but indexed health directory. Free claim; useful citation signal for local SEO.',
    priority: 'low',
  },

  // ── Phase 6: Review platforms + local business ──────────────────
  {
    id: 'google-business',
    name: 'Google Business Profile',
    url: 'https://www.google.com/business/',
    category: 'review',
    why: 'Single highest-leverage local-SEO listing. Reviews here drive Map Pack visibility for "rehab near me."',
    priority: 'high',
  },
  {
    id: 'yelp',
    name: 'Yelp',
    url: 'https://biz.yelp.com/',
    category: 'review',
    why: 'Strong organic rankings for service-based local queries. Active review management is non-negotiable.',
    priority: 'high',
  },
  {
    id: 'bing-places',
    name: 'Bing Places for Business',
    url: 'https://www.bingplaces.com/',
    category: 'review',
    why: 'Microsoft Maps + Bing search + Cortana. Smaller share but trivially cheap to claim.',
    priority: 'medium',
  },
  {
    id: 'apple-maps-business',
    name: 'Apple Maps — Business Connect',
    url: 'https://mapsconnect.apple.com/',
    category: 'review',
    why: 'iPhone-default mapping. Critical for the "directions to 7 Arrows" surface from family members.',
    priority: 'high',
  },
  {
    id: 'facebook-business',
    name: 'Facebook Business Page',
    url: 'https://www.facebook.com/business/pages',
    category: 'review',
    why: 'Doubles as a review surface and a content-distribution channel. Reviews show on Meta search.',
    priority: 'medium',
  },
  {
    id: 'foursquare',
    name: 'Foursquare for Business',
    url: 'https://business.foursquare.com/',
    category: 'review',
    why: 'Powers location data behind Snapchat, Twitter/X places, Uber, and many CMS plugins. Citation-juice.',
    priority: 'medium',
  },
  {
    id: 'bbb',
    name: 'Better Business Bureau (BBB)',
    url: 'https://www.bbb.org/',
    category: 'review',
    why: 'Trust signal families specifically check before placing a loved one. Accreditation helps conversions.',
    priority: 'high',
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    url: 'https://business.trustpilot.com/',
    category: 'review',
    why: 'Consumer-facing review aggregator. Outranks our domain for "[brand] reviews" on cold searches.',
    priority: 'medium',
  },
  {
    id: 'yellow-pages',
    name: 'Yellow Pages (YP.com)',
    url: 'https://www.yellowpages.com/',
    category: 'review',
    why: 'Old-school but still indexed; baseline NAP citation for local SEO consistency.',
    priority: 'low',
  },
  {
    id: 'manta',
    name: 'Manta',
    url: 'https://www.manta.com/',
    category: 'review',
    why: 'Small-business directory. Cheap citation source; not a meaningful inbound channel on its own.',
    priority: 'low',
  },

  // ── Phase 7: Arizona-specific ───────────────────────────────────
  {
    id: 'azdhs-bhs',
    name: 'AZDHS — Behavioral Health Services Provider List',
    url: 'https://www.azdhs.gov/licensing/healthcare-institutions/',
    category: 'arizona',
    why: 'State licensure surface. Listed providers show up in Arizona DHS-driven referrals and crisis lookups.',
    priority: 'high',
  },
  {
    id: 'ahcccs',
    name: 'AHCCCS — Provider Directory',
    url: 'https://www.azahcccs.gov/Members/ProgramsAndCoveredServices/findaprovider.html',
    category: 'arizona',
    why: 'Arizona Medicaid. Listed providers receive referrals from AHCCCS members and integrated RBHA partners.',
    priority: 'high',
  },
  {
    id: 'mercy-care',
    name: 'Mercy Care — Find a Provider (AHCCCS RBHA)',
    url: 'https://www.mercycareaz.org/members/mc/find-provider',
    category: 'arizona',
    why: 'Maricopa County RBHA. Drives a meaningful slice of public-sector SUD referrals.',
    priority: 'medium',
  },
  {
    id: 'caz-region',
    name: 'Care1st / Centene Arizona — Provider Directory',
    url: 'https://www.azcompletehealth.com/find-a-provider.html',
    category: 'arizona',
    why: 'AZ Complete Health is the southern-Arizona RBHA. Worth claiming for state-funded inquiries.',
    priority: 'medium',
  },
  {
    id: 'azbbhe',
    name: 'Arizona Board of Behavioral Health Examiners — Verify a Licensee',
    url: 'https://azbbhe.us/Verification.aspx',
    category: 'arizona',
    why: 'Public licensure verification. Not a marketing surface but a credibility anchor families check.',
    priority: 'low',
  },
  {
    id: 'phoenix-chamber',
    name: 'Greater Phoenix Chamber',
    url: 'https://www.phoenixchamber.com/',
    category: 'arizona',
    why: 'Member directory plus B2B referral pathways for EAP-style employer relationships.',
    priority: 'medium',
  },
  {
    id: 'tucson-chamber',
    name: 'Tucson Metro Chamber',
    url: 'https://www.tucsonchamber.org/',
    category: 'arizona',
    why: 'Southern-AZ business community. Useful for outreach to family-owned businesses with EAP needs.',
    priority: 'low',
  },
  {
    id: 'maricopa-public-health',
    name: 'Maricopa County Department of Public Health',
    url: 'https://www.maricopa.gov/5621/Substance-Use-Disorders',
    category: 'arizona',
    why: 'County-level SUD resource page links to vetted providers. Useful credibility signal.',
    priority: 'low',
  },
  {
    id: 'arha',
    name: 'Arizona Recovery Housing Association (ArRHA)',
    url: 'https://www.arrha.org/',
    category: 'arizona',
    why: 'AZ certified sober-living network. Discharge-planning relationships start in their member directory.',
    priority: 'medium',
  },
  {
    id: 'phoenix-magazine-top-doctors',
    name: 'Phoenix Magazine — Top Doctors / Top Mental Health',
    url: 'https://www.phoenixmag.com/category/top-doctors/',
    category: 'arizona',
    why: 'Annual editorial list. Inclusion is local trust signal that families share inside families.',
    priority: 'medium',
  },

  // ── Phase 8: Recovery community + sober living ──────────────────
  {
    id: 'in-the-rooms',
    name: 'In The Rooms',
    url: 'https://www.intherooms.com/',
    category: 'recovery',
    why: '500K+ member online recovery community. Treatment Center listings convert because users are already in the work.',
    priority: 'high',
  },
  {
    id: 'sober-recovery',
    name: 'SoberRecovery',
    url: 'https://www.soberrecovery.com/forums/',
    category: 'recovery',
    why: 'Long-running peer recovery forum with a treatment directory. Strong organic visibility on long-tail queries.',
    priority: 'medium',
  },
  {
    id: 'recovery-research-institute',
    name: 'Recovery Research Institute (Mass General)',
    url: 'https://www.recoveryanswers.org/',
    category: 'recovery',
    why: 'Academic-grade resource hub. Listing in their referral pages is a credibility win, not a volume play.',
    priority: 'low',
  },
  {
    id: 'sober-nation',
    name: 'Sober Nation',
    url: 'https://sobernation.com/',
    category: 'recovery',
    why: 'Recovery community + treatment finder. Free claim, helpful for surfacing alumni-side content.',
    priority: 'medium',
  },
  {
    id: 'narr',
    name: 'NARR — National Alliance for Recovery Residences',
    url: 'https://narronline.org/affiliates/find-a-residence/',
    category: 'recovery',
    why: 'Standards body for recovery housing. Discharge-planning partnerships start in their affiliate map.',
    priority: 'medium',
  },
  {
    id: 'faces-and-voices',
    name: 'Faces & Voices of Recovery — Recovery Directory',
    url: 'https://facesandvoicesofrecovery.org/resources/recovery-directory/',
    category: 'recovery',
    why: 'National recovery-advocacy nonprofit. Listing positions us inside the broader recovery ecosystem.',
    priority: 'low',
  },
  {
    id: 'soberlink',
    name: 'Soberlink — Treatment Provider Network',
    url: 'https://www.soberlink.com/treatment-providers',
    category: 'recovery',
    why: 'Remote alcohol monitoring. Clinical partnership listings drive referrals from alumni continuing care.',
    priority: 'low',
  },
  {
    id: 'workit-health-resources',
    name: 'Workit Health — Recovery Resources',
    url: 'https://www.workithealth.com/resources/',
    category: 'recovery',
    why: 'MAT-focused telehealth with a referral resource hub. Useful for stepped-care collaborations.',
    priority: 'low',
  },
  {
    id: 'all-treatment',
    name: 'AllTreatment.com',
    url: 'https://www.alltreatment.com/',
    category: 'recovery',
    why: 'Treatment-finder with state and city pages. Free profile, decent organic visibility.',
    priority: 'low',
  },
  {
    id: 'sober-grid',
    name: 'Sober Grid — Provider Network',
    url: 'https://www.sobergrid.com/',
    category: 'recovery',
    why: 'Mobile-first sober community + peer coaching. Treatment partnerships visible inside their app.',
    priority: 'low',
  },
];

// ── Status tracking ────────────────────────────────────────────────

type Status = 'todo' | 'pending' | 'listed' | 'skip';

const STATUS_KEY = 'sa-seo-directories:status';

const STATUS_LABELS: Record<Status, string> = {
  todo: 'To do',
  pending: 'Submitted',
  listed: 'Listed',
  skip: 'Skip',
};

const STATUS_TONE: Record<Status, string> = {
  todo: 'bg-warm-bg/60 text-foreground/65 border-black/10 hover:bg-warm-bg',
  pending: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
  listed: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
  skip: 'bg-foreground/5 text-foreground/40 border-black/10 line-through hover:bg-foreground/10',
};

const STATUS_CYCLE: Record<Status, Status> = {
  todo: 'pending',
  pending: 'listed',
  listed: 'skip',
  skip: 'todo',
};

function useStatusMap(): [Record<string, Status>, (id: string) => void] {
  const [map, setMap] = useState<Record<string, Status>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STATUS_KEY);
      if (raw) setMap(JSON.parse(raw));
    } catch {
      /* corrupt JSON — ignore, the team can just re-mark. */
    }
  }, []);

  const cycle = (id: string) => {
    setMap((prev) => {
      const current = prev[id] ?? 'todo';
      const next = STATUS_CYCLE[current];
      // Never persist the default — keeps localStorage tidy.
      const updated = { ...prev };
      if (next === 'todo') delete updated[id];
      else updated[id] = next;
      try {
        window.localStorage.setItem(STATUS_KEY, JSON.stringify(updated));
      } catch {
        /* quota — non-fatal. */
      }
      return updated;
    });
  };

  return [map, cycle];
}

// ── UI ─────────────────────────────────────────────────────────────

const PRIORITY_TONE: Record<Directory['priority'], string> = {
  high: 'bg-primary/10 text-primary border-primary/20',
  medium: 'bg-foreground/5 text-foreground/70 border-black/10',
  low: 'bg-foreground/5 text-foreground/45 border-black/5',
};

export default function DirectoriesContent() {
  const [statusMap, cycleStatus] = useStatusMap();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DirectoryCategory | 'all'>('all');
  const [hideListed, setHideListed] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DIRECTORIES.filter((d) => {
      if (activeCategory !== 'all' && d.category !== activeCategory) return false;
      if (hideListed && (statusMap[d.id] === 'listed' || statusMap[d.id] === 'skip')) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.why.toLowerCase().includes(q) ||
        d.url.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory, hideListed, statusMap]);

  const grouped = useMemo(() => {
    const out: Partial<Record<DirectoryCategory, Directory[]>> = {};
    for (const d of filtered) {
      (out[d.category] ||= []).push(d);
    }
    return out;
  }, [filtered]);

  const total = DIRECTORIES.length;
  const listed = DIRECTORIES.filter((d) => statusMap[d.id] === 'listed').length;
  const pending = DIRECTORIES.filter((d) => statusMap[d.id] === 'pending').length;

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/seo"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              SEO
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Directories
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            Off-site listings the team should claim, monitor, or submit
            to. Each one builds domain authority, brand reach, or both.
            Click a status pill to cycle through To do → Submitted →
            Listed → Skip. Status saves locally in this browser.
          </p>
        </div>
      </header>

      <SeoSubNav />

      {/* Progress strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <ProgressCard label="Total" value={total} />
        <ProgressCard label="Listed" value={listed} accent="emerald" />
        <ProgressCard label="Submitted" value={pending} accent="amber" />
        <ProgressCard
          label="To do"
          value={Math.max(0, total - listed - pending - DIRECTORIES.filter((d) => statusMap[d.id] === 'skip').length)}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search directories…"
          className="text-sm rounded-md border border-black/10 bg-white px-3 py-2 w-72 max-w-full"
        />
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value as DirectoryCategory | 'all')}
          className="text-sm rounded-md border border-black/10 bg-white px-3 py-2"
        >
          <option value="all">All categories</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs text-foreground/70">
          <input
            type="checkbox"
            checked={hideListed}
            onChange={(e) => setHideListed(e.target.checked)}
          />
          Hide Listed / Skip
        </label>
      </div>

      {total === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>No directories loaded yet.</strong> The list is being built
          out across phases — entries appear here as each phase ships.
        </div>
      ) : null}

      {CATEGORY_ORDER.map((cat) => {
        const rows = grouped[cat] ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={cat} className="mb-8">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/45 mb-3">
              {CATEGORY_LABELS[cat]}
              <span className="ml-2 font-normal tracking-normal normal-case text-foreground/35">
                · {rows.length}
              </span>
            </h2>
            <div className="overflow-hidden border border-black/10 rounded-xl bg-white">
              <table className="w-full text-sm">
                <thead className="bg-warm-bg/50 text-[11px] uppercase tracking-wider text-foreground/55">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10">Directory</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10">Why</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10 w-24">Priority</th>
                    <th className="text-right px-4 py-2.5 font-semibold border-b border-black/10 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map((d) => {
                    const status = statusMap[d.id] ?? 'todo';
                    return (
                      <tr key={d.id} className="align-top">
                        <td className="px-4 py-3">
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary hover:underline"
                          >
                            {d.name}
                          </a>
                          <p className="text-[11px] text-foreground/40 truncate max-w-[280px]" title={d.url}>
                            {d.url.replace(/^https?:\/\//, '')}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-foreground/70 text-[13px] leading-relaxed">{d.why}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${PRIORITY_TONE[d.priority]}`}>
                            {d.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => cycleStatus(d.id)}
                            title="Cycle status"
                            className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${STATUS_TONE[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ProgressCard({
  label, value, accent,
}: { label: string; value: number; accent?: 'emerald' | 'amber' }) {
  const color =
    accent === 'emerald' ? 'text-emerald-600'
    : accent === 'amber' ? 'text-amber-600'
    : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    </div>
  );
}
