// Single source of truth for the Recovery Roadmap series.
//
// Adding a new entry here makes it appear on:
//   - the public landing page (latest 3 surface in <BlogPreview />)
//   - /who-we-are/recovery-roadmap (full chronological list)
// without any other edits.
//
// Each episode still has its own MDX-style page under
// /who-we-are/blog/<slug>/content.tsx — this file is just the
// metadata index that powers the listings.

export interface Episode {
  number: number;
  slug: string;
  title: string;
  /** Short pitch, displayed under the title in listings. */
  blurb: string;
  /** ISO date — used for sorting. */
  publishedAt: string;
  /** Pretty date label shown in the UI ("April 24, 2026"). */
  publishedDisplay: string;
  image: string;
  imageAlt: string;
  /**
   * Optional override for the episode's URL. Most episodes live
   * under /who-we-are/blog/<slug> and use the default. A small set
   * of legacy SEO URLs (e.g. /transition-from-suboxone-to-sublocade)
   * are served at the top level instead — set `href` on those rows
   * so the listings link to the right place.
   */
  href?: string;
  /**
   * Stable slug of the person who authored the post. Matches a
   * `users.public_slug` value on the team table — the byline links
   * out to /who-we-are/meet-our-team/<authorSlug> and the JSON-LD
   * Article schema references the same URL as the Person author,
   * which is what Google's E-E-A-T signals want to see.
   *
   * Optional only because legacy/imported episodes might not have
   * an attributed author. New posts should always set this.
   */
  authorSlug?: string;
}

