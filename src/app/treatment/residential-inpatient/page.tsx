import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Residential Inpatient Treatment | Seven Arrows Recovery",
  description:
    "Our 30-to-90-day residential inpatient program offers 24/7 support, a 6:1 client-to-staff ratio, and a structured daily schedule in a small group setting at Seven Arrows Recovery.",
};

export default function ResidentialInpatientPage() {
  return (
    <>
      <PageHero
        label="Treatment Programs"
        title="Residential Inpatient"
        description="Immerse yourself in recovery with our residential inpatient program, designed for individuals who need round-the-clock clinical support in a safe, structured environment at the base of the Swisshelm Mountains."
      />

      {/* Program Overview */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Program Overview</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            30 to 90 Days of Focused Recovery
          </h2>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p
                className="text-foreground/70 leading-relaxed text-lg mb-6"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Our residential inpatient program provides the time and space
                necessary for deep, lasting change. With stays ranging from 30 to
                90 days, your treatment plan is individualized to address the
                unique factors driving your addiction. You will live on-site at
                our boutique facility, surrounded by the quiet beauty of
                southern Arizona, with a dedicated clinical team guiding you
                every step of the way.
              </p>
              <p
                className="text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Unlike large-scale treatment centers, Seven Arrows maintains a
                deliberately small census. Our 6:1 client-to-staff ratio ensures
                that you receive genuinely personalized care. Every therapist,
                counselor, and support staff member knows your name, your story,
                and your goals.
              </p>
            </div>
            <div className="bg-warm-card rounded-2xl p-8">
              <h3 className="text-xl font-bold text-foreground mb-6">
                Program Highlights
              </h3>
              <ul className="space-y-4">
                {[
                  "30-to-90-day individualized treatment plans",
                  "Small group setting with a maximum 6:1 client-to-staff ratio",
                  "24/7 on-site clinical and residential support",
                  "Evidence-based individual and group therapy",
                  "Proprietary TraumAddiction\u2122 approach",
                  "Holistic and experiential therapies",
                  "Comfortable, home-like living environment",
                  "Structured daily schedule with purposeful downtime",
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

      {/* Daily Schedule */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">What to Expect</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            A Structured Daily Schedule
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg mb-12"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Structure is foundational to early recovery. Each day at Seven Arrows
            balances clinical work, wellness activities, personal reflection,
            and community connection. Here is what a typical day looks like:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                time: "Morning",
                activities:
                  "Mindfulness practice, breakfast, morning check-in with clinical staff",
              },
              {
                time: "Mid-Morning",
                activities:
                  "Individual therapy sessions, evidence-based group therapy",
              },
              {
                time: "Afternoon",
                activities:
                  "Holistic therapies, experiential activities, fitness and wellness time",
              },
              {
                time: "Evening",
                activities:
                  "Community dinner, 12-step or support group meeting, journaling and reflection",
              },
            ].map((block) => (
              <div
                key={block.time}
                className="bg-warm-card rounded-2xl p-6"
              >
                <h3 className="text-lg font-bold text-primary mb-2">
                  {block.time}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed text-sm"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {block.activities}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 24/7 Support */}
      <section className="py-20 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Around-the-Clock Care</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            24/7 Support When You Need It
          </h2>
          <p
            className="text-foreground/70 leading-relaxed max-w-3xl text-lg"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Recovery does not follow a schedule. Cravings, anxiety, and
            emotional breakthroughs can happen at any hour. That is why our
            residential team is present around the clock, ensuring that
            professional support is always just a conversation away. Whether it
            is a late-night check-in or an early-morning moment of clarity,
            someone is here for you.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-dark-section text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Take the First Step Today
          </h2>
          <p
            className="text-white/70 leading-relaxed text-lg mb-10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Our admissions team can verify your insurance and help you begin the
            intake process, often within 24 to 48 hours. Call us now or reach
            out online.
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
