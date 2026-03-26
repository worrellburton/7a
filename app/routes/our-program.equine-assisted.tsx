import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const benefits = [
  {
    number: '01',
    title: 'Immediate, Honest Feedback',
    description:
      'Horses respond to nonverbal cues, energy shifts, and emotional incongruence in real time. This gives clients direct, observable feedback about their internal state, boundaries, and communication style.',
    accent: 'bg-primary/10 text-primary',
  },
  {
    number: '02',
    title: 'Access to Implicit & Trauma-Based Material',
    description:
      'Because EAP is body-based and relational, it helps access stored emotional experiences that may not be fully conscious. This is especially helpful for trauma, attachment wounds, shame, and core beliefs.',
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    number: '03',
    title: 'Builds Regulation Skills',
    description:
      'Clients naturally practice grounding, breath awareness, and nervous system regulation while interacting with a large, sensitive animal. Co-regulation with the horse supports development of self-regulation.',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    number: '04',
    title: 'Strengthens Boundaries & Assertiveness',
    description:
      'Working with horses requires clarity, intention, and appropriate pressure-and-release. Clients practice setting limits, asking clearly, and adjusting when something isn\u2019t working.',
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    number: '05',
    title: 'Increases Self-Awareness & Insight',
    description:
      'Metaphor develops organically \u2014 "this horse feels stuck like I do." These symbolic experiences often create deeper and longer-lasting insight than cognitive processing alone.',
    accent: 'bg-violet-50 text-violet-700',
  },
  {
    number: '06',
    title: 'Enhances Confidence & Mastery',
    description:
      'Successfully connecting with or guiding a horse builds competence, self-trust, and empowerment \u2014 particularly important for individuals struggling with shame or low self-worth.',
    accent: 'bg-rose-50 text-rose-700',
  },
  {
    number: '07',
    title: 'Supports Engagement',
    description:
      'For clients resistant to traditional therapy, EAP feels less clinical and more experiential, increasing motivation and emotional openness.',
    accent: 'bg-teal-50 text-teal-700',
  },
];

export const meta: MetaFunction = () => [
  { title: "Equine-Assisted Psychotherapy (EAP) | Seven Arrows Recovery" },
  { name: "description", content: "Equine-Assisted Psychotherapy at Seven Arrows Recovery integrates relational, somatic, and attachment-focused approaches for powerful trauma-informed healing in the Arizona high desert." },
];