export const EPISODES: Episode[] = [
  {
    number: 1,
    slug: 'when-drinking-stops-working',
    title: 'When Drinking Stops Working: Recognizing the Signs of Addiction',
    blurb:
      'A compassionate guide to understanding when substance use has crossed from choice to compulsion.',
    publishedAt: '2026-03-24',
    publishedDisplay: 'March 24, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'When Drinking Stops Working',
    authorSlug: 'lindsay-rothschild',
  },
  {
    number: 2,
    slug: 'what-happens-first-week',
    title: 'What Happens When You Walk Through the Door: Your First Week in Treatment',
    blurb:
      'Your first week in treatment, demystified. A day-by-day guide for anyone afraid to make the call.',
    publishedAt: '2026-03-24',
    publishedDisplay: 'March 24, 2026',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80',
    imageAlt: 'What Happens When You Walk Through the Door',
    authorSlug: 'lindsay-rothschild',
  },
  {
    number: 3,
    slug: 'what-actually-happens-in-equine-therapy',
    title: 'What Actually Happens in Equine Therapy',
    blurb:
      'The honest, minute-by-minute version of equine therapy — no marketing gloss, no horse-whispering mystique. Just what really happens in the arena and why it reaches places talk therapy sometimes cannot.',
    publishedAt: '2026-04-24',
    publishedDisplay: 'April 24, 2026',
    image: '/images/equine-therapy-portrait.jpg',
    imageAlt: 'What Actually Happens in Equine Therapy',
    authorSlug: 'lindsay-rothschild',
  },
  {
    number: 4,
    slug: 'your-therapists-nervous-system',
    title: "The Miracle Intervention Is Your Therapist's Nervous System",
    blurb:
      "Co-regulation, regulated presence, and the science of why a clinician who's done their own work makes therapy actually land. Plus the warning signs of a therapist performing calm.",
    publishedAt: '2026-04-26',
    publishedDisplay: 'April 26, 2026',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&q=80',
    imageAlt: "A regulated therapist sitting calmly across from a client",
    authorSlug: 'lindsay-rothschild',
  },
  {
    number: 5,
    slug: 'salutogenic-not-pathological',
    title: "Salutogenic, Not Pathological: Rebuilding What's Right Instead of Chasing What's Wrong",
    blurb:
      "The DSM mindset says you are what's wrong with you. The salutogenic frame — built on Rhoton & Gentry's work — says you are what's underneath, still intact, waiting to surface. Why self-leadership beats symptom management for 5-year outcomes.",
    publishedAt: '2026-04-26',
    publishedDisplay: 'April 26, 2026',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80',
    imageAlt: 'A wide horizon at first light — building toward something, not chasing what is broken',
    authorSlug: 'lindsay-rothschild',
  },
  {
    number: 6,
    slug: 'polyvagal-in-plain-english',
    title: "Polyvagal in Plain English: The Three States You Live In Every Day",
    blurb:
      "Ventral, sympathetic, dorsal — walked as a ladder, in language you can actually use mid-craving. Why addiction looks different in each state, and the two questions to ask yourself when you can't tell which one you're in.",
    publishedAt: '2026-04-26',
    publishedDisplay: 'April 26, 2026',
    image: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=1200&q=80',
    imageAlt: 'A person at the foot of a long ladder — the polyvagal ladder you climb up and down all day',
    authorSlug: 'lindsay-rothschild',
  },
  {
    number: 7,
    slug: 'transition-from-suboxone-to-sublocade',
    title: 'Transitioning from Suboxone to Sublocade',
    blurb:
      'What to expect when switching from daily Suboxone to a monthly Sublocade injection — the four-step transition, insurance coverage, and how Seven Arrows Recovery walks alongside you the whole way.',
    publishedAt: '2026-04-28',
    publishedDisplay: 'April 28, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'A resident sitting quietly by a window — recovery on a monthly rhythm instead of a daily one',
    // Served at the top-level legacy URL instead of the standard
    // /who-we-are/blog/<slug> path so existing inbound links and
    // SEO equity from the WordPress era keep landing on the same
    // article.
    href: '/transition-from-suboxone-to-sublocade',
  },
  // ── Episodes 8-51: WordPress-era articles republished at their
  // original root-level URLs to preserve inbound links and SEO
  // equity. Each one has a matching `href` override pointing at the
  // top-level slug; the page bodies live under
  // /src/app/(site)/<slug>/{page,content}.tsx, mirroring the
  // /transition-from-suboxone-to-sublocade pattern (Episode 7).
  {
    number: 8,
    slug: 'signs-a-spouse-is-using-drugs',
    title: 'Signs a Spouse is Using Drugs',
    blurb:
      'Substance abuse doesn’t just affect individuals—it creates ripple effects that touch everyone close to them, especially spouses.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Signs a Spouse is Using Drugs',
    href: '/signs-a-spouse-is-using-drugs',
  },
  {
    number: 9,
    slug: 'what-to-expect-during-meth-withdrawal',
    title: 'What to Expect During Meth Withdrawal',
    blurb:
      'Substance abuse doesn’t just affect individuals—it creates ripple effects that touch everyone close to them, especially spouses.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'What to Expect During Meth Withdrawal',
    href: '/what-to-expect-during-meth-withdrawal',
  },
  {
    number: 10,
    slug: 'drug-rehabs-with-horses',
    title: 'Drug Rehabs with Horses',
    blurb:
      'Finding the right path to recovery is a deeply personal journey that touches every aspect of an individual’s life.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Drug Rehabs with Horses',
    href: '/drug-rehabs-with-horses',
  },
  {
    number: 11,
    slug: 'how-to-go-to-rehab-without-loosing-your-job',
    title: 'How to Go to Rehab Without Loosing Your Job',
    blurb:
      'Going to rehab can be a life-changing decision, but for many individuals, the fear of losing their job can prevent them from seeking the help they need.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How to Go to Rehab Without Loosing Your Job',
    href: '/how-to-go-to-rehab-without-loosing-your-job',
  },
  {
    number: 12,
    slug: 'sound-therapy-and-addiction-treatment',
    title: 'Sound Therapy and Addiction Treatment: How It Aids the Recovery Process',
    blurb:
      'Embarking on the path to addiction recovery is a courageous journey that requires a holistic approach to healing.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Sound Therapy and Addiction Treatment: How It Aids the Recovery Process',
    href: '/sound-therapy-and-addiction-treatment',
  },
  {
    number: 13,
    slug: 'exercise-and-addiction-recovery-4-ways-to-rewire-your-brain',
    title: 'Exercise and Addiction Recovery 4 Ways to Rewire Your Brain',
    blurb:
      'Substance abuse and addiction wire your brain to prioritize substances above everything else. Your lifestyle bends to accommodate them, and your enjoyment…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Exercise and Addiction Recovery 4 Ways to Rewire Your Brain',
    href: '/exercise-and-addiction-recovery-4-ways-to-rewire-your-brain',
  },
  {
    number: 14,
    slug: 'detox-for-benzodiazepine-withdrawal',
    title: 'Should I Go to Detox for Benzodiazepine Withdrawals?',
    blurb:
      'Benzodiazepines, often referred to as “benzos,” are a class of medications primarily prescribed to treat conditions such as anxiety, insomnia, and seizures.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Should I Go to Detox for Benzodiazepine Withdrawals?',
    href: '/detox-for-benzodiazepine-withdrawal',
  },
  {
    number: 15,
    slug: 'force-someone-to-go-to-rehab',
    title: 'Can I Force Someone to Go to Rehab?',
    blurb:
      'Watching someone you love struggle with addiction is one of the most painful experiences you can go through.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Can I Force Someone to Go to Rehab?',
    href: '/force-someone-to-go-to-rehab',
  },
  {
    number: 16,
    slug: 'how-to-help-your-alcoholic-spouse',
    title: 'How to Help Your Alcoholic Spouse',
    blurb:
      'Alcohol abuse is a pervasive issue that affects millions of individuals and their families worldwide. When someone you love is struggling with alcohol use…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How to Help Your Alcoholic Spouse',
    href: '/how-to-help-your-alcoholic-spouse',
  },
  {
    number: 17,
    slug: 'how-long-does-meth-stay-in-your-system',
    title: 'How Long Does Meth Stay in Your System?',
    blurb:
      'Methamphetamine, commonly referred to as meth or crystal meth, is a powerful and addictive stimulant that significantly impacts the central nervous system.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How Long Does Meth Stay in Your System?',
    href: '/how-long-does-meth-stay-in-your-system',
  },
  {
    number: 18,
    slug: 'how-can-equine-therapy-benefit-addiction-recovery',
    title: 'How Can Equine Therapy Benefit Addiction Recovery?',
    blurb:
      'Addiction is an ongoing issue affecting millions of people worldwide. Whether it’s substances like drugs and alcohol or behaviors such as gambling…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How Can Equine Therapy Benefit Addiction Recovery?',
    href: '/how-can-equine-therapy-benefit-addiction-recovery',
  },
  {
    number: 19,
    slug: 'addiction-in-a-coworker',
    title: 'Addiction in a Coworker',
    blurb:
      'Navigating workplace relationships can be challenging under any circumstances, but when you suspect that a coworker might be struggling with drug addiction…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Addiction in a Coworker',
    href: '/addiction-in-a-coworker',
  },
  {
    number: 20,
    slug: 'unlocking-healing-understanding-trauma-informed-yoga-for-addiction-recovery',
    title: 'Unlocking Healing: Understanding Trauma-Informed Yoga for Addiction Recovery',
    blurb:
      'In the journey toward addiction recovery, healing takes many forms. While traditional therapies and support groups play vital roles, complementary practices…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Unlocking Healing: Understanding Trauma-Informed Yoga for Addiction Recovery',
    href: '/unlocking-healing-understanding-trauma-informed-yoga-for-addiction-recovery',
  },
  {
    number: 21,
    slug: 'the-integration-of-cultural-and-holistic-healing-in-recovery',
    title: 'The Integration of Cultural and Holistic Healing in Recovery',
    blurb:
      'Native American healing traditions have played a significant role in addiction recovery for centuries.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'The Integration of Cultural and Holistic Healing in Recovery',
    href: '/the-integration-of-cultural-and-holistic-healing-in-recovery',
  },
  {
    number: 22,
    slug: 'nature-versus-nurture-explaining-the-link-between-epigenetics-and-addiction',
    title: 'Nature Versus Nurture: Explaining the Link Between Epigenetics and Addiction',
    blurb:
      'Nature and nurture are often set as opposing forces. Does our innate nature or genes make us do what we do? Or are our actions determined by our environment…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Nature Versus Nurture: Explaining the Link Between Epigenetics and Addiction',
    href: '/nature-versus-nurture-explaining-the-link-between-epigenetics-and-addiction',
  },
  {
    number: 23,
    slug: 'guide-to-12-step-meetings',
    title: 'A Simple Guide to 12-Step Meetings',
    blurb:
      'The journey to recovery is deeply personal, filled with unique challenges and moments of profound growth.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'A Simple Guide to 12-Step Meetings',
    href: '/guide-to-12-step-meetings',
  },
  {
    number: 24,
    slug: 'boost-your-brain-health-increasing-serotonin-in-addiction-recovery',
    title: 'Boost Your Brain Health Increasing Serotonin in Addiction Recovery',
    blurb:
      'Serotonin, a crucial neurotransmitter, plays a key role in regulating mood, sleep, and appetite. Its deficiencies often lead to conditions such as…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Boost Your Brain Health Increasing Serotonin in Addiction Recovery',
    href: '/boost-your-brain-health-increasing-serotonin-in-addiction-recovery',
  },
  {
    number: 25,
    slug: 'understanding-the-impact-trauma-has-on-addiction',
    title: 'Understanding the Impact Trauma Has on Addiction',
    blurb:
      'Addiction is powerful, and its impact can overwhelm an individual, altering their mental and physical health, relationships, and overall quality of life.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Understanding the Impact Trauma Has on Addiction',
    href: '/understanding-the-impact-trauma-has-on-addiction',
  },
  {
    number: 26,
    slug: 'what-to-expect-during-dbt-sessions',
    title: 'What to Expect During Dbt Sessions',
    blurb:
      'Addiction is powerful, and its impact can overwhelm an individual, altering their mental and physical health, relationships, and overall quality of life.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'What to Expect During Dbt Sessions',
    href: '/what-to-expect-during-dbt-sessions',
  },
  {
    number: 27,
    slug: 'how-to-safely-detox-from-xanax',
    title: 'How to Safely Detox from Xanax',
    blurb:
      'Detoxing from Xanax can feel scary, but necessary at the same time. It’s an important step toward recovery, but many people worry about what will happen…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How to Safely Detox from Xanax',
    href: '/how-to-safely-detox-from-xanax',
  },
  {
    number: 28,
    slug: 'farm-to-table-to-healing-a-conversation-about-food-and-the-recovery-process-with-chef-sandra-bradley',
    title: 'Farm to Table to Healing a Conversation About Food and the Recovery Process with Chef Sandra Bradley',
    blurb:
      'The relationship between food and healing is a significant one. For those in substance abuse or addiction recovery, nutrition becomes all the more essential…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Farm to Table to Healing a Conversation About Food and the Recovery Process with Chef Sandra Bradley',
    href: '/farm-to-table-to-healing-a-conversation-about-food-and-the-recovery-process-with-chef-sandra-bradley',
  },
  {
    number: 29,
    slug: 'sober-summer-activities',
    title: 'Sober Summer Activities',
    blurb:
      'If you’re in recovery, the idea of warm weather, late nights, and seasonal events can feel complicated. But sober summer activities don’t have to be boring…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Sober Summer Activities',
    href: '/sober-summer-activities',
  },
  {
    number: 30,
    slug: 'manage-stress-and-burnout',
    title: 'How to Best Manage Stress and Burnout',
    blurb:
      'In the modern, fast-paced world, stress and burnout have become common challenges, especially for those facing drug addiction.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How to Best Manage Stress and Burnout',
    href: '/manage-stress-and-burnout',
  },
  {
    number: 31,
    slug: 'pets-role-in-addiction-recovery-unconditional-support-love',
    title: 'Pets Role in Addiction Recovery Unconditional Support Love',
    blurb:
      'Beginning the journey to recovery from addiction is a monumental step, and you’re not alone in this. Those on the journey know that support is foundational…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Pets Role in Addiction Recovery Unconditional Support Love',
    href: '/pets-role-in-addiction-recovery-unconditional-support-love',
  },
  {
    number: 32,
    slug: 'why-does-longer-treatment-lead-to-better-outcomes-addiction-recovery-with-sustainable-results',
    title: 'Why Does Longer Treatment Lead to Better Outcomes? Addiction Recovery with Sustainable Results',
    blurb:
      'Many people approach addiction recovery as though it’s a microwave: systematic, straightforward, and—above all else—fast. The “30-day treatment” myth…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Why Does Longer Treatment Lead to Better Outcomes? Addiction Recovery with Sustainable Results',
    href: '/why-does-longer-treatment-lead-to-better-outcomes-addiction-recovery-with-sustainable-results',
  },
  {
    number: 33,
    slug: 'dealing-with-stress-in-recovery-5-tips-to-building-healthy-stress-management-skills',
    title: 'Dealing with Stress in Recovery: 5 Tips to Building Healthy Stress-Management Skills',
    blurb:
      'Since stress is an inevitable part of life, learning stress-management is essential to living a healthy life.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Dealing with Stress in Recovery: 5 Tips to Building Healthy Stress-Management Skills',
    href: '/dealing-with-stress-in-recovery-5-tips-to-building-healthy-stress-management-skills',
  },
  {
    number: 34,
    slug: 'the-power-of-nutrition-in-early-recovery',
    title: 'The Power of Nutrition in Early Recovery',
    blurb:
      'At Seven Arrows Recovery Center in Arizona, embracing nutrition in recovery is a foundational step toward holistic healing for those dealing with substance…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'The Power of Nutrition in Early Recovery',
    href: '/the-power-of-nutrition-in-early-recovery',
  },
  {
    number: 35,
    slug: 'medication-assisted-treatment-long-term',
    title: 'Medication Assisted Treatment Long Term',
    blurb:
      'In the battle against addiction, one of the most effective and research-backed approaches is medication-assisted treatment, also known as MAT.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Medication Assisted Treatment Long Term',
    href: '/medication-assisted-treatment-long-term',
  },
  {
    number: 36,
    slug: 'the-benefits-of-meditation-for-addiction-recovery',
    title: 'The Benefits of Meditation for Addiction Recovery',
    blurb:
      'Meditation is a practice that dates back centuries, and its benefits for mental health are widely recognized.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'The Benefits of Meditation for Addiction Recovery',
    href: '/the-benefits-of-meditation-for-addiction-recovery',
  },
  {
    number: 37,
    slug: 'inpatient-mental-health-facilities-in-arizona',
    title: 'Inpatient Mental Health Facilities in Arizona',
    blurb:
      'Understanding how to find the best inpatient mental health facilities in Arizona is crucial in your journey to healing and recovery.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Inpatient Mental Health Facilities in Arizona',
    href: '/inpatient-mental-health-facilities-in-arizona',
  },
  {
    number: 38,
    slug: 'rebuilding-and-restoring-your-life-in-addiction-recovery',
    title: 'Rebuilding and Restoring Your Life in Addiction Recovery',
    blurb:
      'Recovery from substance abuse and addiction is a lifelong process and can come in many forms. But still many people continue to think that residential…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Rebuilding and Restoring Your Life in Addiction Recovery',
    href: '/rebuilding-and-restoring-your-life-in-addiction-recovery',
  },
  {
    number: 39,
    slug: 'benefits-of-animal-assisted-therapies',
    title: 'The Benefits of Animal-Assisted Therapies in Addiction Treatment',
    blurb:
      'At Seven Arrows Recovery, we understand that the journey to recovery is deeply personal and challenging.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'The Benefits of Animal-Assisted Therapies in Addiction Treatment',
    href: '/benefits-of-animal-assisted-therapies',
  },
  {
    number: 40,
    slug: 'how-do-opioids-affect-the-body',
    title: 'How Do Opioids Affect the Body?',
    blurb:
      'Opioids are a class of drugs that include prescription painkillers like oxycodone and hydrocodone and illicit substances such as heroin.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How Do Opioids Affect the Body?',
    href: '/how-do-opioids-affect-the-body',
  },
  {
    number: 41,
    slug: 'what-makes-a-rehab-holistic',
    title: 'What Makes a Rehab Holistic',
    blurb:
      'Holistic rehab centers take a comprehensive approach to addiction treatment, addressing not only the physical aspects of addiction but also the emotional…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'What Makes a Rehab Holistic',
    href: '/what-makes-a-rehab-holistic',
  },
  {
    number: 42,
    slug: 'what-is-trauma-informed-addiction-treatment',
    title: 'What is Trauma Informed Addiction Treatment',
    blurb:
      'Addiction is a deeply complex and multifaceted challenge, and it is often intertwined with a history of trauma.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'What is Trauma Informed Addiction Treatment',
    href: '/what-is-trauma-informed-addiction-treatment',
  },
  {
    number: 43,
    slug: 'role-of-support-groups-in-addiction-recovery',
    title: 'The Role of Support Groups in Addiction Recovery',
    blurb:
      'Addiction recovery can be filled with many ups and downs. This is because becoming sober is just the beginning of your sobriety journey.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'The Role of Support Groups in Addiction Recovery',
    href: '/role-of-support-groups-in-addiction-recovery',
  },
  {
    number: 44,
    slug: 'should-i-travel-for-addiction-treatment',
    title: 'Should I Travel for Addiction Treatment',
    blurb:
      'Deciding to seek help for addiction is a significant step toward recovery and healthier life choices. One crucial aspect of this journey is determining the…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Should I Travel for Addiction Treatment',
    href: '/should-i-travel-for-addiction-treatment',
  },
  {
    number: 45,
    slug: 'using-insurance-to-cover-detox-for-cocaine',
    title: 'Using Insurance to Cover Detox for Cocaine Addiction',
    blurb:
      'Cocaine addiction can impact every facet of a person’s life—relationships, career, physical health, and emotional well-being.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Using Insurance to Cover Detox for Cocaine Addiction',
    href: '/using-insurance-to-cover-detox-for-cocaine',
  },
  {
    number: 46,
    slug: 'symptoms-of-fentanyl-addiction',
    title: 'Symptoms of Fentanyl Addiction',
    blurb:
      'In recent years, the opioid crisis in the United States has escalated at an alarming rate, with fentanyl at its core.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Symptoms of Fentanyl Addiction',
    href: '/symptoms-of-fentanyl-addiction',
  },
  {
    number: 47,
    slug: 'what-to-look-for-in-a-heroin-rehab',
    title: 'What to Look for in a Heroin Rehab',
    blurb:
      'Heroin addiction is a devastating disease that affects individuals and families across the country. If you or someone you love is struggling, finding the…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'What to Look for in a Heroin Rehab',
    href: '/what-to-look-for-in-a-heroin-rehab',
  },
  {
    number: 48,
    slug: 'dynamics-of-healing-co-occurring-disorders-and-how-to-address-them',
    title: 'Dynamics of Healing Co Occurring Disorders and How to Address Them',
    blurb:
      'Did you know that the brain is one of the most complex parts of the human body? It regulates and cooperates with multiple systems, and keeps everything in…',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'Dynamics of Healing Co Occurring Disorders and How to Address Them',
    href: '/dynamics-of-healing-co-occurring-disorders-and-how-to-address-them',
  },
  {
    number: 49,
    slug: 'what-to-look-for-in-local-detox-centers',
    title: 'What to Look for in Local Detox Centers',
    blurb:
      'Starting the recovery journey is a brave and life-changing decision, and choosing the right detox center is a crucial first step.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'What to Look for in Local Detox Centers',
    href: '/what-to-look-for-in-local-detox-centers',
  },
  {
    number: 50,
    slug: 'how-to-practice-self-care',
    title: 'How to Practice Self Care',
    blurb:
      'Self-care is an essential practice that promotes overall well-being, helps manage stress, and enhances our physical, emotional, and mental health.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'How to Practice Self Care',
    href: '/how-to-practice-self-care',
  },
  {
    number: 51,
    slug: 'what-to-look-for-local-detox-center',
    title: 'What to Look for Local Detox Center',
    blurb:
      'When beginning the journey to recovery, knowing what to look for in a local detox center or rehab is one of the most important decisions you can make.',
    publishedAt: '2026-05-06',
    publishedDisplay: 'May 6, 2026',
    image: '/images/resident-reading-window.jpg',
    imageAlt: 'What to Look for Local Detox Center',
    href: '/what-to-look-for-local-detox-center',
  },

];

