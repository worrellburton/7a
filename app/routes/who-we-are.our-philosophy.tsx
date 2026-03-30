import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const socDomains = [
  {
    title: 'Comprehensibility',
    subtitle: 'Understanding Your Nervous System',
    description:
      'Through psychoeducation and guided awareness, clients develop a coherent understanding of their autonomic nervous system — particularly the threat response and how it can be interrupted. Urges and cravings are reframed as predictable responses to dysregulation rather than failures of willpower, bringing clarity and reducing shame.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="16" cy="16" r="12" />
        <path d="M16 10v6l4 4" />
        <circle cx="16" cy="16" r="3" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
  {
    title: 'Manageability',
    subtitle: 'Building Self-Regulation',
    description:
      'Manageability is cultivated through the integration of neuroception, interoception, and acute relaxation strategies. By intentionally interrupting adaptive threat responses, individuals return to states of physiological safety — enhancing cognitive flexibility, emotional regulation, and behavioral effectiveness.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 24 Q16 4 26 24" />
        <path d="M10 24 Q16 12 22 24" />
        <line x1="6" y1="24" x2="26" y2="24" />
      </svg>
    ),
  },
  {
    title: 'Meaningfulness',
    subtitle: 'Living With Purpose',
    description:
      'This domain focuses on the cultivation of personal meaning through the development of a code of honor, mission statement, and vision for one\'s life and recovery. Forward-Facing Freedom emphasizes intentional, values-driven living — supporting individuals in engaging with life\'s challenges as purposeful and worthy of sustained investment.',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4l3.5 7 7.5 1-5.5 5.5L23 25l-7-3.5L9 25l1.5-7.5L5 12l7.5-1z" />
      </svg>
    ),
  },
];

