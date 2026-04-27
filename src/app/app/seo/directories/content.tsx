'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { RowChat } from '@/components/RowChat';

// localStorage for per-user "last read" timestamps so the unread dot
// only lights up when there's a directory comment the current user
// hasn't seen. Per-browser, same pattern as facilities + backlinks.
const COMMENT_READ_KEY = 'sa-directory-chat-read';
function getDirectoryReadMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem(COMMENT_READ_KEY) || '{}'); }
  catch { return {}; }
}
function setDirectoryReadAt(directoryId: string, ts: string) {
  if (typeof window === 'undefined') return;
  try {
    const map = getDirectoryReadMap();
    map[directoryId] = ts;
    window.localStorage.setItem(COMMENT_READ_KEY, JSON.stringify(map));
  } catch { /* quota — fine */ }
}

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
  /**
   * 1-100 score for how well Seven Arrows fits this directory's
   * audience. Combines audience-overlap, payer-alignment, AZ
   * relevance, and likelihood of a qualified inquiry. ≥80 means
   * core target; 60-79 strong; 40-59 useful citation/long-tail;
   * <40 mostly NAP-citation breadth or future-state coverage.
   */
  fit: number;
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

// 100 directories across 10 categories (see CATEGORY_LABELS above).
// Each entry is a real submission / claim URL — never a placeholder
// — with a one-sentence rationale and a priority hint to sequence
// the team's outreach. Status (To do / Submitted / Listed / Skip)
// is tracked per row in localStorage; see useStatusMap().
export const DIRECTORIES: Directory[] = [
  // ── Phase 2: National addiction treatment ───────────────────────
  {
    id: 'samhsa-findtreatment',
    name: 'SAMHSA Treatment Locator',
    url: 'https://findtreatment.gov/',
    category: 'national',
    why: 'Federal directory used by hospitals, EAPs, and 211 referrals. Highest authority listing in the addiction space.',
    priority: 'high',
    fit: 95,
  },
  {
    id: 'psychology-today-rehab',
    name: 'Psychology Today — Treatment Centers',
    url: 'https://www.psychologytoday.com/us/treatment-rehab',
    category: 'national',
    why: 'High-traffic, paid listing. Generates qualified inquiries from people specifically searching for residential care.',
    priority: 'high',
    fit: 95,
  },
  {
    id: 'recovery-org',
    name: 'Recovery.org',
    url: 'https://www.recovery.org/treatment-centers/',
    category: 'national',
    why: 'AAC-owned but lets independent centers claim listings. Decent referral volume from organic search.',
    priority: 'high',
    fit: 85,
  },
  {
    id: 'rehab-com',
    name: 'Rehab.com',
    url: 'https://www.rehab.com/',
    category: 'national',
    why: 'High DA rehab finder with editor-reviewed listings; profile claim is free.',
    priority: 'high',
    fit: 85,
  },
  {
    id: 'addiction-center',
    name: 'AddictionCenter.com',
    url: 'https://www.addictioncenter.com/treatment/',
    category: 'national',
    why: 'Editorial-style directory. Backlinks from category and condition pages help topical authority.',
    priority: 'high',
    fit: 85,
  },
  {
    id: 'rehabs-com',
    name: 'Rehabs.com',
    url: 'https://www.rehabs.com/',
    category: 'national',
    why: 'AAC-owned. Free profile, paid premium. Strong organic visibility for state + condition queries.',
    priority: 'medium',
    fit: 80,
  },
  {
    id: 'detox-com',
    name: 'Detox.com',
    url: 'https://detox.com/',
    category: 'national',
    why: 'Niche directory targeting detox-stage searchers. Useful since we admit people coming off active use.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'rehabcenter-net',
    name: 'RehabCenter.net',
    url: 'https://www.rehabcenter.net/',
    category: 'national',
    why: 'Long-running rehab directory with editorial reviews and state landing pages.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'thefix',
    name: 'The Fix — Rehab Reviews',
    url: 'https://www.thefix.com/rehab-reviews',
    category: 'national',
    why: 'Trusted recovery-journalism brand. Reviews can drive qualified traffic and earn editorial backlinks.',
    priority: 'medium',
    fit: 78,
  },
  {
    id: 'rehabspot',
    name: 'RehabSpot',
    url: 'https://www.rehabspot.com/',
    category: 'national',
    why: 'Substance-specific landing pages plus state filters. Free claim available.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'addiction-resource',
    name: 'AddictionResource.net',
    url: 'https://www.addictionresource.net/',
    category: 'national',
    why: 'Editorial directory with strong organic rankings on state-level rehab queries.',
    priority: 'medium',
    fit: 72,
  },
  {
    id: 'ncadd',
    name: 'NCADD Treatment Search',
    url: 'https://www.ncadd.org/get-help/find-help',
    category: 'national',
    why: 'National Council on Alcoholism and Drug Dependence. Lower traffic but high credibility for the field.',
    priority: 'low',
    fit: 60,
  },

  // ── Phase 3: Insurance provider networks ────────────────────────
  {
    id: 'bcbs-find-doctor',
    name: 'Blue Cross Blue Shield — Find a Doctor',
    url: 'https://www.bcbs.com/find-a-doctor',
    category: 'insurance',
    why: 'Largest commercial network we accept. In-network listing drives most insurance-driven inquiries.',
    priority: 'high',
    fit: 95,
  },
  {
    id: 'aetna-provider',
    name: 'Aetna — DocFind Provider Directory',
    url: 'https://www.aetna.com/dsepublic/#/contentPage?page=providerSearchLanding',
    category: 'insurance',
    why: 'Required for in-network billing and shows up in member portal searches for "drug rehab near me."',
    priority: 'high',
    fit: 95,
  },
  {
    id: 'cigna-provider',
    name: 'Cigna — Provider Directory',
    url: 'https://hcpdirectory.cigna.com/web/public/consumer/directory',
    category: 'insurance',
    why: 'Cigna behavioral-health network listing is critical for VOB conversions from Cigna members.',
    priority: 'high',
    fit: 95,
  },
  {
    id: 'uhc-find-care',
    name: 'UnitedHealthcare — Find Care',
    url: 'https://www.uhc.com/find-a-doctor',
    category: 'insurance',
    why: 'UHC + Optum behavioral covers a large slice of Arizona employer plans.',
    priority: 'high',
    fit: 92,
  },
  {
    id: 'optum-behavioral',
    name: 'Optum Behavioral Health — Provider Search',
    url: 'https://www.providerexpress.com/content/ope-provexpr/us/en/clinical-resources/findprovider.html',
    category: 'insurance',
    why: 'Behavioral arm of UHC. Manages the SUD network referrals that pre-authorize residential care.',
    priority: 'high',
    fit: 92,
  },
  {
    id: 'humana-provider',
    name: 'Humana — Find a Doctor',
    url: 'https://finder.humana.com/finder/search',
    category: 'insurance',
    why: 'Smaller commercial book in AZ but Medicare Advantage volume is meaningful.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'tricare-provider',
    name: 'TRICARE — Find a Provider',
    url: 'https://www.tricare.mil/FindDoctor',
    category: 'insurance',
    why: 'Active-duty + dependent network. Required surface for any military-facing outreach.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'magellan-provider',
    name: 'Magellan Health — Find a Provider',
    url: 'https://www.magellanprovider.com/find-a-provider/',
    category: 'insurance',
    why: 'Large behavioral-health managed-care org. Many EAP referrals route through Magellan.',
    priority: 'medium',
    fit: 78,
  },
  {
    id: 'beacon-provider',
    name: 'Carelon Behavioral Health (formerly Beacon)',
    url: 'https://www.carelonbehavioralhealth.com/find-a-provider',
    category: 'insurance',
    why: 'Public-sector and EAP behavioral network. Listing drives state-funded SUD referrals.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'compsych',
    name: 'ComPsych — Provider Directory',
    url: 'https://www.compsych.com/providers',
    category: 'insurance',
    why: "World's largest EAP. Listed providers receive direct referrals from member assessments.",
    priority: 'medium',
    fit: 70,
  },

  // ── Phase 4: Mental health directories ──────────────────────────
  {
    id: 'goodtherapy',
    name: 'GoodTherapy.org',
    url: 'https://www.goodtherapy.org/',
    category: 'mental_health',
    why: 'High-DA mental-health directory. Trauma + addiction concentration filters bring qualified searchers.',
    priority: 'high',
    fit: 80,
  },
  {
    id: 'nami-helpline',
    name: 'NAMI HelpLine + Provider Search',
    url: 'https://www.nami.org/help',
    category: 'mental_health',
    why: 'National Alliance on Mental Illness. Family members of clients in crisis call NAMI before they call us.',
    priority: 'high',
    fit: 78,
  },
  {
    id: 'mental-health-america',
    name: 'Mental Health America — Find Help',
    url: 'https://mhanational.org/finding-help',
    category: 'mental_health',
    why: 'Trusted nonprofit umbrella. Their referral pages outrank a lot of paid directories.',
    priority: 'high',
    fit: 75,
  },
  {
    id: 'therapyden',
    name: 'TherapyDen',
    url: 'https://www.therapyden.com/',
    category: 'mental_health',
    why: 'Modern Psychology Today alternative; values-driven filters (BIPOC-affirming, LGBTQ-affirming, etc.).',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'open-path-collective',
    name: 'Open Path Collective',
    url: 'https://openpathcollective.org/',
    category: 'mental_health',
    why: 'Sliding-scale therapist directory. Worth claiming for IOP / outpatient referral pipeline.',
    priority: 'medium',
    fit: 50,
  },
  {
    id: 'inclusive-therapists',
    name: 'Inclusive Therapists',
    url: 'https://www.inclusivetherapists.com/',
    category: 'mental_health',
    why: 'Identity-conscious provider directory. Aligns with our trauma-informed, culturally-responsive positioning.',
    priority: 'medium',
    fit: 55,
  },
  {
    id: 'therapytribe',
    name: 'TherapyTribe',
    url: 'https://www.therapytribe.com/',
    category: 'mental_health',
    why: 'Older but well-indexed mental-health directory; backlinks help domain authority.',
    priority: 'medium',
    fit: 55,
  },
  {
    id: 'zencare',
    name: 'Zencare',
    url: 'https://zencare.co/',
    category: 'mental_health',
    why: 'Higher-end therapist directory. Vetted listings; aligns with private-pay client profile.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'choosing-therapy',
    name: 'Choosing Therapy',
    url: 'https://www.choosingtherapy.com/find-a-therapist/',
    category: 'mental_health',
    why: 'Editorial site with strong organic rankings on long-tail mental health queries.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'counseling-directory',
    name: 'Counseling Directory (US)',
    url: 'https://www.counsellingdirectory.com/',
    category: 'mental_health',
    why: 'High-DA UK-rooted but US-friendly counselling directory. Useful crawl signal beyond addiction-only sites.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'adaa',
    name: 'ADAA — Find a Therapist',
    url: 'https://members.adaa.org/page/FATMain',
    category: 'mental_health',
    why: 'Anxiety & Depression Association of America. Co-occurring referrals where anxiety is the surface presentation.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'iocdf',
    name: 'International OCD Foundation — Find Help',
    url: 'https://iocdf.org/find-help/',
    category: 'mental_health',
    why: 'Niche but high-trust: clients with OCD-spectrum dual-dx sometimes find us via this surface.',
    priority: 'low',
    fit: 45,
  },

  // ── Phase 5: Healthcare / clinician directories ─────────────────
  {
    id: 'healthgrades',
    name: 'Healthgrades',
    url: 'https://www.healthgrades.com/find-a-doctor',
    category: 'healthcare',
    why: 'Highest-traffic doctor-finder in the US. Listing each clinician individually compounds organic reach.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'vitals',
    name: 'Vitals',
    url: 'https://www.vitals.com/',
    category: 'healthcare',
    why: 'Major review-driven physician directory. Strong organic rankings on individual clinician searches.',
    priority: 'high',
    fit: 85,
  },
  {
    id: 'webmd-physician',
    name: 'WebMD — Physician Directory',
    url: 'https://doctor.webmd.com/',
    category: 'healthcare',
    why: 'Trust signal that funnels into the WebMD content ecosystem. Critical for clinician-level pages.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'zocdoc',
    name: 'Zocdoc',
    url: 'https://www.zocdoc.com/',
    category: 'healthcare',
    why: 'Booking-first directory. Outpatient + assessment-stage referrals route through here.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'ratemds',
    name: 'RateMDs',
    url: 'https://www.ratemds.com/',
    category: 'healthcare',
    why: 'Review-driven directory. Useful for individual clinician reputation surfacing.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'doctor-com',
    name: 'Doctor.com',
    url: 'https://www.doctor.com/',
    category: 'healthcare',
    why: 'Aggregator that syndicates listings to dozens of downstream sites in one claim.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'caredash',
    name: 'CareDash',
    url: 'https://www.caredash.com/',
    category: 'healthcare',
    why: 'Mid-tier doctor directory with editorial content. Backlinks help authority more than direct conversions.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'usnews-doctors',
    name: 'U.S. News — Find a Doctor',
    url: 'https://health.usnews.com/doctors',
    category: 'healthcare',
    why: 'Trusted brand. Inclusion adds credibility on landing pages and press kit.',
    priority: 'medium',
    fit: 78,
  },
  {
    id: 'sharecare',
    name: 'Sharecare — Find a Doctor',
    url: 'https://www.sharecare.com/find-a-doctor',
    category: 'healthcare',
    why: 'Aggregator with growing organic visibility on health-condition queries.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'wellness-com',
    name: 'Wellness.com',
    url: 'https://www.wellness.com/',
    category: 'healthcare',
    why: 'Older but indexed health directory. Free claim; useful citation signal for local SEO.',
    priority: 'low',
    fit: 40,
  },

  // ── Phase 6: Review platforms + local business ──────────────────
  {
    id: 'google-business',
    name: 'Google Business Profile',
    url: 'https://www.google.com/business/',
    category: 'review',
    why: 'Single highest-leverage local-SEO listing. Reviews here drive Map Pack visibility for "rehab near me."',
    priority: 'high',
    fit: 100,
  },
  {
    id: 'yelp',
    name: 'Yelp',
    url: 'https://biz.yelp.com/',
    category: 'review',
    why: 'Strong organic rankings for service-based local queries. Active review management is non-negotiable.',
    priority: 'high',
    fit: 92,
  },
  {
    id: 'bing-places',
    name: 'Bing Places for Business',
    url: 'https://www.bingplaces.com/',
    category: 'review',
    why: 'Microsoft Maps + Bing search + Cortana. Smaller share but trivially cheap to claim.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'apple-maps-business',
    name: 'Apple Maps — Business Connect',
    url: 'https://mapsconnect.apple.com/',
    category: 'review',
    why: 'iPhone-default mapping. Critical for the "directions to 7 Arrows" surface from family members.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'facebook-business',
    name: 'Facebook Business Page',
    url: 'https://www.facebook.com/business/pages',
    category: 'review',
    why: 'Doubles as a review surface and a content-distribution channel. Reviews show on Meta search.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'foursquare',
    name: 'Foursquare for Business',
    url: 'https://business.foursquare.com/',
    category: 'review',
    why: 'Powers location data behind Snapchat, Twitter/X places, Uber, and many CMS plugins. Citation-juice.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'bbb',
    name: 'Better Business Bureau (BBB)',
    url: 'https://www.bbb.org/',
    category: 'review',
    why: 'Trust signal families specifically check before placing a loved one. Accreditation helps conversions.',
    priority: 'high',
    fit: 90,
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    url: 'https://business.trustpilot.com/',
    category: 'review',
    why: 'Consumer-facing review aggregator. Outranks our domain for "[brand] reviews" on cold searches.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'yellow-pages',
    name: 'Yellow Pages (YP.com)',
    url: 'https://www.yellowpages.com/',
    category: 'review',
    why: 'Old-school but still indexed; baseline NAP citation for local SEO consistency.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'manta',
    name: 'Manta',
    url: 'https://www.manta.com/',
    category: 'review',
    why: 'Small-business directory. Cheap citation source; not a meaningful inbound channel on its own.',
    priority: 'low',
    fit: 35,
  },

  // ── Phase 7: Arizona-specific ───────────────────────────────────
  {
    id: 'azdhs-bhs',
    name: 'AZDHS — Behavioral Health Services Provider List',
    url: 'https://www.azdhs.gov/licensing/healthcare-institutions/',
    category: 'arizona',
    why: 'State licensure surface. Listed providers show up in Arizona DHS-driven referrals and crisis lookups.',
    priority: 'high',
    fit: 90,
  },
  {
    id: 'ahcccs',
    name: 'AHCCCS — Provider Directory',
    url: 'https://www.azahcccs.gov/Members/ProgramsAndCoveredServices/findaprovider.html',
    category: 'arizona',
    why: 'Arizona Medicaid. Listed providers receive referrals from AHCCCS members and integrated RBHA partners.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'mercy-care',
    name: 'Mercy Care — Find a Provider (AHCCCS RBHA)',
    url: 'https://www.mercycareaz.org/members/mc/find-provider',
    category: 'arizona',
    why: 'Maricopa County RBHA. Drives a meaningful slice of public-sector SUD referrals.',
    priority: 'medium',
    fit: 78,
  },
  {
    id: 'caz-region',
    name: 'Care1st / Centene Arizona — Provider Directory',
    url: 'https://www.azcompletehealth.com/find-a-provider.html',
    category: 'arizona',
    why: 'AZ Complete Health is the southern-Arizona RBHA. Worth claiming for state-funded inquiries.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'azbbhe',
    name: 'Arizona Board of Behavioral Health Examiners — Verify a Licensee',
    url: 'https://azbbhe.us/Verification.aspx',
    category: 'arizona',
    why: 'Public licensure verification. Not a marketing surface but a credibility anchor families check.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'phoenix-chamber',
    name: 'Greater Phoenix Chamber',
    url: 'https://www.phoenixchamber.com/',
    category: 'arizona',
    why: 'Member directory plus B2B referral pathways for EAP-style employer relationships.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'tucson-chamber',
    name: 'Tucson Metro Chamber',
    url: 'https://www.tucsonchamber.org/',
    category: 'arizona',
    why: 'Southern-AZ business community. Useful for outreach to family-owned businesses with EAP needs.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'maricopa-public-health',
    name: 'Maricopa County Department of Public Health',
    url: 'https://www.maricopa.gov/5621/Substance-Use-Disorders',
    category: 'arizona',
    why: 'County-level SUD resource page links to vetted providers. Useful credibility signal.',
    priority: 'low',
    fit: 60,
  },
  {
    id: 'arha',
    name: 'Arizona Recovery Housing Association (ArRHA)',
    url: 'https://www.arrha.org/',
    category: 'arizona',
    why: 'AZ certified sober-living network. Discharge-planning relationships start in their member directory.',
    priority: 'medium',
    fit: 78,
  },
  {
    id: 'phoenix-magazine-top-doctors',
    name: 'Phoenix Magazine — Top Doctors / Top Mental Health',
    url: 'https://www.phoenixmag.com/category/top-doctors/',
    category: 'arizona',
    why: 'Annual editorial list. Inclusion is local trust signal that families share inside families.',
    priority: 'medium',
    fit: 78,
  },

  // ── Phase 8: Recovery community + sober living ──────────────────
  {
    id: 'in-the-rooms',
    name: 'In The Rooms',
    url: 'https://www.intherooms.com/',
    category: 'recovery',
    why: '500K+ member online recovery community. Treatment Center listings convert because users are already in the work.',
    priority: 'high',
    fit: 82,
  },
  {
    id: 'sober-recovery',
    name: 'SoberRecovery',
    url: 'https://www.soberrecovery.com/forums/',
    category: 'recovery',
    why: 'Long-running peer recovery forum with a treatment directory. Strong organic visibility on long-tail queries.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'recovery-research-institute',
    name: 'Recovery Research Institute (Mass General)',
    url: 'https://www.recoveryanswers.org/',
    category: 'recovery',
    why: 'Academic-grade resource hub. Listing in their referral pages is a credibility win, not a volume play.',
    priority: 'low',
    fit: 65,
  },
  {
    id: 'sober-nation',
    name: 'Sober Nation',
    url: 'https://sobernation.com/',
    category: 'recovery',
    why: 'Recovery community + treatment finder. Free claim, helpful for surfacing alumni-side content.',
    priority: 'medium',
    fit: 55,
  },
  {
    id: 'narr',
    name: 'NARR — National Alliance for Recovery Residences',
    url: 'https://narronline.org/affiliates/find-a-residence/',
    category: 'recovery',
    why: 'Standards body for recovery housing. Discharge-planning partnerships start in their affiliate map.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'faces-and-voices',
    name: 'Faces & Voices of Recovery — Recovery Directory',
    url: 'https://facesandvoicesofrecovery.org/resources/recovery-directory/',
    category: 'recovery',
    why: 'National recovery-advocacy nonprofit. Listing positions us inside the broader recovery ecosystem.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'soberlink',
    name: 'Soberlink — Treatment Provider Network',
    url: 'https://www.soberlink.com/treatment-providers',
    category: 'recovery',
    why: 'Remote alcohol monitoring. Clinical partnership listings drive referrals from alumni continuing care.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'workit-health-resources',
    name: 'Workit Health — Recovery Resources',
    url: 'https://www.workithealth.com/resources/',
    category: 'recovery',
    why: 'MAT-focused telehealth with a referral resource hub. Useful for stepped-care collaborations.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'all-treatment',
    name: 'AllTreatment.com',
    url: 'https://www.alltreatment.com/',
    category: 'recovery',
    why: 'Treatment-finder with state and city pages. Free profile, decent organic visibility.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'sober-grid',
    name: 'Sober Grid — Provider Network',
    url: 'https://www.sobergrid.com/',
    category: 'recovery',
    why: 'Mobile-first sober community + peer coaching. Treatment partnerships visible inside their app.',
    priority: 'low',
    fit: 50,
  },

  // ── Phase 9a: Specialty (LGBTQ, vets, dual-dx, populations) ─────
  {
    id: 'glma-provider',
    name: 'GLMA — LGBTQ+ Healthcare Provider Directory',
    url: 'https://www.glma.org/find-a-provider',
    category: 'specialty',
    why: 'Gay & Lesbian Medical Association. Inclusion signals affirming care to LGBTQ+ clients and family.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'pride-counseling',
    name: 'Pride Counseling — Provider Network',
    url: 'https://www.pridecounseling.com/',
    category: 'specialty',
    why: 'Telehealth platform with LGBTQ-affirming positioning. Adjacent referrals when residential is the right step.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'va-community-care',
    name: 'VA Community Care Network',
    url: 'https://www.va.gov/communitycare/',
    category: 'specialty',
    why: 'Federal VA. Required surface for serving veterans on community-care referrals.',
    priority: 'high',
    fit: 80,
  },
  {
    id: 'give-an-hour',
    name: 'Give an Hour — Provider Network',
    url: 'https://giveanhour.org/',
    category: 'specialty',
    why: 'Pro-bono mental health for military, veterans, and first responders. Trusted referral pathway.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'national-center-ptsd',
    name: 'National Center for PTSD — Provider Directory',
    url: 'https://www.ptsd.va.gov/gethelp/find_therapist.asp',
    category: 'specialty',
    why: 'Authoritative PTSD resource. Funnels co-occurring trauma + SUD clients into qualified care.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'neda-treatment',
    name: 'NEDA — Eating Disorder Treatment Finder',
    url: 'https://www.nationaleatingdisorders.org/help-support/',
    category: 'specialty',
    why: 'For dual-dx clients with co-occurring eating disorders; positions us inside the ED-aware referral network.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'samhsa-suicide-988',
    name: '988 Suicide & Crisis Lifeline — Partner Network',
    url: 'https://988lifeline.org/our-network/',
    category: 'specialty',
    why: 'Crisis-line partner ecosystem. Hand-offs into residential SUD care happen here when the call escalates.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'asam-find',
    name: 'ASAM — Find an Addiction Medicine Specialist',
    url: 'https://www.asam.org/membership/find-a-member',
    category: 'specialty',
    why: 'American Society of Addiction Medicine. Surfaces our medical staff inside the gold-standard SUD network.',
    priority: 'high',
    fit: 90,
  },

  // ── Phase 9b: Professional + accreditation ──────────────────────
  {
    id: 'naatp',
    name: 'NAATP — Member Directory',
    url: 'https://www.naatp.org/find-a-provider',
    category: 'professional',
    why: 'National Association of Addiction Treatment Providers. Membership is a peer trust signal in the industry.',
    priority: 'high',
    fit: 95,
  },
  {
    id: 'naadac',
    name: 'NAADAC — Find a Counselor',
    url: 'https://www.naadac.org/find-a-counselor',
    category: 'professional',
    why: 'Association for Addiction Professionals. Clinician-level listings build authority for individual staff.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'joint-commission',
    name: 'The Joint Commission — Quality Check',
    url: 'https://www.qualitycheck.org/',
    category: 'professional',
    why: 'Behavioral-health accreditation lookup. Listed accreditation is a credibility anchor for families + payers.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'carf',
    name: 'CARF International — Provider Directory',
    url: 'https://www.carf.org/providerSearch.aspx',
    category: 'professional',
    why: 'Behavioral-health accreditation alternative to Joint Commission. Listing matters for state and payer audits.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'apa-find',
    name: 'APA — Psychologist Locator',
    url: 'https://locator.apa.org/',
    category: 'professional',
    why: 'American Psychological Association. Surfaces our PhDs / PsyDs inside the most authoritative national lookup.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'aca-find-counselor',
    name: 'ACA — Therapist Directory',
    url: 'https://www.counseling.org/aca-community/learn-about-counseling/find-a-counselor',
    category: 'professional',
    why: 'American Counseling Association. Builds authority for our LPC / LAC / LMHC team members.',
    priority: 'low',
    fit: 60,
  },
  {
    id: 'aamft',
    name: 'AAMFT — Find a Marriage & Family Therapist',
    url: 'https://www.aamft.org/Directories/Find_a_Therapist.aspx',
    category: 'professional',
    why: 'Family-systems angle for our LMFTs; relevant for family-program touchpoints.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'nasw-find-social-worker',
    name: 'NASW — HelpStartsHere Therapist Finder',
    url: 'https://www.helpstartshere.org/find-a-social-worker/',
    category: 'professional',
    why: 'National Association of Social Workers. Surfaces our LCSWs inside an authoritative SW directory.',
    priority: 'low',
    fit: 60,
  },

  // ── Phase 10: General business + brand ──────────────────────────
  {
    id: 'linkedin-company',
    name: 'LinkedIn Company Page',
    url: 'https://www.linkedin.com/company/setup/new/',
    category: 'business',
    why: 'Single most-trafficked B2B brand surface. Doubles as a hiring funnel and a press / partner reference.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    url: 'https://www.crunchbase.com/',
    category: 'business',
    why: 'Default B2B intel directory. Shows up on cold "what is this company" searches by referrers and journalists.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor — Employer Profile',
    url: 'https://www.glassdoor.com/employers/',
    category: 'business',
    why: 'Family members read employer reviews looking for treatment-center culture signals before they call.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'indeed-company',
    name: 'Indeed — Company Page',
    url: 'https://employers.indeed.com/',
    category: 'business',
    why: 'Hiring funnel for clinical staff plus a public-facing review surface that affects family trust.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'owler',
    name: 'Owler',
    url: 'https://www.owler.com/',
    category: 'business',
    why: 'Competitor-tracking B2B directory. Citation-juice; shows up in cold competitive research.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'zoominfo',
    name: 'ZoomInfo — Company Profile',
    url: 'https://www.zoominfo.com/business/',
    category: 'business',
    why: 'Standard B2B intelligence platform; presence here means partners and EAP buyers can verify us.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'bizapedia',
    name: 'Bizapedia',
    url: 'https://www.bizapedia.com/',
    category: 'business',
    why: 'State-business-records aggregator. Auto-populated baseline citation worth claiming.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'hotfrog',
    name: 'Hotfrog',
    url: 'https://www.hotfrog.com/',
    category: 'business',
    why: 'Free national business directory. Cheap NAP citation source for local SEO consistency.',
    priority: 'low',
    fit: 30,
  },
  {
    id: 'chamber-of-commerce-com',
    name: 'ChamberOfCommerce.com',
    url: 'https://www.chamberofcommerce.com/',
    category: 'business',
    why: 'National business directory branded as a chamber index. Decent-DA citation, free claim.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'brownbook',
    name: 'Brownbook.net',
    url: 'https://www.brownbook.net/',
    category: 'business',
    why: 'Open business directory. Useful for citation breadth; not a meaningful inbound channel on its own.',
    priority: 'low',
    fit: 25,
  },

  // ── Phase 2: National addiction long-tail (+50) ─────────────────
  {
    id: 'niaaa-alcohol-navigator',
    name: 'NIAAA Alcohol Treatment Navigator',
    url: 'https://alcoholtreatment.niaaa.nih.gov/',
    category: 'national',
    why: 'NIH-backed AUD-specific treatment finder. High trust signal for clients ready to address alcohol use.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'samhsa-otp-directory',
    name: 'SAMHSA — Opioid Treatment Program Directory',
    url: 'https://dpt2.samhsa.gov/treatment/directory.aspx',
    category: 'national',
    why: 'Federal OTP directory. Funnel for opioid-treatment-specific inquiries.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'samhsa-bup-locator',
    name: 'SAMHSA Buprenorphine Practitioner Locator',
    url: 'https://www.samhsa.gov/medications-substance-use-disorders/find-practitioner',
    category: 'national',
    why: 'MAT-prescriber finder. Worth surfacing our medical staff for opioid-use clients.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'shatterproof-atlas',
    name: 'Shatterproof Treatment Atlas',
    url: 'https://www.treatmentatlas.org/',
    category: 'national',
    why: 'Quality-rated treatment directory backed by Shatterproof. Listing aligns us with evidence-based positioning.',
    priority: 'high',
    fit: 90,
  },
  {
    id: 'partnership-end-addiction',
    name: 'Partnership to End Addiction — Treatment eBook + directory',
    url: 'https://drugfree.org/article/finding-treatment/',
    category: 'national',
    why: 'High-DA family-facing addiction nonprofit. Resource pages drive informed inquiries from concerned families.',
    priority: 'high',
    fit: 85,
  },
  {
    id: 'recovery-com',
    name: 'Recovery.com',
    url: 'https://recovery.com/',
    category: 'national',
    why: 'Modern aggregator with global treatment finder + reviews. Strong UX and growing organic visibility.',
    priority: 'high',
    fit: 88,
  },
  {
    id: 'rehabpath',
    name: 'RehabPath',
    url: 'https://www.rehabpath.com/',
    category: 'national',
    why: 'Treatment-finder with strong premium-rehab positioning. Aligns with our private-pay client profile.',
    priority: 'high',
    fit: 85,
  },
  {
    id: 'treatment4addiction',
    name: 'Treatment4Addiction.com',
    url: 'https://www.treatment4addiction.com/',
    category: 'national',
    why: 'Long-running rehab finder with state and substance landing pages.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'choose-help',
    name: 'ChooseHelp.com',
    url: 'https://www.choosehelp.com/topics/addiction',
    category: 'national',
    why: 'Editorial + directory site with decent organic visibility on long-tail addiction queries.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'addiction-search',
    name: 'AddictionSearch.com',
    url: 'https://www.addictionsearch.com/',
    category: 'national',
    why: 'Free treatment-finder with state pages. Cheap citation source with consistent NAP signal.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'addictions-and-recovery',
    name: 'AddictionsAndRecovery.org',
    url: 'https://www.addictionsandrecovery.org/',
    category: 'national',
    why: 'Educational hub with editorial credibility. Backlinks are useful for topical authority.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'help-org-sa',
    name: 'Help.org — Substance Abuse',
    url: 'https://www.help.org/substance-abuse/',
    category: 'national',
    why: 'Resource portal with treatment listings; aggregates data from SAMHSA + state sources.',
    priority: 'medium',
    fit: 55,
  },
  {
    id: 'recovered-org',
    name: 'Recovered.org',
    url: 'https://recovered.org/',
    category: 'national',
    why: 'UK-rooted but US-active treatment directory with quality-rated profiles.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'addiction-guide',
    name: 'AddictionGuide.com',
    url: 'https://www.addictionguide.com/',
    category: 'national',
    why: 'Treatment locator with editor reviews. Decent organic visibility on substance-specific queries.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'better-addiction-care',
    name: 'Better Addiction Care',
    url: 'https://www.betteraddictioncare.com/',
    category: 'national',
    why: 'Helpline-style directory; profiles get distributed to their referral team.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'rehab-reviews',
    name: 'RehabReviews.com',
    url: 'https://www.rehabreviews.com/',
    category: 'national',
    why: 'AAC-owned editorial review site. Inclusion in roundups drives qualified press-style traffic.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'find-recovery',
    name: 'FindRecovery.com',
    url: 'https://findrecovery.com/',
    category: 'national',
    why: 'Free treatment finder; useful for state-level visibility and basic citation.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'rehab-finder',
    name: 'RehabFinder.org',
    url: 'https://rehabfinder.org/',
    category: 'national',
    why: 'Independent treatment locator. Free claim, modest organic traffic.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'rehabs-near-me',
    name: 'RehabsNearMe',
    url: 'https://rehabsnearme.org/',
    category: 'national',
    why: 'Geo-keyword-targeted directory. Ranks for "rehabs near me [city]" queries.',
    priority: 'medium',
    fit: 55,
  },
  {
    id: 'i-am-sober',
    name: 'I Am Sober — Provider Resources',
    url: 'https://iamsober.com/',
    category: 'national',
    why: 'Recovery-tracking app with 1M+ users. Treatment provider visibility inside the app + community.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'attc-network',
    name: 'ATTC Network — Addiction Technology Transfer Centers',
    url: 'https://attcnetwork.org/find-an-attc',
    category: 'national',
    why: 'SAMHSA-funded clinician training network. Adjacent to academic + government referral pipelines.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'aac-treatmentcenters',
    name: 'AAC — TreatmentCenters.com',
    url: 'https://www.treatmentcenters.com/',
    category: 'national',
    why: "American Addiction Centers' aggregator. Profile claim is free for non-AAC facilities.",
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'rehabpath-luxury',
    name: 'RehabPath — Luxury Rehab',
    url: 'https://www.rehabpath.com/rehab/luxury/',
    category: 'national',
    why: 'Luxury / premium-segment subdirectory. Aligns with our private-pay positioning.',
    priority: 'high',
    fit: 82,
  },
  {
    id: 'hazelden-bettyfd-affiliates',
    name: 'Hazelden Betty Ford — Affiliate Directory',
    url: 'https://www.hazeldenbettyford.org/',
    category: 'national',
    why: 'Joining the affiliate / continuing-care network creates downstream-referral pipelines.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'sober-services',
    name: 'SoberServices.com',
    url: 'https://www.soberservices.com/',
    category: 'national',
    why: 'Recovery directory + content hub. Free claim and modest citation value.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'sober-college-finder',
    name: 'SoberCollege Finder',
    url: 'https://www.sobercollege.com/',
    category: 'national',
    why: 'Adjacent listing useful for the family-of-young-adult demographic.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'recovery-connection',
    name: 'Recovery Connection',
    url: 'https://www.recoveryconnection.com/',
    category: 'national',
    why: 'Long-running recovery hub with treatment provider listings.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'addiction-blog',
    name: 'Addiction Blog — Provider Directory',
    url: 'https://addictionblog.org/treatment/',
    category: 'national',
    why: 'High-volume editorial site; mention in Q&A pages drives long-tail organic traffic.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'addiction-help',
    name: 'AddictionHelp.com',
    url: 'https://www.addictionhelp.com/',
    category: 'national',
    why: 'Drug + alcohol directory with informational content. Newer site, growing organic visibility.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'national-rehab-directory',
    name: 'National Rehab Directory',
    url: 'https://nationalrehabdirectory.com/',
    category: 'national',
    why: 'Free treatment locator; minor citation value for NAP consistency.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'find-rehab-centers',
    name: 'FindRehabCenters.com',
    url: 'https://www.findrehabcenters.com/',
    category: 'national',
    why: 'State + substance landing pages. Free profile, useful citation source.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'rehab-aware',
    name: 'RehabAware',
    url: 'https://www.rehabaware.org/',
    category: 'national',
    why: 'Editorial + directory hybrid. Inclusion in city/state pages drives qualified search traffic.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'addiction-coalition',
    name: 'Addiction Policy Forum — Resource Directory',
    url: 'https://www.addictionpolicy.org/',
    category: 'national',
    why: 'Policy nonprofit with provider resources. Trust signal more than referral pipeline.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'shatterproof-find-treatment',
    name: 'Shatterproof — Find Treatment Hub',
    url: 'https://www.shatterproof.org/find-help',
    category: 'national',
    why: 'Family-facing nonprofit with high trust. Listed providers appear in their family-resource pages.',
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'mid-atlantic-attc',
    name: 'C4 Recovery Foundation — Provider Directory',
    url: 'https://www.c4recovery.org/',
    category: 'national',
    why: 'Industry advocacy nonprofit. Inclusion signals participation in the wider field-improvement community.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'national-recovery-hub',
    name: 'National Recovery Hub',
    url: 'https://www.recoveryhub.io/',
    category: 'national',
    why: 'Newer aggregator with growing visibility on insurance + treatment-cost queries.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'addiction-treatment-magazine',
    name: 'Addiction Treatment Magazine',
    url: 'https://www.addictiontreatmentmagazine.com/',
    category: 'national',
    why: 'Industry trade publication. Editorial mentions and PR placements help thought leadership.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'recovery-today-magazine',
    name: 'Recovery Today Magazine',
    url: 'https://recoverytodaymagazine.com/',
    category: 'national',
    why: 'Recovery-community magazine. Feature inclusion drives alumni-network awareness.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'sober-world',
    name: 'The Sober World Magazine',
    url: 'https://thesoberworld.com/',
    category: 'national',
    why: 'Family-and-recovery-focused magazine with directory section.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'addiction-recovery-ebulletin',
    name: 'Addiction Recovery eBulletin',
    url: 'https://addictionrecoveryebulletin.org/',
    category: 'national',
    why: 'Daily recovery-news roundup. Editorial mentions help backlink profile + thought leadership.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'safe-project',
    name: 'SAFE Project — Treatment Locator',
    url: 'https://www.safeproject.us/recovery/',
    category: 'national',
    why: 'Opioid-recovery-focused nonprofit. Listed providers reach families navigating opioid loss.',
    priority: 'medium',
    fit: 55,
  },
  {
    id: 'national-council-mental-wellbeing',
    name: 'National Council for Mental Wellbeing — Member Directory',
    url: 'https://www.thenationalcouncil.org/',
    category: 'national',
    why: 'Largest behavioral-health membership org. Membership signals credibility to payers.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'aatod',
    name: 'AATOD — Provider Directory',
    url: 'https://www.aatod.org/',
    category: 'national',
    why: 'American Association for the Treatment of Opioid Dependence. Specialty-relevant if MAT-positioned.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'addiction-pro',
    name: 'Addiction Professional',
    url: 'https://www.addictionpro.com/',
    category: 'national',
    why: 'Industry trade journal. Editorial features and listings reach treatment-center peers + referrers.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'treatment-magazine',
    name: 'Treatment Magazine',
    url: 'https://www.treatmentmagazine.com/',
    category: 'national',
    why: 'Industry-side magazine; PR placements compound brand authority within the field.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'best-rehabs',
    name: 'BestRehabs.com',
    url: 'https://bestrehabs.com/',
    category: 'national',
    why: 'Listicle-style directory; inclusion in "best of" pages helps social-proof on cold searches.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'rehab4addiction',
    name: 'Rehab 4 Addiction',
    url: 'https://www.rehab4addiction.co.uk/',
    category: 'national',
    why: 'UK-rooted but US-friendly directory. Backlink value plus secondary international visibility.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'addiction-now',
    name: 'Addiction Now',
    url: 'https://addictionnow.com/',
    category: 'national',
    why: 'Recovery-news outlet with directory pages. Editorial mentions help DA + topical relevance.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'treatment-indicators',
    name: 'Treatment Indicators — Outcomes Network',
    url: 'https://www.treatmentindicators.com/',
    category: 'national',
    why: 'Outcomes-focused provider network. Membership signals data-driven clinical operation.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'caron-affiliates',
    name: 'Caron Treatment — Affiliate Network',
    url: 'https://www.caron.org/',
    category: 'national',
    why: 'Continuing-care affiliate program; downstream-referral pipeline for alumni continuing east-coast care.',
    priority: 'low',
    fit: 45,
  },

  // ── Phase 3: Arizona regional / local (+50) ─────────────────────
  {
    id: 'visit-phoenix',
    name: 'Visit Phoenix — Member Directory',
    url: 'https://www.visitphoenix.com/',
    category: 'arizona',
    why: 'Tourism bureau directory. Family members traveling to drop a loved one search this for amenities + maps.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'visit-tucson',
    name: 'Visit Tucson — Member Directory',
    url: 'https://www.visittucson.org/',
    category: 'arizona',
    why: 'Southern-AZ tourism bureau. Same logic for the Tucson-area reach.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'visit-scottsdale',
    name: 'Experience Scottsdale',
    url: 'https://www.experiencescottsdale.com/',
    category: 'arizona',
    why: 'Scottsdale tourism CVB. Premium positioning aligns with our private-pay client travel profile.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'visit-sedona',
    name: 'Visit Sedona',
    url: 'https://visitsedona.com/',
    category: 'arizona',
    why: 'Wellness-tourism keyword. Aligns with our somatic / equine / outdoor positioning.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'visit-prescott',
    name: 'Visit Prescott',
    url: 'https://www.visit-prescott.com/',
    category: 'arizona',
    why: 'Northern-AZ tourism. Useful for clients exploring the area pre-admission.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'tempe-chamber',
    name: 'Tempe Chamber of Commerce',
    url: 'https://www.tempechamber.org/',
    category: 'arizona',
    why: 'Tempe / east-valley B2B network. Useful for EAP-style employer outreach.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'scottsdale-chamber',
    name: 'Scottsdale Area Chamber of Commerce',
    url: 'https://www.scottsdalechamber.com/',
    category: 'arizona',
    why: 'High-end Scottsdale business network. Strong B2B alignment for employer-side relationships.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'mesa-chamber',
    name: 'Mesa Chamber of Commerce',
    url: 'https://www.mesachamber.org/',
    category: 'arizona',
    why: 'Mesa-area B2B directory. Modest reach, useful citation source for east-valley NAP.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'gilbert-chamber',
    name: 'Gilbert Chamber of Commerce',
    url: 'https://gilbertaz.com/',
    category: 'arizona',
    why: 'Gilbert-area B2B directory. Smaller reach but useful for the family-owned business referral pipeline.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'chandler-chamber',
    name: 'Chandler Chamber of Commerce',
    url: 'https://www.chandlerchamber.com/',
    category: 'arizona',
    why: 'Chandler-area B2B directory. Citation breadth across east-valley markets.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'flagstaff-chamber',
    name: 'Flagstaff Chamber of Commerce',
    url: 'https://www.flagstaffchamber.com/',
    category: 'arizona',
    why: 'Northern-AZ business directory. Modest reach, useful citation.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'sedona-chamber',
    name: 'Sedona Chamber of Commerce',
    url: 'https://www.sedonachamber.com/',
    category: 'arizona',
    why: 'Wellness-tourism town. Aligns with our somatic / outdoor positioning if clients explore the region.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'pinal-chamber',
    name: 'Pinal Partnership / Pinal County Chamber',
    url: 'https://www.pinalpartnership.com/',
    category: 'arizona',
    why: 'County-level business network. Citation source for Pinal-county NAP.',
    priority: 'low',
    fit: 30,
  },
  {
    id: 'arizona-business-magazine',
    name: 'AZ Big Media — Arizona Business Magazine',
    url: 'https://azbigmedia.com/',
    category: 'arizona',
    why: 'AZ-business publication. Annual lists + features drive B2B awareness with employer / EAP buyers.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'phoenix-business-journal',
    name: 'Phoenix Business Journal',
    url: 'https://www.bizjournals.com/phoenix/',
    category: 'arizona',
    why: 'Local Bizjournal. Press placements + Best Places lists drive B2B + family-side trust.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'inbusinessphx',
    name: 'In Business Magazine — Phoenix',
    url: 'https://inbusinessphx.com/',
    category: 'arizona',
    why: 'Phoenix-area B2B publication. Local PR placements compound brand authority.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'tucson-weekly',
    name: 'Tucson Weekly',
    url: 'https://www.tucsonweekly.com/',
    category: 'arizona',
    why: 'Alt-weekly with high local trust. Editorial mentions reach southern-AZ readers.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'phoenix-new-times',
    name: 'Phoenix New Times',
    url: 'https://www.phoenixnewtimes.com/',
    category: 'arizona',
    why: 'Phoenix alt-weekly. Editorial coverage = high trust signal locally.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'arizona-republic',
    name: 'The Arizona Republic — Local Business Listings',
    url: 'https://www.azcentral.com/',
    category: 'arizona',
    why: "AZ's largest daily newspaper + azcentral. PR placements are top-tier local trust signal.",
    priority: 'medium',
    fit: 75,
  },
  {
    id: 'arizona-daily-star',
    name: 'Arizona Daily Star — Tucson',
    url: 'https://tucson.com/',
    category: 'arizona',
    why: 'Tucson daily newspaper. Editorial coverage = top-tier southern-AZ trust signal.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'state-press',
    name: 'The State Press (ASU)',
    url: 'https://www.statepress.com/',
    category: 'arizona',
    why: 'ASU student newspaper. Useful for the collegiate-recovery / young-adult pipeline.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'arizona-pbs',
    name: 'Arizona PBS — Resource Directory',
    url: 'https://azpbs.org/',
    category: 'arizona',
    why: 'Public-broadcasting community-resource pages. Trust signal for family viewers.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'kjzz',
    name: 'KJZZ — NPR Phoenix Resource Page',
    url: 'https://kjzz.org/',
    category: 'arizona',
    why: 'NPR Phoenix. Inclusion in resource roundups reaches NPR-listening adult demo.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'kuat',
    name: 'Arizona Public Media (KUAT) — Tucson',
    url: 'https://news.azpm.org/',
    category: 'arizona',
    why: 'Tucson NPR/PBS. Same resource-roundup leverage in southern AZ.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'crisis-response-network-az',
    name: 'Crisis Response Network — Arizona',
    url: 'https://crisisnetwork.org/',
    category: 'arizona',
    why: 'AZ statewide crisis line operator. Listed providers receive direct hand-offs from crisis dispatchers.',
    priority: 'high',
    fit: 80,
  },
  {
    id: 'solari-crisis',
    name: 'Solari Crisis & Human Services',
    url: 'https://solari-inc.org/',
    category: 'arizona',
    why: 'AZ crisis-system contractor. Provider resource access drives statewide crisis-handoff referrals.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'banner-health-find-care',
    name: 'Banner Health — Find a Doctor / Behavioral Health',
    url: 'https://www.bannerhealth.com/services/behavioral-health',
    category: 'arizona',
    why: "AZ's largest health system. Referral relationships with Banner ED + behavioral teams drive admits.",
    priority: 'high',
    fit: 80,
  },
  {
    id: 'honorhealth',
    name: 'HonorHealth — Behavioral Health Resources',
    url: 'https://www.honorhealth.com/medical-services/behavioral-health',
    category: 'arizona',
    why: 'Scottsdale-area health system. Their behavioral / ED teams are key discharge-referral partners.',
    priority: 'high',
    fit: 78,
  },
  {
    id: 'dignity-health-az',
    name: 'Dignity Health Arizona — Behavioral Health',
    url: 'https://www.dignityhealth.org/arizona/services/behavioral-health',
    category: 'arizona',
    why: 'Dignity Health AZ network includes major Phoenix-area hospitals. Discharge-referral funnel.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'mayo-clinic-az',
    name: 'Mayo Clinic Arizona — Behavioral Health',
    url: 'https://www.mayoclinic.org/departments-centers/psychiatry-psychology/arizona/overview',
    category: 'arizona',
    why: 'Mayo AZ relationships are gold-standard referral partnerships for affluent dual-dx clients.',
    priority: 'high',
    fit: 82,
  },
  {
    id: 'so-az-behavioral-health',
    name: 'Southern Arizona Behavioral Health Center',
    url: 'https://sabhc.com/',
    category: 'arizona',
    why: 'Southern-AZ partner network. Tucson-area referral pipeline.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'crisis-preparation-recovery',
    name: 'Crisis Preparation & Recovery (CPR) — AZ',
    url: 'https://crpaz.org/',
    category: 'arizona',
    why: 'Maricopa-county urgent psychiatric care provider. Step-down referrals into residential SUD.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'connections-az',
    name: 'Connections Health Solutions — Phoenix',
    url: 'https://www.connectionshs.com/',
    category: 'arizona',
    why: '23-hour crisis stabilization in Phoenix. High-volume hand-off partner for residential SUD.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'asu-cssr',
    name: 'ASU Center for the Study of Sport and Recovery',
    url: 'https://thesundevils.com/',
    category: 'arizona',
    why: 'ASU collegiate recovery community. Adjacent to young-adult athlete-recovery referral pipeline.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'u-of-a-cscr',
    name: 'University of Arizona Collegiate Recovery Program',
    url: 'https://health.arizona.edu/',
    category: 'arizona',
    why: 'UA collegiate recovery. Adjacent to young-adult, southern-AZ student referrals.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'nau-care',
    name: 'NAU Recovery Resources',
    url: 'https://in.nau.edu/cmdr/',
    category: 'arizona',
    why: 'Northern Arizona University recovery resources. Niche but real young-adult pipeline.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'arizona-summit-org',
    name: 'Arizona Substance Abuse Partnership',
    url: 'https://goyff.az.gov/asap',
    category: 'arizona',
    why: 'Governor-office-housed statewide SUD partnership. Inclusion signals state-level engagement.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'arizona-attorney-general-opioid',
    name: "Arizona Attorney General — Opioid Resources",
    url: 'https://www.azag.gov/criminal/opioid',
    category: 'arizona',
    why: 'AG-office opioid resource page. Trust signal during the AZ opioid-settlement era.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'maricopa-county-opioid',
    name: 'Maricopa County — Opioid Response',
    url: 'https://www.maricopa.gov/5621/Substance-Use-Disorders',
    category: 'arizona',
    why: 'County opioid resource hub. Public-sector visibility for SUD providers.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'pima-county-behavioral',
    name: 'Pima County — Behavioral Health Resources',
    url: 'https://webcms.pima.gov/health/',
    category: 'arizona',
    why: 'Southern-AZ public-health hub. Inclusion in resource pages drives Tucson-area referrals.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'yavapai-county-behavioral',
    name: 'Yavapai County — Community Health Services',
    url: 'https://www.yavapaiaz.gov/CHS',
    category: 'arizona',
    why: 'Northern-AZ county health resources. Citation breadth + niche referrals.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'arizona-foothills-magazine',
    name: 'Arizona Foothills Magazine',
    url: 'https://www.arizonafoothillsmagazine.com/',
    category: 'arizona',
    why: 'AZ luxury/lifestyle magazine. Inclusion in best-of lists reaches private-pay demographics.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'so-scottsdale-magazine',
    name: 'So Scottsdale Magazine',
    url: 'https://socialmediascottsdale.com/',
    category: 'arizona',
    why: 'Affluent-Scottsdale lifestyle publication. PR placements reach core private-pay families.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'images-arizona',
    name: 'Images Arizona Magazine',
    url: 'https://imagesarizona.com/',
    category: 'arizona',
    why: 'North-Scottsdale / Carefree lifestyle magazine. Niche affluent-AZ reach.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'tucson-lifestyle',
    name: 'Tucson Lifestyle Magazine',
    url: 'https://www.tucsonlifestyle.com/',
    category: 'arizona',
    why: 'Southern-AZ lifestyle magazine. PR placements reach Tucson-affluent demographics.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'frontdoors-media',
    name: 'Frontdoors Media — Phoenix',
    url: 'https://frontdoorsmedia.com/',
    category: 'arizona',
    why: 'AZ philanthropy-and-society publication. Editorial mentions strengthen community / nonprofit partner ties.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'arizona-network-of-mental-health',
    name: 'Arizona Network for Mental Health Services',
    url: 'https://www.azabh.org/',
    category: 'arizona',
    why: 'AZ behavioral health services membership network. Membership signals statewide engagement.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'naatp-az-chapter',
    name: 'NAATP Arizona Chapter',
    url: 'https://www.naatp.org/',
    category: 'arizona',
    why: 'NAATP state chapter. Local field-credibility + AZ peer-network access.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'maricopa-area-agency-aging',
    name: 'Area Agency on Aging — Region One (Maricopa)',
    url: 'https://www.aaaphx.org/',
    category: 'arizona',
    why: 'Older-adult resource hub. Niche referrals for our 50+ admissions pipeline.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'arizona-healthcare-directory',
    name: 'Arizona Health-Care Directory (AZ Health Council)',
    url: 'https://www.azhha.org/',
    category: 'arizona',
    why: 'AZ Hospital + Healthcare Association. Hospital-system partnership credibility signal.',
    priority: 'low',
    fit: 50,
  },

  // ── Phase 4: Population-specific (+50) ──────────────────────────
  // Women
  {
    id: 'she-recovers',
    name: 'SHE RECOVERS Foundation — Provider Directory',
    url: 'https://sherecovers.org/',
    category: 'specialty',
    why: 'Global women-in-recovery community. Treatment listings reach women navigating SUD specifically.',
    priority: 'high',
    fit: 80,
  },
  {
    id: 'women-for-sobriety',
    name: 'Women for Sobriety',
    url: 'https://womenforsobriety.org/',
    category: 'specialty',
    why: 'Long-running women-only recovery org. Program partners surface in their meeting + resources.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'sober-mom-squad',
    name: 'Sober Mom Squad',
    url: 'https://www.sobermomsquad.com/',
    category: 'specialty',
    why: 'Modern women / mom-recovery community. Affinity drives qualified inquiries from a high-need demographic.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'tempest-sobriety',
    name: 'Tempest — Provider Resources',
    url: 'https://www.jointempest.com/',
    category: 'specialty',
    why: 'Gray-area-drinking-focused recovery program; aligns with women / professional recovery.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'sober-mom-life',
    name: 'The Sober Mom Life',
    url: 'https://thesobermomlife.com/',
    category: 'specialty',
    why: 'Mom-recovery editorial brand. Editorial mentions reach mid-30s parents in early sobriety.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'beyond-pink-recovery',
    name: 'Beyond Pink — Women Recovery',
    url: 'https://www.beyondpinkrecovery.com/',
    category: 'specialty',
    why: 'Women-only recovery community + resource hub.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'sober-girl-society',
    name: 'Sober Girl Society',
    url: 'https://sobergirlsociety.com/',
    category: 'specialty',
    why: 'Modern sober-curious community for women. Niche but high-affinity audience.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'recovery-elevator',
    name: 'Recovery Elevator — Provider Resources',
    url: 'https://www.recoveryelevator.com/',
    category: 'specialty',
    why: 'Adult-recovery podcast + community. Resource-page placement reaches engaged-listener audience.',
    priority: 'medium',
    fit: 60,
  },
  // Men
  {
    id: 'mens-recovery',
    name: "Men's Recovery Project",
    url: 'https://mensrecoveryproject.org/',
    category: 'specialty',
    why: "Men's recovery resource hub. Affinity marketing for the male-identifying demo.",
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'theotherbar',
    name: 'The Other Bar — Men Lawyers',
    url: 'https://otherbar.org/',
    category: 'specialty',
    why: 'Lawyer-recovery group; trends male. Strong professional-recovery affinity.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'mens-sheds',
    name: "Men's Sheds Association",
    url: 'https://www.menssheds.org/',
    category: 'specialty',
    why: "Men's mental-wellness community. Adjacent to alcohol + isolation work.",
    priority: 'low',
    fit: 40,
  },
  // Young adult / adolescent
  {
    id: 'asset-young-adults',
    name: 'ASSET — Young Adult Recovery Support',
    url: 'https://www.assetinstitute.com/',
    category: 'specialty',
    why: 'Young-adult-specific transitional living + recovery network. Adjacent referral pipeline.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'transitions-young-adult',
    name: 'Young People in Recovery (YPR)',
    url: 'https://youngpeopleinrecovery.org/',
    category: 'specialty',
    why: 'National young-people-in-recovery org. Listings in chapter resource pages reach young adults.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'collegiate-recovery-arc',
    name: 'Association of Recovery in Higher Education',
    url: 'https://collegiaterecovery.org/',
    category: 'specialty',
    why: 'Collegiate recovery program network. Discharge-to-college pipeline for young adults.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'narcanon-arrowhead-young',
    name: 'NACoA — Children of Alcoholics',
    url: 'https://nacoa.org/',
    category: 'specialty',
    why: 'Adult-children-of-alcoholics support. Family-system referrals for our adult clients in family programs.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'young-people-aa',
    name: 'YPAA — Young People in AA',
    url: 'https://www.icypaa.org/',
    category: 'specialty',
    why: 'Young-people-in-AA umbrella. Adjacent visibility within the young-adult AA pipeline.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'arts-recovery',
    name: 'Recovery Reform — Adolescent Resources',
    url: 'https://www.recoveryreform.org/',
    category: 'specialty',
    why: 'Adolescent-specific advocacy + resource hub. Niche-but-relevant for transitional-age clients.',
    priority: 'low',
    fit: 40,
  },
  // Executive / professional
  {
    id: 'executive-recovery',
    name: 'Executive Recovery Resources',
    url: 'https://www.thecaronfoundation.org/executive-recovery/',
    category: 'specialty',
    why: 'Executive-tier referral pipeline. High overlap with our private-pay client profile.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'professionals-help',
    name: 'Professionals Help Professionals',
    url: 'https://www.professionalshelpprofessionals.org/',
    category: 'specialty',
    why: 'Professionals-recovery community + meeting list. Strong affinity for executive demographic.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'sober-executives',
    name: 'Sober Executives Forum',
    url: 'https://www.soberexecutives.com/',
    category: 'specialty',
    why: 'Closed peer group for executives in recovery. Peer-referral pipeline.',
    priority: 'low',
    fit: 60,
  },
  {
    id: 'all-sober',
    name: 'All Sober — Provider Resources',
    url: 'https://allsober.com/',
    category: 'specialty',
    why: 'Recovery community + treatment finder with strong UX and growing audience.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'reframe-app',
    name: 'Reframe App — Provider Network',
    url: 'https://www.joinreframeapp.com/',
    category: 'specialty',
    why: 'Habit-change app aimed at moderating drinking. Adjacent referral pipeline when escalating.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'monument-network',
    name: 'Monument — Provider Network',
    url: 'https://www.joinmonument.com/',
    category: 'specialty',
    why: 'Telehealth alcohol-recovery platform. Step-up referrals when residential is the right call.',
    priority: 'medium',
    fit: 60,
  },
  // Trauma / dual-dx populations
  {
    id: 'trauma-recovery-network',
    name: 'EMDRIA — Trauma Recovery Network',
    url: 'https://www.emdria.org/',
    category: 'specialty',
    why: 'EMDR International Association. Surfaces our EMDR-trained clinicians for trauma-driven SUD clients.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'sidran-trauma',
    name: 'Sidran Institute — Trauma Resources',
    url: 'https://www.sidran.org/',
    category: 'specialty',
    why: 'Trauma-informed care nonprofit. Resource pages drive trauma-aware family inquiries.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'isst-d',
    name: 'ISSTD — Trauma + Dissociation Provider Directory',
    url: 'https://www.isst-d.org/',
    category: 'specialty',
    why: 'Specialty referral source for complex-trauma + dissociative dual-dx cases.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'rains-recovery',
    name: 'RAINN — Survivor Resources Directory',
    url: 'https://www.rainn.org/',
    category: 'specialty',
    why: 'Sexual-assault survivor resource hub. Co-occurring SUD pipeline for trauma-survivor clients.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'national-domestic-violence',
    name: 'National Domestic Violence Hotline — Provider Resources',
    url: 'https://www.thehotline.org/',
    category: 'specialty',
    why: 'DV crisis line. Co-occurring SUD referrals from survivor-services pipeline.',
    priority: 'low',
    fit: 50,
  },
  // Athletes / musicians / artists
  {
    id: 'musicares',
    name: 'MusiCares — Provider Network',
    url: 'https://www.musicares.org/',
    category: 'specialty',
    why: 'Recording Academy nonprofit. Refers musicians + industry into qualified treatment.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'backline-care',
    name: 'Backline.care — Music Industry Mental Health',
    url: 'https://backline.care/',
    category: 'specialty',
    why: 'Music industry mental-health connector. Adjacent to MusiCares for the music demo.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'sims-foundation',
    name: 'SIMS Foundation (Austin Musicians)',
    url: 'https://simsfoundation.org/',
    category: 'specialty',
    why: 'Music-industry mental-health nonprofit. Niche but high-trust referral pathway.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'athletes-in-recovery',
    name: 'Athletes In Recovery',
    url: 'https://athletesinrecovery.org/',
    category: 'specialty',
    why: 'Athlete-specific peer recovery community. Adjacent to college-athlete and pro-athlete pipelines.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'taylor-hooton',
    name: 'Taylor Hooton Foundation',
    url: 'https://taylorhooton.org/',
    category: 'specialty',
    why: 'PED + appearance-substance education for young athletes. Young-adult athlete pipeline.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'transition-house-young-adult',
    name: 'Transition House — Young Adult',
    url: 'https://www.thetransitionhouse.org/',
    category: 'specialty',
    why: 'Young-adult-specific transitional living network.',
    priority: 'low',
    fit: 45,
  },
  // LGBTQ+ + identity-specific
  {
    id: 'national-queer-trans-trauma',
    name: 'National Queer & Trans Therapists of Color Network',
    url: 'https://nqttcn.com/',
    category: 'specialty',
    why: 'QTPOC therapist + provider network. Affirming-care positioning for QTPOC clients.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'lgbtq-national-help',
    name: 'LGBT National Help Center',
    url: 'https://www.lgbthotline.org/',
    category: 'specialty',
    why: 'LGBTQ+ crisis hotline + resource hub. Hand-offs into affirming-care providers.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'trans-lifeline',
    name: 'Trans Lifeline — Provider Resources',
    url: 'https://translifeline.org/',
    category: 'specialty',
    why: 'Trans-specific crisis line. Trauma-aware referrals for transgender clients.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'pride-institute-network',
    name: 'PRIDE Institute Network',
    url: 'https://pride-institute.com/',
    category: 'specialty',
    why: 'LGBTQ-affirming addiction treatment network. Strong field-credibility for affirming positioning.',
    priority: 'medium',
    fit: 65,
  },
  // Older adults / retirees
  {
    id: 'older-adults-substance',
    name: 'NCOA — Older Adults Substance Use',
    url: 'https://www.ncoa.org/',
    category: 'specialty',
    why: 'National Council on Aging. Older-adult-specific substance use resource pipeline.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'aarp-mental-health',
    name: 'AARP — Mental Health & Substance Use Resources',
    url: 'https://www.aarp.org/health/conditions-treatments/info-2018/mental-health-substance-use-disorders.html',
    category: 'specialty',
    why: 'AARP resource hub. Older-adult / boomer demographic referral surface.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'silver-ribbon-campaign',
    name: 'Silver Ribbon Campaign — Older Adults',
    url: 'https://www.silverribboncampaign.org/',
    category: 'specialty',
    why: 'Older-adult mental-health awareness nonprofit.',
    priority: 'low',
    fit: 35,
  },
  // Family / loved ones
  {
    id: 'partnership-text-helpline',
    name: 'Partnership to End Addiction — Text Helpline',
    url: 'https://drugfree.org/get-help/',
    category: 'specialty',
    why: 'Family-text-line resource. Listed providers receive direct family-side referrals.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'al-anon-meetings',
    name: 'Al-Anon Family Groups — Resource Map',
    url: 'https://al-anon.org/al-anon-meetings/find-an-al-anon-meeting/',
    category: 'specialty',
    why: 'Family-of-addict meeting locator. Affinity referrals from family programs.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'aldn-allies',
    name: 'Adult Children of Alcoholics (ACA)',
    url: 'https://adultchildren.org/',
    category: 'specialty',
    why: 'ACA worldwide-meeting network. Adult-children-of-alcoholics family-program affinity.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'soshelps',
    name: 'SOS Helps — Family of Alcoholics',
    url: 'https://www.cosaa.org/',
    category: 'specialty',
    why: 'Family resource org. Adjacent to family-program inquiries.',
    priority: 'low',
    fit: 40,
  },
  // Mental health condition niche
  {
    id: 'national-bipolar',
    name: 'NAMI — Bipolar Treatment Provider Search',
    url: 'https://www.dbsalliance.org/',
    category: 'specialty',
    why: 'Bipolar dual-dx co-occurring SUD referrals route through DBSA support groups.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'borderline-treatment-network',
    name: 'NEABPD — Borderline Treatment Provider Network',
    url: 'https://www.borderlinepersonalitydisorder.org/',
    category: 'specialty',
    why: 'BPD referral pipeline; strong overlap with co-occurring SUD admissions.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'adhd-treatment',
    name: 'CHADD — ADHD Provider Directory',
    url: 'https://chadd.org/',
    category: 'specialty',
    why: 'ADHD national resource. ADHD-SUD dual-dx is a meaningful slice of admissions.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'autism-self-advocacy',
    name: 'Autism Self Advocacy Network — Provider Resources',
    url: 'https://autisticadvocacy.org/',
    category: 'specialty',
    why: 'Autism-affirming provider listing. Niche but relevant for neurodivergent dual-dx admissions.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'dbsa-support',
    name: 'DBSA — Depression & Bipolar Support Alliance',
    url: 'https://www.dbsalliance.org/support/find-a-support-group/',
    category: 'specialty',
    why: 'DBSA support-group locator. Mood-disorder dual-dx referrals from peer-support attendees.',
    priority: 'low',
    fit: 50,
  },

  // ── Phase 5: Profession-specific (+50) ──────────────────────────
  // Pilots / aviation
  {
    id: 'haims',
    name: 'HIMS Program — Pilots in Recovery',
    url: 'https://www.himsprogram.com/',
    category: 'specialty',
    why: 'FAA-recognized program for pilots returning to flight. Listed providers feed pilot pipeline.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'birds-of-a-feather',
    name: 'Birds of a Feather (Pilots in AA)',
    url: 'https://birdsofafeather.org/',
    category: 'specialty',
    why: 'Pilots-in-AA fellowship. Affinity referrals for the high-stakes, high-stigma aviation demographic.',
    priority: 'low',
    fit: 60,
  },
  {
    id: 'alpa-substance',
    name: 'ALPA — Pilot Assistance Network',
    url: 'https://www.alpa.org/health-and-wellness',
    category: 'specialty',
    why: 'Air Line Pilots Association assistance hub. Union-side referral pipeline into HIMS-aligned care.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'aopa-pilot-protection',
    name: 'AOPA Pilot Protection Services',
    url: 'https://www.aopa.org/',
    category: 'specialty',
    why: 'AOPA member-resource hub. Adjacent to HIMS / pilot-recovery referral system.',
    priority: 'low',
    fit: 55,
  },
  // Lawyers
  {
    id: 'hazelden-betty-ford-legal',
    name: 'Hazelden Betty Ford Legal Professionals Program',
    url: 'https://www.hazeldenbettyford.org/professionals/legal-professionals',
    category: 'specialty',
    why: 'Specialty legal-professional treatment program. Adjacent referral source for AZ legal community.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'aba-coLAP',
    name: 'ABA CoLAP — Lawyer Assistance Programs',
    url: 'https://www.americanbar.org/groups/lawyer_assistance/',
    category: 'specialty',
    why: 'American Bar Association lawyer-assistance directory. State-LAP referrals for legal professionals.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'azlap',
    name: 'Arizona Lawyer Assistance Program (LAP)',
    url: 'https://azlap.org/',
    category: 'specialty',
    why: 'AZ State Bar program. Direct referral pipeline for AZ attorneys + judges.',
    priority: 'high',
    fit: 78,
  },
  {
    id: 'lcl-mass',
    name: 'Lawyers Concerned for Lawyers (multi-state network)',
    url: 'https://www.lclma.org/',
    category: 'specialty',
    why: 'State-LCL networks refer lawyers across state lines. AZ legal-professional pipeline.',
    priority: 'low',
    fit: 55,
  },
  // Doctors / healthcare
  {
    id: 'fsmb-pmp',
    name: 'FSMB — Physician Health Programs Directory',
    url: 'https://www.fsmb.org/physician-health-programs/',
    category: 'specialty',
    why: 'Federation of State Medical Boards Physician Health Program directory. State-PHP referrals.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'arizona-php',
    name: 'Arizona Physician Health Program (Az MAP)',
    url: 'https://www.azmap.us/',
    category: 'specialty',
    why: 'AZ medical-board PHP. Direct referral pipeline for AZ physicians + APPs.',
    priority: 'high',
    fit: 80,
  },
  {
    id: 'doctorshealthprogram',
    name: 'Federation of State PHPs (FSPHP)',
    url: 'https://www.fsphp.org/',
    category: 'specialty',
    why: 'Federation of State PHPs umbrella. Cross-state referrals for monitored physicians.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'nurses-recovery',
    name: 'IntNSA — Nurse-Recovery Provider Network',
    url: 'https://www.intnsa.org/',
    category: 'specialty',
    why: 'International Nurses Society on Addictions. Nurse-recovery referral pipeline.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'arizona-nursing-rcp',
    name: 'AZ Nursing Recovery Program (PARN/CARE)',
    url: 'https://www.azbn.gov/',
    category: 'specialty',
    why: 'AZ Board of Nursing recovery alternative-to-discipline program. Direct AZ-nurse referral pathway.',
    priority: 'high',
    fit: 78,
  },
  {
    id: 'asahp-pharmacy',
    name: 'AAPS Pharmacist Recovery Network',
    url: 'https://www.azpharmacy.gov/',
    category: 'specialty',
    why: 'Pharmacist-specific monitoring + recovery. AZ Board of Pharmacy referrals.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'dental-recovery-az',
    name: 'AZ Dental Wellness Committee',
    url: 'https://www.azda.org/',
    category: 'specialty',
    why: 'AZ Dental Association wellness program. Niche but real dental-professional pipeline.',
    priority: 'low',
    fit: 55,
  },
  // First responders / fire / police
  {
    id: 'iaff-recovery',
    name: 'IAFF Center of Excellence',
    url: 'https://www.iaffrecoverycenter.com/',
    category: 'specialty',
    why: 'International Association of Fire Fighters treatment center. Adjacent firefighter-recovery referral pipeline.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'first-responder-wellness',
    name: 'First Responder Wellness Network',
    url: 'https://firstresponder-wellness.com/',
    category: 'specialty',
    why: 'First-responder-focused treatment finder. Affinity-marketing for FR demographic.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'cops-frontline',
    name: 'COPS — Concerns of Police Survivors',
    url: 'https://www.concernsofpolicesurvivors.org/',
    category: 'specialty',
    why: 'Police-family support nonprofit. Adjacent to law-enforcement family referrals.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'iaff-behavioral-health',
    name: 'IAFF Behavioral Health Resources',
    url: 'https://www.iaff.org/behavioral-health/',
    category: 'specialty',
    why: 'IAFF resource hub. Listed providers gain visibility within the firefighter-mental-health network.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'safe-call-now',
    name: 'Safe Call Now — First Responder Crisis',
    url: 'https://www.safecallnow.org/',
    category: 'specialty',
    why: 'First-responder crisis line + provider referrals. Direct hand-off pipeline.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'badge-of-life',
    name: 'Badge of Life — Police Mental Health',
    url: 'https://www.badgeoflife.org/',
    category: 'specialty',
    why: 'Police-officer mental health nonprofit. LE-specific referral pipeline.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'firefighter-behavioral-alliance',
    name: 'Firefighter Behavioral Health Alliance',
    url: 'https://www.ffbha.org/',
    category: 'specialty',
    why: 'FFBHA — firefighter-suicide prevention + provider referrals.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'gobfdh',
    name: 'GovX — First Responder Verification + Resource',
    url: 'https://www.govx.com/',
    category: 'specialty',
    why: 'Trust-signal surface for first-responder programs that include benefits.',
    priority: 'low',
    fit: 35,
  },
  {
    id: 'serv-arizona-fr',
    name: 'Arizona Public Safety Personnel Wellness',
    url: 'https://www.azpsr.com/',
    category: 'specialty',
    why: 'AZ statewide first-responder wellness program. Local LE / fire / EMS pipeline.',
    priority: 'medium',
    fit: 65,
  },
  // Veterans (broader than the 4 we already have)
  {
    id: 'wounded-warrior',
    name: 'Wounded Warrior Project — Mental Health Resources',
    url: 'https://www.woundedwarriorproject.org/',
    category: 'specialty',
    why: 'WWP referral pipeline for combat-veteran mental health + SUD.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'cohen-veterans-network',
    name: 'Cohen Veterans Network',
    url: 'https://www.cohenveteransnetwork.org/',
    category: 'specialty',
    why: 'High-trust private veteran mental-health network. Vet-family referral pipeline.',
    priority: 'medium',
    fit: 60,
  },
  {
    id: 'iava',
    name: 'IAVA — Iraq and Afghanistan Veterans of America',
    url: 'https://iava.org/',
    category: 'specialty',
    why: 'Iraq + Afghanistan veteran advocacy. Resource-page mentions reach OEF/OIF veterans.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'mission-22',
    name: 'Mission 22 — Veteran Resource Network',
    url: 'https://www.mission22.com/',
    category: 'specialty',
    why: 'Veteran-suicide-prevention nonprofit. Aligned with our PTSD + SUD veteran admissions.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'arizona-veterans',
    name: 'Arizona Department of Veterans Services',
    url: 'https://dvs.az.gov/',
    category: 'specialty',
    why: 'AZ state vet-services agency. Direct AZ-veteran referral pipeline.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'phx-vet-center',
    name: 'Phoenix Vet Center (VA)',
    url: 'https://www.va.gov/find-locations/facility/vc_0510V',
    category: 'specialty',
    why: 'Phoenix VA Vet Center. Direct combat-veteran referral channel.',
    priority: 'medium',
    fit: 70,
  },
  {
    id: 'tucson-vet-center',
    name: 'Tucson Vet Center (VA)',
    url: 'https://www.va.gov/find-locations/facility/vc_0509V',
    category: 'specialty',
    why: 'Tucson VA Vet Center. Southern-AZ combat-veteran referral channel.',
    priority: 'medium',
    fit: 65,
  },
  {
    id: 'dav-resource',
    name: 'DAV — Disabled American Veterans',
    url: 'https://www.dav.org/',
    category: 'specialty',
    why: 'DAV national resource hub. Service-officer referrals for VA-eligible veterans.',
    priority: 'low',
    fit: 55,
  },
  {
    id: 'american-legion',
    name: 'The American Legion — Resource Pages',
    url: 'https://www.legion.org/',
    category: 'specialty',
    why: 'American Legion mental-health + SUD resource pages. Veteran-organization affiliate referrals.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'vfw-resources',
    name: 'VFW — Resources & Support',
    url: 'https://www.vfw.org/',
    category: 'specialty',
    why: 'VFW resource hub. Veteran-org affiliate pipeline.',
    priority: 'low',
    fit: 45,
  },
  // Education / teachers / academics
  {
    id: 'nea-mh',
    name: 'NEA — Educator Mental Health Resources',
    url: 'https://www.nea.org/professional-excellence/student-engagement/tools-tips/social-emotional-learning-resources',
    category: 'specialty',
    why: 'National Education Association resource hub. Teacher-recovery referral pipeline.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'aft-eap',
    name: 'AFT EAP — Teacher Assistance',
    url: 'https://www.aft.org/',
    category: 'specialty',
    why: 'American Federation of Teachers EAP-style support. Teacher pipeline.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'aze-school-counselors',
    name: 'Arizona School Counselors Association',
    url: 'https://www.azsca.org/',
    category: 'specialty',
    why: 'AZ school counselor network. Adjacent to adolescent referral pipeline (we currently treat adults only, but family-side reach).',
    priority: 'low',
    fit: 40,
  },
  // Trades / blue-collar / labor unions
  {
    id: 'unionwellness',
    name: 'Union Wellness Network',
    url: 'https://www.unioncoalition.org/',
    category: 'specialty',
    why: 'Trade-union wellness network. EAP-referral pipeline for blue-collar demographic.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'iuoe-resources',
    name: 'IUOE — Engineer Mental Health Resources',
    url: 'https://www.iuoe.org/',
    category: 'specialty',
    why: 'International Union of Operating Engineers. Trade-recovery pipeline for engineers / heavy-equipment.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'liuna-resources',
    name: 'LIUNA — Laborers Health Resources',
    url: 'https://www.liuna.org/',
    category: 'specialty',
    why: 'LIUNA member resources. Trade-recovery pipeline for construction / labor.',
    priority: 'low',
    fit: 35,
  },
  // Tech / silicon-valley
  {
    id: 'tech-recovery-network',
    name: 'Tech Recovery Network',
    url: 'https://techrecoverynetwork.com/',
    category: 'specialty',
    why: 'Tech-industry recovery community. High-affinity for executive / professional recovery from tech sector.',
    priority: 'low',
    fit: 50,
  },
  {
    id: 'silicon-valley-recovery',
    name: 'Silicon Valley Recovery Group',
    url: 'https://siliconvalleyrecovery.org/',
    category: 'specialty',
    why: 'Bay-Area-rooted tech-professional recovery. Long-distance AZ-residential referrals.',
    priority: 'low',
    fit: 45,
  },
  // Finance / Wall Street
  {
    id: 'wall-street-counseling',
    name: 'Wall Street Recovery / Sober Banker',
    url: 'https://www.soberbanker.com/',
    category: 'specialty',
    why: 'Finance-professional recovery niche. Strong affinity for high-income executive demographic.',
    priority: 'low',
    fit: 50,
  },
  // Restaurant / hospitality
  {
    id: 'ben-foundation',
    name: 'Ben Foundation — Hospitality Recovery',
    url: 'https://www.bensfriendshope.com/',
    category: 'specialty',
    why: "Ben's Friends — hospitality-industry recovery. Restaurant-worker pipeline.",
    priority: 'low',
    fit: 50,
  },
  {
    id: 'james-beard-mental',
    name: 'James Beard Foundation — Mental Health Resources',
    url: 'https://www.jamesbeard.org/',
    category: 'specialty',
    why: 'JBF resource hub for chefs + restaurant pros. Adjacent hospitality pipeline.',
    priority: 'low',
    fit: 40,
  },
  // Clergy
  {
    id: 'clergy-recovery',
    name: 'Clergy Wellness — Hartford Institute',
    url: 'https://hartfordinstitute.org/',
    category: 'specialty',
    why: 'Clergy-recovery referral resources. Niche but real religious-professional pipeline.',
    priority: 'low',
    fit: 35,
  },
  // Athletes / pro sports
  {
    id: 'nflpa-foundation',
    name: 'NFLPA — Player Resources & Mental Health',
    url: 'https://nflpa.com/players/players-resources',
    category: 'specialty',
    why: 'NFL Players Association resources. Pro-athlete pipeline for retired-player recovery.',
    priority: 'low',
    fit: 45,
  },
  {
    id: 'nbpa-cares',
    name: 'NBPA Foundation — Player Wellness',
    url: 'https://nbpa.com/foundation',
    category: 'specialty',
    why: 'NBA Players Association foundation. Pro-athlete + family pipeline.',
    priority: 'low',
    fit: 40,
  },
  {
    id: 'mlbpa-resources',
    name: 'MLBPA — Player Resources',
    url: 'https://www.mlbplayers.com/',
    category: 'specialty',
    why: 'MLB Players Association resources. Pro-baseball-player pipeline.',
    priority: 'low',
    fit: 40,
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

function useStatusMap(): [Record<string, Status>, (id: string) => void, (id: string, value: Status) => void] {
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

  const persist = (updated: Record<string, Status>) => {
    try {
      window.localStorage.setItem(STATUS_KEY, JSON.stringify(updated));
    } catch {
      /* quota — non-fatal. */
    }
  };

  const cycle = (id: string) => {
    setMap((prev) => {
      const current = prev[id] ?? 'todo';
      const next = STATUS_CYCLE[current];
      // Never persist the default — keeps localStorage tidy.
      const updated = { ...prev };
      if (next === 'todo') delete updated[id];
      else updated[id] = next;
      persist(updated);
      return updated;
    });
  };

  const setStatus = (id: string, value: Status) => {
    setMap((prev) => {
      const updated = { ...prev };
      if (value === 'todo') delete updated[id];
      else updated[id] = value;
      persist(updated);
      return updated;
    });
  };

  return [map, cycle, setStatus];
}

// ── Live-link tracking ─────────────────────────────────────────────
//
// Once a directory listing is up, the team pastes the public URL
// here. Stored separately from status so the existing localStorage
// state stays compatible. The presence of a link is what colors the
// row green; missing means red.

const LINKS_KEY = 'sa-seo-directories:links';

function useLinkMap(): [
  Record<string, string>,
  (id: string, value: string) => void,
] {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LINKS_KEY);
      if (raw) setMap(JSON.parse(raw));
    } catch {
      /* corrupt — ignore. */
    }
  }, []);

  const setLink = (id: string, value: string) => {
    setMap((prev) => {
      const trimmed = value.trim();
      const updated = { ...prev };
      if (!trimmed) delete updated[id];
      else updated[id] = trimmed;
      try {
        window.localStorage.setItem(LINKS_KEY, JSON.stringify(updated));
      } catch {
        /* quota — non-fatal. */
      }
      return updated;
    });
  };

  return [map, setLink];
}

