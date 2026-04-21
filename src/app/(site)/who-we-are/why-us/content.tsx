'use client';




import PageHero from '@/components/PageHero';
import Link from 'next/link';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  FAQ Accordion (page-specific questions)                           */
/* ------------------------------------------------------------------ */
const pageFaqs = [
  {
    question: 'What types of addiction do you treat at your AZ facility?',
    answer:
      'Seven Arrows Recovery treats alcohol addiction, opioid and heroin dependency, prescription drug abuse (including benzodiazepines like Xanax), methamphetamine addiction, and co-occurring mental health disorders (dual diagnosis). Our clinical team tailors every treatment plan to the substances and underlying conditions involved.',
  },
  {
    question: 'Do you accept out-of-state patients?',
    answer:
      'Absolutely. Many of our clients travel from outside Arizona for treatment. Research consistently shows that seeking treatment away from familiar environments and triggers significantly improves outcomes. Our admissions team assists with travel coordination and can often facilitate admission within 24 to 48 hours.',
  },
  {
    question: 'Will my insurance cover residential treatment at Seven Arrows?',
    answer:
      'We accept most major insurance plans including Aetna, Blue Cross Blue Shield, Cigna, Humana, UnitedHealthcare, and TRICARE. Our admissions team provides free, confidential insurance verification so you know your coverage before committing. Call (866) 996-4308 to verify your benefits today.',
  },
];

function WhyUsFAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-foreground/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 text-left group"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-bold text-foreground pr-8 group-hover:text-primary transition-colors">
          {question}
        </h3>
        <span
          className={`shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-transform duration-300 ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        }`}
      >
        <p
          className="text-foreground/70 leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {answer}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */
