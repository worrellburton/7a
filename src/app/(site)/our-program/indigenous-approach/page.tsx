import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Indigenous Approach | Seven Arrows Recovery',
  description:
    'Experience traditional healing practices at Seven Arrows Recovery. Sweat lodge ceremonies, connection to the land, and culturally integrated recovery in the Arizona high desert.',
};

import PageHero from '@/components/PageHero';
import GeoAnswer from '@/components/seo/GeoAnswer';
import Link from 'next/link';
import { faqPageSchema, medicalWebPageSchema, jsonLdScript } from '@/lib/seo/pageSchema';

const faqJsonLd = faqPageSchema([
  {
    q: 'Are there rehabs that use indigenous or holistic practices?',
    a: 'Yes. Seven Arrows Recovery is a JCAHO-accredited residential addiction treatment program in Cochise County, Arizona that integrates indigenous and holistic practices — sweat lodge ceremony, talking circles, smudging, drumming, storytelling, and land-based work — alongside evidence-based clinical care, held respectfully and facilitated by experienced practitioners.',
  },
  {
    q: 'Is the sweat lodge a required part of treatment?',
    a: 'No. All ceremonial and indigenous practices are offered as invitations, not requirements. Clients opt in when and if it is clinically and personally appropriate. Clinical care remains the foundation of the program.',
  },
  {
    q: 'How are indigenous practices integrated respectfully?',
    a: 'Ceremonial elements are held by experienced practitioners and woven through clinical care, not presented as an aesthetic layer. Seven Arrows treats these practices as a living tradition — used only where it honors the cultural lineage and supports the clinical goals.',
  },
]);

const webPageJsonLd = medicalWebPageSchema({
  url: 'https://sevenarrowsrecovery.com/our-program/indigenous-approach',
  name: 'Rehabs that use indigenous or holistic practices — Seven Arrows Recovery',
  description:
    'Residential addiction treatment in Arizona that integrates indigenous and holistic practices — sweat lodge, talking circles, land-based ceremony — with evidence-based clinical care.',
  about: [
    { type: 'MedicalTherapy', name: 'Holistic Therapy' },
    { type: 'MedicalTherapy', name: 'Residential Addiction Treatment' },
  ],
});

const practices = [
  {
    title: 'Sweat Lodge Ceremonies',
    description:
      'The sweat lodge is a sacred space for purification, prayer, and renewal. Guided by experienced practitioners, these ceremonies offer clients a profound opportunity for spiritual cleansing, emotional release, and connection to something greater than themselves.',
  },
  {
    title: 'Connection to the Land',
    description:
      'Nestled at the base of the Swisshelm Mountains in southern Arizona, our campus invites clients to reconnect with the natural world. Walking the desert trails, sitting beneath vast skies, and witnessing the rhythms of the land become powerful tools for grounding and healing.',
  },
  {
    title: 'Traditional Healing Practices',
    description:
      'Drawing from time-honored indigenous wisdom, we incorporate practices such as talking circles, smudging, drumming, and storytelling into our programming. These traditions foster community, self-reflection, and a deeper sense of meaning in the recovery journey.',
  },
  {
    title: 'Cultural Integration',
    description:
      'Our indigenous approach is woven respectfully throughout the treatment experience, not separated from clinical care. By integrating traditional wisdom with modern therapeutic methods, we honor the whole person \u2014 mind, body, spirit, and community.',
  },
];

export default function IndigenousApproachPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(webPageJsonLd)} />
      <PageHero
        label="Indigenous Approach"
        title={[
          { text: 'Rooted in ' },
          { text: 'ancient wisdom', accent: true },
          { text: '.' },
        ]}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Our Program', href: '/our-program' },
          { label: 'Indigenous Approach' },
        ]}
        description="At Seven Arrows Recovery, we honor indigenous healing traditions as a vital part of the recovery journey. The land, the ceremonies, and the wisdom of generations past guide our clients toward deep, lasting transformation."
        image="/images/campfire-ceremony-circle.webp"
        ctas={[
          {
            kind: 'phone',
            display: '(866) 996-4308',
            eyebrow: 'Admissions · 24/7',
          },
          { kind: 'link', href: '/admissions', label: 'Begin admissions' },
        ]}
      />

      <GeoAnswer
        id="rehabs-that-use-indigenous-or-holistic-practices"
        question="Rehabs that use indigenous or holistic practices"
        answer={
          <p>
            Seven Arrows Recovery is a JCAHO-accredited residential rehab in Arizona that
            integrates indigenous and holistic practices — sweat lodge ceremony, talking
            circles, smudging, drumming, storytelling, and land-based ceremony — directly into
            a clinical program grounded in the TraumAddiction&reg; model. Ceremonial work is
            held by experienced practitioners and offered as invitation, not requirement,
            threaded respectfully through evidence-based individual and group therapy.
          </p>
        }
        bullets={[
          { label: 'Sweat lodge', body: 'Traditional sweat lodge ceremony held by experienced practitioners — offered, not required.' },
          { label: 'Land-based work', body: 'Desert trails, silence, sky, seasonal rhythm — the Cochise County campus is part of the medicine.' },
          { label: 'Talking circles + storytelling', body: 'Community-held groups informed by indigenous traditions; woven alongside CBT/DBT, EMDR, somatic work.' },
          { label: 'Respectful integration', body: 'Ceremonies treated as living traditions — never aestheticized, always held with cultural grounding.' },
        ]}
      />


      {/* Introduction */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Healing Through Tradition
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Long before modern medicine, indigenous peoples understood that
              true healing requires attention to the spirit as much as the body.
              At Seven Arrows Recovery, we carry this understanding into
              everything we do &mdash; creating space for clients to experience
              the transformative power of ceremony, community, and connection to
              the natural world.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our approach is guided by deep respect for the traditions we draw
              from and a commitment to offering these experiences in a way that
              is authentic, inclusive, and meaningful.
            </p>
          </div>

          {/* Practices */}
          <div className="grid md:grid-cols-2 gap-8">
            {practices.map((item) => (
              <div
                key={item.title}
                className="bg-warm-card rounded-2xl p-8 shadow-sm"
              >
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-warm-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Experience the Healing Power of the Land
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Discover how indigenous healing traditions can open new pathways to
            recovery. Our admissions team is here to answer your questions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link href="/contact" className="btn-primary">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
