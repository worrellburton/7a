import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alumni & Aftercare | Seven Arrows Recovery',
  description:
    'Seven Arrows Recovery provides continuing care, alumni support, aftercare planning, and relapse prevention resources to sustain your recovery long after treatment ends.',
};

import PageHero from "@/components/PageHero";
import Link from 'next/link';

export default function AlumniAftercarePage() {
  return (
    <>
      <PageHero
        label="Treatment Programs"
        title="Alumni & Aftercare"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Treatment', href: '/treatment' },
          { label: 'Alumni & Aftercare' },
        ]}
        description="Recovery does not end when you leave our facility. Seven Arrows Recovery offers a robust alumni network and individualized aftercare planning to help you build a fulfilling, substance-free life for years to come."
        image="/images/group-gathering-pavilion.jpg"
      />

      {/* Continuing Care Overview */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Continuing Care</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Support That Extends Beyond Treatment
          </h2>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p
                className="text-foreground/70 leading-relaxed text-lg mb-6"
                style={{ fontFamily: "var(--font-body)" }}
              >
                The transition from residential treatment back to everyday life is
                one of the most vulnerable periods in recovery. Without a clear
                plan and a strong support system, even the most motivated
                individuals can struggle. Our continuing care program bridges the
                gap between the structured environment of treatment and the
                independence of daily living.
              </p>
              <p
                className="text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Before you leave Seven Arrows, your clinical team works with you
                to develop a comprehensive aftercare plan tailored to your unique
                needs, goals, and circumstances. This plan becomes your roadmap
                for sustained recovery, covering everything from outpatient
                resources to sober living recommendations and ongoing therapy.
              </p>
            </div>
            <div className="bg-warm-card rounded-2xl p-8">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Aftercare Includes
              </h3>
              <ul className="space-y-4">
                {[
                  "Individualized aftercare plan developed before discharge",
                  "Referrals to outpatient therapists and support groups",
                  "Sober living placement assistance when needed",
                  "Ongoing relapse prevention strategies and tools",
                  "Regular check-ins with your Seven Arrows clinical team",
                  "Access to the Seven Arrows alumni network",
                  "Family support resources and guidance",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-foreground/70"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Alumni Network */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Alumni Network</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            A Community That Understands
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg mb-12"
            style={{ fontFamily: "var(--font-body)" }}
          >
            When you complete treatment at Seven Arrows Recovery, you become part
            of a lifelong community. Our alumni network connects graduates with
            one another, providing peer support, accountability, and shared
            experiences that reinforce recovery.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Alumni Events",
                description:
                  "Regular gatherings, both virtual and in-person, that keep you connected to the Seven Arrows community and provide opportunities for fellowship and growth.",
              },
              {
                title: "Peer Mentorship",
                description:
                  "Connect with alumni who have walked the same path. Our peer mentorship program pairs newer graduates with experienced members for guidance and encouragement.",
              },
              {
                title: "Online Community",
                description:
                  "A private online platform where alumni can share milestones, ask for support, and stay engaged with the recovery community no matter where life takes them.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-warm-card rounded-2xl p-8">
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Relapse Prevention */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Relapse Prevention</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Tools for Long-Term Sobriety
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg mb-6"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Relapse is not a sign of failure; it is a signal that your recovery
            plan needs adjustment. Our relapse prevention programming equips you
            with practical skills and strategies to recognize warning signs early,
            manage triggers, and take decisive action before a lapse becomes a
            relapse.
          </p>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg"
            style={{ fontFamily: "var(--font-body)" }}
          >
            From cognitive-behavioral coping techniques to mindfulness practices
            and emergency contact plans, your relapse prevention toolkit is built
            during treatment and refined throughout your aftercare journey. If
            challenges arise, our team is just a phone call away.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-dark-section text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Recovery Is a Lifelong Journey
          </h2>
          <p
            className="text-white/70 leading-relaxed text-lg mb-10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Whether you are considering treatment for the first time or looking
            for stronger aftercare support, our admissions team is here to help.
            Call us today to learn how Seven Arrows Recovery can support your
            long-term sobriety.
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
    </>
  );
}
