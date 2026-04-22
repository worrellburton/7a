import type { SubstanceContent } from './types';

export const ketamineContent: SubstanceContent = {
  hero: {
    label: 'Ketamine Addiction Treatment',
    title: 'Ketamine is having a moment. The dependence side of it is not a myth.',
    description:
      'At Seven Arrows Recovery, ketamine use disorder is treated as the emerging, under-recognized condition it is. Our residential program in Arizona combines medical oversight, dissociation-aware trauma therapy, and nervous-system work for a drug whose recreational and prescribed uses are blurring faster than most clinical systems can keep up with.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Ketamine Addiction' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Ketamine blocks NMDA glutamate —{' '}
        <em className="not-italic text-primary">and opens a dissociative doorway.</em>
      </>
    ),
    paragraphs: [
      'Ketamine is an NMDA receptor antagonist, which produces both the rapid antidepressant effect researchers are excited about and the dissociative experience users are drawn to. Low, supervised doses can be therapeutic. Chronic recreational use is an entirely different story.',
      'Repeated high-frequency use damages the bladder (ketamine cystitis), produces cognitive effects that persist between uses, and builds psychological dependence on dissociation as a coping tool. The detachment becomes the reward.',
      'Recovery means reconnecting to the body rather than escaping it. For clients who have leaned on ketamine to get distance from trauma, the therapeutic work is to build actual safety inside the body, not just chemical absence.',
    ],
    chart: {
      natural: { label: 'natural presence', color: '#2f6f5e' },
      spike: { label: 'ketamine dissociation', color: '#d88966' },
      flatline: { label: 'chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Escape, reset, drift, dose.</em>
      </>
    ),
    paragraphs: [
      "Ketamine's short half-life and gentle comedown make it uniquely easy to redose — and uniquely hard to notice the pattern climbing. Weekly use becomes nightly use quietly.",
      'Residential care gives the body time to reconnect. Bladder symptoms improve, cognition clears, and the underlying reason for wanting distance from the body gets direct attention.',
    ],
    stages: [
      { label: 'Dose', hint: 'Distance from body' },
      { label: 'Dissociation', hint: '30–60 minutes' },
      { label: 'Reconnect', hint: 'Often harder than expected' },
      { label: 'Redose', hint: 'To avoid the landing' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        Ketamine has <em className="not-italic text-accent">specific physical costs</em> most recreational users are not told about.
      </>
    ),
    body: 'The "safer drug" reputation masks real harm at recreational-use frequencies. Bladder, kidney, cognitive, and mood symptoms all stack with chronic use, and most do not reverse without extended abstinence.',
    stats: [
      {
        value: 25,
        suffix: '%',
        label: 'Heavy users with cystitis',
        body: 'Up to a quarter of heavy ketamine users develop ketamine-induced cystitis — bladder damage that can require urological intervention if untreated.',
      },
      {
        value: 50,
        suffix: '%',
        label: 'Cognitive impact',
        body: 'Meta-analyses of chronic ketamine users consistently show measurable deficits in working memory and executive function compared to controls.',
      },
      {
        value: 3,
        suffix: ' mo',
        label: 'Meaningful recovery window',
        body: 'Bladder and cognitive symptoms begin measurable recovery within three months of abstinence — the earlier the better.',
      },
    ],
    footnote:
      'Figures are directional, drawn from peer-reviewed literature on chronic ketamine use.',
  },
  withdrawal: {
    eyebrow: 'The First Thirty Days',
    title: (
      <>
        Ketamine withdrawal is <em className="not-italic text-primary">psychological more than physical</em> — and the arc has its own shape.
      </>
    ),
    body: "Unlike opioids or benzos, ketamine withdrawal is not medically dramatic. The challenge is almost entirely psychological: the return of whatever was being dissociated from. That return requires a containing environment and skilled trauma work.",
    phases: [
      {
        label: 'Acute withdrawal',
        days: 'Days 1–7',
        body: 'Fatigue, cravings, mild depression, difficulty sleeping. Bladder symptoms often peak or plateau here before beginning to improve.',
      },
      {
        label: 'Reconnection',
        days: 'Weeks 2–4',
        body: 'The body comes back online. For clients with underlying trauma, the reconnection can be more difficult than the withdrawal itself. Trauma-informed support matters.',
      },
      {
        label: 'Re-integration',
        days: 'Weeks 4–8',
        body: 'Cognitive clarity returns. Bladder symptoms continue to improve. Trauma work comes into focus. Emotional range begins to expand again.',
      },
      {
        label: 'Re-regulation',
        days: 'Months 3–9',
        body: 'Measurable cognitive recovery. Sustained bladder improvement. Baseline mood stabilizes. Aftercare holds the long arc.',
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">and the landscape is blurring fast</em>.
      </>
    ),
    body: 'The boom in therapeutic and recreational ketamine is producing presentation patterns that did not exist five years ago. We meet them as they are.',
    personas: [
      {
        label: 'The therapeutic-to-recreational shift',
        headline: 'Started in a clinic, continued elsewhere.',
        body: 'Began legitimate ketamine-assisted therapy for depression or PTSD. The experience was powerful. The drug was also easy to find off-protocol. The line blurred.',
      },
      {
        label: 'The dissociative seeker',
        headline: 'A drug that let you leave.',
        body: 'Trauma or chronic distress made the body feel unsafe. Ketamine provided distance. Forward-Facing Freedom® treats the underlying need directly.',
      },
      {
        label: 'The party-and-nightlife user',
        headline: 'Weekend use that stopped staying weekend.',
        body: 'Recreational use at events, stretched to weekly, stretched to nightly. Cognitive and bladder symptoms arrive before most users realize the dose has climbed.',
      },
      {
        label: 'The poly-substance pattern',
        headline: 'Ketamine plus MDMA, cannabis, or stimulants.',
        body: 'Common in club and festival cultures. We treat the full pattern, assess bladder and cognitive function, and re-establish somatic safety.',
      },
      {
        label: 'The depressed user',
        headline: "Self-medicating what the therapeutic version was meant to treat.",
        body: 'Depression was underneath. The drug worked, briefly, in the wrong container. We treat the depression directly — often the first time it has had that attention.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Reconnect to the body.{' '}
        <em className="not-italic text-primary">Treat the dissociation-driver directly.</em> Rebuild safety inside.
      </>
    ),
    body: 'Ketamine recovery has a specific shape: reduce the dissociation, restore the body, treat the reason the body felt unsafe. Somatic and trauma-informed work are the main modalities here.',
    flagship: {
      title: 'Somatic-first trauma therapy for chronic dissociation',
      body: 'Forward-Facing Freedom® combined with body-based interventions designed to rebuild felt-sense safety. The nervous system learns that the body is a place it can live in again, without needing chemical distance.',
      iconId: 'spiral',
    },
    modalities: [
      {
        title: 'Urological assessment',
        body: 'Baseline urological review for clients with bladder symptoms, with referral to specialist partners when needed. The physical side of ketamine use deserves direct attention.',
        iconId: 'heart',
      },
      {
        title: 'Cognitive rehabilitation',
        body: 'Structured executive-function work, attention training, and memory support while cognitive symptoms recover — which they do, measurably, with abstinence.',
        iconId: 'brain-body',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, and IFS — with careful attention to clients for whom ketamine-assisted therapy previously opened material without containment.',
        iconId: 'spiral',
      },
      {
        title: 'Equine-assisted work',
        body: 'Horses require presence. Dissociative clients relearn embodiment through a relationship that demands it — gently and without judgment.',
        iconId: 'horse',
      },
      {
        title: 'Breathwork, yoga, sound',
        body: 'Embodiment practices that restore the felt-sense of being in the body. These are central here, not peripheral.',
        iconId: 'breath',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for depression, PTSD, anxiety, and dissociative disorders — the conditions most often riding alongside chronic ketamine use.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        The body becomes a <em className="not-italic text-primary">place worth being</em>, again.
      </>
    ),
    paragraphs: [
      'Most ketamine alumni describe the shift as a felt-sense thing: sitting in a chair and being present in it, a meal they actually taste, the weight of their own hands. Small embodied moments stacking into a baseline.',
      'Sleep, movement, connection, and meaning do the long work. The target is a life where the body can be inhabited rather than escaped.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'Natural rhythm returns' },
      { x: 0.4, label: 'Movement', hint: 'Embodied presence' },
      { x: 0.65, label: 'Connection', hint: 'Co-regulation' },
      { x: 0.9, label: 'Meaning', hint: 'Purpose, identity' },
    ],
  },
  voices: {
    eyebrow: 'Alumni Voices',
    title: (
      <>
        Three alumni, three{' '}
        <em className="not-italic text-primary">first moments back inside the body</em>.
      </>
    ),
    voices: [
      {
        quote:
          "I had been chasing the dissociation for years thinking it was the point. Week three here, I realized the actual point was to build a body I wanted to be in. That was a different project entirely.",
        attribution: 'Alumna · 14 months sober · therapy-to-recreational drift',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          "The urologist I saw at admission changed my life independently of the addiction work. Nobody else had connected the dots.",
        attribution: 'Alumnus · 18 months sober · long-arc daily user',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          "Equine therapy was the unlock. A horse made me be in my body. I did not know I had missed being in my body until I was back in it.",
        attribution: 'Alumna · 2 years sober · trauma-driven use',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to come back',
    title: (
      <>
        The body is <em className="not-italic text-accent">still yours to live in.</em>
      </>
    ),
    body: 'Our admissions team can verify your insurance, coordinate urological assessment, and begin intake within 24 to 48 hours. The reconnection work is specific. We know how to hold it.',
  },
};