// ── Semrush referring-domain match ─────────────────────────────────
//
// The Backlinks page persists a snapshot of Semrush data in
// `seo_backlinks_snapshots`. Reading the latest snapshot lets us
// annotate each directory row with whether Semrush has actually seen
// a link from that domain to us — and, if so, the authority score
// and total backlinks. Apex domain (host minus a leading "www.") is
// the matching key on both sides.

interface SemrushRefDomain {
  domain: string;
  ascore: number;
  backlinks_num: number;
  first_seen: string;
  last_seen: string;
}

interface SemrushSnapshot {
  rows: SemrushRefDomain[];
  byDomain: Map<string, SemrushRefDomain>;
  syncedAt: string | null;
  empty: boolean;
}

function apexDomain(input: string): string {
  try {
    const u = new URL(input);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return input.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

function useSemrushSnapshot(): { snap: SemrushSnapshot | null; loading: boolean; error: string | null } {
  const [snap, setSnap] = useState<SemrushSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/seo/backlinks', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as {
          refdomains?: SemrushRefDomain[];
          synced_at?: string | null;
          empty?: boolean;
        };
        if (cancelled) return;
        const rows = data.refdomains ?? [];
        const byDomain = new Map<string, SemrushRefDomain>();
        for (const r of rows) {
          byDomain.set(r.domain.replace(/^www\./i, '').toLowerCase(), r);
        }
        setSnap({
          rows,
          byDomain,
          syncedAt: data.synced_at ?? null,
          empty: !!data.empty,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { snap, loading, error };
}

// ── UI ─────────────────────────────────────────────────────────────

const PRIORITY_TONE: Record<Directory['priority'], string> = {
  high: 'bg-primary/10 text-primary border-primary/20',
  medium: 'bg-foreground/5 text-foreground/70 border-black/10',
  low: 'bg-foreground/5 text-foreground/45 border-black/5',
};

export default function DirectoriesContent() {
  const [statusMap, cycleStatus, setStatus] = useStatusMap();
  const [linkMap, setLink] = useLinkMap();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DirectoryCategory | 'all'>('all');
  const [hideListed, setHideListed] = useState(false);
  const { snap: semrush, loading: semrushLoading, error: semrushError } = useSemrushSnapshot();

  // Per-row comment thread metadata (count + latest msg timestamp +
  // last-read timestamp). Subscribe to realtime so the unread dot
  // lights up the moment a teammate posts.
  const { session } = useAuth();
  const [chatLatest, setChatLatest] = useState<Record<string, string>>({});
  const [chatCounts, setChatCounts] = useState<Record<string, number>>({});
  const [chatRead, setChatRead] = useState<Record<string, string>>({});
  const [openChat, setOpenChat] = useState<Directory | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    setChatRead(getDirectoryReadMap());
    let cancelled = false;
    async function loadChatMeta() {
      const rows = await db({
        action: 'select',
        table: 'seo_directory_messages',
        select: 'directory_id, created_at',
        order: { column: 'created_at', ascending: false },
      }).catch(() => null);
      if (cancelled || !Array.isArray(rows)) return;
      const latest: Record<string, string> = {};
      const counts: Record<string, number> = {};
      for (const r of rows as Array<{ directory_id: string; created_at: string }>) {
        if (!latest[r.directory_id]) latest[r.directory_id] = r.created_at;
        counts[r.directory_id] = (counts[r.directory_id] || 0) + 1;
      }
      setChatLatest(latest);
      setChatCounts(counts);
    }
    loadChatMeta();
    const channel = supabase
      .channel('directory-chat-meta')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'seo_directory_messages' }, (payload) => {
        const row = payload.new as { directory_id: string; created_at: string };
        setChatLatest((prev) => ({ ...prev, [row.directory_id]: row.created_at }));
        setChatCounts((prev) => ({ ...prev, [row.directory_id]: (prev[row.directory_id] || 0) + 1 }));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'seo_directory_messages' }, (payload) => {
        const row = payload.old as { directory_id: string };
        setChatCounts((prev) => {
          const next = { ...prev };
          if (next[row.directory_id]) next[row.directory_id] = Math.max(0, next[row.directory_id] - 1);
          return next;
        });
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);

  const markChatRead = useCallback((directoryId: string) => {
    const ts = chatLatest[directoryId] || new Date().toISOString();
    setDirectoryReadAt(directoryId, ts);
    setChatRead((prev) => ({ ...prev, [directoryId]: ts }));
  }, [chatLatest]);

  const isUnread = (directoryId: string): boolean => {
    const latest = chatLatest[directoryId];
    if (!latest) return false;
    const read = chatRead[directoryId];
    if (!read) return true;
    return new Date(latest).getTime() > new Date(read).getTime();
  };

  const openComments = (d: Directory) => {
    setOpenChat(d);
    markChatRead(d.id);
  };

  // Lock body scroll + close on Escape while drawer is open.
  useEffect(() => {
    if (!openChat) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenChat(null); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [openChat]);

  // Saving a live URL implies "we got listed there" — flip the
  // status to listed automatically. Clearing the URL backs the
  // status down to "to do" so red/empty rows stay honest.
  const saveLink = (id: string, value: string) => {
    const trimmed = value.trim();
    setLink(id, trimmed);
    if (trimmed) setStatus(id, 'listed');
    else if (statusMap[id] === 'listed') setStatus(id, 'todo');
  };

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
    // Within each category: rows with a live link recorded (the green
    // tint) bubble to the top so completed work is visible first.
    // Stable within each tier (preserves the curated DIRECTORIES order).
    for (const cat of Object.keys(out) as DirectoryCategory[]) {
      const list = out[cat];
      if (!list) continue;
      out[cat] = list
        .map((d, i) => ({ d, i }))
        .sort((a, b) => {
          const aLinked = !!linkMap[a.d.id] && statusMap[a.d.id] !== 'skip';
          const bLinked = !!linkMap[b.d.id] && statusMap[b.d.id] !== 'skip';
          if (aLinked !== bLinked) return aLinked ? -1 : 1;
          return a.i - b.i;
        })
        .map((x) => x.d);
    }
    return out;
  }, [filtered, linkMap, statusMap]);

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

      {/* URL convention warning — surfaces every time someone is
          about to fill out a directory submission, so we never lose
          another listing to the wrong domain. */}
      <div className="mb-5 rounded-xl border-2 border-rose-300 bg-rose-50 p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="13" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="text-sm text-rose-900 leading-relaxed">
          <p className="font-bold mb-1">Use the correct site URL when submitting.</p>
          <p>
            Always:{' '}
            <code className="px-1.5 py-0.5 rounded bg-white border border-rose-200 font-mono text-rose-800 font-semibold">
              www.sevenarrowsrecoveryarizona.com
            </code>
            <br />
            Never:{' '}
            <code className="px-1.5 py-0.5 rounded bg-rose-100 border border-rose-200 font-mono text-rose-700 line-through">
              www.sevenarrowsrecovery.com
            </code>
          </p>
        </div>
      </div>

      <SemrushStatusBanner
        loading={semrushLoading}
        error={semrushError}
        snap={semrush}
      />

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
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10 w-20">Fit</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10 w-32" title="Semrush referring-domain match for this directory's apex domain">Semrush</th>
                    <th className="text-left px-4 py-2.5 font-semibold border-b border-black/10 w-64">Live link</th>
                    <th className="text-center px-4 py-2.5 font-semibold border-b border-black/10 w-16">Notes</th>
                    <th className="text-right px-4 py-2.5 font-semibold border-b border-black/10 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map((d) => {
                    const status = statusMap[d.id] ?? 'todo';
                    const link = linkMap[d.id] ?? '';
                    // Row tint is the user's most-requested visual:
                    // red if no live link recorded, green once one is.
                    // "skip" overrides — we don't want to nag about
                    // directories the team explicitly chose to skip.
                    const tintClass =
                      status === 'skip'
                        ? ''
                        : link
                          ? 'bg-emerald-50/60 hover:bg-emerald-50'
                          : 'bg-rose-50/40 hover:bg-rose-50/60';
                    return (
                      <tr key={d.id} className={`align-top transition-colors ${tintClass}`}>
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
                        <td className="px-4 py-3">
                          <FitChip score={d.fit} />
                        </td>
                        <td className="px-4 py-3">
                          <SemrushCell
                            domain={apexDomain(d.url)}
                            snap={semrush}
                            loading={semrushLoading}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <LinkCell
                            value={link}
                            onSave={(v) => saveLink(d.id, v)}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => openComments(d)}
                            title={chatCounts[d.id] ? `${chatCounts[d.id]} comment${chatCounts[d.id] === 1 ? '' : 's'}` : 'Add a comment'}
                            aria-label={`Comments for ${d.name}`}
                            className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg text-foreground/45 hover:text-primary hover:bg-primary/5 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            {chatCounts[d.id] ? (
                              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[9px] font-bold tabular-nums">
                                {chatCounts[d.id] > 99 ? '99+' : chatCounts[d.id]}
                              </span>
                            ) : null}
                            {isUnread(d.id) && (
                              <span aria-label="Unread" className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                            )}
                          </button>
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

      {openChat && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Comments for ${openChat.name}`}
          className="fixed inset-0 z-[100] flex justify-end"
          onClick={() => setOpenChat(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            className="relative bg-white w-full sm:max-w-md h-full shadow-2xl flex flex-col animate-drawer-slide"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <header className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
                  Directory comments
                </p>
                <p className="text-sm font-medium text-foreground truncate mt-0.5" title={openChat.name}>
                  {openChat.name}
                </p>
                <a
                  href={openChat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary/70 hover:text-primary hover:underline truncate block max-w-full"
                  title={openChat.url}
                >
                  {openChat.url.replace(/^https?:\/\//, '')}
                </a>
              </div>
              <button
                type="button"
                onClick={() => setOpenChat(null)}
                aria-label="Close"
                className="shrink-0 p-1.5 rounded-lg text-foreground/45 hover:bg-warm-bg hover:text-foreground/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="flex-1 min-h-0">
              <RowChat
                table="seo_directory_messages"
                keyColumn="directory_id"
                keyValue={openChat.id}
                label={openChat.name}
                targetPath="/app/seo/directories"
                activityType="seo.directory_chat_message"
                activityKind="seo_directory"
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// Banner above the table summarising the Semrush snapshot's age and
// pointing the user at the Backlinks page when no snapshot exists.
function SemrushStatusBanner({
  loading,
  error,
  snap,
}: {
  loading: boolean;
  error: string | null;
  snap: SemrushSnapshot | null;
}) {
  if (loading) {
    return (
      <div className="mb-5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[12px] text-foreground/55">
        Loading Semrush referring-domain data…
      </div>
    );
  }
  if (error) {
    return (
      <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] text-rose-800">
        Couldn&apos;t load Semrush data: {error}
      </div>
    );
  }
  if (!snap || snap.empty || snap.rows.length === 0) {
    return (
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 flex items-start gap-2">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="13" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          No Semrush snapshot yet — click <strong>Sync from Semrush</strong> on the{' '}
          <Link href="/app/seo/backlinks" className="underline font-semibold hover:text-amber-700">
            Backlinks page
          </Link>{' '}
          to populate the Semrush column below.
        </span>
      </div>
    );
  }
  const matched = DIRECTORIES.filter((d) => snap.byDomain.has(apexDomain(d.url))).length;
  const synced = snap.syncedAt
    ? new Date(snap.syncedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  return (
    <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-[12px] text-emerald-900 flex items-center justify-between gap-3 flex-wrap">
      <span>
        <strong>{matched}</strong> of <strong>{DIRECTORIES.length}</strong> directories
        present in Semrush&apos;s referring-domain set
        {' · '}
        <strong>{snap.rows.length}</strong> total ref. domains
      </span>
      {synced ? (
        <span className="text-emerald-800/70">Last synced {synced}</span>
      ) : null}
    </div>
  );
}

// Per-row Semrush match. "—" if not seen by Semrush, otherwise shows
// authority score and total backlinks from that domain.
function SemrushCell({
  domain,
  snap,
  loading,
}: {
  domain: string;
  snap: SemrushSnapshot | null;
  loading: boolean;
}) {
  if (loading) {
    return <span className="text-[11px] text-foreground/35">…</span>;
  }
  if (!snap || snap.empty) {
    return <span className="text-[11px] text-foreground/30" title="No snapshot">—</span>;
  }
  const hit = snap.byDomain.get(domain);
  if (!hit) {
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border bg-foreground/5 text-foreground/45 border-black/5"
        title={`Semrush has not detected a backlink from ${domain}`}
      >
        Not seen
      </span>
    );
  }
  const ascore = Math.max(0, Math.min(100, Math.round(hit.ascore || 0)));
  const tone =
    ascore >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : ascore >= 60 ? 'bg-sky-100 text-sky-800 border-sky-200'
    : ascore >= 40 ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-foreground/5 text-foreground/65 border-black/10';
  const lastSeen = hit.last_seen ? new Date(hit.last_seen).toLocaleDateString() : 'unknown';
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums border ${tone}`}
      title={`Authority Score ${ascore} · ${hit.backlinks_num} backlink${hit.backlinks_num === 1 ? '' : 's'} · last seen ${lastSeen}`}
    >
      AS {ascore}
      <span className="text-foreground/50 font-normal">·</span>
      <span className="font-normal">{hit.backlinks_num}</span>
    </span>
  );
}

