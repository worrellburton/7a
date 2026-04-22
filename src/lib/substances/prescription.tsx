import type { SubstanceContent } from './types';

export const prescriptionContent: SubstanceContent = {
  hero: {
    label: 'Prescription Drug Addiction Treatment',
    title: 'It was a prescription. It became a problem. Both are true, and neither is shameful.',
    description:
      'At Seven Arrows Recovery, prescription drug use disorder — opioids, stimulants, benzodiazepines, z-drugs, and combinations of all three — is treated with the same seriousness as any other addiction, and with the added care that comes with knowing most of our clients did everything the system asked them to.',
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'What We Treat', href: '/what-we-treat' },
      { label: 'Prescription Drug Addiction' },
    ],
  },
  reward: {
    eyebrow: 'The Neurochemistry',
    title: (
      <>
        Prescribed does not mean safe —{' '}
        <em className="not-italic text-primary">it means monitored.</em>
      </>
    ),
    paragraphs: [
      "Prescription opioids, benzodiazepines, and stimulants all produce dependence through the same neurochemical pathways their street equivalents do. A doctor&rsquo;s signature does not change what the drug does at the receptor.",
      'Tolerance climbs. Relief shrinks. The dose needed to feel normal keeps pace with a body adapting to the drug. Most people notice only when they try to stop — and the system that prescribed the medication has usually already moved on.',
      'Recovery begins with the simple acknowledgement that a prescription problem is a real problem. Shame keeps people in it longer than the pharmacology does.',
    ],
    chart: {
      natural: { label: 'natural baseline', color: '#2f6f5e' },
      spike: { label: 'prescribed dose', color: '#d88966' },
      flatline: { label: 'after chronic use', color: '#a4958a' },
    },
  },
  cycle: {
    eyebrow: 'The Cycle',
    title: (
      <>
        Four stages. <em className="not-italic text-primary">Invisible because they are legal.</em>
      </>
    ),
    paragraphs: [
      'Prescription-drug dependence almost always begins outside the client\'s awareness. The prescription is legal, the reason for taking it is real, the refills are automatic. By the time the pattern is obvious, it is already established.',
      'Residential care is frequently the first place a careful taper, honest assessment, and parallel treatment for the original symptom all happen under one roof.',
    ],
    stages: [
      { label: 'Prescribed', hint: 'Real symptom, real relief' },
      { label: 'Tolerance', hint: 'Same dose, less effect' },
      { label: 'Dose creep', hint: 'Or a second prescription' },
      { label: 'Dependence', hint: 'Quiet, then loud' },
    ],
  },
  body: {
    eyebrow: 'The body keeps score',
    title: (
      <>
        The prescription-drug landscape is <em className="not-italic text-accent">the largest substance problem in America</em>.
      </>
    ),
    body: 'Prescription opioids, benzodiazepines, and stimulants together account for tens of millions of adult Americans using, and millions developing dependence. The pharmaceutical path into addiction is quieter than the street path but not less real.',
    stats: [
      {
        value: 16,
        suffix: 'M',
        label: 'Annual misuse (US)',
        body: 'Roughly 16 million Americans misuse prescription medications in a given year — the largest category of drug misuse outside of alcohol.',
      },
      {
        value: 25,
        suffix: '%',
        label: 'Develop dependence',
        body: 'Up to a quarter of long-term users of prescribed controlled substances develop clinically significant dependence — most without ever misusing the script.',
      },
      {
        value: 10,
        suffix: '×',
        label: 'Benzo + opioid overdose risk',
        body: 'Co-prescribing a benzodiazepine with an opioid multiplies overdose risk by an order of magnitude. Many prescriptions are still written this way.',
      },
    ],
    footnote:
      'Figures are directional, drawn from SAMHSA and CDC prescription drug monitoring data.',
  },
  withdrawal: {
    eyebrow: 'The First Ninety Days',
    title: (
      <>
        Each class tapers differently. <em className="not-italic text-primary">All of them want patience.</em>
      </>
    ),
    body: 'Prescription drug withdrawal depends entirely on which class of drug is involved. Opioids are painful but not lethal. Benzos can be medically dangerous. Stimulants are mostly emotional. We build the plan to the client, not the other way around.',
    phases: [
      {
        label: 'Assessment & stabilization',
        days: 'Week 1',
        body: 'Full medication review, baseline labs, and taper planning. Often the first time all of a client\'s scripts sit on the same table in the same week.',
      },
      {
        label: 'Active taper',
        days: 'Weeks 2–12',
        body: 'Class-specific tapering: opioids with MAT support, benzos slow and long, stimulants with dopamine rebuilding work. Held by an addiction-medicine physician throughout.',
      },
      {
        label: 'Post-taper',
        days: 'Weeks 12–24',
        body: 'Body clears the last of the medication. Symptoms the script was masking (pain, panic, ADHD) get their own direct treatment, not another pill.',
      },
      {
        label: 'Re-regulation',
        days: 'Months 6–18',
        body: 'Nervous system rebuilds without the pharmaceutical scaffolding. Aftercare, community, and pain/anxiety management carry the long arc.',
      },
    ],
  },
  personas: {
    eyebrow: 'Who We Actually See',
    title: (
      <>
        Five patterns through our door —{' '}
        <em className="not-italic text-primary">all of them started with a legitimate script</em>.
      </>
    ),
    body: 'Prescription-drug addiction rarely begins as misuse. Most of our clients did exactly what the prescription said — for exactly as long as the prescription kept being refilled.',
    personas: [
      {
        label: 'The post-surgical opioid patient',
        headline: 'A legitimate script that never ended.',
        body: 'A knee, a back, a C-section. The pills were legitimately prescribed. The script ran out before the dependence did. No tapering plan was offered.',
      },
      {
        label: 'The chronic benzo user',
        headline: 'A decade of clonazepam for panic.',
        body: 'Panic disorder, real and documented. Benzos were the go-to for years. No one laid out an off-ramp. You are still handling panic, now with a second problem on top.',
      },
      {
        label: 'The ADHD stimulant user',
        headline: 'The prescription that doubled.',
        body: 'Adderall, Vyvanse, Ritalin — at doses that crept. Weekend use stretched to weekdays. You are still working, but the nervous system is paying a compounding cost.',
      },
      {
        label: 'The poly-prescription case',
        headline: 'Multiple scripts, multiple prescribers.',
        body: 'Sleep pill, anxiety pill, pain pill, stimulant to offset the sedation. Nobody is in charge. We get the list on one page for the first time.',
      },
      {
        label: 'The script-to-street shift',
        headline: 'The script got cut off. The street filled in.',
        body: 'Prescription dried up. Pills became unaffordable or unavailable. The bridge to heroin or illicit benzos happened in weeks, not years.',
      },
    ],
  },
  approach: {
    eyebrow: 'Our Approach',
    title: (
      <>
        Honest medication review. <em className="not-italic text-primary">Careful, class-specific tapers.</em>{' '}
        Real treatment for the underlying symptom.
      </>
    ),
    body: 'The first gift of residential care is usually a comprehensive medication review — often the first one the client has ever had. From there we build class-specific tapers paired with proper treatment for whatever the pill was supposed to address in the first place.',
    flagship: {
      title: 'Addiction-medicine led medication review and taper',
      body: 'A board-certified addiction physician, not a handoff. Every prescription gets examined, every taper is class-specific, and the condition underneath each prescription gets its own direct treatment plan.',
      iconId: 'shield',
    },
    modalities: [
      {
        title: 'Pain-informed care',
        body: 'Pain psychology review for clients with chronic-pain prescriptions. We separate nociception from catastrophizing and build a body-first plan that does not require opioids to be livable.',
        iconId: 'heart',
      },
      {
        title: 'Panic and sleep reconditioning',
        body: 'Structured CBT for panic disorder, sleep-hygiene rebuilding, and graded exposure — direct treatment for what the benzo was masking.',
        iconId: 'compass',
      },
      {
        title: 'ADHD assessment and behavioral care',
        body: 'Proper neuropsych assessment, behavioral strategies, and medication management that does not rely on ever-climbing stimulant doses.',
        iconId: 'brain-body',
      },
      {
        title: 'Trauma-informed therapy',
        body: 'Forward-Facing Freedom®, EMDR, ART, IFS — sequenced after the body and medication picture have stabilized.',
        iconId: 'spiral',
      },
      {
        title: 'Equine-assisted work, breathwork, yoga',
        body: 'Somatic practices that restore the nervous-system tools the medications were doing the job of.',
        iconId: 'horse',
      },
      {
        title: 'Dual-diagnosis care',
        body: 'Integrated treatment for depression, anxiety, PTSD, ADHD, and chronic pain — the conditions most often present behind prescription dependence.',
        iconId: 'duo',
      },
    ],
  },
  rewiring: {
    eyebrow: 'Rebuilding Baseline',
    title: (
      <>
        Your nervous system <em className="not-italic text-primary">had tools before the prescription</em>. They come back.
      </>
    ),
    paragraphs: [
      'Most alumni describe the return of some ordinary nervous-system function in the second or third month — pain tolerance improves, panic episodes shrink, attention improves without the stimulant, sleep normalizes without the pill. The body is remembering what it could do before it got help.',
      'Sleep, movement, connection, and meaning are the four pillars. Every one of them is also literal medicine for the condition the prescription was first written for.',
    ],
    anchors: [
      { x: 0.12, label: 'Sleep', hint: 'Natural architecture' },
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
        <em className="not-italic text-primary">first medication reviews in years</em>.
      </>
    ),
    voices: [
      {
        quote:
          "Nobody had ever put all of my prescriptions on one table until I got here. We looked at it and the first sentence from the doctor was, 'No wonder you feel like this.' That was the start.",
        attribution: 'Alumna · 14 months · 4-script poly-prescription',
        photo: '/images/covered-porch-desert-view.jpg',
      },
      {
        quote:
          "Eight years of prescribed opioids for a back injury. The taper was gentler than I expected. The pain management turned out to be more than half breathwork, body awareness, and finally sleeping.",
        attribution: 'Alumnus · 2 years · post-surgical opioid dependence',
        photo: '/images/group-sunset-desert.jpg',
      },
      {
        quote:
          "They treated my ADHD, not my Adderall problem. That distinction is why this one stuck.",
        attribution: 'Alumna · 18 months · stimulant dependence',
        photo: '/images/facility-exterior-mountains.jpg',
      },
    ],
  },
  cta: {
    eyebrow: 'Ready to look at the list',
    title: (
      <>
        Every prescription on one page. <em className="not-italic text-accent">Finally.</em>
      </>
    ),
    body: 'Our admissions team can verify your insurance, coordinate with your current prescribers, and build a safe taper plan within 24 to 48 hours. The first step is the list. We will hold the rest.',
  },
};