export default function PageContent() {
  return (
    <>
      {/* ── Hero ── */}
      <PageHero
        label="What To Expect"
        title="Why Us?"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Why Us?' }]}
        description="Our team is here to help you through every step of the process. We provide support from our first contact to successful discharge. We offer multidisciplinary treatment delivered by compassionate physicians, clinicians and addiction specialists. We are dedicated to help you achieve a brighter future."
        meta={[
          { label: 'Written By', value: 'Seven Arrows Recovery Staff', icon: 'author' },
          { label: 'Published', value: 'March 10, 2023', icon: 'published' },
          { label: 'Modified', value: 'April 20, 2026', icon: 'modified' },
          { label: 'Reading Time', value: '3 minutes', icon: 'reading' },
        ]}
        image="/images/facility-exterior-mountains.jpg"
      />

      {/* ── H2: A Healing Sanctuary in the Sonoran Desert ── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4">Location</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            A Healing Sanctuary in the Sonoran Desert
          </h2>
          <div className="space-y-5 text-foreground/70 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            <p>
              Recovery requires distance — not just from substances, but from the people, places, and
              routines that reinforce addictive behavior. That is why our 160-acre private ranch in
              southeastern Arizona exists far from the distractions and triggers of metro life. Clients
              who travel from{' '}
              <Link href="/locations/phoenix" className="text-primary underline hover:text-primary/80">
                Phoenix
              </Link>
              ,{' '}
              <Link href="/locations/tucson" className="text-primary underline hover:text-primary/80">
                Tucson
              </Link>
              ,{' '}
              <Link href="/locations/scottsdale" className="text-primary underline hover:text-primary/80">
                Scottsdale
              </Link>
              , and{' '}
              <Link href="/locations/mesa" className="text-primary underline hover:text-primary/80">
                Mesa
              </Link>{' '}
              consistently describe the physical separation as one of the most powerful parts of their
              healing journey.
            </p>
            <p>
              Set at the base of the Swisshelm Mountains in Cochise County, the campus is surrounded by
              wide-open desert, dramatic rock formations, and skies unbroken by city light. The
              landscape itself becomes a therapeutic tool — grounding clients in the present moment and
              providing a quiet canvas for self-reflection. Research on destination rehabilitation
              confirms that removing individuals from their habitual environment significantly reduces
              relapse risk during and after treatment.
            </p>
            <p>
              While we are a premier destination for residents across Arizona's major metro areas, our
              secluded setting also draws clients from across the country seeking the privacy,
              tranquility, and clinical depth that only a boutique, rural facility can offer.{' '}
              <Link href="/who-we-are/areas-we-serve" className="text-primary underline hover:text-primary/80">
                Learn more about the areas we serve
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── H2: The Seven Arrows Difference ── */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="section-label mb-4">What Sets Us Apart</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              The Seven Arrows Difference: Our Unique Approach to Recovery
            </h2>
            <p
              className="text-foreground/70 text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Our treatment philosophy blends multiple clinical disciplines into a single, cohesive
              program. Every element is designed to treat the whole person — body, mind, and spirit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
            {/* H3: Evidence-Based & Medical Care */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.482 4.446A2.25 2.25 0 0115.378 21H8.622a2.25 2.25 0 01-2.14-1.554L5 14.5m14 0H5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Evidence-Based &amp; Medical Care</h3>
              <p
                className="text-foreground/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Our multidisciplinary clinical team delivers treatment grounded in proven modalities
                including Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), EMDR,
                and Motivational Interviewing. Medically supervised detoxification is available on-site
                with 24/7 oversight, and our co-occurring disorder protocols address the anxiety,
                depression, PTSD, and other mental health conditions that frequently accompany substance
                use disorders.{' '}
                <Link href="/our-program/evidence-based" className="text-primary underline hover:text-primary/80">
                  Explore our evidence-based methods
                </Link>
                .
              </p>
            </div>

            {/* H3: Indigenous Healing Traditions */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Indigenous Healing Traditions</h3>
              <p
                className="text-foreground/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                What truly distinguishes Seven Arrows is our incorporation of Indigenous healing
                practices rooted in centuries of earth-based wisdom. Clients have the opportunity to
                participate in sweat lodge ceremonies, smudging rituals, talking circles, and other
                land-based therapies that reconnect them with nature, community, and a sense of purpose
                larger than themselves. These practices complement clinical treatment and offer a
                spiritual dimension of healing that conventional programs rarely provide.{' '}
                <Link href="/our-program/indigenous-approach" className="text-primary underline hover:text-primary/80">
                  Learn about our Indigenous approach
                </Link>
                .
              </p>
            </div>

            {/* H3: Dedicated Equine Therapy */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Dedicated Equine Therapy</h3>
              <p
                className="text-foreground/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Our equine-assisted therapy program assigns each client their own horse for the duration
                of treatment. This one-on-one relationship builds trust, emotional regulation,
                accountability, and nonverbal communication skills — all of which are critical to
                sustained sobriety. Working with horses in Arizona's open desert landscape provides
                immediate, honest feedback that accelerates breakthroughs in ways traditional talk
                therapy cannot.{' '}
                <Link href="/our-program/equine-assisted" className="text-primary underline hover:text-primary/80">
                  Discover our equine therapy program
                </Link>
                .
              </p>
            </div>

            {/* H3: 1-on-1 Individualized Care */}
            <div className="bg-white rounded-2xl p-8 hover:shadow-md transition-shadow duration-300">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">1-on-1 Individualized Care</h3>
              <p
                className="text-foreground/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Our deliberately small census and low client-to-staff ratio mean that every individual
                receives a customized treatment plan, frequent one-on-one sessions with their primary
                therapist, and the kind of personal attention that large-volume facilities simply cannot
                provide. Group sessions remain intimate, fostering genuine peer connection and
                accountability rather than getting lost in a crowd.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── H2: Meet the Experts Guiding Your Journey ── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-4">Expert Team</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Meet the Experts Guiding Your Journey
          </h2>
          <p
            className="text-foreground/70 text-lg leading-relaxed mb-8 max-w-3xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Our clinical and medical staff hold advanced credentials in addiction medicine, trauma
            therapy, behavioral health, and holistic modalities. Every treatment plan is developed and
            overseen by licensed clinicians — including licensed clinical social workers, licensed
            professional counselors, certified addiction specialists, and medical professionals with
            experience in detoxification and co-occurring disorder management. This depth of expertise
            is what allows us to deliver individualized, evidence-based care at the highest standard.
          </p>
          <Link
            href="/who-we-are/meet-our-team"
            className="btn-primary inline-block"
          >
            Meet Our Clinical Team
          </Link>
        </div>
      </section>

      {/* ── H2: FAQ Section ── */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-4 text-center">Common Questions</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-8 text-center">
            Frequently Asked Questions About Our Arizona Facility
          </h2>
          <div className="bg-white rounded-2xl p-8 lg:p-12">
            {pageFaqs.map((faq) => (
              <WhyUsFAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── H2: Begin Your Healing Journey Today ── */}
      <section className="py-16 lg:py-24 bg-dark-section text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Begin Your Healing Journey Today
            </h2>
            <p
              className="text-white/80 text-lg leading-relaxed mb-8 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Taking the first step is the hardest part. Our admissions team is available 24 hours a
              day, 7 days a week to answer your questions, verify your insurance, and help you or your
              loved one begin the path to recovery.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a href="tel:8669964308" className="btn-primary">
                Call (866) 996-4308
              </a>
              <Link
                href="/insurance"
                className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
              >
                Verify Your Insurance
              </Link>
              <Link
                href="/contact"
                className="btn-outline border-white text-white hover:bg-white hover:text-foreground"
              >
                Contact Us Online
              </Link>
            </div>
          </div>

          {/* NAP + Map */}
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="bg-white/10 rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-4">Seven Arrows Recovery</h3>
              <address
                className="not-italic text-white/80 leading-relaxed space-y-2"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <p>Elfrida, AZ 85610</p>
                <p>Cochise County, Arizona</p>
                <p className="pt-2">
                  <a href="tel:8669964308" className="text-white hover:text-primary transition-colors">
                    (866) 996-4308
                  </a>
                </p>
                <p className="text-sm text-white/60 pt-1">
                  Available 24/7 — Confidential &amp; Free Consultations
                </p>
              </address>
            </div>

            <div className="rounded-2xl overflow-hidden h-64 md:h-full min-h-[256px]">
              <iframe
                title="Seven Arrows Recovery Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3382.5!2d-109.6939!3d31.6711!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sElfrida%2C+AZ+85610!5e0!3m2!1sen!2sus!4v1"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '256px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
