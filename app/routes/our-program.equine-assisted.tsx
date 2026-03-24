import PageHero from '~/components/PageHero';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const experiences = [
  {
    title: 'Horse Therapy',
    description:
      'Working with horses offers a unique mirror for human emotion. Horses are highly attuned to body language and energy, providing immediate, honest feedback that helps clients become more aware of their emotional states. Through grooming, leading, and simply being present with these powerful animals, clients access a form of healing that talk therapy alone cannot reach.',
  },
  {
    title: 'Emotional Regulation',
    description:
      'Horses respond to calm, centered energy and become unsettled around tension or fear. This dynamic teaches clients to regulate their emotions in real time. Learning to approach a horse with steadiness and intention translates directly into the ability to manage cravings, anxiety, and emotional triggers in daily life.',
  },
  {
    title: 'Trust Building',
    description:
      'Addiction erodes trust &mdash; trust in others and trust in oneself. Building a relationship with a horse requires patience, consistency, and vulnerability. As clients earn the trust of their equine partners, they begin to rebuild their own capacity for trust, laying the groundwork for healthier relationships in recovery.',
  },
  {
    title: 'Outdoor Healing',
    description:
      'Our equine program takes place in the open landscape of southern Arizona, surrounded by mountains and desert sky. Stepping out of a clinical setting and into the natural world lowers stress, promotes mindfulness, and reminds clients of the beauty and possibility that exist beyond addiction.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Equine-Assisted Experience | Seven Arrows Recovery" },
  { name: "description", content: "Discover equine-assisted therapy at Seven Arrows Recovery. Horse therapy promotes emotional regulation, trust building, and outdoor healing in the Arizona high desert." },
];

export default function EquineAssistedPage() {
  return (
    <main>
      <PageHero
        label="Equine-Assisted Experience"
        title="Healing Through Connection with Horses"
        description="At Seven Arrows Recovery, our equine-assisted program offers a powerful, experiential approach to healing. Working with horses in the Arizona high desert, clients discover new pathways to emotional growth, self-awareness, and lasting recovery."
        image="/7a/images/equine-therapy-portrait.jpg"
      />

      {/* Introduction */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Why Equine Therapy Works
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed mb-4"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Equine-assisted therapy is one of the most effective experiential
              modalities in addiction treatment. Horses are prey animals with a
              heightened sensitivity to emotional energy, making them remarkable
              partners in the therapeutic process. They do not judge, they do
              not hold grudges, and they respond only to what is happening in
              the present moment.
            </p>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              For clients who struggle to connect in traditional therapy
              settings, the barn and the arena often become the place where
              breakthroughs happen. Our trained equine specialists and licensed
              therapists work together to create safe, structured sessions that
              meet each client where they are.
            </p>
          </div>

          {/* Experiences */}
          <div className="grid md:grid-cols-2 gap-8">
            {experiences.map((item) => (
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
            Experience Equine-Assisted Healing
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Discover how working with horses can open new doors in your
            recovery. Our admissions team is here to answer your questions and
            help you get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
            <Link to="/contact" className="btn-primary">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
