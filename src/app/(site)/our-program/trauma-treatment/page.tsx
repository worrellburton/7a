import type { Metadata } from 'next';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Forward-Facing® Accelerated Recovery Treatment | Seven Arrows Recovery',
  description:
    'Forward-Facing® Accelerated Recovery (FF-AR) treatment in Arizona — trauma-informed residential care that addresses addiction at its root. Call (866) 718-1665.',
};

import PageHero from '@/components/PageHero';
import ClinicalGap from '@/components/trauma/ClinicalGap';
import PostTraumaticAdaptation from '@/components/trauma/PostTraumaticAdaptation';
import SocDomains from '@/components/trauma/SocDomains';
import WisdomGallery from '@/components/trauma/WisdomGallery';
import ClinicalModalities from '@/components/trauma/ClinicalModalities';
import PostTraumaticGrowth from '@/components/trauma/PostTraumaticGrowth';
import TraumaCTA from '@/components/trauma/TraumaCTA';

export default function TraumaTreatmentPage() {
  return (
    <main>
      {/* Phase 1 — shared video-backdrop hero for consistency with
          every other inner page. The Swisshelm mp4 loops under the
          scrim on first paint. */}
      <PageHero
        label="Forward-Facing® Accelerated Recovery Treatment"
        title={[
          { text: 'Healing trauma at ' },
          { text: 'the root', accent: true },
          { text: ' of recovery.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our Program', href: '/our-program' },
          { label: 'Trauma Treatment' },
        ]}
        description="The Forward-Facing® Accelerated Recovery (FF-AR) model is an integrative, salutogenic approach to treating trauma and addiction simultaneously — grounded in the understanding that addiction is a post-traumatic adaptive capacity, not a pathology to be eliminated. FF-AR addresses both at once without overwhelming the nervous system: rather than intensive memory processing early in recovery, it emphasizes neuroception, interoceptive awareness, and the gradual expansion of capacity as the foundation of healing and relapse prevention."
        attribution="Forward-Facing Accelerated Recovery (FF-AR) is an adapted application of the Forward-Facing Freedom® model developed by Dr. J. Eric Gentry. The FF-AR model was collaboratively developed and is jointly owned by Dr. Eric Gentry and Lindsay Rothschild for use in trauma and addiction recovery settings."
        ctas={[
          {
            kind: 'phone',
            display: '(866) 718-1665',
            eyebrow: 'Clinical line · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'See the plan' },
        ]}
      />

      {/* Guiding Principles of a Trauma-Informed Approach — SAMHSA's
          six TIC principles, with our interpretation under each. */}
      <section
        id="guiding-principles-of-trauma-informed-care"
        className="bg-warm-bg/40 py-20 lg:py-28"
        aria-labelledby="tic-principles-heading"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p
            className="text-[11px] font-semibold tracking-[0.22em] uppercase text-primary mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            How we practice it
          </p>
          <h2
            id="tic-principles-heading"
            className="text-foreground font-bold tracking-tight mb-5"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.6vw, 2.8rem)', lineHeight: 1.05 }}
          >
            Guiding Principles of a Trauma-Informed Approach
          </h2>
          <p
            className="text-foreground/70 text-sm leading-relaxed max-w-3xl mb-12"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Trauma-Informed Care (TIC) is guided by six core principles developed by the{' '}
            <a
              href="https://stacks.cdc.gov/view/cdc/56843"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              Substance Abuse and Mental Health Services Administration (SAMHSA)
            </a>
            . Here is how we interpret and implement those principles at Seven Arrows.
          </p>

          <ol className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {[
              {
                n: 1,
                title: 'Safety',
                body: "We prioritize the safety of our client's nervous system and listen to the stories of the nervous system. We create environments where people feel physically and psychologically secure, recognizing that trauma impacts safety needs.",
              },
              {
                n: 2,
                title: 'Trustworthiness and Transparency',
                body: 'We build trust by keeping decisions, expectations, and procedures concise and predictable for clients and staff. We integrate healing practices into our own lives and leadership, recognizing our nervous-system regulation as the miracle intervention.',
              },
              {
                n: 3,
                title: 'Connection and Community',
                body: 'We value the healing power of connection and lived experience. Peer support is rooted in community, mutual understanding, and shared humanity. Our staff are encouraged to engage in their own healing journeys so they can offer authentic presence and empathy — honoring that no one heals in isolation.',
              },
              {
                n: 4,
                title: 'Collaboration',
                body: 'Healing is a shared process grounded in partnership and respect. We intentionally share power, honor lived experience, and recognize that healing happens through relationships, not in a hierarchy. By focusing on a person’s history of survival and movement through trauma, we understand behaviors as expressions of capacity and competency rather than pathology or disease.',
              },
              {
                n: 5,
                title: 'Empowerment',
                body: 'We center choice, voice, and personal agency by emphasizing strengths, resilience, and the innate capacity for active adaptation. We view health as a continuum and healing as a process of incremental movement toward greater wellbeing and functionality. We listen for competence and capacity within each person’s story to support transformation toward health rather than defining individuals by pathology or brokenness.',
              },
              {
                n: 6,
                title: 'Cultural, Historical, and Gender Responsiveness',
                body: 'We honor the whole person by recognizing how culture, identity, history, and lived experience shape healing. This includes acknowledging the impact of historical harm, discrimination, and intergenerational trauma. We work with humility to reduce bias, listen deeply, and offer care and connections that respect each person’s background and dignity, enhancing their sense of belonging.',
              },
            ].map((p) => (
              <li
                key={p.n}
                className="relative rounded-2xl border border-black/8 bg-white p-6 shadow-[0_8px_24px_-18px_rgba(60,48,42,0.18)]"
              >
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold mb-3"
                  aria-hidden="true"
                >
                  {p.n}
                </span>
                <h3
                  className="text-foreground font-bold tracking-tight mb-2"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1.2 }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-foreground/70 text-[15px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {p.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {/* Phase 2 — The Clinical Gap, animated SVG glyph section. */}
      <ClinicalGap />

      {/* Phase 3 — Post-Traumatic Adaptation: full-bleed photo +
          overlay card + ACE stats that count up on scroll-in. */}
      <PostTraumaticAdaptation />

      {/* Phase 4 — Forward-Facing Accelerated Recovery three SOC domains with
          custom animated SVG diagrams per domain. */}
      <SocDomains />

      {/* Phase 5 — four full-bleed photos carrying overlaid wisdom
          quotes about trauma-informed recovery. */}
      <WisdomGallery />

      {/* Phase 6 — Clinical Modalities bento layout with photo anchor
          and flagship Forward-Facing® Accelerated Recovery feature tile. */}
      <ClinicalModalities />

      {/* Phase 7 — Treatment timeline removed per leadership: the
          "Twelve weeks, paced to the nervous system" stepper
          implied a fixed schedule that doesn't match how we
          sequence stays in practice. The TreatmentTimeline
          component file is preserved for future reuse. */}

      {/* Phase 8 — Post-Traumatic Growth: parallax photo + three
          counting-up outcome stats. */}
      <PostTraumaticGrowth />

      {/* Phase 9 — Alumni voices section removed under the
          real-reviews-only policy (was hardcoded fabricated quotes). */}

      {/* Phase 10 — WebGL aurora CTA with trust line. */}
      <TraumaCTA />
    </main>
  );
}
