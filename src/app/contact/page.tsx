import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import ContactPageForm from './ContactPageForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with Seven Arrows Recovery. Call (866) 996-4308 or reach out online. Our admissions team is available 24/7 to help you begin your recovery journey.',
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        label="Get in Touch"
        title="Contact Us"
        description="Our compassionate admissions team is available around the clock to answer your questions, verify insurance, and help you or your loved one take the first step toward lasting recovery."
      />

      {/* Contact Info + Form */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Contact Details */}
            <div>
              <p className="section-label mb-4">Reach Out</p>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                We&apos;re Here for You
              </h2>
              <p
                className="text-foreground/70 leading-relaxed mb-8"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Whether you are seeking help for yourself or a loved one, our team is ready to
                listen. There is no obligation and every conversation is completely confidential.
              </p>

              {/* Phone */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Phone</h3>
                  <a
                    href="tel:8669964308"
                    className="text-primary font-semibold text-lg hover:underline"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    (866) 996-4308
                  </a>
                  <p
                    className="text-foreground/60 text-sm mt-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Available 24 hours a day, 7 days a week
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">Location</h3>
                  <p
                    className="text-foreground/70"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Cochise County, Arizona
                  </p>
                  <p
                    className="text-foreground/60 text-sm mt-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    At the base of the Swisshelm Mountains
                  </p>
                </div>
              </div>

              {/* 24/7 Availability Note */}
              <div className="flex items-start gap-4 mb-8">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">24/7 Availability</h3>
                  <p
                    className="text-foreground/70"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Addiction does not keep business hours and neither do we. Our admissions team
                    is available day and night to take your call and begin the process.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href="tel:8669964308" className="btn-primary">
                  Call Now
                </a>
                <Link href="/admissions" className="btn-outline">
                  Start Admissions
                </Link>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-6">
                Send Us a Message
              </h3>
              <ContactPageForm />
            </div>
          </div>
        </div>
      </section>

      {/* Map / Location Section */}
      <section className="py-16 lg:py-24 bg-warm-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label justify-center mb-4">Our Location</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Find Us in Southeastern Arizona
            </h2>
            <p
              className="text-foreground/70 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Seven Arrows Recovery is located in Cochise County, Arizona, at the base of the
              Swisshelm Mountains — a serene, remote setting ideal for focused healing and
              recovery.
            </p>
          </div>

          <div
            className="rounded-2xl h-72 lg:h-96"
            style={{
              background:
                'linear-gradient(160deg, #4a6741 0%, #8b7355 40%, #c4956a 70%, #e8c9a0 100%)',
            }}
            aria-label="Map showing Seven Arrows Recovery location in Cochise County, Arizona"
          >
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/90">
                <svg
                  className="mx-auto mb-4 w-16 h-16 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Interactive Map Coming Soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            The Call That Changes Everything
          </h2>
          <p
            className="text-foreground/70 mb-8 max-w-xl mx-auto"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Recovery begins with a single conversation. Whether it is for you or someone you love,
            we are here to help — 24 hours a day, 7 days a week.
          </p>
          <a href="tel:8669964308" className="btn-primary">
            Call (866) 996-4308
          </a>
        </div>
      </section>
    </>
  );
}
