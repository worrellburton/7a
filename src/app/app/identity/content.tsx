'use client';

// Identity page · internal reference for staff. Mirrors the "Who we
// are" brand & clinical positioning doc so anyone in the org has the
// canonical language at their fingertips when they pitch the program,
// answer a referral source, or draft outbound copy. Content is hard-
// coded rather than DB-backed because it changes rarely; future edits
// happen here in source so the change is reviewable.
//
// Layout: editorial reference doc. Tight max-width for reading,
// section headers in the display serif so they scan, the elevator
// pitches lifted into copper-bordered pull-quotes at the end.

interface Section {
  id: string;
  title: string;
  items: string[];
  // Optional sub-bullets for sections that nest topics (e.g. Family
  // program's "Topics may include" list).
  sub?: { intro: string; items: string[]; outro?: string[] } | null;
  // Optional callout paragraph that sits BELOW the list. Used by the
  // Indigenous & Community section to land a plain-English statement
  // of inclusivity at the bottom of the section.
  callout?: string;
}

const SECTIONS: Section[] = [
  {
    id: 'who-we-are',
    title: 'Who We Are',
    items: [
      'Joint Commission–accredited residential treatment program.',
      'ASAM Level 3.5 care.',
      'Boutique 20-bed program with shared rooms that have mountain views and en-suite bath (2 per room).',
      'Located on a 160-acre ranch in rural Southeast Arizona.',
      'Specialized treatment for substance use disorders and co-occurring mental health conditions — specializing in trauma healing.',
      'Extended lengths of stay available (30, 60, 90+ days).',
    ],
  },
  {
    id: 'what-makes-us-different',
    title: 'What Makes Seven Arrows Different',
    items: [
      'First certified Forward-Facing® Accelerated Recovery (FF-AR) treatment center.',
      'Salutogenic approach focused on creating health, not simply managing illness.',
      'Emphasis on nervous system regulation as the foundation for recovery.',
      'Integration of evidence-based, experiential, and culturally informed healing practices.',
      "Individualized treatment plans tailored to each client's needs and goals.",
      'Strong focus on purpose, meaning, connection, and long-term recovery.',
      'Small group sizes — high staff-to-client ratio.',
      'All staff trained and/or certified in trauma-informed and salutogenic care.',
    ],
  },
  {
    id: 'clinical-approach',
    title: 'Clinical Approach',
    items: [
      'Forward-Facing model unique to our facility (Forward-Facing Accelerated Recovery).',
      'Trauma-informed and trauma-responsive care.',
      'Internal Family Systems (IFS).',
      'EMDR therapy.',
      'Somatic Cognitive Behavioral Therapy.',
      'Polyvagal-informed treatment.',
      'Motivational Interviewing.',
      'Somatic CBT and DBT interventions.',
      'Acceptance and Commitment Therapy.',
      'Accelerated Resolution Therapy (ART).',
      'Collaborative case management planning.',
      'Comprehensive psychiatric and medical support — on-site nursing staff.',
      'Medication-Assisted Treatment options (MAT). We do NOT offer Methadone or Suboxone.',
      'Minimum of 2 individual sessions per week; additional sessions available if clinically indicated.',
      '20+ hours of group psychotherapy per week with licensed therapists or credentialed professionals.',
      'Off-site and on-site 12-step meetings available (optional). SMART Recovery offered several times per week. Wellbriety weekly — a recovery movement created by Indigenous people that blends traditional Native healing practices, cultural teachings, spirituality, and community support with principles of addiction recovery.',
    ],
  },
  {
    id: 'experiential',
    title: 'Experiential & Holistic Programming',
    items: [
      'Equine-Assisted Psychotherapy (individual and group sessions).',
      '2 hours of equine group weekly.',
      '1:1 equine sessions offered 1–2× during the stay.',
      'Clients work with and care for horses throughout treatment.',
      'Daily mucking as a ritual / meditative / community experience.',
      'Twice-weekly horseback riding experiences (optional).',
      'Nature-based and experiential therapies.',
      'Off-site outings to Bisbee, Tombstone, Chiricahua National Monument, museums, local hiking, Patagonia Lake (seasonal), and more.',
      'Trauma-informed yoga weekly.',
      'Individual Reiki sessions available.',
      'Mindfulness practices and meditation experiences.',
      'Creative and expressive arts (sound, chant, dance, etc.).',
      'Focus on nutrition with fresh meals and locally sourced ingredients.',
      'Cold plunge available daily.',
      'Fitness center available.',
      'Craft night to explore creative expression.',
      'Tea time for enhancing holistic healing.',
    ],
  },
  {
    id: 'indigenous',
    title: 'Indigenous & Community Healing Practices',
    items: [
      'Founder Brian Twomoons and family from the Crow Nation — given the rights to share ceremonies with our clients.',
      'Sweat Lodge ceremonies weekly (optional).',
      'Kiva fire, smudge ceremony, tobacco ceremony, and community gatherings.',
      'Morning intentions and community circles.',
      'Rituals and ceremonies that support meaning-making and connection.',
      'Respectful integration of Indigenous-informed healing traditions.',
      'Emphasis on belonging, community, and shared healing.',
    ],
    callout:
      'Seven Arrows is not a religious or faith-based program — however, we recognize that healing often includes opportunities for spiritual growth through connection, nature, ceremony, purpose, and meaningful experiences. Individuals of all backgrounds, beliefs, and identities are welcome.',
  },
  {
    id: 'family',
    title: 'Family / Loved Ones Program',
    items: [
      '10-week Family Education Program available virtually, so family members and loved ones can participate from anywhere.',
      'Provides practical education, support, and tools to help families better understand addiction, trauma, and the recovery process.',
    ],
    sub: {
      intro: 'Topics may include:',
      items: [
        'Understanding addiction and recovery.',
        'The impact of trauma on individuals and families.',
        'Nervous system regulation and stress responses.',
        'Healthy boundaries and communication.',
        'Codependency and enabling behaviors.',
        'Rebuilding trust and repairing relationships.',
        'Supporting recovery without taking responsibility for it.',
        'Self-care and resilience for family members.',
        'Relapse prevention and recovery planning.',
        'Navigating difficult emotions such as guilt, shame, fear, and grief.',
      ],
      outro: [
        "Individual family support sessions (1× monthly) are offered throughout a client's stay to address specific concerns, improve communication, and support relational healing.",
        'Family sessions can help create alignment around treatment goals, expectations, and discharge planning.',
        'Ongoing resources, referrals, and educational materials are provided to support families during and after treatment.',
        'Our goal is not only to support the individual seeking recovery, but to help strengthen the relationships and support systems that contribute to long-term healing and wellness.',
      ],
    },
  },
  {
    id: 'alumni',
    title: 'Alumni & Continuing Care Support',
    items: [
      'Dedicated alumni community through the Seven Arrows platform (Feather), providing opportunities for connection, encouragement, and peer support.',
      'Alumni chat spaces where former clients can stay connected, share successes, seek support, and celebrate milestones.',
      'Weekly alumni support groups facilitated by alumni — opportunities for ongoing fellowship and accountability.',
      'Quarterly alumni events that foster community, connection, and continued growth.',
      'Annual alumni reunion bringing together graduates from across the country to reconnect, reflect, and celebrate recovery.',
      'Ongoing outreach and support from Seven Arrows professional staff to help alumni navigate challenges and maintain connection to recovery resources.',
    ],
  },
  {
    id: 'beliefs',
    title: 'What We Believe',
    items: [
      'Addiction is often an adaptation to unresolved pain, trauma, and dysregulation.',
      'Healing happens in relationship.',
      'Recovery is about more than abstinence — it is about building a meaningful life.',
      'Safety is something that is felt in the nervous system, not just understood cognitively.',
      'Every individual has innate strengths and resilience that can be cultivated.',
    ],
  },
  {
    id: 'referrals',
    title: 'Ideal Referrals',
    items: [
      'Adults struggling with substance use disorders.',
      'Individuals with significant trauma histories.',
      'Clients needing a highly relational treatment environment.',
      'Individuals seeking longer-term residential care.',
      'Clients who have not responded to traditional treatment approaches.',
      'Professionals, executives, first responders, and helping professionals.',
      'Individuals seeking a deeper, whole-person approach to recovery.',
    ],
  },
  {
    id: 'outcomes',
    title: 'Outcomes We Focus On',
    items: [
      'Nervous system regulation.',
      'Increased resilience and self-efficacy.',
      'Improved relationships.',
      'Trauma recovery.',
      'Sustainable recovery capital.',
      'Meaning, purpose, and connection.',
      'Long-term recovery and quality of life.',
    ],
  },
];

