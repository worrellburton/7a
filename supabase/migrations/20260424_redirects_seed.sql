-- Initial redirect seed for the WordPress → Next.js migration at
-- sevenarrowsrecoveryarizona.com. Every path the old site used that
-- appeared in search engine crawls, mapped to its closest new-site
-- destination.
--
-- ON CONFLICT DO NOTHING so the seed is safe to re-run and won't
-- clobber admin edits that happen after first apply.

insert into public.redirects (from_path, to_path, status_code, notes) values
  -- Core pages. No '/' -> '/' row — that's a self-loop and the
  -- middleware would redirect forever. The homepage stays as the
  -- natural Next.js route.
  ('/admissions/', '/admissions', 301, null),
  ('/contact/', '/contact', 301, null),
  ('/tour/', '/tour', 301, null),
  ('/careers/', '/who-we-are/careers', 301, null),
  ('/faqs/', '/who-we-are/faqs', 301, null),
  ('/why-us/', '/who-we-are/why-us', 301, null),
  ('/about-us/', '/who-we-are', 301, null),
  ('/our-program/', '/our-program', 301, null),
  ('/seven-core-principles/', '/our-program/evidence-based', 301, 'Review — may deserve dedicated page on new site'),
  ('/thank-you/', '/contact', 301, 'No dedicated thank-you page on new site'),
  ('/privacy-policy-2/', '/', 301, 'No privacy page on new site yet'),

  -- Team members — slug preserved from old URL; new site slugifies
  -- from full_name so these should mostly resolve 1:1. If any
  -- member has left, flip the to_path to /who-we-are/meet-our-team.
  ('/about-us/laura-harder-lac-ma/', '/who-we-are/meet-our-team/laura-harder-lac-ma', 301, 'Review slug on new site'),
  ('/about-us/winter-groeschl/', '/who-we-are/meet-our-team/winter-groeschl', 301, 'Review slug on new site'),
  ('/about-us/lindsay-rothschild/', '/who-we-are/meet-our-team/lindsay-rothschild', 301, 'Review slug on new site'),
  ('/about-us/brian-two-moons/', '/who-we-are/meet-our-team/brian-two-moons', 301, 'Review slug on new site'),
  ('/about-us/melissa-simard/', '/who-we-are/meet-our-team/melissa-simard', 301, 'Review slug on new site'),
  ('/about-us/dr-tracey-oppenheim-md/', '/who-we-are/meet-our-team/dr-tracey-oppenheim-md', 301, 'Review slug on new site'),
  ('/about-us/placida-valdez/', '/who-we-are/meet-our-team/placida-valdez', 301, 'Review slug on new site'),

  -- Treatment services (modalities / levels of care)
  ('/treatment-services/', '/treatment', 301, null),
  ('/treatment-services/detox/', '/treatment/residential-inpatient', 301, 'New site bundles detox into residential'),
  ('/treatment-services/detox/alcohol-detox/', '/what-we-treat/alcohol-addiction', 301, null),
  ('/treatment-services/detox/drug-detox/', '/what-we-treat', 301, 'Generic — points to substance index'),
  ('/treatment-services/detox/heroin-detox/', '/what-we-treat/heroin-addiction', 301, null),
  ('/treatment-services/equine-assisted/', '/our-program/equine-assisted', 301, null),
  ('/treatment-services/family-therapy/', '/our-program/family-program', 301, null),
  ('/treatment-services/partial-hospitalization/', '/treatment/residential-inpatient', 301, 'No dedicated PHP page'),
  ('/treatment-services/intensive-outpatient/', '/treatment/residential-inpatient', 301, 'No dedicated IOP page'),
  ('/treatment-services/outpatient/', '/treatment/residential-inpatient', 301, 'No dedicated OP page'),
  ('/treatment-services/inpatient/', '/treatment/residential-inpatient', 301, null),
  ('/treatment-services/trauma-informed-care/', '/our-program/trauma-treatment', 301, null),
  ('/treatment-services/alumni-aftercare/', '/treatment/alumni-aftercare', 301, null),
  ('/treatment-services/holistic-approaches/', '/our-program/holistic-approaches', 301, null),
  ('/treatment-services/luxury-addiction-treatment/', '/treatment/residential-inpatient', 301, null),
  ('/treatment-services/brainspotting/', '/our-program/trauma-treatment', 301, 'No dedicated brainspotting page'),
  ('/treatment-services/cbt/', '/our-program/evidence-based', 301, null),
  ('/treatment-services/dual-diagnosis/', '/what-we-treat/dual-diagnosis', 301, null),
  ('/treatment-services/evidence-based/', '/our-program/evidence-based', 301, null),
  ('/treatment-services/interventions/', '/treatment/interventions', 301, null),
  ('/treatment-services/indigenous-program/', '/our-program/indigenous-approach', 301, null),

  -- Drug / substance pages
  ('/alcohol/', '/what-we-treat/alcohol-addiction', 301, null),
  ('/heroin/', '/what-we-treat/heroin-addiction', 301, null),
  ('/opioid/', '/what-we-treat/opioid-addiction', 301, null),
  ('/prescription-drugs/', '/what-we-treat/prescription-drug-addiction', 301, null),
  ('/meth-addiction/', '/what-we-treat/methamphetamine', 301, null),
  ('/marijuana-rehab/', '/what-we-treat/marijuana-addiction', 301, null),
  ('/xanax/', '/what-we-treat/benzodiazepine', 301, null),
  ('/fentanyl-detox/', '/what-we-treat/opioid-addiction', 301, null),
  ('/carfentanil-detox/', '/what-we-treat/opioid-addiction', 301, null),
  ('/suboxone-detox/', '/what-we-treat/opioid-addiction', 301, null),
  ('/methadone-detox/', '/what-we-treat/opioid-addiction', 301, null),
  ('/detox-for-benzodiazepine-withdrawal/', '/what-we-treat/benzodiazepine', 301, null),

  -- Insurance carriers
  ('/aetna/', '/insurance/aetna', 301, null),
  ('/cigna/', '/insurance/cigna', 301, null),
  ('/blue-cross-blue-shield/', '/insurance/blue-cross-blue-shield', 301, null),
  ('/united-healthcare/', '/insurance/united-healthcare', 301, null),
  ('/optum/', '/insurance/united-healthcare', 301, 'Optum is UHC-owned — flip if dedicated page is added'),

  -- Cities / locations (new site has Phoenix, Tucson, Scottsdale, Mesa only)
  ('/phoenix/', '/locations/phoenix', 301, null),
  ('/tucson-az/', '/locations/tucson', 301, null),
  ('/scottsdale-az/', '/locations/scottsdale', 301, null),
  ('/mesa/', '/locations/mesa', 301, null),
  ('/gilbert-az/', '/locations/mesa', 301, 'East Valley — closest new page is Mesa'),
  ('/queen-creek/', '/locations/mesa', 301, 'East Valley — closest new page is Mesa'),
  ('/maricopa/', '/locations/mesa', 301, 'Nearest new city page'),
  ('/marana/', '/locations/tucson', 301, 'Marana is in the Tucson metro'),
  ('/fountain-hills-az/', '/locations/scottsdale', 301, 'Adjacent to Scottsdale'),
  ('/sedona/', '/locations/phoenix', 301, 'Northern AZ — defaulting to Phoenix until dedicated page exists'),
  ('/lake-havasu/', '/locations/phoenix', 301, 'Western AZ — defaulting to Phoenix'),

  -- Who we help
  ('/who-we-help/', '/our-program/who-we-help', 301, null),
  ('/who-we-help/mens/', '/our-program/who-we-help', 301, null),
  ('/who-we-help/women/', '/our-program/who-we-help', 301, null),
  ('/who-we-help/lgbtqia/', '/our-program/who-we-help', 301, null),

  -- SEO landing pages
  ('/arizona-rehab-centers/', '/', 301, null),
  ('/private-rehabs-in-arizona/', '/', 301, null),
  ('/luxury-rehab-center/', '/treatment/residential-inpatient', 301, null),
  ('/drug-rehabs-with-horses/', '/our-program/equine-assisted', 301, null),
  ('/rehabs-that-accept-insurance-in-arizona/', '/insurance/aetna', 301, null),
  ('/inpatient-mental-health-facilities-in-arizona/', '/treatment/residential-inpatient', 301, null),
  ('/dual-diagnosis-treatment-centers-in-arizona/', '/what-we-treat/dual-diagnosis', 301, null),

  -- Blog index + pagination
  ('/blog/', '/who-we-are/recovery-roadmap', 301, null),
  ('/blog/page/3/', '/who-we-are/recovery-roadmap', 301, null),
  ('/blog/page/9/', '/who-we-are/recovery-roadmap', 301, null),
  ('/blog/page/10/', '/who-we-are/recovery-roadmap', 301, null),
  ('/blog/page/12/', '/who-we-are/recovery-roadmap', 301, null),

  -- Blog categories / tags
  ('/category/therapy/', '/who-we-are/recovery-roadmap', 301, null),
  ('/category/addiction-treatment/', '/who-we-are/recovery-roadmap', 301, null),
  ('/category/recovery/', '/who-we-are/recovery-roadmap', 301, null),
  ('/category/dual-diagnosis/', '/what-we-treat/dual-diagnosis', 301, null),
  ('/category/uncategorized/', '/who-we-are/recovery-roadmap', 301, null),
  ('/tag/fmla/', '/who-we-are/recovery-roadmap', 301, null),

  -- Individual blog posts. Generic fallback to recovery-roadmap —
  -- upgrade to-path on a per-post basis as content is ported.
  ('/how-long-does-meth-stay-in-your-system/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/guide-to-12-step-meetings/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/nature-versus-nurture-explaining-the-link-between-epigenetics-and-addiction/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/transition-from-suboxone-to-sublocade/', '/what-we-treat/opioid-addiction', 301, 'blog post — substance-relevant'),
  ('/the-integration-of-cultural-and-holistic-healing-in-recovery/', '/our-program/indigenous-approach', 301, 'blog post — topical match'),
  ('/force-someone-to-go-to-rehab/', '/treatment/interventions', 301, 'blog post — topical match'),
  ('/the-power-of-nutrition-in-early-recovery/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/benefits-of-animal-assisted-therapies/', '/our-program/equine-assisted', 301, 'blog post — topical match'),
  ('/addiction-in-a-coworker/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/how-to-go-to-rehab-without-loosing-your-job/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/signs-a-spouse-is-using-drugs/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/what-to-expect-during-meth-withdrawal/', '/what-we-treat/methamphetamine', 301, 'blog post — substance-relevant'),
  ('/sober-summer-activities/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/the-benefits-of-meditation-for-addiction-recovery/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/using-insurance-to-cover-detox-for-cocaine/', '/what-we-treat/cocaine', 301, 'blog post — substance-relevant'),
  ('/boost-your-brain-health-increasing-serotonin-in-addiction-recovery/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/what-to-expect-during-rehab/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/help-a-loved-one-with-alcohol-addiction/', '/what-we-treat/alcohol-addiction', 301, 'blog post — substance-relevant'),
  ('/unlocking-healing-understanding-trauma-informed-yoga-for-addiction-recovery/', '/our-program/trauma-treatment', 301, 'blog post — topical match'),
  ('/dynamics-of-healing-co-occurring-disorders-and-how-to-address-them/', '/what-we-treat/dual-diagnosis', 301, 'blog post — topical match'),
  ('/healing-in-arizona-how-a-new-environment-can-facilitate-recovery/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/stories-of-hope-seven-arrows-changed-my-life/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/understanding-the-impact-trauma-has-on-addiction/', '/our-program/trauma-treatment', 301, 'blog post — topical match'),
  ('/manage-stress-and-burnout/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/exercise-and-addiction-recovery-4-ways-to-rewire-your-brain/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/what-to-expect-during-dbt-sessions/', '/our-program/evidence-based', 301, 'blog post — topical match'),
  ('/sound-therapy-and-addiction-treatment/', '/our-program/holistic-approaches', 301, 'blog post — topical match'),
  ('/how-can-equine-therapy-benefit-addiction-recovery/', '/our-program/equine-assisted', 301, 'blog post — topical match'),
  ('/how-to-help-your-alcoholic-spouse/', '/what-we-treat/alcohol-addiction', 301, 'blog post — substance-relevant'),
  ('/pets-role-in-addiction-recovery-unconditional-support-love/', '/our-program/equine-assisted', 301, 'blog post — topical match'),
  ('/role-of-support-groups-in-addiction-recovery/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/rebuilding-and-restoring-your-life-in-addiction-recovery/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/medication-assisted-treatment-long-term/', '/our-program/evidence-based', 301, 'blog post — topical match'),
  ('/self-care-addiction-recovery/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/why-does-longer-treatment-lead-to-better-outcomes-addiction-recovery-with-sustainable-results/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/farm-to-table-to-healing-a-conversation-about-food-and-the-recovery-process-with-chef-sandra-bradley/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/getting-through-the-holidays-sober/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/what-to-look-for-in-local-detox-centers/', '/treatment/residential-inpatient', 301, 'blog post — topical match'),
  ('/getting-through-the-first-day-at-rehab/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/medical-and-holistic-addiction-treatment/', '/our-program/holistic-approaches', 301, 'blog post — topical match'),
  ('/how-do-opioids-affect-the-body/', '/what-we-treat/opioid-addiction', 301, 'blog post — substance-relevant'),
  ('/what-to-look-for-in-a-heroin-rehab/', '/what-we-treat/heroin-addiction', 301, 'blog post — substance-relevant'),
  ('/addiction-in-native-american-communities/', '/our-program/indigenous-approach', 301, 'blog post — topical match'),
  ('/how-to-practice-self-care/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/cbt-improves-addiction-outcomes/', '/our-program/evidence-based', 301, 'blog post — topical match'),
  ('/difference-between-inpatient-vs-outpatient/', '/treatment/residential-inpatient', 301, 'blog post — topical match'),
  ('/how-to-safely-detox-from-xanax/', '/what-we-treat/benzodiazepine', 301, 'blog post — substance-relevant'),
  ('/supportive-holistic-care-for-medical-detox/', '/our-program/holistic-approaches', 301, 'blog post — topical match'),
  ('/symptoms-of-fentanyl-addiction/', '/what-we-treat/opioid-addiction', 301, 'blog post — substance-relevant'),
  ('/dealing-with-stress-in-recovery-5-tips-to-building-healthy-stress-management-skills/', '/who-we-are/recovery-roadmap', 301, 'blog post — upgrade when ported'),
  ('/what-makes-a-rehab-holistic/', '/our-program/holistic-approaches', 301, 'blog post — topical match'),
  ('/neurobiology-how-addiction-works-how-we-heal/', '/our-program/evidence-based', 301, 'blog post — topical match'),
  ('/what-to-look-for-local-detox-center/', '/treatment/residential-inpatient', 301, 'blog post — legacy URL typo; topical match')
on conflict (from_path) do nothing;
