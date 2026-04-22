import type { SubstanceContent } from './types';

export const inhalantsContent: SubstanceContent = {
  hero: {
    label: 'Inhalant Addiction Treatment',
    title: 'Inhalants are cheap, legal, and the most neurologically dangerous drug most users never hear about.',
    description:
      'At Seven Arrows Recovery, inhalant use disorder is treated with the medical seriousness its neurotoxicity demands. Our residential program in Arizona coordinates urgent medical assessment, cognitive rehabilitation, trauma-informed therapy, and long-arc recovery work for a class of substances that causes damage faster than almost any other.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Inhalants' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Inhalants hit fast and hit hard —{' '}
        <em className="not-italic text-primary">and every use is neurologically expensive.</em>
      </>
    ),
    paragraphs: [
      'Solvents, aerosols, nitrous oxide, and volatile nitrites act on GABA, NMDA, and dopamine systems all at once, producing a rapid brief high that peaks within seconds to minutes. The speed of onset is part of what makes them dangerous — and what makes the pattern hard to interrupt without support.',
      'Unlike almost every other recreational drug, inhalants are directly neurotoxic at any dose. Chronic use produces measurable loss of white matter, cognitive impairment, and peripheral nerve damage. "Sudden sniffing death" from cardiac arrhythmia can happen on a first or thousandth use.',
      'Recovery means stopping immediately and giving the brain and body the best conditions to repair what can be repaired. Time, structure, and neurological support do the heavy lifting.',
    ],
    chart: {
      natural: { label: 'cognitive baseline', color: '#2f6f5e' },
      spike: { label: 'inhalant hit', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Measured in minutes.</em>
      </>
    ),
    paragraphs: [
      'The inhalant cycle is uniquely fast: use, seconds-to-minutes peak, rapid comedown, the pull to redose. Users often cycle dozens of times in a single sitting, amplifying neurotoxicity with every pass.',
      'Residential care breaks the cycle by physical separation — from the substance, from the tools of use, and from the environments that enable rapid redosing. The nervous system gets a real chance to begin repair.',
    ],
    stages: [
      { label: 'Inhale', hint: 'Seconds to peak' },
      { label: 'Peak', hint: '1–3 minutes' },
      { label: 'Comedown', hint: 'Headache, fog' },
      { label: 'Redose', hint: 'Compression stacks harm' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Inhalants are <em className="not-italic text-accent">the most neurotoxic class of recreational drugs</em>.
      </>
    ),
    body: 'The combination of rapid action, easy access, and per-use brain injury makes inhalants uniquely dangerous. Most users underestimate the risk because the drugs are legal and cheap. The medical reality is different.',
    stats: [
      {
        value: 55,
        suffix: '%',
        label: 'Show white-matter change',
        body: 'Imaging studies of long-term toluene users show measurable white-matter abnormalities in more than half of chronic cases.',
      },
      {
        value: 1,
        suffix: '×',
        label: 'First-use fatality risk',
        body: 'Sudden sniffing death from cardiac arrhythmia can occur on a single use, at any usage history. No "safe" dose exists.',
      },
      {
        value: 6,
        suffix: ' mo',
        label: 'Early cognitive recovery',
        body: 'Measurable cognitive recovery begins within three to six months of abstinence. Earlier intervention protects more of what is still salvageable.',
      },
    ],
    footnote:
      'Figures are directional, drawn from NIDA and peer-reviewed neuroimaging literature on inhalant use.',
  },
  withdrawal: {
    eyebrow: 'The First Ninety Days',
    title: (
      <>
        Inhalant withdrawal is <em className="not-italic text-primary">mild physically</em> — and the real work is neurological recovery.
      </>
    ),
    body: 'Physical withdrawal is rarely dramatic. What takes time is the brain and body repair — cognitive function, peripheral nerve health, and psychiatric stability all need months of abstinence and structured support to come back.',
    phases: [
      {
        label: 'Acute withdrawal',
        days: 'Days 1–7',
        body: 'Irritability, disturbed sleep, headaches, mild GI symptoms, cravings. Medical oversight to assess cardiovascular and neurological baseline.',
      },
      {
        label: 'Early repair',
        days: 'Weeks 2–6',
        body: 'Cognitive fog begins to lift. Mood lability, intermittent cravings. Neuropsych assessment often run in this window to establish a recovery baseline.',
      },
      {
        label: 'Re-integration',
        days: 'Months 2–4',
        body: 'Measurable cognitive recovery. Peripheral nerve symptoms improve. Trauma work and relational rebuild come fully online.',
      },
      {
        label: 'Re-regulation',
        days: 'Months 4–12+',
        body: 'Sustained neurological improvement. Baseline mood and cognition continue to rebuild. Aftercare and community hold the long arc.',
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">often younger, often hidden</em>.
      </>
    ),
    body: 'Inhalant use skews younger than other substances and is often hidden or misidentified as something else. Early intervention matters enormously because the neurotoxicity compounds.',
    personas: [
      {
        label: 'The young-adult hidden user',
        headline: 'An adolescent pattern that never stopped.',
        body: 'Started in adolescence because inhalants were accessible and no one knew. The pattern never ended. We see the neurological cost and work forward from where the client actually is.',
      },
      {
        label: 'The poppers / nitrite user',
        headline: 'Specific-context use that climbed.',
        body: 'Use in particular social or sexual contexts that became more frequent over time. Cardiovascular and methemoglobinemia risk deserves direct medical attention.',
      },
      {
        label: 'The nitrous / whippets user',
        headline: 'Legal, cheap, easy to redose.',
        body: 'Nitrous oxide dependence has risen sharply. B12 deficiency and peripheral neuropathy are common, under-diagnosed consequences. We screen and treat.',
      },
      {
        label: 'The trauma self-medicator',
        headline: 'A drug that made the mind go elsewhere.',
        body: 'Acute or complex trauma underneath. Inhalants provided rapid dissociation. Forward-Facing Freedom® treats the underlying need directly.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Inhalants alongside alcohol or cannabis.',
        body: 'Often not the primary drug in a use pattern, but always the one with the most per-use neurological cost. We treat the whole picture.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Protect the brain. <em className="not-italic text-primary">Support the repair.</em> Treat what was underneath.
      </>
    ),
    body: 'Inhalant recovery starts with immediate cessation, thorough medical and cognitive assessment, and a long-arc plan that supports the brain and body while they do the slow work of rebuilding.',
    flagship: {
      title: 'Neurologically-informed residential treatment',
      body: 'Baseline neuropsych assessment, B12 and nutritional rehabilitation, cognitive support work, and trauma-informed therapy sequenced so the brain has the best possible conditions to repair what can be repaired.',
      iconId: 'brain-body',
    },
    modalities: [
      {
        title: 'Medical and neurological assessment',
        body: 'Cardiovascular review, B12 and hematology screening, peripheral nerve assessment, neuroimaging referral when indicated. The medical piece is not optional here.',
        iconId: 'heart',
      },
      {
        title: 'Cognitive rehabilitation',
        body: 'Structured attention, memory, and executive-function work. Paired with lifestyle protocols (sleep, nutrition, movement) that measurably support brain recovery.',
        iconId: 'brain-body',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced after the early medical and cognitive picture is stable.',
        iconId: 'spiral',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses mirror nervous-system states. Grounding and presence work with a non-judgmental partner helps clients rebuild embodied safety.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Parasympathetic practice and embodiment work that give the nervous system back its own regulatory tools.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for depression, PTSD, anxiety, and cognitive-effect-related mood disorders. One team, one plan, one longer runway.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        The brain <em className="not-italic text-primary">repairs more than most people realize</em>. It just needs time.
      </>
    ),
    paragraphs: [
      'Most alumni describe a measurable shift somewhere between months two and four — attention sharpens, memory consolidates, mood steadies, the fog clears. Neurological repair is real and visible over months of abstinence.',
      'Sleep, movement, connection, and meaning — the four pillars — are the literal activities that support brain repair. None of this is a metaphor.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'White-matter repair' },
      { x: 0.4, label: 'Movement', hint: 'Natural regulation' },
      { x: 0.65, label: 'Connection', hint: 'Co-regulation' },
      { x: 0.9, label: 'Meaning', hint: 'Purpose, identity' },
    ],
  },
  voices: {
    eyebrow: 'Alumni Voices',
    title: (
      <>
        Three alumni, three{' '}
        <em className="not-italic text-primary">first moments the fog started to lift</em>.
      </>
    ),
    voices: [
      {
        quote:
          'Month three, I read a book again. A whole book. I had not been able to hold a paragraph in my head for five years. That was when I believed the damage was not permanent.',
        attribution: 'Alumnus · 18 months sober · long-arc toluene use',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          'The B12 injections and the neuropsych team did as much work as any therapy. The medical side of this is not optional, and this was the first place that acted like it knew that.',
        attribution: 'Alumna · 2 years sober · nitrous dependence',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          'Treatment met me where I was. I had cognitive damage. That was named, supported, and then worked around. I have never felt less ashamed of anything than I did here.',
        attribution: 'Alumna · 14 months sober · adolescent-onset pattern',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Every hour matters',
    title: (
      <>
        The brain repairs. <em className="not-italic text-accent">Start giving it the conditions.</em>
      </>
    ),
    body: 'Our admissions team can verify your insurance, coordinate neurological and cognitive assessment, and begin intake within 24 to 48 hours. Inhalant use is one of the few addictions where "start today" is a medical statement, not a marketing one.',
  },
};
