// Curated catalogue of the marketing pages a campaign can feature.
// Hand-picked instead of generated from the file tree so the picker
// doesn't surface compliance / legal / blog-detail pages that don't
// belong in an email CTA. Update this list when a new marketing
// destination ships.

export interface SitePage {
  /** Absolute-from-root URL. Always starts with "/". */
  path: string;
  /** Display name in the picker + the email body. */
  title: string;
  /** One-line description for the picker row. */
  blurb: string;
  /** Grouping label so the picker can show sections. */
  group:
    | 'Top of funnel'
    | 'Our program'
    | 'Treatment'
    | 'What we treat'
    | 'Insurance'
    | 'Locations'
    | 'Who we are';
}

export const SITE_PAGES: SitePage[] = [
  // ─── Top of funnel ──────────────────────────────────────────────
  { path: '/admissions', title: 'Admissions', blurb: 'How the intake conversation goes from first call to first night.', group: 'Top of funnel' },
  { path: '/tour', title: 'Take a tour', blurb: 'Photos + a virtual walk through the ranch and the houses.', group: 'Top of funnel' },
  { path: '/contact', title: 'Contact', blurb: 'Direct ways to reach the admissions team.', group: 'Top of funnel' },

  // ─── Our program ───────────────────────────────────────────────
  { path: '/our-program', title: 'Our program', blurb: 'The full clinical philosophy in one page.', group: 'Our program' },
  { path: '/our-program/equine-assisted', title: 'Equine-assisted therapy', blurb: 'How the herd participates in the work.', group: 'Our program' },
  { path: '/our-program/evidence-based', title: 'Evidence-based care', blurb: 'CBT, DBT, MAT — what the modalities look like in practice.', group: 'Our program' },
  { path: '/our-program/trauma-treatment', title: 'Trauma-informed treatment', blurb: 'Polyvagal-grounded clinical approach.', group: 'Our program' },
  { path: '/our-program/holistic-approaches', title: 'Holistic approaches', blurb: 'Sound, somatic, breath, and movement work.', group: 'Our program' },
  { path: '/our-program/indigenous-approach', title: 'Indigenous approach', blurb: 'Cultural and ceremonial integration with the program.', group: 'Our program' },
  { path: '/our-program/family-program', title: 'Family program', blurb: 'How loved ones are folded into the recovery process.', group: 'Our program' },
  { path: '/our-program/who-we-help', title: 'Who we help', blurb: 'Demographics + cohorts the program serves.', group: 'Our program' },

  // ─── Treatment levels ───────────────────────────────────────────
  { path: '/treatment/residential-inpatient', title: 'Residential / inpatient', blurb: 'The 30-90 day on-ranch level of care.', group: 'Treatment' },
  { path: '/treatment/interventions', title: 'Interventions', blurb: 'How a family-led intervention works at Seven Arrows.', group: 'Treatment' },
  { path: '/treatment/alumni-aftercare', title: 'Alumni & aftercare', blurb: 'Life after the ranch — the alumni community and aftercare plan.', group: 'Treatment' },

  // ─── What we treat ──────────────────────────────────────────────
  { path: '/what-we-treat', title: 'What we treat', blurb: 'Substance + co-occurring conditions overview.', group: 'What we treat' },
  { path: '/what-we-treat/alcohol-addiction', title: 'Alcohol addiction', blurb: 'Alcohol use disorder treatment track.', group: 'What we treat' },
  { path: '/what-we-treat/opioid-addiction', title: 'Opioid addiction', blurb: 'Opioid treatment including MAT.', group: 'What we treat' },
  { path: '/what-we-treat/heroin-addiction', title: 'Heroin addiction', blurb: 'Heroin-specific protocol and aftercare.', group: 'What we treat' },
  { path: '/what-we-treat/methamphetamine', title: 'Methamphetamine', blurb: 'Stimulant detox + extended residential.', group: 'What we treat' },
  { path: '/what-we-treat/benzodiazepine', title: 'Benzodiazepine', blurb: 'Medical detox protocol for benzo dependence.', group: 'What we treat' },
  { path: '/what-we-treat/prescription-drug-addiction', title: 'Prescription drugs', blurb: 'Rx misuse treatment.', group: 'What we treat' },
  { path: '/what-we-treat/marijuana-addiction', title: 'Marijuana addiction', blurb: 'High-potency cannabis use disorder.', group: 'What we treat' },
  { path: '/what-we-treat/dual-diagnosis', title: 'Dual diagnosis', blurb: 'Co-occurring mental-health + substance treatment.', group: 'What we treat' },

  // ─── Insurance ──────────────────────────────────────────────────
  { path: '/insurance', title: 'Insurance overview', blurb: 'How VOB works at Seven Arrows.', group: 'Insurance' },
  { path: '/insurance/aetna', title: 'Aetna', blurb: 'Aetna in-network details.', group: 'Insurance' },
  { path: '/insurance/blue-cross-blue-shield', title: 'Blue Cross Blue Shield', blurb: 'BCBS in-network details.', group: 'Insurance' },
  { path: '/insurance/cigna', title: 'Cigna', blurb: 'Cigna in-network details.', group: 'Insurance' },
  { path: '/insurance/humana', title: 'Humana', blurb: 'Humana in-network details.', group: 'Insurance' },
  { path: '/insurance/tricare', title: 'TRICARE', blurb: 'TRICARE for military families.', group: 'Insurance' },
  { path: '/insurance/united-healthcare', title: 'UnitedHealthcare', blurb: 'UHC / Optum coverage details.', group: 'Insurance' },

  // ─── Locations ──────────────────────────────────────────────────
  { path: '/locations/phoenix', title: 'Phoenix', blurb: 'Serving the Phoenix metro from the ranch in Cochise County.', group: 'Locations' },
  { path: '/locations/scottsdale', title: 'Scottsdale', blurb: 'Scottsdale-area arrivals + admissions logistics.', group: 'Locations' },
  { path: '/locations/tucson', title: 'Tucson', blurb: 'Tucson-area arrivals + admissions logistics.', group: 'Locations' },
  { path: '/locations/mesa', title: 'Mesa', blurb: 'East Valley arrivals + admissions logistics.', group: 'Locations' },

  // ─── Who we are ─────────────────────────────────────────────────
  { path: '/who-we-are', title: 'Who we are', blurb: 'Background on the program + the people behind it.', group: 'Who we are' },
  { path: '/who-we-are/why-us', title: 'Why us', blurb: 'What separates Seven Arrows from a generic 30-day center.', group: 'Who we are' },
  { path: '/who-we-are/meet-our-team', title: 'Meet the team', blurb: 'Clinical + admissions + ranch staff bios.', group: 'Who we are' },
  { path: '/who-we-are/recovery-roadmap', title: 'Recovery Roadmap', blurb: 'The investigative series — landing page for all episodes.', group: 'Who we are' },
  { path: '/who-we-are/faqs', title: 'FAQs', blurb: 'Common admissions + program questions.', group: 'Who we are' },
];

export const SITE_PAGE_GROUPS: SitePage['group'][] = [
  'Top of funnel',
  'Our program',
  'Treatment',
  'What we treat',
  'Insurance',
  'Locations',
  'Who we are',
];

export function findSitePage(path: string | null | undefined): SitePage | null {
  if (!path) return null;
  return SITE_PAGES.find((p) => p.path === path) ?? null;
}
