import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import PageHero from '~/components/PageHero';
import AdmissionsForm from '~/components/AdmissionsForm';

const steps = [
  {
    number: '01',
    title: 'Call Us',
    description:
      'Reach our admissions team 24/7 at (866) 996-4308. We will listen to your story, answer your questions, and help determine if Seven Arrows is the right fit for you or your loved one.',
  },
  {
    number: '02',
    title: 'Verify Your Insurance',
    description:
      'We accept most major insurance providers. Our team will verify your benefits quickly and walk you through coverage details so there are no surprises.',
  },
  {
    number: '03',
    title: 'Arrive Within 24–48 Hours',
    description:
      'Once everything is confirmed, we coordinate travel and intake logistics. Many of our clients arrive at our Cochise County campus within 24 to 48 hours of their first call.',
  },
];

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const insuranceProviders = [
  { name: 'Aetna', domain: 'aetna.com' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com' },
  { name: 'Cigna', domain: 'cigna.com' },
  { name: 'Humana', domain: 'humana.com' },
  { name: 'UnitedHealthcare', domain: 'uhc.com' },
  { name: 'TRICARE', domain: 'tricare.mil' },
];

export const meta: MetaFunction = () => [
  { title: "Admissions" },
  { name: "description", content: "Begin your recovery journey at Seven Arrows Recovery. Learn about our simple admissions process, verify your insurance, and start treatment within 24-48 hours." },
];

export default function AdmissionsPage() {
  return (
    <>
      <PageHero
        label="Begin Your Journey"
        title="Admissions"
        description="Taking the first step toward recovery is the hardest part. Our compassionate admissions team is here to guide you through a simple, confidential process — from your first call to your arrival at our campus."
        image="/7a/images/embrace-connection.jpg"
      />

      {/* Step-by-Step Process */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label justify-center mb-4">How It Works</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              A Simple, Compassionate Process
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              We designed our admissions process to remove barriers and get you the help you
              need as quickly as possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl bg-warm-card p-8 shadow-sm"
              >
                <span
                  className="text-5xl font-bold text-primary/20 absolute top-4 right-6"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.number}
                </span>
                <h3 className="text-xl font-bold text-foreground mb-3 mt-2">
                  {step.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="tel:8669964308" className="btn-primary">
              Call (866) 996-4308
            </a>
          </div>
        </div>
      </section>

      {/* Insurance Verification */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="section-label mb-4">Insurance</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Insurance Verification
              </h2>
              <p
                className="text-foreground/70 leading-relaxed mb-6"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Seven Arrows Recovery works with most major insurance providers to make
                treatment accessible. Our admissions team can verify your benefits within
                minutes — at no cost and with no obligation.
              </p>

              <h3 className="text-lg font-bold text-foreground mb-4">
                Accepted Providers Include:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {insuranceProviders.map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-center justify-center rounded-lg bg-white px-4 py-4 shadow-sm h-16"
                  >
                    <img
                      src={`https://cdn.brandfetch.io/${provider.domain}/h/48/w/160/logo?c=${BRANDFETCH_CLIENT_ID}`}
                      alt={provider.name}
                      className="h-8 w-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>

              <p
                className="text-foreground/60 text-sm"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Don&apos;t see your provider listed? Contact us — we may still be able to
                help. We also offer private pay options and can discuss financing.
              </p>
            </div>

            {/* Contact / Verification Form */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-6">
                Verify Your Insurance
              </h3>
              <AdmissionsForm />
            </div>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label justify-center mb-4">What to Expect</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Your First Days at Seven Arrows
          </h2>
          <p
            className="text-foreground/70 leading-relaxed mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            When you arrive at our campus in Cochise County, Arizona, you will be welcomed by
            our clinical team for a thorough intake assessment. We will develop a personalized
            treatment plan tailored to your unique needs, history, and goals.
          </p>
          <p
            className="text-foreground/70 leading-relaxed mb-8"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            From day one, you will have access to individual therapy, group sessions, holistic
            activities, and the healing environment of the Swisshelm Mountains. Our small group
            setting ensures you receive attentive, individualized care throughout your stay.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tour" className="btn-primary">
              Tour Our Campus
            </Link>
            <Link to="/contact" className="btn-outline">
              Have Questions? Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