// Inline editor for the public URL of a finished listing. Click the
// chip to enter edit mode, paste in the link, Enter or blur to save,
// Esc to cancel. Empty input on save clears the link.
function LinkCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  if (editing) {
    return (
      <input
        autoFocus
        type="url"
        value={draft}
        placeholder="https://…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onSave(draft); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setEditing(false);
            onSave(draft);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
            setDraft(value);
          }
        }}
        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    );
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 max-w-full">
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          title={value}
          className="text-[12px] font-medium text-emerald-700 hover:text-emerald-800 truncate max-w-[180px]"
        >
          {value.replace(/^https?:\/\//, '')}
        </a>
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit link"
          aria-label="Edit live link"
          className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-foreground/45 hover:text-foreground/80 hover:bg-black/5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5h-7a2 2 0 00-2 2v13a2 2 0 002 2h13a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 rounded-md border border-rose-300/60 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add link
    </button>
  );
}

// 1-100 fit score chip. Tone gradient mirrors the Fit semantics in
// the Directory interface: emerald for ≥80 (core target), sky for
// 60-79 (strong fit), amber for 40-59 (useful but secondary),
// foreground/40 for <40 (citation breadth only).
function FitChip({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    clamped >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : clamped >= 60 ? 'bg-sky-100 text-sky-800 border-sky-200'
    : clamped >= 40 ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-foreground/5 text-foreground/55 border-black/10';
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded text-[12px] font-bold tabular-nums border ${tone}`}
      title={`Fit ${clamped}/100`}
    >
      {clamped}
    </span>
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
