import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const clinicalApproaches = [
  {
    title: 'Forward-Facing Freedom®',
    description:
      'Our primary therapeutic framework. FFF is a present-focused, salutogenic model that prioritizes nervous system regulation, meaning-making, and strengths-based care. Clients build capacity through breathwork, somatic awareness, and attentional practices before engaging in deeper trauma processing.',
  },
  {
    title: 'Somatic Experiencing',
    description:
      'Trauma lives in the body as much as in the mind. Somatic Experiencing helps clients tune into physical sensations, release stored tension, and restore the nervous system\'s natural capacity for self-regulation.',
  },
  {
    title: 'Polyvagal-Informed Care',
    description:
      'Drawing from Polyvagal Theory, our clinicians help clients understand their nervous system states — fight, flight, freeze, and social engagement — becoming the foundation for recognizing triggers and returning to safety.',
  },
  {
    title: 'Psychoeducation & Reframing',
    description:
      'Clients learn to understand urges and cravings through the intrusion, arousal, avoidance cycle — reframing substance use as a predictable response to dysregulation rather than a failure of willpower.',
  },
  {
    title: 'Experiential & Community Groups',
    description:
      'FFF is delivered through a combination of psychoeducation, experiential groups, and community engagement. Shared experience builds relational connection and reinforces the safety needed for healing.',
  },
  {
    title: 'Body-Based Interventions',
    description:
      'From breathwork and movement therapy to equine-assisted experiences and sensory grounding techniques, our body-based interventions reconnect clients with their physical selves.',
  },
];

export const meta: MetaFunction = () => [
  { title: "TraumAddiction® | Seven Arrows Recovery" },
  { name: "description", content: "Seven Arrows Recovery's TraumAddiction® approach treats trauma and addiction as one integrated condition using the Forward-Facing Freedom® model — a salutogenic framework rooted in nervous system regulation and meaning-making." },
];

export default function TraumAddictionPage() {
  return (
    <>
      <PageHero
        label="TraumAddiction®"
        title="Trauma & Addiction Are One Condition"
        description="TraumAddiction® is our integrated model for treating trauma and substance use together — not as separate conditions, but as deeply interconnected challenges that require a unified, salutogenic approach."
        image="/images/embrace-connection.jpg"
      />

      {/* The Problem */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <p className="section-label mb-4">The Clinical Gap</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Traditional Models Fall Short
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Trauma and addiction have historically been treated as separate clinical domains.
              Trauma-focused therapies often rely on exposure and memory processing, which may
              destabilize individuals in early recovery due to increased arousal and craving
              activation. Meanwhile, substance use treatment prioritizes stabilization, often
              delaying trauma work indefinitely.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              This creates a gap where trauma remains unaddressed while addiction persists.
              The ACE study demonstrated that individuals with higher adverse childhood experience
              scores show significantly increased risk for both addiction and mental health challenges
              — confirming what our clinicians see every day: these conditions cannot be separated.
            </p>
          </div>

          {/* Reframe block */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 lg:p-12 shadow-sm">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Addiction as a Post-Traumatic Adaptation
            </h3>
            <p
              className="text-foreground/70 leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              At Seven Arrows, we do not view addiction as moral failure. Substance use can be
              understood as a <strong>functional adaptation</strong> that regulates overwhelming
              emotional and physiological states — functioning as dissociation, numbing distress,
              or modulating nervous system activation.
            </p>
            <p
              className="text-foreground/70 leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Research indicates that trauma impacts interoception, emotional regulation, and
              autonomic functioning. By recognizing addiction as an adaptive capacity rather than
              a character defect, we remove shame and open the door to genuine, lasting healing.
            </p>
          </div>
        </div>
      </section>

      {/* Salutogenic Framework */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label justify-center mb-4">The Science of Health Creation</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              A Salutogenic Approach
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our approach draws from <strong>salutogenesis</strong> — a paradigm introduced by
              Aaron Antonovsky that shifts the focus from what makes people sick to what actively
              creates health. Central to this model is the <strong>Sense of Coherence</strong>: the
              feeling that life is comprehensible, manageable, and meaningful.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Comprehensibility',
                subtitle: 'Understanding Your Nervous System',
                description: 'Develop awareness of the autonomic nervous system and the threat response. Understand urges and cravings as predictable responses to dysregulation — not failures of willpower.',
              },
              {
                title: 'Manageability',
                subtitle: 'Building Self-Regulation',
                description: 'Cultivate self-regulation through neuroception, interoception, and acute relaxation strategies. Intentionally interrupt threat responses to return to physiological safety.',
              },
              {
                title: 'Meaningfulness',
                subtitle: 'Living With Purpose',
                description: 'Develop a personal code of honor, mission statement, and vision for recovery. Engage with life\'s challenges as purposeful and worthy of sustained investment.',
              },
            ].map((domain) => (
              <div key={domain.title} className="bg-warm-bg rounded-2xl p-8">
                <h3 className="text-xl font-bold text-foreground mb-1">{domain.title}</h3>
                <p className="text-primary text-sm font-medium mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                  {domain.subtitle}
                </p>
                <p className="text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
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
              Stabilize. Understand. Grow.
            </h2>
            <p
              className="text-white/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Forward-Facing Freedom is a present-focused model developed by J. Eric Gentry, PhD
              and Lindsay Rothschild, LCSW. Rather than beginning with retrospective trauma
              processing, FFF builds capacity first — creating the neurological foundation needed
              for deep, lasting change.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { title: 'Stabilize', description: 'Regulate the nervous system through breathwork, somatic awareness, and acute relaxation strategies before engaging in deeper processing.' },
              { title: 'Understand', description: 'Develop awareness of internal cues, reframe cravings as nervous system activation states, and build a coherent narrative of recovery.' },
              { title: 'Grow', description: 'Cultivate post-traumatic growth through meaning-making, values-driven living, and strengthened relational connection.' },
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

      {/* Clinical Modalities */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label justify-center mb-4">Clinical Modalities</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              How We Deliver TraumAddiction® Care
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {clinicalApproaches.map((item) => (
              <div key={item.title} className="bg-warm-bg rounded-2xl p-8">
                <h3 className="text-lg font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-foreground/70 leading-relaxed text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Start Healing Today
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            You don&apos;t have to carry the weight of trauma alone. Our TraumAddiction® approach,
            grounded in Forward-Facing Freedom, offers a practical and compassionate path forward.
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
