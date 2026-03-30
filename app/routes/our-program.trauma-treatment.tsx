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
      'Trauma lives in the body as much as in the mind. Somatic Experiencing helps clients tune into physical sensations, release stored tension, and restore the nervous system\'s natural capacity for self-regulation. This body-first approach is especially effective for complex trauma.',
  },
  {
    title: 'Polyvagal-Informed Care',
    description:
      'Drawing from Polyvagal Theory, our clinicians help clients understand their nervous system states — fight, flight, freeze, and social engagement. This awareness becomes the foundation for recognizing triggers, interrupting threat responses, and returning to states of physiological safety.',
  },
  {
    title: 'Psychoeducation & Reframing',
    description:
      'Clients learn to understand urges and cravings through the intrusion, arousal, avoidance cycle — reframing substance use as a predictable response to dysregulation rather than a failure of willpower. This knowledge removes shame and empowers self-regulation.',
  },
  {
    title: 'Experiential & Community Groups',
    description:
      'FFF is delivered through a combination of psychoeducation, experiential groups, and community engagement. Shared experience builds relational connection and reinforces the safety needed for healing.',
  },
  {
    title: 'Body-Based Interventions',
    description:
      'From breathwork and movement therapy to equine-assisted experiences and sensory grounding techniques, our body-based interventions reconnect clients with their physical selves and build the resilience that supports lasting recovery.',
  },
];

export const meta: MetaFunction = () => [
  { title: "TraumAddiction® Treatment | Forward-Facing Freedom® | Seven Arrows Recovery" },
  { name: "description", content: "Seven Arrows Recovery's TraumAddiction® approach treats trauma and addiction as one integrated condition using the Forward-Facing Freedom® model — a salutogenic framework rooted in nervous system regulation, somatic awareness, and meaning-making." },
];

export default function TraumaTreatmentPage() {
  return (
    <main>
      <PageHero
        label="TraumAddiction® Treatment"
        title="Healing Trauma at the Root"
        description="Addiction rarely exists in isolation. Our TraumAddiction® approach treats trauma and substance use as one integrated condition through the Forward-Facing Freedom® model — unlocking deeper and more lasting healing."
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
              This creates a clinical gap where trauma remains unaddressed while addiction persists.
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

      {/* Forward-Facing Freedom */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              The Forward-Facing Freedom® Approach
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Stabilize. Understand. Grow.
            </h2>
            <p
              className="text-white/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Forward-Facing Freedom is a present-focused, salutogenic model developed by
              J. Eric Gentry, PhD and Lindsay Rothschild, LCSW. Rather than beginning with
              retrospective trauma processing, FFF builds capacity first — creating the
              neurological foundation needed for deep, lasting change.
            </p>
          </div>

          {/* Three SOC domains */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Comprehensibility',
                description: 'Develop a coherent understanding of your nervous system. Learn to recognize the threat response and how to interrupt it. Understand urges and cravings as predictable responses to dysregulation — not failures of willpower.',
              },
              {
                title: 'Manageability',
                description: 'Cultivate self-regulation through neuroception, interoception, and acute relaxation strategies. Intentionally interrupt adaptive threat responses to return to physiological safety, enhancing emotional regulation and behavioral effectiveness.',
              },
              {
                title: 'Meaningfulness',
                description: 'Develop a personal code of honor, mission statement, and vision for your life and recovery. Engage with life\'s challenges as purposeful and worthy of sustained investment through intentional, values-driven living.',
              },
            ].map((domain, i) => (
              <div key={domain.title} className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center mb-5">
                  <span className="text-primary font-bold">{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold mb-3">{domain.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  {domain.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clinical Approaches */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <p className="section-label mb-4">Clinical Modalities</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              How We Deliver TraumAddiction® Care
            </h2>
            <p
              className="text-foreground/70 leading-relaxed text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              In our residential setting, TraumAddiction® treatment is delivered through
              an integrated combination of clinical modalities — all aligned with the
              Forward-Facing Freedom framework and trauma-informed principles of safety,
              empowerment, and collaboration.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {clinicalApproaches.map((item) => (
              <div
                key={item.title}
                className="bg-warm-bg rounded-2xl p-8"
              >
                <h3 className="text-lg font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed text-sm"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Post-Traumatic Growth */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label justify-center mb-4">Beyond Recovery</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Post-Traumatic Growth
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Forward-Facing Freedom does not just aim for symptom reduction. The model actively
            supports post-traumatic growth — including increased resilience, deeper meaning,
            and strengthened relational connection. By supporting safety, awareness, and
            intention, FFF enables clients to move forward in recovery with purpose.
          </p>
          <p
            className="text-foreground/70 text-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            This represents a paradigm shift in TraumAddiction treatment: from managing illness
            to actively creating health. From reducing shame to building coherence. From surviving
            to thriving.
          </p>
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
            Reach out to our admissions team to learn how we can help you reclaim your life.
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
    </main>
  );
}
