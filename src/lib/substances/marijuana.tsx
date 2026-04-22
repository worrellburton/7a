import type { SubstanceContent } from './types';

export const marijuanaContent: SubstanceContent = {
  hero: {
    label: 'Marijuana Addiction Treatment',
    title: 'Cannabis dependence is real — and it finally has a name.',
    description:
      'At Seven Arrows Recovery, cannabis use disorder is treated as a legitimate clinical diagnosis, not dismissed because the drug is legal. High-potency modern cannabis produces real tolerance, real withdrawal, and real functional cost. Our residential program in Arizona treats it with the same seriousness as any other substance.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Marijuana Addiction' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        THC rides the endocannabinoid system —{' '}
        <em className="not-italic text-primary">and today&rsquo;s THC is nothing like 1995&rsquo;s.</em>
      </>
    ),
    paragraphs: [
      'THC binds to CB1 receptors across the brain, triggering dopamine release, mood shifts, and modulation of appetite, pain, and anxiety. At moderate doses this is the smoothing effect most users describe.',
      'The THC content of modern cannabis has climbed from ~3% in flower from 1995 to 20%+ in commonly-sold flower today, and 70–90% in concentrates and vapes. The pharmacology looks nothing like the cannabis of a generation ago. The dependence landscape matches.',
      'Recovery involves giving the endocannabinoid system time to reset — which it will — and treating the underlying anxiety, sleep, and attention patterns cannabis was stepping in to manage.',
    ],
    chart: {
      natural: { label: 'endocannabinoid baseline', color: '#2f6f5e' },
      spike: { label: 'THC dose', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Quieter than other drugs, equally real.</em>
      </>
    ),
    paragraphs: [
      'Cannabis dependence settles in softly. A wake-and-bake, a session to unwind, something for sleep, something to eat. By the time it is every waking non-task hour, the pattern has been invisible for years.',
      'Residential care for cannabis often surprises clients: withdrawal is more uncomfortable than they expected, and life feels louder — good and bad — without the smoothing effect. That is the nervous system coming back online.',
    ],
    stages: [
      { label: 'Use', hint: 'Unwind, sleep, appetite' },
      { label: 'Plateau', hint: '1–3 hours' },
      { label: 'Comedown', hint: 'Anxiety, poor sleep' },
      { label: 'Next hit', hint: 'Morning, lunch, evening' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Cannabis dependence is <em className="not-italic text-accent">not a fringe diagnosis</em>.
      </>
    ),
    body: 'Legalization has normalized cannabis — and quietly normalized daily high-dose use. Dependence rates are rising, especially among young adults using concentrates and vapes. The drug has changed faster than the cultural understanding of what it does.',
    stats: [
      {
        value: 30,
        suffix: '%',
        label: 'Daily users with CUD',
        body: 'Roughly 30% of daily cannabis users meet DSM-5 criteria for cannabis use disorder. That is not a small number.',
      },
      {
        value: 5,
        suffix: '×',
        label: 'Psychosis risk (high-potency)',
        body: 'High-potency cannabis use is associated with up to 5× increased risk of psychotic disorders in vulnerable populations.',
      },
      {
        value: 14,
        suffix: ' d',
        label: 'Peak withdrawal window',
        body: 'Cannabis withdrawal peaks around days 2–6 and typically resolves by day 14 — sleep disturbance is often the longest-lasting symptom.',
      },
    ],
    footnote:
      'Figures are directional, drawn from NIDA and peer-reviewed cannabis research. Individual risk varies.',
  },
  withdrawal: {
    eyebrow: 'The First Thirty Days',
    title: (
      <>
        Cannabis withdrawal is <em className="not-italic text-primary">real</em> — and almost nobody is told that before they try to quit.
      </>
    ),
    body: 'The cultural myth that cannabis has no withdrawal has kept people from seeking help. The truth: irritability, sleep disturbance, anxiety, vivid dreams, and appetite disruption are documented, consistent, and meaningful. They pass. The window is navigable with structure.',
    phases: [
      {
        label: 'Acute withdrawal',
        days: 'Days 1–7',
        body: 'Insomnia, irritability, anxiety, appetite loss, vivid dreams. Peak around days 2–6. Structure matters here because the discomfort pulls strongly for a "just one" to reset.',
      },
      {
        label: 'Sub-acute',
        days: 'Days 7–21',
        body: 'Most physical symptoms resolve. Sleep remains disturbed. Cravings shift from physical to situational — the places, people, and routines that held the habit.',
      },
      {
        label: 'Re-integration',
        days: 'Weeks 3–8',
        body: 'Nervous system begins normalizing. Anxiety (or whatever was being self-medicated) becomes directly treatable. Trauma work comes online.',
      },
      {
        label: 'Post-acute',
        days: 'Months 2–6',
        body: 'Sleep architecture fully returns. Dreams normalize. Baseline mood stabilizes. Aftercare and community carry the long arc.',
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">almost none of them thought they had a real problem</em>.
      </>
    ),
    body: 'The biggest obstacle to cannabis treatment is the belief that cannabis cannot produce a real problem. If it is affecting your sleep, your attention, your relationships, or your work — it is a real problem.',
    personas: [
      {
        label: 'The wake-and-bake daily user',
        headline: 'Every waking non-task hour.',
        body: 'Daily use has slowly stretched from evenings to mornings. You would say you function — and you do. But the question of who you are without it has become difficult to answer.',
      },
      {
        label: 'The high-potency concentrate user',
        headline: 'This is not the flower of 1995.',
        body: 'Dabs, carts, live resin. THC concentrations your nervous system was never evolved to handle at those frequencies. Dependence arrives faster and deeper than most users expect.',
      },
      {
        label: 'The anxiety self-medicator',
        headline: 'The only thing that quiets it.',
        body: 'Cannabis was the fastest path to manageable anxiety — and became the only path. Dual-diagnosis care for the original anxiety is non-negotiable here.',
      },
      {
        label: 'The trauma survivor',
        headline: 'A smoother that kept working.',
        body: 'Acute or complex trauma underneath. Cannabis did for you what alcohol does for others. Forward-Facing Freedom® is built for this landing.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Weed plus almost anything.',
        body: 'Often alongside alcohol, nicotine, or prescription medications. We treat the whole pattern rather than the one cultural consensus labels "serious."',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Take cannabis seriously.{' '}
        <em className="not-italic text-primary">Treat the anxiety underneath.</em> Rebuild the routines the plant was holding.
      </>
    ),
    body: 'Cannabis use disorder deserves the same clinical seriousness as any other SUD. What makes this treatment slightly different is that most of the therapeutic work happens not during acute withdrawal but in the weeks after — rebuilding life patterns cannabis was smoothing over.',
    flagship: {
      title: 'Somatic-CBT for cannabis use disorder',
      body: 'Our house-integrated CBT variant tracks the body and the thought together. Clients learn to distinguish genuine anxiety from craving-anxiety and to interrupt the pattern before reflex takes over.',
      iconId: 'brain-body',
    },
    modalities: [
      {
        title: 'Sleep architecture rebuilding',
        body: 'Cannabis heavily disrupts REM. Structured sleep-hygiene work, light-cycle restoration, and nervous-system training give the body back its own sleep mechanism.',
        iconId: 'shield',
      },
      {
        title: 'Anxiety-direct CBT',
        body: 'Treat the anxiety cannabis was managing, directly. Cognitive and somatic work together, so the symptom does not require the plant to be tolerable.',
        iconId: 'compass',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced after the first few weeks, when the nervous system has quieted enough to do the work.',
        iconId: 'spiral',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses mirror nervous-system states. Clients who have been smoothing edges with cannabis experience an honest down-regulation baseline — often for the first time in years.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Parasympathetic-activating practices that give the nervous system back the tools cannabis was performing.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for anxiety, ADHD, PTSD, and depression — the conditions most commonly underneath heavy cannabis use.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        The endocannabinoid system <em className="not-italic text-primary">resets</em>. Life gets louder, then livable.
      </>
    ),
    paragraphs: [
      'Most alumni describe the shift at week three or four — sleep comes back, dreams normalize, mornings feel workable, appetite synchronizes with actual hunger. The system is rebalancing.',
      'Sleep, movement, connection, and meaning — the four pillars — do the long-arc work. The goal is not a life that feels exactly like it did on cannabis; it is a life the nervous system can actually inhabit.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'REM returns' },
      { x: 0.4, label: 'Movement', hint: 'Natural regulation' },
      { x: 0.65, label: 'Connection', hint: 'Belonging' },
      { x: 0.9, label: 'Meaning', hint: 'Purpose, identity' },
    ],
  },
  voices: {
    eyebrow: 'Alumni Voices',
    title: (
      <>
        Three alumni, three{' '}
        <em className="not-italic text-primary">first sober mornings that felt okay</em>.
      </>
    ),
    voices: [
      {
        quote:
          "I did not think it was a real problem until I tried to stop for a week on my own. Treatment took it seriously when nobody in my life would. That mattered.",
        attribution: 'Alumna · 16 months sober · daily dabs user',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          "Week four, I woke up without anxiety for the first time in fifteen years. Turned out it had been cannabis holding the volume, not cannabis fixing it.",
        attribution: 'Alumnus · 2 years sober · anxiety self-medication',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          "The sleep work was the unlock. I had forgotten what REM felt like. The dreams were intense, then they were normal, then I was rested. Took about a month.",
        attribution: 'Alumnus · 14 months sober · long-arc daily user',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to take it seriously',
    title: (
      <>
        Cannabis dependence is real. <em className="not-italic text-accent">So is recovery.</em>
      </>
    ),
    body: 'Our admissions team can verify your insurance and begin intake within 24 to 48 hours. You do not need a rock-bottom to deserve a better system.',
  },
};
