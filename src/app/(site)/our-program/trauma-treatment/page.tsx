import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TraumAddiction® Treatment | Forward-Facing Freedom® | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery',
};

import TraumaHero from '@/components/trauma/TraumaHero';
import ClinicalGap from '@/components/trauma/ClinicalGap';
import PostTraumaticAdaptation from '@/components/trauma/PostTraumaticAdaptation';
import SocDomains from '@/components/trauma/SocDomains';
import WisdomGallery from '@/components/trauma/WisdomGallery';
import Link from 'next/link';

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

export default function TraumaTreatmentPage() {
  return (
    <main>
      {/* Phase 1: cinematic WebGL-aurora hero. Replaces the generic
          PageHero on this page only; all other inner pages still use
          the shared PageHero component. */}
      <TraumaHero />

      {/* Phase 2: The Clinical Gap — animated SVG glyph section */}
      <ClinicalGap />

      {/* Phase 3: Post-Traumatic Adaptation — full-bleed photo +
          overlay card + ACE stats that count up on scroll-in */}
      <PostTraumaticAdaptation />

      {/* Phase 4: Forward-Facing Freedom three SOC domains with
          custom animated SVG diagrams per domain */}
      <SocDomains />

      {/* Phase 5: four full-bleed photos carrying overlaid wisdom
          quotes about trauma-informed recovery */}
      <WisdomGallery />

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
            <Link href="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
