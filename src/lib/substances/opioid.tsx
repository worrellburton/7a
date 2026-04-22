import type { SubstanceContent } from './types';

export const opioidContent: SubstanceContent = {
  hero: {
    label: 'Opioid Addiction Treatment',
    title: 'Opioids quiet pain. Healing teaches the body pain can pass.',
    description:
      'At Seven Arrows Recovery, opioid use disorder is treated as a neurological, somatic, and psychological condition at once. Our residential program in Arizona coordinates medication-assisted treatment, trauma-informed therapy, and nervous-system work so the body learns, often for the first time, that it can come down on its own.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Opioid Addiction' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Opioids hijack the body&rsquo;s own pain system —{' '}
        <em className="not-italic text-primary">and retune the volume knob.</em>
      </>
    ),
    paragraphs: [
      "Opioids bind to mu-receptors that the body already uses for its endogenous pain-and-comfort system (endorphins, enkephalins). The hit is not foreign — it is a flood of what the body was already supposed to make for itself, at a dose the body could never produce.",
      'Repeated use tells the brain to stop making its own. Endogenous opioid production down-regulates. The system that normally blunts ordinary pain, stress, and loneliness starts to fail, and withdrawal — physical and emotional — becomes intolerable without the drug.',
      'Recovery is neurochemical re-learning. With time, support, and often a bridge medication, the mu-system comes back online. The body remembers how to comfort itself.',
    ],
    chart: {
      natural: { label: 'endogenous opioids', color: '#2f6f5e' },
      spike: { label: 'opioid hit', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Each one loads the next.</em>
      </>
    ),
    paragraphs: [
      'Opioid dependence compresses into a tight physical loop — use, relief, early withdrawal, use again — often running on a six-to-twelve-hour clock. What started as pain management becomes pain maintenance.',
      "Residential care buys the nervous system what the loop has been stealing: time, safety, and someone else holding the wheel while the chemistry recalibrates.",
    ],
    stages: [
      { label: 'Use', hint: 'Pain relief, calm, warmth' },
      { label: 'Peak', hint: '20–90 minutes' },
      { label: 'Withdrawal', hint: 'Physical and emotional pain' },
      { label: 'Crave', hint: 'Only the drug quiets it' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Opioid overactivation is <em className="not-italic text-accent">physically dangerous</em>.
      </>
    ),
    body: 'Opioids suppress respiration, disrupt the gut, depress the immune system, and wreck sleep architecture. Overdose risk rises steeply with poly-substance use — especially with benzodiazepines or alcohol on board — and has only gotten worse in the fentanyl era.',
    stats: [
      {
        value: 80,
        suffix: 'K+',
        label: 'US deaths per year',
        body: 'Opioid-involved overdose now accounts for more than 80,000 American deaths annually — the majority now driven by fentanyl contamination.',
      },
      {
        value: 75,
        suffix: '%',
        label: 'Relapse without MAT',
        body: 'Relapse rates within a year are roughly 75% without medication-assisted treatment — and drop sharply when MAT is paired with residential therapy.',
      },
      {
        value: 3,
        suffix: '×',
        label: 'Overdose risk post-detox',
        body: 'Post-detox overdose risk climbs sharply because tolerance drops — which is why aftercare and naloxone access matter more than any other phase of care.',
      },
    ],
    footnote:
      'Figures are directional, drawn from CDC and SAMHSA surveillance. Individual risk varies substantially.',
  },
  withdrawal: {
    eyebrow: 'The First Thirty Days',
    title: (
      <>
        Opioid withdrawal is <em className="not-italic text-primary">brutal but survivable</em> —
        with the right medical support.
      </>
    ),
    body: 'Opioid withdrawal is rarely fatal on its own, but it is one of the most physically punishing detoxes in medicine. We coordinate medical detox before admission (or on-site when indicated), manage MAT induction carefully, and hold the emotional work as the body shifts.',
    phases: [
      {
        label: 'Acute withdrawal',
        days: 'Hours 6–72',
        body: 'Full-body pain, GI distress, chills, insomnia, restlessness, anxiety. Medical oversight and bridge medication drastically change what this window feels like.',
      },
      {
        label: 'Sub-acute',
        days: 'Days 4–14',
        body: 'Physical symptoms ease; depression and anhedonia climb. MAT (buprenorphine, methadone, or naltrexone) is often the stabilizing factor here.',
      },
      {
        label: 'PAWS',
        days: 'Weeks 2–12',
        body: 'Protracted mood flatness, insomnia, cue-triggered cravings. Trauma work comes online as the nervous system quiets.',
      },
      {
        label: 'Re-regulation',
        days: 'Months 3–12+',
        body: "Endogenous opioid system gradually comes back online. Natural rewards start to register. Aftercare and community carry the curve forward.",
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">almost none of them started with the goal of getting high.</em>
      </>
    ),
    body: 'Opioid dependence almost never begins as recreational use. Most people we see took something at some point for real pain — and could not get back off of it.',
    personas: [
      {
        label: 'The post-surgical dependence',
        headline: 'A legitimate prescription that never ended.',
        body: 'A knee, a back, a C-section. Pills were legitimately prescribed. The script ran out before the dependence did. No one handed you a tapering plan.',
      },
      {
        label: 'The chronic-pain patient',
        headline: 'Pain that deserved treatment and got the wrong one.',
        body: 'Years of prescribed opioids for genuine pain. Tolerance climbed. Effectiveness dropped. You now take more for less relief and cannot stop without withdrawal.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Opioids on top of everything else.',
        body: 'Alcohol, benzodiazepines, stimulants in the mix. Overdose risk is highest here. We treat the full pattern, not just the piece that scared you most.',
      },
      {
        label: 'The fentanyl-era user',
        headline: 'The drug is not what it used to be.',
        body: 'What you buy on the street today is not what was on the street five years ago. Tolerance, risk, and overdose math have all changed.',
      },
      {
        label: 'The relapse',
        headline: 'Not your first stay.',
        body: 'Opioid use disorder has one of the highest relapse rates in medicine. That is not a character failure — it is a biology problem. We build MAT and aftercare in from day one.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Medicate when it helps. <em className="not-italic text-primary">Regulate the nervous system.</em>{' '}
        Rebuild the life.
      </>
    ),
    body: 'MAT is not a crutch; it is scaffolding. We combine it with the same trauma-informed, nervous-system-first framework we use for every other substance, so the medication buys time for the psychological work to land.',
    flagship: {
      title: 'Medication-assisted treatment, fully integrated',
      body: 'Buprenorphine, methadone, or naltrexone protocols held by an addiction-medicine physician, paired tightly with trauma-informed psychotherapy. The medication does its job; the therapy does its own.',
      iconId: 'shield',
    },
    modalities: [
      {
        title: 'Pain-informed care',
        body: 'A pain psychologist reviews every chronic-pain case. We separate nociception from catastrophizing, and build a body-first plan that does not require opioids to be livable.',
        iconId: 'heart',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — sequenced after the body is stable so processing supports regulation rather than unsettling it.',
        iconId: 'spiral',
      },
      {
        title: 'Naloxone-ready aftercare',
        body: 'Every discharging client leaves with naloxone in hand, a family member trained to use it, and a harm-reduction plan aligned with their goals.',
        iconId: 'shield',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses mirror nervous-system states without judgment. Clients learn what down-regulation physically feels like — often for the first time sober.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Parasympathetic-activating practice that restores the body\'s own down-regulation tools. These are not extras — they are medicine.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for depression, anxiety, PTSD, and chronic-pain-related mood disorders. One team, one plan.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        Your own endorphin system <em className="not-italic text-primary">comes back online</em>.
      </>
    ),
    paragraphs: [
      'Most alumni describe the shift as happening sometime between weeks four and eight — a walk becomes enjoyable, a hug from family registers, a cold morning feels alive instead of painful. The endogenous opioid system is relearning its job.',
      'Sleep, movement, connection, and meaning are the four pillars that carry the curve back up. They are not metaphors. They are the literal activities the brain uses to manufacture its own comfort.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'Pain tolerance restored' },
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
        <em className="not-italic text-primary">first ordinary pleasures that came back</em>.
      </>
    ),
    voices: [
      {
        quote:
          'Bupe got me stable. The trauma work got me sober. The difference between those two things is the difference between being on a medicine and being free.',
        attribution: 'Alumnus · 22 months sober · chronic-pain origin',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          "Week five, I cried in the arena because a horse laid her head on my shoulder and my body did not flinch. I had not realized how much pain I had been bracing against.",
        attribution: 'Alumna · 14 months sober · post-surgical dependence',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          'They sent me home with naloxone and a plan. Six months in, my wife used the naloxone on a friend at a Christmas party. The training is not just for you.',
        attribution: 'Alumnus · 2 years sober · fentanyl era',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to come down',
    title: (
      <>
        Pain can pass. <em className="not-italic text-accent">Your body remembers how.</em>
      </>
    ),
    body: "Our admissions team can verify your insurance, coordinate medical detox, and start MAT planning within 24 to 48 hours. One confidential call gets the whole machine moving.",
  },
};
