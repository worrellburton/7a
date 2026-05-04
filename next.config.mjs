/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  // Tell Next.js NOT to auto-redirect trailing slashes (its default
  // behavior is a 308 strip when trailingSlash: false). With this
  // flag set, the redirects() rule below handles the strip with an
  // explicit 301, which is what SEO crawlers expect.
  skipTrailingSlashRedirect: true,

  async redirects() {
    // Legacy-URL redirect map. Sources are listed without trailing
    // slashes — the trailing-slash strip below runs first, so a
    // request to `/foo/` hits the strip → `/foo`, then the
    // browser's follow-up to `/foo` hits the matching legacy rule
    // and lands on the final destination. Two 301 hops; Google
    // merges them and passes link equity through.
    //
    // Phases below are organised so adding/removing a logical group
    // is a single edit — substances together, insurance together,
    // etc. Order across phases doesn't matter (no overlapping
    // sources), but order within Next's array matters when sources
    // overlap, so keep more-specific paths above their parents in
    // the same phase.
    return [
      // ── Trailing-slash strip ────────────────────────────────────
      // 301-redirect any non-root path with a trailing slash to the
      // canonical no-slash form. `:path+` requires at least one
      // path segment so `/` itself isn't a self-redirect.
      {
        source: '/:path+/',
        destination: '/:path+',
        statusCode: 301,
      },

      // ── Phase 1: Substance landing pages → /what-we-treat/* ─────
      { source: '/meth-addiction', destination: '/what-we-treat/methamphetamine', statusCode: 301 },
      { source: '/what-to-expect-during-meth-withdrawal', destination: '/what-we-treat/methamphetamine', statusCode: 301 },
      { source: '/xanax', destination: '/what-we-treat/benzodiazepine', statusCode: 301 },
      { source: '/detox-for-benzodiazepine-withdrawal', destination: '/what-we-treat/benzodiazepine', statusCode: 301 },
      { source: '/opioid', destination: '/what-we-treat/opioid-addiction', statusCode: 301 },
      { source: '/fentanyl-detox', destination: '/what-we-treat/opioid-addiction', statusCode: 301 },
      { source: '/transition-from-suboxone-to-sublocade', destination: '/what-we-treat/opioid-addiction', statusCode: 301 },
      { source: '/methadone-detox', destination: '/what-we-treat/opioid-addiction', statusCode: 301 },
      { source: '/suboxone-detox', destination: '/what-we-treat/opioid-addiction', statusCode: 301 },
      { source: '/carfentanil-detox', destination: '/what-we-treat/opioid-addiction', statusCode: 301 },
      { source: '/alcohol', destination: '/what-we-treat/alcohol-addiction', statusCode: 301 },
      { source: '/help-a-loved-one-with-alcohol-addiction', destination: '/what-we-treat/alcohol-addiction', statusCode: 301 },
      { source: '/heroin', destination: '/what-we-treat/heroin-addiction', statusCode: 301 },
      { source: '/marijuana-rehab', destination: '/what-we-treat/marijuana-addiction', statusCode: 301 },
      { source: '/prescription-drugs', destination: '/what-we-treat/prescription-drug-addiction', statusCode: 301 },

      // ── Phase 2: Insurance carriers → /insurance/* ──────────────
      { source: '/aetna', destination: '/insurance/aetna', statusCode: 301 },
      { source: '/cigna', destination: '/insurance/cigna', statusCode: 301 },
      { source: '/united-healthcare', destination: '/insurance/united-healthcare', statusCode: 301 },
      { source: '/optum', destination: '/insurance/united-healthcare', statusCode: 301 },
      { source: '/blue-cross-blue-shield', destination: '/insurance/blue-cross-blue-shield', statusCode: 301 },

      // ── Phase 3: Treatment services → /treatment/* ──────────────
      // More-specific detox sub-paths come first so they don't get
      // swallowed by `/treatment-services/detox`.
      { source: '/treatment-services/detox/alcohol-detox', destination: '/what-we-treat/alcohol-addiction', statusCode: 301 },
      { source: '/treatment-services/detox/heroin-detox', destination: '/what-we-treat/heroin-addiction', statusCode: 301 },
      { source: '/treatment-services/detox/drug-detox', destination: '/what-we-treat', statusCode: 301 },
      { source: '/treatment-services/detox', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/treatment-services/inpatient', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/treatment-services/intensive-outpatient', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/treatment-services/outpatient', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/treatment-services/partial-hospitalization', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/treatment-services/luxury-addiction-treatment', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/luxury-rehab-center', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/difference-between-inpatient-vs-outpatient', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/inpatient-mental-health-facilities-in-arizona', destination: '/treatment/residential-inpatient', statusCode: 301 },
      { source: '/treatment-services/dual-diagnosis', destination: '/what-we-treat/dual-diagnosis', statusCode: 301 },
      { source: '/dual-diagnosis-treatment-centers-in-arizona', destination: '/what-we-treat/dual-diagnosis', statusCode: 301 },
      { source: '/treatment-services/interventions', destination: '/treatment/interventions', statusCode: 301 },
      { source: '/force-someone-to-go-to-rehab', destination: '/treatment/interventions', statusCode: 301 },
      { source: '/treatment-services/alumni-aftercare', destination: '/treatment/alumni-aftercare', statusCode: 301 },
      { source: '/treatment-services', destination: '/treatment', statusCode: 301 },

      // ── Phase 4: Our Program (modalities) → /our-program/* ──────
      { source: '/treatment-services/holistic-approaches', destination: '/our-program/holistic-approaches', statusCode: 301 },
      { source: '/supportive-holistic-care-for-medical-detox', destination: '/our-program/holistic-approaches', statusCode: 301 },
      { source: '/what-makes-a-rehab-holistic', destination: '/our-program/holistic-approaches', statusCode: 301 },
      { source: '/sound-therapy-and-addiction-treatment', destination: '/our-program/holistic-approaches', statusCode: 301 },
      { source: '/medical-and-holistic-addiction-treatment', destination: '/our-program/holistic-approaches', statusCode: 301 },
      { source: '/treatment-services/evidence-based', destination: '/our-program/evidence-based', statusCode: 301 },
      { source: '/seven-core-principles', destination: '/our-program/evidence-based', statusCode: 301 },
      { source: '/medication-assisted-treatment-long-term', destination: '/our-program/evidence-based', statusCode: 301 },
      { source: '/what-to-expect-during-dbt-sessions', destination: '/our-program/evidence-based', statusCode: 301 },
      { source: '/cbt-improves-addiction-outcomes', destination: '/our-program/evidence-based', statusCode: 301 },
      { source: '/treatment-services/cbt', destination: '/our-program/evidence-based', statusCode: 301 },
      { source: '/treatment-services/equine-assisted', destination: '/our-program/equine-assisted', statusCode: 301 },
      { source: '/pets-role-in-addiction-recovery-unconditional-support-love', destination: '/our-program/equine-assisted', statusCode: 301 },
      { source: '/drug-rehabs-with-horses', destination: '/our-program/equine-assisted', statusCode: 301 },
      { source: '/treatment-services/indigenous-program', destination: '/our-program/indigenous-approach', statusCode: 301 },
      { source: '/addiction-in-native-american-communities', destination: '/our-program/indigenous-approach', statusCode: 301 },
      { source: '/the-integration-of-cultural-and-holistic-healing-in-recovery', destination: '/our-program/indigenous-approach', statusCode: 301 },
      { source: '/treatment-services/trauma-informed-care', destination: '/our-program/trauma-treatment', statusCode: 301 },
      { source: '/treatment-services/brainspotting', destination: '/our-program/trauma-treatment', statusCode: 301 },
      { source: '/treatment-services/family-therapy', destination: '/our-program/family-program', statusCode: 301 },

      // ── Phase 5: Who We Help cohorts → /our-program/who-we-help ─
      { source: '/who-we-help/women', destination: '/our-program/who-we-help', statusCode: 301 },
      { source: '/who-we-help/mens', destination: '/our-program/who-we-help', statusCode: 301 },
      { source: '/who-we-help/lgbtqia', destination: '/our-program/who-we-help', statusCode: 301 },
      { source: '/who-we-help', destination: '/our-program/who-we-help', statusCode: 301 },

      // ── Phase 6: Locations (city pages) → /locations/* ──────────
      { source: '/scottsdale-az', destination: '/locations/scottsdale', statusCode: 301 },
      { source: '/fountain-hills-az', destination: '/locations/scottsdale', statusCode: 301 },
      { source: '/tucson-az', destination: '/locations/tucson', statusCode: 301 },
      { source: '/marana', destination: '/locations/tucson', statusCode: 301 },
      { source: '/mesa', destination: '/locations/mesa', statusCode: 301 },
      { source: '/maricopa', destination: '/locations/mesa', statusCode: 301 },
      { source: '/gilbert-az', destination: '/locations/mesa', statusCode: 301 },
      { source: '/queen-creek', destination: '/locations/mesa', statusCode: 301 },
      { source: '/phoenix', destination: '/locations/phoenix', statusCode: 301 },
      { source: '/sedona', destination: '/locations/phoenix', statusCode: 301 },
      { source: '/lake-havasu', destination: '/locations/phoenix', statusCode: 301 },

      // ── Phase 7: Team bios → /who-we-are/meet-our-team/* ────────
      { source: '/about-us/winter-groeschl', destination: '/who-we-are/meet-our-team/winter-groeschl', statusCode: 301 },
      { source: '/about-us/melissa-simard', destination: '/who-we-are/meet-our-team/melissa-simard', statusCode: 301 },
      { source: '/about-us/lindsay-rothschild', destination: '/who-we-are/meet-our-team/lindsay-rothschild', statusCode: 301 },
      { source: '/about-us/placida-valdez', destination: '/who-we-are/meet-our-team/placida-valdez', statusCode: 301 },

      // ── Phase 8: Who We Are core pages → /who-we-are/* ──────────
      // Bio routes above are more specific than `/about-us` so
      // they stay in Phase 7. The bare `/about-us` lands on the
      // section landing page.
      { source: '/about-us', destination: '/who-we-are', statusCode: 301 },
      { source: '/why-us', destination: '/who-we-are/why-us', statusCode: 301 },
      { source: '/faqs', destination: '/who-we-are/faqs', statusCode: 301 },
      { source: '/careers', destination: '/who-we-are/careers', statusCode: 301 },

      // ── Phase 9: Blog + categories → /who-we-are/recovery-roadmap
      // Wholesale rollup of legacy WordPress blog content into the
      // recovery-roadmap hub. `/category/dual-diagnosis` is the one
      // exception — it keeps its topical destination.
      { source: '/category/dual-diagnosis', destination: '/what-we-treat/dual-diagnosis', statusCode: 301 },
      { source: '/category/recovery', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/category/therapy', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/category/uncategorized', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/category/addiction-treatment', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/blog', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/self-care-addiction-recovery', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/what-to-expect-during-rehab', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/role-of-support-groups-in-addiction-recovery', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/getting-through-the-holidays-sober', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/manage-stress-and-burnout', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/the-power-of-nutrition-in-early-recovery', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/sober-summer-activities', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/addiction-in-a-coworker', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/rebuilding-and-restoring-your-life-in-addiction-recovery', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },
      { source: '/getting-through-the-first-day-at-rehab', destination: '/who-we-are/recovery-roadmap', statusCode: 301 },

      // ── Phase 10: Misc / catch-alls ─────────────────────────────
      { source: '/arizona-rehab-centers', destination: '/', statusCode: 301 },
      { source: '/private-rehabs-in-arizona', destination: '/', statusCode: 301 },
      { source: '/privacy-policy-2', destination: '/', statusCode: 301 },
      { source: '/thank-you', destination: '/contact', statusCode: 301 },
    ];
  },
};

export default nextConfig;
