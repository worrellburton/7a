import type { SubstanceContent } from './types';

export const benzoContent: SubstanceContent = {
  hero: {
    label: 'Benzodiazepine Addiction Treatment',
    title: 'Benzos silence the alarm. Healing teaches the alarm it can stop ringing.',
    description:
      'At Seven Arrows Recovery, benzodiazepine use disorder is treated with the medical seriousness it requires. Benzo withdrawal is one of the only substance withdrawals that can kill you — so we sequence medical tapering, nervous-system regulation, and trauma-informed therapy carefully, in the right order.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Benzodiazepines' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Benzos push GABA harder —{' '}
        <em className="not-italic text-primary">and the brain pushes back.</em>
      </>
    ),
    paragraphs: [
      "Benzodiazepines bind to GABA-A receptors and amplify the brain's built-in calming system. For anyone in the grip of panic, the relief is fast and real. That is exactly why they work — and why the body adapts.",
      'Chronic use down-regulates GABA receptors and up-regulates excitatory glutamate to compensate. Tolerance climbs. The original panic breaks through. The nervous system is now more activated, not less — and the drug is the only thing that quiets it.',
      'Recovery is patience. The GABA system reassembles, but slowly. Tapering must be medically supervised. Rushed detox can trigger seizures, psychosis, or protracted withdrawal that lasts months.',
    ],
    chart: {
      natural: { label: 'baseline calm', color: '#2f6f5e' },
      spike: { label: 'benzo dose', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Each one needs a higher dose.</em>
      </>
    ),
    paragraphs: [
      'Benzo dependence tends to settle into an invisible rhythm: the dose that used to work stops working, panic breaks through, another dose is added or increased, the cycle repeats. Most people do not notice they are in it until they try to stop.',
      "Residential care in the benzo case is almost always paired with a carefully-paced medical taper rather than abrupt cessation. Safety first, always.",
    ],
    stages: [
      { label: 'Dose', hint: 'Relief, calm, sleep' },
      { label: 'Plateau', hint: '2–4 hours, then fade' },
      { label: 'Breakthrough', hint: 'Symptoms return stronger' },
      { label: 'Next dose', hint: 'The ladder climbs' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Benzo withdrawal is <em className="not-italic text-accent">medically dangerous</em>.
      </>
    ),
    body: 'Alongside alcohol, benzos are one of the only substances whose withdrawal can be fatal. Seizures, delirium, psychosis, and protracted post-acute withdrawal are real risks without medical oversight. Respect for those risks is the baseline of good care.',
    stats: [
      {
        value: 30,
        suffix: '%',
        label: 'Develop dependence',
        body: 'Roughly 30% of long-term benzodiazepine users develop clinically significant dependence, often without ever misusing the prescription.',
      },
      {
        value: 10,
        suffix: '×',
        label: 'Overdose risk w/ opioids',
        body: 'Taking benzos alongside opioids multiplies overdose risk by an order of magnitude. Mixing is a primary driver of fatal overdose.',
      },
      {
        value: 18,
        suffix: ' mo',
        label: 'PAWS duration',
        body: 'Protracted withdrawal symptoms (PAWS) can persist up to 18 months. Patience and extended aftercare are non-negotiable.',
      },
    ],
    footnote:
      'Figures are directional, drawn from FDA, CDC, and peer-reviewed literature on benzodiazepine dependence.',
  },
  withdrawal: {
    eyebrow: 'The Taper',
    title: (
      <>
        Benzo withdrawal cannot be rushed — and <em className="not-italic text-primary">must not be attempted alone</em>.
      </>
    ),
    body: 'The safest path is almost always a slow, medically-supervised taper (often using a longer-half-life benzo like clonazepam or diazepam as a stepping stone) combined with residential structure and nervous-system work. We coordinate the taper with an addiction medicine physician.',
    phases: [
      {
        label: 'Stabilize',
        days: 'Week 1',
        body: 'Switch (when indicated) to a long-half-life benzo. Establish baseline. Medical oversight 24/7. No reductions in the first week — the goal is stability.',
      },
      {
        label: 'Gradual taper',
        days: 'Weeks 2–12',
        body: 'Small, slow reductions — often 5–10% at a time, held for days or weeks before the next cut. Somatic practice carries the nervous system between cuts.',
      },
      {
        label: 'Post-taper',
        days: 'Weeks 12–24',
        body: 'Body clears the last of the medication. Sleep and anxiety often get worse before they get better. Trauma work supports the landing.',
      },
      {
        label: 'PAWS',
        days: 'Months 6–18',
        body: 'Intermittent rebound anxiety, sleep disturbance, mood flatness. Normal, resolving. Aftercare and community carry the curve.',
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">almost all of them started with a prescription</em>.
      </>
    ),
    body: 'Benzo dependence is almost always iatrogenic — it started with a legitimate prescription for a legitimate reason. That is not a moral failure. It is a pharmacological fact.',
    personas: [
      {
        label: 'The prescribed long-term user',
        headline: 'The script never had an off-ramp.',
        body: 'Started with a real reason (panic, insomnia, seizures). No physician ever laid out a tapering plan. The years stacked. The dependence followed.',
      },
      {
        label: 'The panic self-medicator',
        headline: 'The only thing that made panic manageable.',
        body: 'Panic disorder or complex trauma underneath. Benzos worked — until they stopped working. Dual-diagnosis care is central to the recovery plan.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Benzos plus opioids, alcohol, or stimulants.',
        body: 'Overdose risk multiplies dramatically with any other depressant. We treat the full pattern and taper carefully.',
      },
      {
        label: 'The high-functioning user',
        headline: 'Still running the career.',
        body: 'Work, parenting, obligations — all met. The dose creeps quietly. You notice the dependence only when you try to stop for a day.',
      },
      {
        label: 'The relapse',
        headline: 'Not your first taper.',
        body: 'Benzo relapse is common precisely because under-tapering triggers rebound. We extend the runway and protect the taper.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Taper slow. <em className="not-italic text-primary">Regulate the nervous system.</em>{' '}
        Rebuild without the drug.
      </>
    ),
    body: 'The core question of benzo recovery is whether the nervous system can learn to calm itself again. The answer is yes, but the timeline is long and the taper must be held carefully. We build both.',
    flagship: {
      title: 'Medically-supervised long-arc taper, coupled with somatic therapy',
      body: 'An addiction-medicine physician holds the taper. A somatic-CBT team holds the psychotherapy. Each cut is supported by breathwork, yoga, sleep protocols, and clinical check-ins. The body does not have to do this alone.',
      iconId: 'shield',
    },
    modalities: [
      {
        title: '24/7 medical oversight',
        body: 'Seizure-precaution protocols, cardiovascular monitoring, and bridge medications (gabapentin, clonidine, hydroxyzine) when indicated to make the taper tolerable.',
        iconId: 'heart',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced carefully so processing does not destabilize the taper. Often begins mid-taper or post-taper.',
        iconId: 'spiral',
      },
      {
        title: 'Panic-and-sleep reconditioning',
        body: 'Structured CBT for panic disorder, sleep-hygiene rebuilding, and graded exposure work — so the symptoms benzos were masking have their own direct treatment.',
        iconId: 'compass',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses mirror nervous-system activation. Clients tapering benzos learn what safe down-regulation physically feels like without a pill.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Parasympathetic-activating practices that train the nervous system to calm itself. These carry more weight here than in almost any other substance protocol.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for panic disorder, PTSD, insomnia, and the conditions most often present underneath long-term benzo use.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        The GABA system <em className="not-italic text-primary">regenerates</em>. The timeline is long. It works.
      </>
    ),
    paragraphs: [
      'Alumni describe the shift in months rather than weeks. Somewhere between month four and month nine, the body stops reacting to every small stressor like a five-alarm fire. Sleep quietly normalizes. Panic episodes shrink from hours to minutes.',
      "Sleep, movement, connection, and meaning are the four pillars that carry the curve. None replace the drug. They rebuild the nervous-system skills the drug was performing in its place.",
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'Rebuilds architecture' },
      { x: 0.4, label: 'Movement', hint: 'Vagal tone' },
      { x: 0.65, label: 'Connection', hint: 'Co-regulation' },
      { x: 0.9, label: 'Meaning', hint: 'Purpose, identity' },
    ],
  },
  voices: {
    eyebrow: 'Alumni Voices',
    title: (
      <>
        Three alumni, three{' '}
        <em className="not-italic text-primary">first full nights of sleep after the taper</em>.
      </>
    ),
    voices: [
      {
        quote:
          "Twelve years on clonazepam. Tapering took ten months. Month seven I slept through a whole night for the first time in a decade. I cried in the morning. The body remembered.",
        attribution: 'Alumna · 2 years benzo-free · iatrogenic origin',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          "The breathwork carried me between cuts. I did not believe it would. It did. The body had more tools than I had ever given it credit for.",
        attribution: 'Alumnus · 14 months benzo-free · panic disorder origin',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          "Nobody rushed the taper. That alone was new. Every other place I had been had a schedule. Seven Arrows had a body and a person and a plan built around both.",
        attribution: 'Alumna · 18 months benzo-free · prior four attempts',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to taper',
    title: (
      <>
        The nervous system <em className="not-italic text-accent">can learn calm again.</em>
      </>
    ),
    body: 'Our admissions team can verify your insurance and coordinate with your current prescriber on a safe taper plan within 24 to 48 hours. Benzo recovery is patient work. Starting the plan is the first step.',
  },
};
