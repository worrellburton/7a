import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';
import PageHero from '~/components/PageHero';
import AdmissionsForm from '~/components/AdmissionsForm';
import { useState } from 'react';

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const insuranceProviders = [
  { name: 'Aetna', domain: 'aetna.com' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com' },
  { name: 'Cigna', domain: 'cigna.com' },
  { name: 'Humana', domain: 'humana.com' },
  { name: 'UnitedHealthcare', domain: 'uhc.com' },
  { name: 'TRICARE', domain: 'tricare.mil' },
  { name: 'Anthem', domain: 'anthem.com' },
  { name: 'Carelon Behavioral Health', domain: 'carelon.com' },
  { name: 'ComPsych', domain: 'compsych.com' },
];

const selfSteps = [
  {
    number: '01',
    title: 'Verify Your Insurance',
    description:
      'Call us or fill out the form below. We will confidentially verify your health insurance benefits and walk you through your coverage — at no cost and with no obligation.',
  },
  {
    number: '02',
    title: 'Complete a Phone Assessment',
    description:
      'A brief, compassionate phone assessment with our clinical team covers your medical history, mental health, addiction history, and a few other topics to ensure Seven Arrows is the right fit.',
  },
  {
    number: '03',
    title: 'Arrange Transportation & Arrive',
    description:
      'We help arrange transportation from anywhere in the country to our Cochise County campus — including sober concierge transport and airport pickup in Tucson. Many clients arrive within 24–48 hours.',
  },
];

const lovedOneSteps = [
  {
    number: '01',
    title: 'Cover the Financials',
    description:
      'Treatment is typically covered by health insurance. We will need the client\'s name, date of birth, and insurance policy information. Our team will confidentially contact the provider to ascertain coverage.',
  },
  {
    number: '02',
    title: 'Phone Assessment With the Client',
    description:
      'A short over-the-phone assessment covers medical issues, mental health, addiction history, and a few other topics. After our clinical and medical directors review, we collectively decide if Seven Arrows is the right fit.',
  },
  {
    number: '03',
    title: 'Intervention Support (If Needed)',
    description:
      'Our admissions team can help you navigate the difficult situation of convincing a loved one to accept treatment. Sometimes this requires a professional interventionist to conduct a family meeting — we can arrange this.',
  },
  {
    number: '04',
    title: 'Admission & Ongoing Updates',
    description:
      'We arrange medical detox or direct admission, plus airport pickup in Tucson for those flying in. Once admitted, your loved one signs a release of information so our team can keep you updated as treatment progresses.',
  },
];

export const meta: MetaFunction = () => [
  { title: "Admissions | Seven Arrows Recovery" },
  { name: "description", content: "Begin your recovery journey at Seven Arrows Recovery. Our streamlined admissions process includes insurance verification, a brief phone assessment, and transportation coordination — most clients arrive within 24-48 hours." },
];

function InsuranceLogo({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="text-foreground/60 text-sm font-semibold whitespace-nowrap"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {name}
      </span>
    );
  }

  return (
    <img
      src={`https://cdn.brandfetch.io/${domain}/fallback/404/theme/dark/h/48/w/160/logo?c=${BRANDFETCH_CLIENT_ID}`}
      alt={name}
      className="h-8 w-auto max-w-[140px] object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function AdmissionsPage() {
  const [tab, setTab] = useState<'self' | 'loved-one'>('self');

  return (
    <>
      <PageHero
        label="The First Step"
        title="Our Admissions Process"
        description="At Seven Arrows we have streamlined your admissions process. You will always have access to a live person to answer any concerns that you or your loved one might have — both prior to admission and throughout your stay."
        image="/7a/images/embrace-connection.jpg"
      />

      {/* Intro + Call */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label justify-center mb-4">We&apos;re Here to Help</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Ready When You Are
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Call us at <a href="tel:+15206148088" className="text-primary font-semibold hover:underline">(520) 614-8088</a> and
            a member of our team will walk you through setting up an assessment. Once you speak with our
            clinical and medical team, we can arrange transportation and provide sober concierge transport
            if desired.
          </p>
          <a href="tel:+15206148088" className="btn-primary text-lg px-10 py-4">
            Call (520) 614-8088
          </a>
        </div>
      </section>

      {/* Tabbed: Help for Myself / Help for a Loved One */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label justify-center mb-4">How It Works</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-8">
              Your Path to Admission
            </h2>

            {/* Tab buttons */}
            <div className="inline-flex rounded-full bg-white shadow-sm p-1.5 gap-1">
              <button
                type="button"
                onClick={() => setTab('self')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 ${
                  tab === 'self'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Help for Myself
              </button>
              <button
                type="button"
                onClick={() => setTab('loved-one')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 ${
                  tab === 'loved-one'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Help for a Loved One
              </button>
            </div>
          </div>

          {/* Tab intro */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            {tab === 'self' ? (
              <p
                className="text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Welcome, and congratulations on taking this first step towards a better life.
                We at Seven Arrows are honored that you have considered us as part of your path
                towards recovery. Here&apos;s how the process works:
              </p>
            ) : (
              <p
                className="text-foreground/70 leading-relaxed text-lg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                We applaud you for reaching out and assisting a loved one in finding treatment.
                Depending on the situation, our admissions team can help you navigate the difficult
                process of convincing a loved one to accept help. Here&apos;s what to expect:
              </p>
            )}
          </div>

          {/* Steps */}
          <div className={`grid grid-cols-1 ${tab === 'loved-one' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-6 max-w-6xl mx-auto`}>
            {(tab === 'self' ? selfSteps : lovedOneSteps).map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl bg-white p-8 shadow-sm"
              >
                <span
                  className="text-5xl font-bold text-primary/15 absolute top-4 right-6"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.number}
                </span>
                <h3 className="text-lg font-bold text-foreground mb-3 mt-2 pr-10">
                  {step.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed text-sm"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href="tel:+15206148088" className="btn-primary">
              Start the Process — Call Now
            </a>
          </div>
        </div>
      </section>

      {/* Insurance Verification */}
      <section id="verify" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="section-label mb-4">Insurance</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Insurance Verification
              </h2>
              <p
                className="text-foreground/70 leading-relaxed mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Seven Arrows Recovery works with most major insurance providers to make
                treatment accessible. Our admissions team can verify your benefits within
                minutes — at no cost and with no obligation. We will need the client&apos;s
                name, date of birth, and insurance policy information.
              </p>
              <p
                className="text-foreground/70 leading-relaxed mb-8"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                We will confidentially contact your insurance provider to ascertain coverage
                and walk you through every detail so there are no surprises.
              </p>

              <h3 className="text-lg font-bold text-foreground mb-5">
                Accepted Providers Include:
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {insuranceProviders.map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-center justify-center rounded-xl bg-warm-bg px-4 py-4 h-16"
                  >
                    <InsuranceLogo name={provider.name} domain={provider.domain} />
                  </div>
                ))}
              </div>

              <p
                className="text-foreground/50 text-sm"
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
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label mb-4">What to Expect</p>
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
                className="text-foreground/70 leading-relaxed mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                From day one, you will have access to individual therapy, group sessions, holistic
                activities, and the healing environment of the Swisshelm Mountains. Our small group
                setting ensures you receive attentive, individualized care throughout your stay.
              </p>
              <p
                className="text-foreground/70 leading-relaxed mb-8"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                For clients flying to Arizona, we arrange a driver to pick you up from the airport
                in Tucson. We also offer sober concierge transport from anywhere in the country.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/tour" className="btn-primary">
                  Tour Our Campus
                </Link>
                <Link to="/contact" className="btn-outline">
                  Have Questions?
                </Link>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              <img
                src="/7a/images/group-gathering-pavilion.jpg"
                alt="Clients gathering at Seven Arrows Recovery"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Take the First Step Today
          </h2>
          <p
            className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our admissions team is available around the clock to answer your questions and help
            you or your loved one begin the journey to recovery. Call us now or reach out online —
            we&apos;re here for every step of the way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+15206148088" className="btn-primary">
              Call (520) 614-8088
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
