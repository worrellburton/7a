import type { SubstanceContent } from './types';

export const methContent: SubstanceContent = {
  hero: {
    label: 'Methamphetamine Addiction Treatment',
    title: 'Meth runs the nervous system into the ground. We help it stand back up.',
    description:
      'At Seven Arrows Recovery, methamphetamine use disorder is treated as a dopamine-system injury and a trauma response at once. Our residential program in Arizona sequences medical stabilization, trauma-informed therapy, and long-arc nervous-system work so the brain has time and support to recover from a drug that is uniquely punishing to it.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Methamphetamine' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Meth releases the entire stash of dopamine —{' '}
        <em className="not-italic text-primary">and damages the warehouse doing it.</em>
      </>
    ),
    paragraphs: [
      'Methamphetamine forces dopamine, norepinephrine, and serotonin to flood out of storage vesicles into the synapse, and then blocks reuptake. The result is a sustained neurochemical tidal wave unlike anything the brain encounters naturally.',
      "Unlike cocaine, meth's effects last hours, not minutes — and meth is directly neurotoxic at the cellular level. Prolonged use damages dopamine neurons themselves. This is why meth withdrawal and recovery look longer and flatter than almost every other stimulant.",
      'Recovery is possible, and the dopamine system does rebuild — but the timeline is measured in months, not weeks. Structure, sleep, nutrition, and patience are as clinical as any medication.',
    ],
    chart: {
      natural: { label: 'natural reward', color: '#2f6f5e' },
      spike: { label: 'meth wave', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Days, not hours.</em>
      </>
    ),
    paragraphs: [
      'Meth binges stretch over days — use extends wakefulness, wakefulness extends use, the crash is multi-day, and cravings rebuild as the body re-enters the world. The cycle runs longer and punishes harder than shorter-acting stimulants.',
      'Residential care interrupts the loop structurally: sleep is restored first, appetite second, and the emotional floor is held while dopamine begins the long, slow process of regenerating.',
    ],
    stages: [
      { label: 'Binge', hint: 'Hours to multiple days' },
      { label: 'Tweak', hint: 'Anxiety, paranoia' },
      { label: 'Crash', hint: '1–3 days of sleep' },
      { label: 'Crave', hint: 'Anhedonia drives the next' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Meth is <em className="not-italic text-accent">uniquely hard on tissue</em>.
      </>
    ),
    body: 'Meth accelerates cardiovascular wear, damages dopamine neurons, wrecks dental health ("meth mouth"), and produces persistent psychiatric symptoms that can outlast the drug by months. The stakes are higher than public perception usually allows.',
    stats: [
      {
        value: 50,
        suffix: 'K+',
        label: 'US deaths per year',
        body: 'Psychostimulant-involved overdose deaths (primarily meth) now exceed 50,000 annually — the fastest-growing drug mortality category in the country.',
      },
      {
        value: 40,
        suffix: '%',
        label: 'Psychosis risk',
        body: 'Roughly 40% of people who use meth heavily experience psychotic symptoms at some point — and about 10–15% develop a persistent psychotic disorder.',
      },
      {
        value: 9,
        suffix: ' mo',
        label: 'Dopamine recovery time',
        body: 'Imaging studies suggest dopamine transporter density partially recovers within nine months of abstinence, and continues over years.',
      },
    ],
    footnote: 'Figures are directional, drawn from CDC and peer-reviewed neuroimaging literature.',
  },
  withdrawal: {
    eyebrow: 'The First Ninety Days',
    title: (
      <>
        Meth withdrawal is <em className="not-italic text-primary">longer and flatter</em> than
        almost any other stimulant.
      </>
    ),
    body: 'Meth withdrawal is rarely medically dangerous, but the psychological arc is long. The real work is holding the floor during weeks of anhedonia while the brain rebuilds. Residential structure, sleep, nutrition, and trauma-informed therapy carry this phase.',
    phases: [
      {
        label: 'Crash',
        days: 'Days 1–5',
        body: 'Profound exhaustion, hypersomnia, hunger, dysphoria. The body is clawing back the sleep and nourishment deferred during the binge. Medical oversight matters.',
      },
      {
        label: 'Acute withdrawal',
        days: 'Weeks 1–2',
        body: 'Intense anhedonia, flat mood, cravings, cognitive fog. Dropout risk peaks without structure. Residential care buys the window.',
      },
      {
        label: 'PAWS',
        days: 'Weeks 3–12',
        body: 'Post-acute symptoms: intermittent cravings, mood lability, cognitive fog. Trauma work becomes accessible as the noise quiets.',
      },
      {
        label: 'Re-regulation',
        days: 'Months 4–12+',
        body: 'Dopamine function measurably improves. Natural rewards slowly return. Aftercare and long-term community carry the curve forward.',
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">and the stereotype misses most of them</em>.
      </>
    ),
    body: 'Meth use crosses every income, age, and job category we work with. Pretending otherwise keeps people out of care.',
    personas: [
      {
        label: 'The weight-and-energy user',
        headline: 'It started as performance.',
        body: 'Began using to work longer, lose weight, or keep up. The utility was real. The cost was not obvious until years in.',
      },
      {
        label: 'The ADHD self-medicator',
        headline: 'Something that finally felt like focus.',
        body: 'Undiagnosed ADHD or untreated attentional issues. Meth initially produced what felt like executive function. Dual-diagnosis care is central to recovery.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Meth up, opioids or alcohol down.',
        body: 'Rarely just meth. Overdose and cardiovascular risk multiplies with opioid or alcohol pairings. We treat the whole pattern.',
      },
      {
        label: 'The trauma survivor',
        headline: 'A drug that outran the inside.',
        body: 'Meth kept the nervous system busy enough to outrun trauma. When the drug stops, the trauma arrives. Forward-Facing Freedom® is built for exactly this landing.',
      },
      {
        label: 'The relapse',
        headline: 'Not your first stay.',
        body: 'Meth relapse rates are high partly because the neurochemistry takes so long to rebuild. We do not count that against you. We extend the runway.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Sleep first. <em className="not-italic text-primary">Mood next.</em> The rebuild follows.
      </>
    ),
    body: 'Meth recovery has its own sequencing. Push too hard on psychotherapy before the brain has had weeks of sleep and nutrition and progress feels impossible. Wait too long and the window closes. We hold both rails.',
    flagship: {
      title: 'Dopamine-first residential treatment',
      body: 'Sleep restoration, nutritional rehabilitation, and anhedonia-informed psychotherapy as a coordinated package. The biology is the first patient; the psychology is the second; both get full attention.',
      iconId: 'brain-body',
    },
    modalities: [
      {
        title: 'Cardiac & psychiatric stabilization',
        body: 'Baseline cardiovascular assessment, psychiatric review for persistent symptoms (paranoia, psychosis), and 24/7 medical oversight through the early window.',
        iconId: 'heart',
      },
      {
        title: 'Contingency management',
        body: 'Evidence-based positive-reinforcement scaffolding for the anhedonia window. Small structured wins are tracked and rewarded while intrinsic motivation rebuilds.',
        iconId: 'trophy',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced after sleep and mood have stabilized enough to hold the work.',
        iconId: 'spiral',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses mirror nervous-system overactivation without judgment. Clients coming off long periods of stimulation learn what down-regulation actually feels like.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Parasympathetic practice to restore the tools meth was overriding. These are not extras — they are medicine for the nervous system meth spent years overheating.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for ADHD, anxiety, depression, PTSD, and meth-induced psychiatric symptoms. One team, one plan.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        The dopamine warehouse <em className="not-italic text-primary">restocks</em>, slowly.
      </>
    ),
    paragraphs: [
      'Most meth alumni describe the turning point as week six or seven — the flatness starts to break. Food tastes like food again. Music moves you. Cold water on your face registers as cold water. The dopamine transporters are coming back online, measurably.',
      'Sleep, movement, connection, and meaning are the four pillars. They are the literal activities that rebuild natural reward after a drug that taught the brain to expect tidal waves.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'Restores function' },
      { x: 0.4, label: 'Movement', hint: 'Natural dopamine' },
      { x: 0.65, label: 'Connection', hint: 'Oxytocin, safety' },
      { x: 0.9, label: 'Meaning', hint: 'Purpose, identity' },
    ],
  },
  voices: {
    eyebrow: 'Alumni Voices',
    title: (
      <>
        Three alumni, three{' '}
        <em className="not-italic text-primary">first moments the world came back</em>.
      </>
    ),
    voices: [
      {
        quote:
          "I slept for four days straight when I arrived. I did not know a body was allowed to do that. By day ten, I was crying at sunsets because my nervous system was finally getting anything at all.",
        attribution: 'Alumna · 18 months sober · long-arc daily use',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          'Week seven was when music started to sound like music again. Before that, everything had been flat. I did not realize how much I had lost until it came back.',
        attribution: 'Alumnus · 22 months sober · polysubstance incl. meth',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          "The horses broke me. One of them laid down in the dirt next to me on a bad afternoon. That was the first afternoon I believed I was not going back.",
        attribution: 'Alumnus · 2 years sober · meth + alcohol',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to come down',
    title: (
      <>
        The nervous system <em className="not-italic text-accent">can still come back.</em>
      </>
    ),
    body: 'Our admissions team can verify your insurance and begin intake within 24 to 48 hours. Meth recovery is a longer arc than most — which is exactly why starting now matters.',
  },
};
