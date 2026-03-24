import PageHero from '~/components/PageHero';
import MedicalDisclaimer from '~/components/MedicalDisclaimer';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/node';

const conditions = [
  {
    title: 'Dual Diagnosis',
    href: '/what-we-treat/dual-diagnosis',
    description:
      'Integrated treatment for co-occurring mental health and substance use disorders, addressing the whole person for lasting recovery.',
  },
  {
    title: 'Alcohol Addiction',
    href: '/what-we-treat/alcohol-addiction',
    description:
      'Comprehensive alcohol addiction treatment including medically supervised detox, individual therapy, and relapse prevention planning.',
  },
  {
    title: 'Heroin Addiction',
    href: '/what-we-treat/heroin-addiction',
    description:
      'Specialized heroin and opioid addiction treatment with medically supervised detox and evidence-based clinical care.',
  },
  {
    title: 'Marijuana Addiction',
    href: '/what-we-treat/marijuana-addiction',
    description:
      'Treatment for marijuana dependence addressing psychological reliance, withdrawal symptoms, and underlying emotional issues.',
  },
  {
    title: 'Opioid Addiction',
    href: '/what-we-treat/opioid-addiction',
    description:
      'Comprehensive opioid addiction treatment for prescription painkillers, fentanyl, and other opioid substances.',
  },
  {
    title: 'Prescription Drug Addiction',
    href: '/what-we-treat/prescription-drug-addiction',
    description:
      'Specialized treatment for addiction to benzodiazepines, stimulants, pain medications, and other prescription substances.',
  },
  {
    title: 'Xanax Addiction',
    href: '/what-we-treat/xanax-addiction',
    description:
      'Safe, medically supervised Xanax and benzodiazepine detox with individualized tapering protocols and therapeutic support.',
  },
];

export const meta: MetaFunction = () => [
  { title: "What We Treat | Seven Arrows Recovery" },
  { name: "description", content: "Seven Arrows Recovery treats alcohol addiction, drug addiction, opioid dependence, dual diagnosis, and more. Explore our evidence-based treatment programs in Arizona." },
];

export default function WhatWeTreatPage() {
  return (
    <>
      <PageHero
        label="What We Treat"
        title="Conditions We Treat"
        description="At Seven Arrows Recovery, we provide individualized, evidence-based treatment for a wide range of substance use disorders and co-occurring mental health conditions. Our clinical team creates personalized plans to guide you toward lasting recovery."
        image="/7a/images/resident-reading-window.jpg"
      />

      {/* Conditions Grid */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Our Specialties</p>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Evidence-Based Treatment Programs
            </h2>
            <p
              className="text-foreground/70 leading-relaxed max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Every individual&apos;s path to recovery is unique. We offer specialized programs
              tailored to the substance and the person, combining clinical expertise with
              compassionate care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {conditions.map((condition) => (
              <Link
                key={condition.href}
                href={condition.href}
                className="group bg-warm-card rounded-2xl p-8 hover:shadow-lg transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-[#a0522d] transition-colors">
                  {condition.title}
                </h3>
                <p
                  className="text-foreground/70 leading-relaxed mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {condition.description}
                </p>
                <span
                  className="text-[#a0522d] font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  Learn More &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-warm-bg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
            Begin Your Recovery Today
          </h2>
          <p
            className="text-foreground/70 leading-relaxed text-lg mb-10 max-w-2xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            No matter what substance you or your loved one is struggling with, our team is here to
            help. Call us now for a confidential consultation and take the first step toward a new
            life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" className="btn-primary">
              Contact Us
            </Link>
            <a
              href="tel:8669964308"
              className="btn-primary"
            >
              Call (866) 996-4308
            </a>
          </div>
        </div>
      </section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <MedicalDisclaimer />
      </div>
    </>
  );
}
