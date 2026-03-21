import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Interventions | Seven Arrows Recovery",
  description:
    "Professional intervention services at Seven Arrows Recovery help families guide loved ones toward treatment through a compassionate, structured process with expert support.",
};

export default function InterventionsPage() {
  return (
    <>
      <PageHero
        label="Treatment Programs"
        title="Interventions"
        description="When someone you love is struggling with addiction and is not yet ready to seek help, a professional intervention can be the turning point. Our intervention specialists guide families through a compassionate, structured process that opens the door to treatment."
      />

      {/* Overview */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Professional Guidance</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Expert Intervention Services
          </h2>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p
                className="text-foreground/70 leading-relaxed text-lg mb-6"
                style={{ fontFamily: "var(--font-body)" }}
              >
                An intervention is a carefully planned conversation in which
                family members, friends, and a trained professional come together
                to help a person recognize the impact of their addiction and
                accept treatment. Without professional guidance, these
                conversations can escalate or stall. Our intervention specialists
                bring structure, expertise, and empathy to ensure the best
                possible outcome.
              </p>
              <p
                className="text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: "var(--font-body)" }}
              >
                At Seven Arrows Recovery, we work closely with families before,
                during, and after the intervention. We help you prepare
                emotionally, set healthy boundaries, and create a clear plan so
                that when your loved one says yes, the path to treatment is
                already in place.
              </p>
            </div>
            <div className="bg-warm-card rounded-2xl p-8">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Our Intervention Approach
              </h3>
              <ul className="space-y-4">
                {[
                  "Certified, experienced intervention professionals",
                  "Family education and preparation sessions",
                  "Compassionate, non-confrontational methodology",
                  "Customized intervention plans for each situation",
                  "Coordination of travel and treatment logistics",
                  "Post-intervention family support and guidance",
                  "Immediate transition into treatment upon acceptance",
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

      {/* The Guided Process */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">The Guided Process</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            How a Professional Intervention Works
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg mb-12"
            style={{ fontFamily: "var(--font-body)" }}
          >
            A successful intervention is the result of thoughtful preparation.
            Here is how we walk families through each stage of the process.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Initial Consultation",
                description:
                  "We speak privately with the family to understand the situation, assess the severity of addiction, and determine the best approach.",
              },
              {
                step: "02",
                title: "Family Preparation",
                description:
                  "Family members participate in coaching sessions where they learn how to express concern, set boundaries, and stay focused on love and support.",
              },
              {
                step: "03",
                title: "The Intervention",
                description:
                  "Our specialist facilitates the conversation, guiding each participant and keeping the discussion productive, compassionate, and on track.",
              },
              {
                step: "04",
                title: "Transition to Care",
                description:
                  "When your loved one agrees to treatment, we coordinate immediate travel and admission so there is no delay between acceptance and action.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-warm-card rounded-2xl p-6">
                <span className="text-primary font-bold text-3xl mb-4 block">
                  {item.step}
                </span>
                <h3 className="text-lg font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed text-sm"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Family Involvement */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Family Involvement</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Healing Is a Family Journey
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg mb-6"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Addiction affects every member of the family. Our intervention
            process does more than help your loved one enter treatment; it
            begins the healing process for the entire family system. We provide
            education about addiction as a disease, guidance on establishing
            healthy boundaries, and resources to support your own well-being
            throughout your loved one&apos;s recovery journey.
          </p>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg"
            style={{ fontFamily: "var(--font-body)" }}
          >
            After the intervention, we remain available to the family for
            ongoing support, answering questions and connecting you with
            resources that can help you navigate the weeks and months ahead.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-dark-section text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Help Your Loved One Find Recovery
          </h2>
          <p
            className="text-white/70 leading-relaxed text-lg mb-10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            If someone you care about is struggling with addiction, you do not
            have to face it alone. Our intervention team is ready to help.
            Reach out today for a confidential consultation.
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
