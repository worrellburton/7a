import type { SubstanceContent } from './types';

export const alcoholContent: SubstanceContent = {
  hero: {
    label: 'Alcohol Addiction Treatment',
    title: 'Alcohol changes the brain. We help it change back.',
    description:
      'At Seven Arrows Recovery, alcohol use disorder is treated as a whole-person condition: a neurochemical dependency, a trauma response, and a social pattern entwined at once. Our residential program in Arizona holds all three together — medically-supported detox, trauma-informed therapy, and a landscape that slows the nervous system down long enough for the work to land.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Alcohol Addiction' },
    ],
  },

  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Alcohol quiets the nervous system —{' '}
        <em className="not-italic text-primary">and then demands more volume to do it.</em>
      </>
    ),
    paragraphs: [
      "Alcohol enhances GABA (the brain's brake pedal) and dulls glutamate (the brain's accelerator). The first few drinks feel like relief because the nervous system is being chemically quieted. The body adapts by turning up glutamate to compensate — which is why tolerance climbs, why withdrawal is agitated, and why the drink that used to soften the edges eventually stops working.",
      'Chronic use flattens dopamine signaling the same way stimulants do — not by spiking it, but by slowly silencing the baseline. Food, rest, sex, connection, and pleasure all start to register weaker. The drink becomes the only reliable source of anything at all.',
      'Healing is not "stop drinking." Healing is repairing the nervous-system chemistry the drinking was substituting for — and building a life the brain actually wants to stay awake in.',
    ],
    chart: {
      natural: { label: 'natural reward', color: '#2f6f5e' },
      spike: { label: 'a drink', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },

  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Running on a clock you did not set.</em>
      </>
    ),
    paragraphs: [
      'Alcohol dependence settles into a predictable rhythm — drink to soften the day, sleep, wake up worse, drink to feel normal again. What looks like pleasure has long since become maintenance.',
      'Residential care interrupts the rhythm physically. The house is dry, the schedule is full, the nervous system finally has time to recalibrate without the drink doing its work for it.',
    ],
    stages: [
      { label: 'Drink', hint: 'Relief, unwind, sleep aid' },
      { label: 'Peak', hint: '30–90 minutes' },
      { label: 'Withdrawal', hint: 'Anxiety, poor sleep, shakes' },
      { label: 'Crave', hint: 'Only one thing quiets it' },
    ],
  },

  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Alcohol is <em className="not-italic text-accent">expensive to the body</em>, slowly.
      </>
    ),
    body: 'Unlike stimulants, alcohol rarely delivers a dramatic medical moment — which is part of the trap. The damage is cumulative: liver, heart, brain, sleep architecture, immune function, and mood regulation all drift quietly downhill, and most drinkers only notice once the drift has already taken years.',
    stats: [
      {
        value: 178,
        suffix: 'K',
        label: 'US deaths per year',
        body: 'Roughly 178,000 Americans die annually from excessive alcohol use — more than opioids and stimulants combined.',
      },
      {
        value: 4,
        suffix: '×',
        label: 'Depression risk',
        body: 'Heavy drinkers are up to four times more likely to meet criteria for major depressive disorder than non-drinkers.',
      },
      {
        value: 90,
        suffix: '%',
        label: 'Sleep-quality hit',
        body: 'Even "just a couple drinks" can reduce REM sleep by up to 90% on a given night — the exact sleep the nervous system uses to regulate mood.',
      },
    ],
    footnote:
      'Figures are directional, drawn from CDC/SAMHSA surveillance data and peer-reviewed sleep research. Individual risk varies.',
  },

  withdrawal: {
    eyebrow: 'The First Thirty Days',
    title: (
      <>
        Alcohol withdrawal is <em className="not-italic text-primary">medically serious</em> — and
        the only one on this list that can be dangerous to stop alone.
      </>
    ),
    body: 'Unlike cocaine or cannabis, alcohol withdrawal carries real physical risk: seizures, DTs, and cardiovascular strain. We coordinate medical detox before admission (or on-site when clinically appropriate), then hold the emotional work as the body stabilizes.',
    phases: [
      {
        label: 'Acute withdrawal',
        days: 'Hours 6–72',
        body: 'Tremor, anxiety, elevated heart rate, poor sleep, nausea. The highest-risk window medically — detox oversight is non-negotiable.',
      },
      {
        label: 'Early recovery',
        days: 'Days 4–10',
        body: 'Physical symptoms resolve; mood is labile. Cravings peak here. The nervous system is asking where its off-switch went.',
      },
      {
        label: 'Post-acute (PAWS)',
        days: 'Weeks 2–8',
        body: 'Intermittent cravings, poor sleep, anhedonia, cognitive fog. Trauma work becomes accessible as the acute noise quiets.',
      },
      {
        label: 'Re-regulation',
        days: 'Months 2–6+',
        body: 'Sleep, appetite, and mood steadily normalize. Natural rewards return. Aftercare carries the curve forward from here.',
      },
    ],
  },

  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">not the park-bench stereotype.</em>
      </>
    ),
    body: 'The alcohol-addiction cliché keeps high-functioning drinkers out of care. If you see yourself in any of these, you are exactly who residential treatment is designed for.',
    personas: [
      {
        label: 'The high-functioning drinker',
        headline: 'Still running a career.',
        body: 'Nobody at work knows. The daily pours have climbed quietly over years. By the time you are researching treatment, the math between "normal" and "too much" has already been broken for a long time.',
      },
      {
        label: 'The gray-area drinker',
        headline: 'Not rock-bottom, not fine.',
        body: 'You could probably stop on your own — you have, dozens of times. The pattern always comes back. You do not need a bottom to earn a better system.',
      },
      {
        label: 'The trauma self-medicator',
        headline: 'A drink to take the edge off a body that never got to come down.',
        body: 'Acute or complex trauma sits underneath. The alcohol was an anaesthetic for a nervous system in chronic sympathetic activation. Forward-Facing Freedom® is built for this exact presentation.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Rarely just alcohol.',
        body: 'Benzodiazepines, cannabis, or stimulants often ride alongside. We treat the whole pattern, not just the loudest piece.',
      },
      {
        label: 'The relapse',
        headline: 'Not your first stay.',
        body: 'We do not count previous attempts against you. We look hard at what was missing last time and sequence that in.',
      },
    ],
  },

  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Stabilize the body. <em className="not-italic text-primary">Regulate the nervous system.</em>{' '}
        Rebuild the life.
      </>
    ),
    body: 'Alcohol recovery sequencing matters. Too much trauma processing before the body is physically stable re-triggers craving. Too little psychotherapy after detox loses the window where real change is available.',
    flagship: {
      title: 'Somatic-Cognitive Behavioral Therapy for alcohol craving',
      body: 'Our house-integrated CBT variant tracks the body and the thought at the same time. Clients learn to interrupt the craving loop at the nervous-system level — before the "one drink" decision has a chance to become reflex.',
      iconId: 'brain-body',
    },
    modalities: [
      {
        title: 'Medical detox coordination',
        body: 'Pre-admission or on-site medical detox with 24/7 clinical oversight through the acute window. MAT (naltrexone, acamprosate) when clinically indicated.',
        iconId: 'heart',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced after the body is stable so processing supports regulation rather than unsettling it.',
        iconId: 'spiral',
      },
      {
        title: '12-step & SMART-friendly groups',
        body: 'Access to both tracks so clients can find a recovery community that actually fits their temperament and beliefs, not one forced on them.',
        iconId: 'hands',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses mirror nervous-system states with zero judgment. Clients who have been drinking to down-regulate learn what natural down-regulation feels like.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Parasympathetic-activating practices that give the nervous system back the tool alcohol was doing the job of, at a fraction of the cost.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for depression, anxiety, PTSD, and sleep disorders — the conditions most commonly found riding alongside alcohol use.',
        iconId: 'duo',
      },
    ],
  },

  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        Sleep returns first. <em className="not-italic text-primary">Then everything else.</em>
      </>
    ),
    paragraphs: [
      'Most alumni describe the turning point as the first week they sleep all the way through — usually somewhere between weeks three and five. The nervous system finally gets a night of clean REM. Mood stabilizes behind it, then appetite, then desire for anything other than the bottle.',
      'Sleep, movement, connection, and meaning are the four pillars that carry the curve back up. None of them replace the drink. They rebuild the nervous-system function the drink was standing in for.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'Restores REM' },
      { x: 0.4, label: 'Movement', hint: 'Endogenous regulation' },
      { x: 0.65, label: 'Connection', hint: 'Oxytocin, belonging' },
      { x: 0.9, label: 'Meaning', hint: 'Purpose, identity' },
    ],
  },

  voices: {
    eyebrow: 'Alumni Voices',
    title: (
      <>
        Three alumni, three{' '}
        <em className="not-italic text-primary">first mornings without a hangover.</em>
      </>
    ),
    voices: [
      {
        quote:
          'I slept through a whole night for the first time in a decade on day twenty-two. I cried at breakfast. Nobody at the ranch was surprised — they told me it always comes back.',
        attribution: 'Alumna · 2 years sober · high-functioning pattern',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          'The equine work broke something open. A horse that had refused me all week walked up and put her head on my chest. I had not realized how braced my body had been for years.',
        attribution: 'Alumnus · 18 months sober · alcohol + cannabis',
        photo: '/images/facility-exterior-mountains.jpg',
      },
      {
        quote:
          'This was my fourth treatment center. The difference here was the sequencing — they did not push me into trauma work until my nervous system could actually hold it. That was the missing piece.',
        attribution: 'Alumnus · 14 months sober · prior multiple relapses',
        photo: '/images/group-sunset-desert.jpg',
      },
    ],
  },

  cta: {
    eyebrow: 'Ready to put it down',
    title: (
      <>
        Alcohol changes the brain. <em className="not-italic text-accent">The brain changes back.</em>
      </>
    ),
    body: "Our admissions team can verify your insurance, coordinate medical detox if you need it, and hold a bed within 24 to 48 hours. One confidential call gets the whole machine moving.",
  },
};
