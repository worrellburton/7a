import type { SubstanceContent } from './types';

export const heroinContent: SubstanceContent = {
  hero: {
    label: 'Heroin Addiction Treatment',
    title: 'Heroin is the strongest argument against ever believing willpower is enough.',
    description:
      'At Seven Arrows Recovery, heroin use disorder is treated with the seriousness it deserves: medical detox coordination, medication-assisted treatment, trauma-informed therapy, and a residential structure that holds your nervous system while it learns how to function without the drug.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Heroin Addiction' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Heroin converts to morphine at the receptor —{' '}
        <em className="not-italic text-primary">fast, complete, and hard to un-teach.</em>
      </>
    ),
    paragraphs: [
      "Heroin is diacetylmorphine — chemically designed to cross the blood-brain barrier faster than morphine. It reaches mu-receptors within seconds, producing the warm, full-body quieting that users describe as finally feeling safe.",
      'That speed is the trap. The brain learns, at a cellular level, that this exact chemistry is the fastest route to relief from pain, grief, anxiety, and the nervous-system dysregulation that often drove use in the first place. Endogenous opioid production collapses under the weight of the flood.',
      'Recovery rewires the learning. With MAT scaffolding, trauma-informed therapy, and a nervous system that finally gets to stabilize, the body begins manufacturing its own relief again.',
    ],
    chart: {
      natural: { label: 'endogenous opioids', color: '#2f6f5e' },
      spike: { label: 'heroin hit', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Running on a four-hour clock.</em>
      </>
    ),
    paragraphs: [
      "Heroin has an aggressive half-life. Most daily users are in withdrawal within four to six hours of their last dose, which is why the loop is so punishing: the drug that provided relief is also the thing causing the suffering that relief is for.",
      'Residential care is often the first time in years the body gets to stay out of withdrawal for a sustained window. That alone begins the work.',
    ],
    stages: [
      { label: 'Use', hint: 'Warmth, safety, quiet' },
      { label: 'Peak', hint: 'Minutes — then drift' },
      { label: 'Early withdrawal', hint: 'Within 4–6 hours' },
      { label: 'Crave', hint: 'Only the drug answers it' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Heroin overdose risk is <em className="not-italic text-accent">higher than it has ever been</em>.
      </>
    ),
    body: 'Fentanyl contamination has changed the heroin landscape in a way that cannot be overstated. The drug you buy today is almost never only heroin — and the dose that felt survivable yesterday can be fatal today. Respiratory depression, not the drug itself, is what kills people.',
    stats: [
      {
        value: 80,
        suffix: 'K+',
        label: 'Opioid overdose deaths/year',
        body: 'Opioid-involved overdose kills more than 80,000 Americans annually — a majority now driven by fentanyl cut into heroin and other drugs.',
      },
      {
        value: 50,
        suffix: '×',
        label: 'Fentanyl vs. heroin potency',
        body: 'Fentanyl is roughly 50 times more potent than heroin by weight. A fraction of a milligram off on a cut can be fatal.',
      },
      {
        value: 3,
        suffix: '×',
        label: 'Overdose risk post-detox',
        body: 'Overdose risk climbs sharply right after detox because tolerance drops faster than risk awareness. Naloxone access and aftercare matter.',
      },
    ],
    footnote:
      'Figures are directional, drawn from CDC and DEA data. Individual risk varies by supply, route, and poly-substance factors.',
  },
  withdrawal: {
    eyebrow: 'The First Thirty Days',
    title: (
      <>
        Heroin withdrawal is <em className="not-italic text-primary">survivable</em> — and almost
        nobody survives it alone more than a few times.
      </>
    ),
    body: 'Medically, opioid withdrawal is rarely fatal on its own. Psychologically and physically, it is one of the most painful detoxes in medicine — which is exactly why unsupported attempts to quit usually end in relapse within days. We coordinate medical detox and MAT induction carefully.',
    phases: [
      {
        label: 'Acute withdrawal',
        days: 'Hours 6–72',
        body: 'Bone pain, muscle aches, GI distress, chills, insomnia, restlessness. The days people describe as the worst of their lives. MAT changes what this window feels like.',
      },
      {
        label: 'Sub-acute',
        days: 'Days 4–14',
        body: 'Physical symptoms ease; depression and anhedonia rise. Most post-detox relapses happen in this window. Residential structure and MAT hold the line.',
      },
      {
        label: 'PAWS',
        days: 'Weeks 2–12',
        body: 'Protracted mood flatness, cue-triggered cravings, insomnia. Trauma work and somatic practice come online as the acute noise quiets.',
      },
      {
        label: 'Re-regulation',
        days: 'Months 3–12+',
        body: 'Endogenous opioid system slowly rebuilds. Natural rewards return. Aftercare and community keep the curve moving up.',
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">and one shared question underneath.</em>
      </>
    ),
    body: "The common question underneath almost every heroin admission is: what was I trying to quiet? The answer is usually in the body before it is in the story.",
    personas: [
      {
        label: 'The pill-to-heroin pipeline',
        headline: 'The prescription ran out. The street was cheaper.',
        body: 'Prescribed opioids after an injury or surgery. When the pills stopped, heroin was cheaper and easier to find. Millions of Americans share this exact story.',
      },
      {
        label: 'The trauma self-medicator',
        headline: 'The drug that finally worked.',
        body: 'After years of failed coping — alcohol, stimulants, avoidance — heroin was the thing that finally quieted the body. That is a nervous-system signal, not a moral failure.',
      },
      {
        label: 'The high-risk daily user',
        headline: 'Running an hourly math problem.',
        body: 'Daily or multi-daily use. Tolerance is high. Overdose risk in the fentanyl era is real even at the "normal" dose. We handle admission carefully and MAT-forward.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Heroin plus anything sedating.',
        body: 'Benzodiazepines or alcohol on the same day multiplies overdose risk. We treat the full pattern and move carefully through detox.',
      },
      {
        label: 'The relapse',
        headline: 'Not your first stay.',
        body: 'Opioid use disorder has one of the highest recurrence rates in medicine. That is a biological fact, not a character one. We build MAT and naloxone access in from day one.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Medication is scaffolding. <em className="not-italic text-primary">Therapy is the rebuild.</em>{' '}
        Community is the roof.
      </>
    ),
    body: 'Medication-assisted treatment is evidence-based, life-saving, and fully supported here. It is not a lesser form of sobriety — it is the difference between relapse-and-overdose and sustained recovery for most people with opioid use disorder.',
    flagship: {
      title: 'MAT-first, therapy-anchored opioid treatment',
      body: 'Buprenorphine, methadone, or naltrexone protocols held by an addiction-medicine physician, paired tightly with trauma-informed psychotherapy. Medication stabilizes the biology; therapy changes the life it holds.',
      iconId: 'shield',
    },
    modalities: [
      {
        title: 'Medical detox coordination',
        body: 'Pre-admission or on-site medical detox with 24/7 clinical oversight. Comfort medications, careful MAT induction, and nursing staff throughout the hardest window.',
        iconId: 'heart',
      },
      {
        title: 'Naloxone-ready aftercare',
        body: 'Every discharging client leaves with naloxone, a family member trained to use it, and a harm-reduction plan aligned with their goals. Every time.',
        iconId: 'shield',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced after the body is stable and MAT is holding so processing supports regulation.',
        iconId: 'spiral',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses mirror nervous-system states. Clients learn what safe, drug-free down-regulation physically feels like — often for the first time in years.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Parasympathetic-activating practices that give the nervous system back the tools heroin was doing the job of.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for depression, PTSD, anxiety, and chronic pain — the conditions most often underneath the use.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        Your body remembers how to <em className="not-italic text-primary">comfort itself</em>.
      </>
    ),
    paragraphs: [
      'Most alumni describe the shift as happening sometime between weeks four and ten — a walk becomes pleasant, a meal tastes like a meal, a hug from family actually registers in the body. The endogenous opioid system is relearning.',
      'Sleep, movement, connection, and meaning are the four pillars that carry the curve back up. Each is literally how the brain makes its own version of what heroin was providing.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'Pain tolerance returns' },
      { x: 0.4, label: 'Movement', hint: 'Endogenous opioids' },
      { x: 0.65, label: 'Connection', hint: 'Oxytocin, belonging' },
      { x: 0.9, label: 'Meaning', hint: 'Purpose, identity' },
    ],
  },
  voices: {
    eyebrow: 'Alumni Voices',
    title: (
      <>
        Three alumni, three{' '}
        <em className="not-italic text-primary">first moments the body answered back</em>.
      </>
    ),
    voices: [
      {
        quote:
          "Sub got me out of the hourly math problem. The trauma work got me out of the reason for the math problem. Those are two different pieces of medicine.",
        attribution: 'Alumnus · 2 years sober · fentanyl era',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          "I did not know my body could relax on its own. Week six, walking the perimeter of the ranch at sunset, I realized my shoulders were not up by my ears. That was new.",
        attribution: 'Alumna · 16 months sober · pill-to-heroin',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          "They sent me home with naloxone like it was a toothbrush. No drama. That matter-of-fact approach is what made the plan feel survivable.",
        attribution: 'Alumnus · 14 months sober · prior three treatment stays',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to come down',
    title: (
      <>
        The body remembers comfort. <em className="not-italic text-accent">Yours can too.</em>
      </>
    ),
    body: 'Our admissions team can verify your insurance, coordinate medical detox, and begin MAT planning within 24 to 48 hours. One confidential call gets the cardiologist, the psychiatrist, and the trauma clinician on the same page.',
  },
};
