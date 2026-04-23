// EAP-specific FAQ corpus used by both the visible accordion and the
// FAQPage JSON-LD schema on /our-program/equine-assisted. Same source
// of truth means what crawlers read and what humans read stay in sync.
//
// Style rules:
//   - Start every answer with a direct one-sentence claim.
//   - Name real entities (IFS, somatic experiencing, JCAHO, Cochise
//     County, TRICARE) — specificity is the GEO win.
//   - No marketing adjectives.

export interface EquineFaq {
  id: string;
  q: string;
  a: string;
}

export const equineFaqs: EquineFaq[] = [
  {
    id: 'what-is-eap',
    q: 'What is equine-assisted psychotherapy (EAP)?',
    a: 'Equine-assisted psychotherapy is a licensed mental-health intervention delivered by a clinician in partnership with trained horses. At Seven Arrows, sessions are co-led by an Arizona-licensed therapist and a dedicated equine specialist and draw on attachment theory, somatic experiencing, and Internal Family Systems (IFS).',
  },
  {
    id: 'eap-vs-riding',
    q: 'Is this horseback riding?',
    a: 'No. Most EAP work is done on the ground — leading, groundwork, grooming, and in-hand partnership exercises. Mounted work is offered only when clinically appropriate and under a specific safety protocol; the therapeutic work happens regardless of whether the client ever gets in the saddle.',
  },
  {
    id: 'evidence',
    q: 'Is EAP evidence-based?',
    a: 'There is a growing evidence base for equine-assisted approaches in PTSD, anxiety, depression, and substance use — particularly when delivered as an adjunct to standard individual and group therapy. Seven Arrows uses EAP as a complement to CBT, DBT, EMDR, ART, and IFS, not as a replacement.',
  },
  {
    id: 'who-benefits-most',
    q: 'Who benefits most from EAP?',
    a: 'Clients carrying trauma (including PTSD, combat trauma, military sexual trauma, and complex childhood trauma), attachment injury, grief, moral injury, or high-functioning shame tend to gain the most. Veterans, first responders, healthcare professionals, and clients who have already cycled through traditional residential care often describe EAP as the modality that finally &ldquo;landed.&rdquo;',
  },
  {
    id: 'is-it-safe',
    q: 'Is working with horses safe?',
    a: 'Yes. Every session is co-led by a licensed clinician and a dedicated equine specialist, with a documented safety protocol, helmets when mounted, and horses whose temperament and training are specifically matched to this work. A horse who is off, in season, or recovering is rotated out rather than pushed.',
  },
  {
    id: 'session-length',
    q: 'How long is a session and how often do they happen?',
    a: 'A typical EAP session runs about sixty minutes — roughly fifteen minutes of observation and arrival, thirty minutes of groundwork, and fifteen minutes of processing. Most clients have EAP one to two times per week during a residential stay, alongside weekly individual therapy and daily group.',
  },
  {
    id: 'fear-of-horses',
    q: 'What if I&rsquo;m afraid of horses or have never been around them?',
    a: 'You don&rsquo;t need to know anything about horses. The work starts with whatever level of contact is safe for your nervous system — sometimes just sharing the ring from a distance. Discomfort is information we can use, not a reason to skip the session.',
  },
  {
    id: 'opt-out',
    q: 'Is EAP required? What if I don&rsquo;t want to do it?',
    a: 'EAP is offered, not required. Clients who decline are substituted into equivalent clinical hours with no reduction in care intensity or length-of-stay benefits. We don&rsquo;t push clients toward a modality their gut says isn&rsquo;t the right fit.',
  },
  {
    id: 'insurance',
    q: 'Does insurance cover EAP?',
    a: 'EAP is one of several clinical modalities delivered inside residential addiction treatment, and residential stays are typically reimbursable under most major PPO plans — Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, and TRICARE among them — as an out-of-network provider. Our admissions team verifies your specific benefits before you commit.',
  },
  {
    id: 'location',
    q: 'Where does the work happen?',
    a: 'At our private 160-acre ranch at the base of the Swisshelm Mountains in Cochise County, Arizona — ten minutes from Elfrida, Arizona, about two and a half hours southeast of Tucson International Airport. Our herd lives on the property full-time.',
  },
];