const principles = [
  {
    number: 1,
    title: 'Treat the Whole Person',
    description:
      'Addiction is never just about the substance. We address the underlying trauma, nervous system dysregulation, mental health conditions, and spiritual disconnection that fuel addictive behavior.',
  },
  {
    number: 2,
    title: 'Honor Individual Stories',
    description:
      'No two paths to addiction are the same. Every treatment plan at Seven Arrows is built around the individual — their history, their nervous system, their unique path to healing.',
  },
  {
    number: 3,
    title: 'Heal Through Connection',
    description:
      'Isolation is a hallmark of addiction. Recovery happens in community. We cultivate authentic relationships between clients, staff, families, and the natural world around us.',
  },
  {
    number: 4,
    title: 'Regulate Before Processing',
    description:
      'Drawing from Forward-Facing Freedom, we prioritize nervous system stabilization before deeper trauma work. Breathwork, somatic awareness, and attentional practices build the capacity needed for lasting change.',
  },
  {
    number: 5,
    title: 'Reframe Addiction as Adaptation',
    description:
      'Rather than viewing addiction as moral failure, we understand substance use as a post-traumatic adaptive capacity — a functional response to overwhelming emotional and physiological states. This removes shame and opens the door to genuine healing.',
  },
  {
    number: 6,
    title: 'Build for the Long Term',
    description:
      'Treatment is the beginning, not the end. We equip every client with self-regulation skills, a personal code of honor, and a support network designed to sustain recovery for years to come.',
  },
  {
    number: 7,
    title: 'Let the Land Heal',
    description:
      'The Swisshelm Mountains, the open desert sky, and the quiet of southeastern Arizona are not just a backdrop. Nature is an active part of the therapeutic process, supporting nervous system regulation and grounding clients in something larger than themselves.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Our Philosophy | TraumAddiction® & Forward-Facing Freedom® | Seven Arrows Recovery" },
  { name: "description", content: "Seven Arrows Recovery's philosophy is rooted in the salutogenic TraumAddiction® model and Forward-Facing Freedom® approach — treating trauma and addiction as one integrated condition through nervous system regulation, meaning-making, and strengths-based care." },
];

export default function OurPhilosophyPage() {
  return (
    <>
      <PageHero
        label="Our Philosophy"
        title="A Salutogenic Approach to Recovery"
        description="At Seven Arrows Recovery, we believe lasting recovery requires more than stopping substance use. Our philosophy is rooted in the science of health creation — addressing the mind, body, and spirit through the TraumAddiction® and Forward-Facing Freedom® framework."
        image="/images/horses-grazing.jpg"
      />

      {/* TraumAddiction Introduction */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">The TraumAddiction® Model</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Reframing Addiction Through a New Lens
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Substance use disorders and trauma-related conditions frequently co-occur, yet have
              historically been treated through parallel and often incompatible models. Traditional
              trauma therapies emphasize memory processing, while addiction treatment prioritizes
              stabilization — creating clinical tension that leaves many stuck. Our TraumAddiction®
              model bridges this gap, conceptualizing addiction as a post-traumatic adaptive capacity
              and treating both conditions as one integrated challenge.
            </p>
          </div>

          {/* Salutogenesis explanation */}
          <div className="max-w-4xl mx-auto bg-warm-bg rounded-2xl p-8 lg:p-12 mb-16">
            <h3 className="text-xl font-bold text-foreground mb-4">
              From Pathology to Health Creation
            </h3>
            <p
              className="text-foreground/70 leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our approach draws from <strong>salutogenesis</strong> — a paradigm introduced by Aaron Antonovsky
              that shifts the focus from what makes people sick to what actively creates health.
              Central to this model is the <strong>Sense of Coherence</strong>: the feeling that life is
              comprehensible, manageable, and meaningful.
            </p>
            <p
              className="text-foreground/70 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              The landmark ACE study demonstrated a strong relationship between early adversity and
              substance use — individuals with higher adverse childhood experience scores show significantly
              increased risk for addiction. Rather than pathologizing this, we understand substance use as
              a functional adaptation that regulates overwhelming emotional and physiological states.
              This reframe removes shame and opens the door to genuine healing.
            </p>
          </div>

          {/* Sense of Coherence Domains */}
          <div className="grid md:grid-cols-3 gap-8">
            {socDomains.map((domain) => (
              <div key={domain.title} className="bg-warm-bg rounded-2xl p-8">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                  {domain.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{domain.title}</h3>
                <p className="text-primary text-sm font-medium mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                  {domain.subtitle}
                </p>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {domain.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Forward-Facing Freedom */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              Forward-Facing Freedom®
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              A Present-Focused Path to Healing
            </h2>
            <p
              className="text-white/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Forward-Facing Freedom (FFF) is a present-focused model emphasizing stabilization,
              awareness, and growth. Unlike retrospective models that begin with trauma processing,
              FFF prioritizes building capacity first — through breathwork, somatic awareness, and
              attentional practices that regulate the autonomic nervous system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: 'Stabilize',
                description: 'Regulate the nervous system through breathwork, somatic awareness, and acute relaxation strategies before engaging in deeper processing.',
              },
              {
                title: 'Understand',
                description: 'Develop awareness of internal cues, reframe cravings as nervous system activation states, and build a coherent narrative of recovery.',
              },
              {
                title: 'Grow',
                description: 'Cultivate post-traumatic growth through meaning-making, values-driven living, and strengthened relational connection.',
              },
            ].map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold">{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold mb-3">{step.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mind Body Spirit */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">Mind, Body, Spirit</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Recovery Beyond the Surface
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Most treatment programs focus on stopping substance use. We go further. True recovery
              means rebuilding every dimension of a person&apos;s life — guided by Polyvagal Theory,
              somatic regulation, and strengths-based frameworks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Mind',
                description:
                  'Psychoeducation, attentional practices, and cognitive reframing address thought patterns and build the awareness needed for self-regulation and lasting behavioral change.',
                image: '/images/individual-therapy-session.jpg',
              },
              {
                title: 'Body',
                description:
                  'Somatic experiencing, breathwork, movement therapy, and equine-assisted experiences reconnect clients with their physical selves and restore the nervous system\'s natural capacity for regulation.',
                image: '/images/horses-grazing.jpg',
              },
              {
                title: 'Spirit',
                description:
                  'Meaning-making, values development, community connection, and time in nature at the Swisshelm Mountains cultivate purpose and a sense of coherence essential for sustained recovery.',
                image: '/images/sign-night-sky-milky-way.jpg',
              },
            ].map((pillar) => (
              <div key={pillar.title} className="relative rounded-2xl overflow-hidden">
                <img src={pillar.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative p-8 text-center">
                  <h3 className="text-2xl font-bold text-white mb-4">{pillar.title}</h3>
                  <p className="text-white/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{pillar.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 Core Principles */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Guiding Principles</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              The Seven Arrows
            </h2>
          </div>
          <div className="space-y-6 max-w-4xl mx-auto">
            {principles.map((principle) => (
              <div
                key={principle.number}
                className="bg-white rounded-2xl p-8 shadow-sm flex gap-6 items-start"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-lg">{principle.number}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{principle.title}</h3>
                  <p
                    className="text-foreground/70 leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {principle.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Begin Your Healing Journey
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our philosophy is not just words on a page. It is the lived experience of every client
            who walks through our doors. By supporting safety, awareness, and intention, we enable
            clients to move forward in recovery with resilience and purpose.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link to="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
