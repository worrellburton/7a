import PageHero from "~/components/PageHero";
import { Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

const services = [
  {
    title: "Detoxification",
    href: "/treatment/detoxification",
    description:
      "Medically supervised detox in a safe, comfortable setting with 24/7 medical oversight to help you through the critical first stage of recovery.",
  },
  {
    title: "Residential Inpatient",
    href: "/treatment/residential-inpatient",
    description:
      "Immersive 30-to-90-day residential programs with a 6:1 client-to-staff ratio, providing around-the-clock support in our boutique facility.",
  },
  {
    title: "Interventions",
    href: "/treatment/interventions",
    description:
      "Professional intervention services that guide families through a compassionate, structured process to help loved ones accept treatment.",
  },
  {
    title: "Alumni & Aftercare",
    href: "/treatment/alumni-aftercare",
    description:
      "Continuing care and alumni support that extends your recovery journey well beyond your stay, with relapse prevention planning and community connection.",
  },
];

export const meta: MetaFunction = () => [
  { title: "Treatment | Seven Arrows Recovery" },
  { name: "description", content: "Explore our comprehensive addiction treatment services including detoxification, residential inpatient care, professional interventions, and alumni aftercare programs at Seven Arrows Recovery." },
];

export default function TreatmentPage() {
  return (
    <>
      <PageHero
        label="Our Programs"
        title="Treatment"
        description="Seven Arrows Recovery offers a full continuum of care designed to meet you wherever you are on your recovery journey. From medical detox through alumni aftercare, every program is built around clinical excellence and personal attention."
      />

      {/* Overview */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Comprehensive Care</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            A Full Continuum of Recovery Services
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg mb-12"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Addiction is complex, and lasting recovery demands more than a single
            intervention. At Seven Arrows Recovery we combine medically supervised
            detoxification, intensive residential treatment, professional
            intervention guidance, and long-term aftercare into one seamless
            pathway. Our clinical team tailors each phase to the individual,
            ensuring you receive the right level of care at every step.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service) => (
              <Link
                key={service.href}
                href={service.href}
                className="group block bg-warm-card rounded-2xl p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed mb-4"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {service.description}
                </p>
                <span
                  className="text-primary font-semibold text-sm uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Learn More &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Seven Arrows */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Why Seven Arrows</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Treatment Built Around You
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-10">
            {[
              {
                heading: "Small Group Setting",
                text: "With a maximum of six clients per staff member, you receive the individualized attention that large facilities simply cannot provide.",
              },
              {
                heading: "Evidence-Based Methods",
                text: "Our clinicians integrate proven therapeutic modalities, including our proprietary TraumAddiction\u2122 approach, to address the root causes of addiction.",
              },
              {
                heading: "Seamless Transitions",
                text: "Each phase of care flows naturally into the next. Your treatment team coordinates every transition so there are no gaps in support.",
              },
            ].map((item) => (
              <div key={item.heading}>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {item.heading}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-dark-section text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Begin Your Recovery?
          </h2>
          <p
            className="text-white/70 leading-relaxed text-lg mb-10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Our admissions team is available around the clock to answer your
            questions, verify your insurance, and help you take the first step.
            Call us today or reach out online.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </Link>
            <Link href="/contact" className="btn-outline border-white text-white hover:bg-white hover:text-foreground">
              Contact Us Online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