const ELEVATOR_PITCHES: { id: string; text: string }[] = [
  {
    id: 'short',
    text:
      'Seven Arrows Recovery is a boutique residential treatment center that integrates trauma recovery and addiction treatment through a salutogenic, nervous-system-focused approach that helps people build meaningful, sustainable lives in recovery.',
  },
  {
    id: 'long',
    text:
      'Nestled on a 160-acre ranch in rural Arizona, Seven Arrows Recovery offers a unique approach to trauma and addiction treatment that combines a robust clinical program with experiential healing, community connection, and Indigenous wisdom. Our focus is not simply on reducing symptoms, but on helping people cultivate the skills, relationships, and sense of purpose needed to create a meaningful life in recovery.',
  },
];

export default function IdentityContent() {
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10" style={{ fontFamily: 'var(--font-body)' }}>
      <article className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-10 lg:mb-14">
          <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold mb-3">
            Program Identity
          </p>
          <h1
            className="text-3xl lg:text-5xl font-bold text-foreground leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Who we are, in our own words.
          </h1>
          <p className="mt-4 text-base text-foreground/65 max-w-2xl leading-relaxed">
            The canonical language we use to describe the program — clinical approach,
            experiential programming, beliefs, and ideal referrals. Use this as the
            source of truth when you pitch the program, answer a referral source, or
            draft outbound copy.
          </p>

          {/* Table of contents — anchors to each section so a long
              scroll-target reader can jump straight to what they need. */}
          <nav
            aria-label="Sections"
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px] text-foreground/70 border-t border-foreground/10 pt-6"
          >
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-baseline gap-2 hover:text-primary transition-colors"
              >
                <span className="tabular-nums text-foreground/35 w-5 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{s.title}</span>
              </a>
            ))}
            <a
              href="#elevator"
              className="flex items-baseline gap-2 hover:text-primary transition-colors"
            >
              <span className="tabular-nums text-foreground/35 w-5 shrink-0">
                {String(SECTIONS.length + 1).padStart(2, '0')}
              </span>
              <span>Elevator Pitches</span>
            </a>
          </nav>
        </header>

        {/* Sections */}
        <div className="space-y-12 lg:space-y-16">
          {SECTIONS.map((section, idx) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="scroll-mt-24"
            >
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-[11px] tabular-nums tracking-[0.2em] text-foreground/35 font-semibold">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h2
                  id={`${section.id}-heading`}
                  className="text-2xl lg:text-3xl font-bold text-foreground leading-tight"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {section.title}
                </h2>
              </div>

              <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/80">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {section.sub && (
                <div className="mt-5 pl-5 border-l-2 border-primary/20">
                  <p className="text-[13px] uppercase tracking-[0.16em] text-foreground/55 font-semibold mb-3">
                    {section.sub.intro}
                  </p>
                  <ul className="space-y-2 text-[14px] leading-relaxed text-foreground/75">
                    {section.sub.items.map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-2 inline-block w-1 h-1 rounded-full bg-foreground/35 shrink-0"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {section.sub.outro && section.sub.outro.length > 0 && (
                    <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-foreground/80">
                      {section.sub.outro.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section.callout && (
                <p className="mt-5 px-5 py-4 rounded-lg bg-primary/5 border border-primary/20 text-[14px] leading-relaxed text-foreground/85">
                  {section.callout}
                </p>
              )}
            </section>
          ))}
        </div>

        {/* Elevator pitches — lifted into copper-bordered pull-quotes
            so they read as the polished line, not just a bullet. */}
        <section id="elevator" aria-labelledby="elevator-heading" className="mt-16 scroll-mt-24">
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-[11px] tabular-nums tracking-[0.2em] text-foreground/35 font-semibold">
              {String(SECTIONS.length + 1).padStart(2, '0')}
            </span>
            <h2
              id="elevator-heading"
              className="text-2xl lg:text-3xl font-bold text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Elevator Pitches
            </h2>
          </div>
          <p className="text-sm text-foreground/60 mb-6">
            Two ready-to-go versions — pick the short one for cold conversations and
            the long one when you have a paragraph of room.
          </p>

          <div className="space-y-5">
            {ELEVATOR_PITCHES.map((p, i) => (
              <figure
                key={p.id}
                className="rounded-2xl bg-white border border-primary/30 shadow-sm px-6 py-6"
              >
                <figcaption className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold mb-3">
                  {i === 0 ? 'Short version' : 'Long version'}
                </figcaption>
                <blockquote
                  className="text-[17px] leading-relaxed text-foreground/85"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  &ldquo;{p.text}&rdquo;
                </blockquote>
              </figure>
            ))}
          </div>
        </section>

        {/* Footer hairline so the doc ends with intention. */}
        <div className="mt-16 pt-6 border-t border-foreground/10 text-[11px] uppercase tracking-[0.22em] text-foreground/35 text-center">
          Seven Arrows Recovery · Program Identity
        </div>
      </article>
    </div>
  );
}
