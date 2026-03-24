import PageHero from "~/components/PageHero";
import { Link } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [
  { title: "Detoxification | Seven Arrows Recovery" },
  { name: "description", content: "Medically supervised detoxification at Seven Arrows Recovery provides 24/7 medical oversight in a comfortable, safe setting to help you through withdrawal and transition into treatment." },
];

export default function DetoxificationPage() {
  return (
    <>
      <PageHero
        label="Treatment Programs"
        title="Detoxification"
        description="Medical detox is the critical first step in recovery. Our medically supervised detoxification program ensures your safety and comfort as your body clears substances, preparing you for the therapeutic work ahead."
        image="/7a/images/embrace-connection.jpg"
      />

      {/* Overview */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Medically Supervised</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Safe, Comfortable Detox
          </h2>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p
                className="text-foreground/70 leading-relaxed text-lg mb-6"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Withdrawal from drugs or alcohol can be physically dangerous and
                profoundly uncomfortable. At Seven Arrows Recovery, our
                detoxification program is overseen by experienced medical
                professionals who monitor your vitals, manage symptoms, and
                adjust protocols in real time. You are never alone during this
                process.
              </p>
              <p
                className="text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Our comfortable, home-like environment stands in stark contrast
                to the clinical feel of hospital-based detox. You will have a
                private, peaceful space to rest and recover, with nutritious
                meals, calming surroundings, and a compassionate team at your
                side around the clock.
              </p>
            </div>
            <div className="bg-warm-card rounded-2xl p-8">
              <h3 className="text-xl font-bold text-foreground mb-6">
                What Sets Our Detox Apart
              </h3>
              <ul className="space-y-4">
                {[
                  "24/7 medical oversight by trained professionals",
                  "Individualized detox protocols based on substance history",
                  "Medication-assisted symptom management when appropriate",
                  "Comfortable, private setting away from clinical environments",
                  "Nutritional support and hydration management",
                  "Emotional and psychological support throughout",
                  "Seamless transition into residential treatment",
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

      {/* The Process */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">The Process</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            From Intake to Treatment
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg mb-12"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Detox is not the end of treatment; it is the beginning. Our team
            ensures a smooth, coordinated path from medical stabilization into
            the therapeutic environment where lasting recovery takes root.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Medical Assessment",
                description:
                  "Upon arrival, our medical team conducts a comprehensive evaluation of your physical health, substance use history, and any co-occurring conditions to create a personalized detox plan.",
              },
              {
                step: "02",
                title: "Monitored Withdrawal",
                description:
                  "Throughout the withdrawal process, your medical team monitors vitals, manages symptoms with appropriate medications, and adjusts your care plan as needed to keep you safe and comfortable.",
              },
              {
                step: "03",
                title: "Transition to Treatment",
                description:
                  "Once medically stabilized, you transition directly into our residential inpatient program. Your clinical team is already familiar with your history, so therapeutic work can begin immediately.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-warm-card rounded-2xl p-8">
                <span className="text-primary font-bold text-3xl mb-4 block">
                  {item.step}
                </span>
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

      {/* 24/7 Oversight */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Peace of Mind</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            24/7 Medical Oversight
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Withdrawal symptoms can escalate quickly and unpredictably. Our
            medical staff is on-site around the clock, ready to respond to any
            changes in your condition. Vital signs are monitored at regular
            intervals, and our team is equipped to handle both common withdrawal
            symptoms and medical emergencies. Your safety is our foremost
            priority.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-dark-section text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Start With a Safe, Supported Detox
          </h2>
          <p
            className="text-white/70 leading-relaxed text-lg mb-10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Do not attempt to detox alone. Our admissions team can help you
            understand the process and begin intake quickly. Call us now or fill
            out our online form.
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