export default function EquineAssistedPage() {
  return (
    <main>
      <PageHero
        label="Equine-Assisted Psychotherapy"
        title="Healing Happens in the Arena"
        description="Equine-Assisted Psychotherapy (EAP) creates a powerful, experiential way to access emotions, patterns, and relational dynamics that are often difficult to reach through talk therapy alone."
        image="/7a/images/equine-therapy-portrait.jpg"
      />

      {/* What is EAP — Split Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="section-label mb-4">Why It Works</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
                Horses Don&apos;t Lie.
                <br />
                <span className="text-primary">Neither Does Healing.</span>
              </h2>
              <p
                className="text-foreground/60 leading-relaxed mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Equine-Assisted Psychotherapy is one of the most effective experiential
                modalities in addiction treatment. Horses are prey animals with a
                heightened sensitivity to emotional energy, making them remarkable
                partners in the therapeutic process. They do not judge, they do
                not hold grudges, and they respond only to what is happening in
                the present moment.
              </p>
              <p
                className="text-foreground/60 leading-relaxed mb-8"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                For clients who struggle to connect in traditional therapy
                settings, the arena often becomes the place where
                breakthroughs happen. Our trained equine specialists and licensed
                therapists work together to create safe, structured sessions that
                meet each client where they are.
              </p>

              {/* Key differentiators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-warm-bg rounded-xl p-4">
                  <p className="text-2xl font-bold text-foreground mb-1">100%</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Experiential &amp; body-based</p>
                </div>
                <div className="bg-warm-bg rounded-xl p-4">
                  <p className="text-2xl font-bold text-foreground mb-1">IFS</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Parts-based model aligned</p>
                </div>
                <div className="bg-warm-bg rounded-xl p-4">
                  <p className="text-2xl font-bold text-foreground mb-1">Real-Time</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Immediate biofeedback</p>
                </div>
                <div className="bg-warm-bg rounded-xl p-4">
                  <p className="text-2xl font-bold text-foreground mb-1">Somatic</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Attachment-focused approach</p>
                </div>
              </div>
            </div>

            {/* Image with floating card */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden aspect-[3/4] shadow-lg">
                <img
                  src="/7a/images/equine-therapy-portrait.jpg"
                  alt="Client working with a horse during an Equine-Assisted Psychotherapy session"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating quote card */}
              <div className="absolute -bottom-6 -left-4 lg:-left-8 bg-white rounded-2xl p-5 shadow-xl border border-gray-100 max-w-[280px]">
                <svg className="w-6 h-6 text-primary/30 mb-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
                </svg>
                <p className="text-sm text-foreground/70 italic leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  &ldquo;This horse feels stuck like I do.&rdquo;
                </p>
                <p className="text-xs text-foreground/40 mt-2" style={{ fontFamily: 'var(--font-body)' }}>
                  &mdash; The kind of insight that changes everything
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7 Benefits — Numbered cards */}
      <section className="py-20 lg:py-28 bg-warm-bg" aria-labelledby="benefits-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <p className="section-label justify-center mb-4">7 Reasons EAP Works</p>
            <h2 id="benefits-heading" className="text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              Why Equine-Assisted Psychotherapy Is So Impactful
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((benefit) => (
              <div
                key={benefit.number}
                className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-10 h-10 rounded-xl ${benefit.accent} flex items-center justify-center text-sm font-bold mb-5`}>
                  {benefit.number}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {benefit.title}
                </h3>
                <p
                  className="text-foreground/60 text-sm leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-width image break */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src="/7a/images/horses-grazing.jpg"
          alt="Horses grazing in the Arizona landscape near Seven Arrows Recovery"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a0f0a]/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-16">
          <div className="max-w-7xl mx-auto">
            <p
              className="text-white/80 text-lg lg:text-xl max-w-2xl leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              &ldquo;EAP uniquely integrates relational, somatic, and attachment-focused
              approaches in a way that aligns beautifully with trauma-informed and
              parts-based models like IFS.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Integration approach */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Image */}
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-warm-bg">
              <img
                src="/7a/images/horse-sketch-artwork.jpg"
                alt="Artistic rendering of horse therapy"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* Right: Content */}
            <div>
              <p className="section-label mb-4">Our Approach</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6 leading-tight">
                Where Clinical Expertise Meets Equine Wisdom
              </h2>
              <p
                className="text-foreground/60 leading-relaxed mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                At Seven Arrows, our EAP program is led by clinicians with deep
                backgrounds in both equine work and psychotherapy. This dual expertise
                means sessions are not just about &ldquo;being around horses&rdquo; &mdash;
                they are carefully designed therapeutic interventions grounded in
                attachment theory, somatic experiencing, and parts-based work.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Relational & somatic integration',
                  'Attachment-focused framework',
                  'Trauma-informed & parts-based (IFS)',
                  'Licensed therapists + equine specialists',
                  'Open-air sessions in the Arizona high desert',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{item}</span>
                  </div>
                ))}
              </div>

              <Link to="/our-program" className="btn-outline">
                View Full Program
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
            Ready to Experience Equine-Assisted Psychotherapy?
          </h2>
          <p
            className="text-foreground/60 text-lg leading-relaxed mb-10 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Discover how working with horses can open new doors in your
            recovery. Our admissions team is ready to help you take the first step.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-dark">
              Call (866) 996-4308
            </a>
            <Link to="/contact" className="btn-outline">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
