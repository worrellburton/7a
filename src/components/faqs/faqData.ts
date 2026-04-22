// Canonical FAQ corpus for /who-we-are/faqs.
//
// Lives in a non-client module so the server page can emit a
// FAQPage JSON-LD schema from the same source of truth as the UI
// accordion. Keep answers:
//   - One idea per Q; 1–3 sentences.
//   - Start with a direct answer ("Yes." / "Residential stays…") so
//     LLMs can quote the first sentence as a standalone response.
//   - Name entities explicitly (drug brand names, ICD categories,
//     insurance carriers, cities, airports) — specificity is what
//     makes this page cite-worthy.
//   - Avoid marketing adverbs ("compassionate," "premier," etc.).

export interface FaqEntry {
  id: string;
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  hint: string;
  items: FaqEntry[];
}

export const faqCategories: FaqCategory[] = [
  {
    id: 'admissions',
    label: 'Admissions',
    hint: 'Getting started · assessment · timeline',
    items: [
      {
        id: 'how-to-start',
        q: 'How do I get started with admissions?',
        a: 'Call our admissions team at (866) 996-4308 or fill out the contact form. We run a confidential phone assessment, verify your insurance benefits (usually within 15 to 30 minutes), and coordinate travel. Many clients are admitted within 24 to 48 hours of their first call.',
      },
      {
        id: 'assessment',
        q: 'What does the intake assessment look like?',
        a: 'The first call is a confidential 20 to 30-minute clinical screen covering substance use history, mental-health history, current medications, medical conditions, and recent detox needs. It determines level-of-care fit and whether we need to arrange a detox stay before residential admission.',
      },
      {
        id: 'who-admissions-speaks-to',
        q: 'Can a family member call on behalf of a loved one?',
        a: 'Yes. Parents, spouses, and adult children regularly make the first call on a loved one’s behalf. Admissions can share general information, answer questions, and run a preliminary insurance check; clinical decisions and release-of-information paperwork require the client’s signature at intake.',
      },
      {
        id: 'how-fast',
        q: 'How quickly can someone be admitted?',
        a: 'Most admissions happen within 24 to 48 hours of the first call. Faster turnaround is possible in urgent cases; slower timelines happen when we need to coordinate a partnered detox stay first, or when out-of-state travel requires scheduling.',
      },
      {
        id: 'waitlist',
        q: 'Is there a waitlist?',
        a: 'Our boutique census (small group sizes, private rooms) means admission depends on current bed availability. When we are at capacity, we offer a short waitlist and will refer to trusted partner programs if the timing is urgent.',
      },
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance & cost',
    hint: 'Carriers · verification · private pay · financing',
    items: [
      {
        id: 'insurance-accepted',
        q: 'Which insurance plans does Seven Arrows accept?',
        a: 'Seven Arrows Recovery is in-network with most major insurance plans, including Aetna, Blue Cross Blue Shield (BCBS), Cigna, UnitedHealthcare, Humana, and TRICARE. We also work with many out-of-network PPO plans.',
      },
      {
        id: 'insurance-verification',
        q: 'How do I verify my insurance?',
        a: 'Call (866) 996-4308 with your insurance card or submit our online form. Our admissions team runs a free, confidential benefits check and returns typical coverage details (deductible, copay, authorized days) within 15 to 30 minutes during business hours.',
      },
      {
        id: 'cost',
        q: 'How much does residential treatment cost?',
        a: 'Out-of-pocket cost depends entirely on your specific insurance benefits and length of stay. Our admissions team provides a written estimate after verification so you can make the decision with real numbers in front of you. Private-pay rates are available on request.',
      },
      {
        id: 'tricare',
        q: 'Do you accept TRICARE for active-duty military and veterans?',
        a: 'Yes. Seven Arrows is in-network with TRICARE and regularly treats active-duty service members, reservists, veterans, and TRICARE-covered dependents. Our TraumAddiction™ approach is designed for trauma-impacted populations including the military community.',
      },
      {
        id: 'medicaid-medicare',
        q: 'Do you accept Medicaid or Medicare?',
        a: 'Seven Arrows does not currently accept Medicaid or Medicare as primary insurance. Clients with Medicaid or Medicare coverage should call us and we will refer to trusted partner programs that are in-network with those plans.',
      },
      {
        id: 'financing',
        q: 'What if I don’t have insurance?',
        a: 'We offer private-pay options and can discuss financing when needed. Many families use a combination of insurance, savings, and short-term financing; admissions will walk through what is realistic for your situation without pressure.',
      },
    ],
  },
  {
    id: 'clinical',
    label: 'Clinical approach',
    hint: 'Modalities · evidence base · trauma · dual diagnosis',
    items: [
      {
        id: 'evidence-based',
        q: 'Is Seven Arrows an evidence-based program?',
        a: 'Yes. Our core clinical program includes CBT, DBT, EMDR, ART (Accelerated Resolution Therapy), IFS (Internal Family Systems), and MI (Motivational Interviewing), layered with somatic and experiential therapies. Every client gets an individualized plan built from these modalities.',
      },
      {
        id: 'traumaddiction',
        q: 'What is the TraumAddiction™ approach?',
        a: 'TraumAddiction™ is our proprietary clinical framework for treating trauma and addiction as a single, integrated condition. It pairs cognitive work (CBT, IFS) with body-based interventions (somatic experiencing, EMDR, ART) so the nervous system and the narrative both get attention.',
      },
      {
        id: 'dual-diagnosis',
        q: 'Do you treat dual-diagnosis (co-occurring) conditions?',
        a: 'Yes. We are a dual-diagnosis residential program, which means substance use and co-occurring mental-health conditions — PTSD, major depressive disorder, generalized anxiety, stabilized bipolar II, OCD, ADHD — are treated together in a single integrated plan rather than handed off.',
      },
      {
        id: 'medication',
        q: 'Can I continue my psychiatric medications during treatment?',
        a: 'Yes. Our medical team reviews every client’s medications at intake, coordinates with your existing prescribers when possible, and only makes changes that are clinically necessary. We do not require clients to taper or discontinue medication to enroll.',
      },
      {
        id: 'therapy-frequency',
        q: 'How often will I meet with a therapist?',
        a: 'Every client has weekly individual therapy with a primary clinician, plus daily group therapy, family therapy on a scheduled cadence, and adjunctive work like EMDR or ART as clinically indicated. One-to-one time is protected and not swapped out for group coverage.',
      },
      {
        id: 'holistic',
        q: 'Do you offer holistic therapies?',
        a: 'Yes. Trauma-informed yoga, breathwork, sound healing, art and music therapy, mindfulness, nutrition, and equine-assisted psychotherapy are woven through the week alongside clinical sessions. Indigenous practices (sweat lodge, talking circle, land-based ceremony) are offered by trusted carriers.',
      },
    ],
  },
  {
    id: 'detox',
    label: 'Detox & medical',
    hint: 'On-site care · MAT · medical oversight',
    items: [
      {
        id: 'detox-on-site',
        q: 'Do you offer medical detox on-site?',
        a: 'We accept clients who are post-detox or who do not require medical detox. For clients who still need acute detoxification (severe alcohol, benzodiazepine, or complicated opioid withdrawal), admissions coordinates a short stay at a partnered detox facility so you arrive at Seven Arrows medically stable.',
      },
      {
        id: 'mat',
        q: 'Do you support medication-assisted treatment (MAT)?',
        a: 'Yes. Clients on buprenorphine, naltrexone, or vivitrol are welcome, and our medical team manages these medications throughout the stay in coordination with your prescriber. We do not require clients to discontinue MAT as a condition of admission.',
      },
      {
        id: 'medical-oversight',
        q: 'Is medical care available 24/7?',
        a: 'Yes. Nursing staff is on campus and on-call around the clock; a medical director oversees every treatment plan; and we have established referral pathways to local hospitals in Cochise County for any care that exceeds our level.',
      },
    ],
  },
  {
    id: 'daily-life',
    label: 'Life at the ranch',
    hint: 'Schedule · rooms · food · phones · what to bring',
    items: [
      {
        id: 'typical-day',
        q: 'What does a typical day look like?',
        a: 'Days include individual therapy, group therapy, holistic practice (yoga, breathwork, sound), time with the horses, meals together, and an evening reflection or circle. Structure is consistent but flexes around clinical needs and ceremony calendars.',
      },
      {
        id: 'accommodations',
        q: 'What are the accommodations like?',
        a: 'Seven Arrows is a 160-acre private ranch at the base of the Swisshelm Mountains in Cochise County, Arizona. Clients stay in residential rooms on the property, with a mix of private and semi-private configurations depending on census. The grounds are open, quiet, and walkable.',
      },
      {
        id: 'food',
        q: 'What about food and nutrition?',
        a: 'Meals are prepared on-site by an in-house kitchen and served family-style. The menu emphasizes whole foods and accommodates common dietary needs (vegetarian, vegan, gluten-free, allergies). Nutrition education is part of the program rather than an afterthought.',
      },
      {
        id: 'phones',
        q: 'Can I use my phone during treatment?',
        a: 'We limit personal electronics to support a distraction-free environment, particularly in the first two weeks. Clients are given structured, supervised access to check in with family and handle essential outside obligations; specific policies are reviewed at intake.',
      },
      {
        id: 'what-to-bring',
        q: 'What should I bring to treatment?',
        a: 'Bring comfortable clothing suitable for outdoor Arizona weather, sturdy closed-toe shoes, toiletries, any prescribed medications in their original containers, a notebook or journal, and a list of emergency contacts. Admissions sends a full packing list with your confirmation.',
      },
    ],
  },
  {
    id: 'family',
    label: 'Family & loved ones',
    hint: 'Visitation · communication · family program',
    items: [
      {
        id: 'family-involvement',
        q: 'Can family be involved during treatment?',
        a: 'Yes. Family involvement is a core part of our program. We offer weekly family therapy, open-enrollment family education groups, and a dedicated family coordinator who handles visitation, ROI paperwork, and communication throughout the stay.',
      },
      {
        id: 'visitation',
        q: 'How does visitation work?',
        a: 'Visitation is structured and typically scheduled after the first two weeks. Our family coordinator schedules in-person visits, campus tours for loved ones, and family weekends on a rhythm that supports the clinical work rather than interrupts it.',
      },
      {
        id: 'communication',
        q: 'Can I talk to my family while I’m in treatment?',
        a: 'Yes. Structured phone and video check-ins with approved family members begin in the first week. The specific schedule and approved contact list are set with your primary clinician at intake and reviewed throughout the stay.',
      },
    ],
  },
  {
    id: 'after',
    label: 'After treatment',
    hint: 'Aftercare · alumni · relapse · sober living',
    items: [
      {
        id: 'aftercare',
        q: 'What happens after I complete residential treatment?',
        a: 'Before discharge, your primary clinician builds a written aftercare plan: outpatient therapy referrals, sober-living recommendations, psychiatric follow-up, alumni program participation, and a relapse-prevention framework. Aftercare is planned from week one, not the last day.',
      },
      {
        id: 'alumni',
        q: 'Do you have an alumni program?',
        a: 'Yes. Our alumni network includes weekly online meetings, in-person reunion weekends on the ranch, ongoing access to alumni coordinators, and peer support for returning clients. The relationship continues long after residential treatment ends.',
      },
      {
        id: 'sober-living',
        q: 'Do you help place clients into sober living?',
        a: 'Yes. Our aftercare team maintains a vetted list of sober-living homes across Arizona and nationally, and coordinates the transition directly for clients who step down into that environment after residential care.',
      },
      {
        id: 'relapse',
        q: 'What if I relapse after treatment?',
        a: 'Relapse is clinical information, not failure. Alumni can call admissions at any hour for support, re-admission assessment, or a referral to a different level of care if appropriate. Many clients return for a shorter stay after a relapse and find the second round markedly different.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & licensure',
    hint: 'HIPAA · confidentiality · monitoring programs',
    items: [
      {
        id: 'confidentiality',
        q: 'Is my treatment confidential?',
        a: 'Yes. Seven Arrows is HIPAA-compliant and additionally governed by 42 CFR Part 2, the federal confidentiality rule for substance-use treatment records. We do not release information without your signed authorization except where the law requires it (e.g., mandated reporting).',
      },
      {
        id: 'accreditation',
        q: 'Is Seven Arrows accredited?',
        a: 'Yes. Seven Arrows Recovery is JCAHO-accredited, LegitScript-certified, and HIPAA-compliant. Accreditation details and current status are available on request.',
      },
      {
        id: 'monitoring',
        q: 'Do you work with professional monitoring programs?',
        a: 'Yes. We routinely treat physicians, nurses, pilots, and attorneys in monitoring programs such as the Arizona Medical Association PHP, state nursing boards, and the FAA HIMS program. Documentation, discretion, and continuity with monitoring requirements are standard parts of our care.',
      },
    ],
  },
];

export const allFaqs: FaqEntry[] = faqCategories.flatMap((c) => c.items);