/** Newest-first — drives the landing page's "latest" surfacing. */
export const EPISODES_NEWEST_FIRST: Episode[] = [...EPISODES].sort((a, b) => {
  if (a.publishedAt === b.publishedAt) return b.number - a.number;
  return a.publishedAt < b.publishedAt ? 1 : -1;
});

/** Episode-number ascending — the chronological "Series" view. */
export const EPISODES_BY_NUMBER: Episode[] = [...EPISODES].sort(
  (a, b) => a.number - b.number,
);

export function episodeHref(slug: string): string {
  const ep = EPISODES.find((e) => e.slug === slug);
  if (ep?.href) return ep.href;
  return `/who-we-are/blog/${slug}`;
}

// ── Image rotation ────────────────────────────────────────────
//
// Most legacy episodes (8-51, plus a couple from the original 7)
// were imported with the same placeholder photo
// (/images/resident-reading-window.jpg) before per-article art
// could be commissioned. Without rotation, the Recovery Roadmap
// listing renders the same woman-reading-by-a-window photo on
// roughly 45 cards in a row — which makes the page feel like a
// duplicate / broken render even though every entry is unique.
//
// `episodeImage(ep)` returns the entry's own image unless that
// image is the known placeholder, in which case it picks from
// LEGACY_ROTATION_IMAGES by `(number - 1) % len`. Cycling on the
// episode number ensures:
//   - the image is stable per-episode (same slug always renders
//     the same photo), so og:image / share previews stay
//     coherent over time;
//   - adjacent episodes never collide (44 placeholder rows over
//     a 15-image rotation gives a gap of ≥ 15 between repeats);
//   - new placeholder episodes inserted later just continue the
//     cycle.
//
// The rotation pool is intentionally drawn from the in-repo
// /public/images/ catalog — Unsplash sources were deliberately
// excluded so the page stays self-hosted and won't break if a
// remote photo is reorganized upstream.
const LEGACY_PLACEHOLDER = '/images/resident-reading-window.jpg';

const LEGACY_ROTATION_IMAGES: string[] = [
  '/images/equine-therapy-portrait.jpg',
  '/images/horses-grazing.jpg',
  '/images/horse-sketch-artwork.jpg',
  '/images/campfire-ceremony-circle.webp',
  '/images/common-area-living-room.jpg',
  '/images/covered-porch-desert-view.jpg',
  '/images/embrace-connection.jpg',
  '/images/facility-exterior-mountains.jpg',
  '/images/group-gathering-pavilion.jpg',
  '/images/group-sunset-desert.jpg',
  '/images/group-therapy-room.jpg',
  '/images/individual-therapy-session.jpg',
  '/images/resident-reading-window.jpg',
  '/images/sign-night-sky-milky-way.jpg',
  '/images/sound-healing-session.jpg',
];

export function episodeImage(ep: Pick<Episode, 'image' | 'number'>): string {
  if (ep.image !== LEGACY_PLACEHOLDER) return ep.image;
  const i = ((ep.number - 1) % LEGACY_ROTATION_IMAGES.length + LEGACY_ROTATION_IMAGES.length)
    % LEGACY_ROTATION_IMAGES.length;
  return LEGACY_ROTATION_IMAGES[i];
}
