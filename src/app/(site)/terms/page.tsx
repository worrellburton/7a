import type { Metadata } from 'next';
import Link from 'next/link';
import { RANCH_ADDRESS, RANCH_PHONE, RANCH_PHONE_TEL } from '@/components/RanchAddress';

// Terms of Service — required by SMS carrier registration (10DLC) and
// linked from the global footer. The SMS Messaging Terms section
// below is the verbatim language carriers look for during campaign
// approval: program description, frequency, opt-out keyword, help
// keyword, message-and-data-rates disclosure, and the explicit
// "carriers are not liable for delayed or undelivered messages"
// statement. Update LAST_UPDATED whenever substantive changes ship.
const LAST_UPDATED = 'April 30, 2026';

// 1-hour ISR — marketing pages are otherwise fully static; this lets the
// edge cache hold the rendered HTML so TTFB drops from ~250ms (cold SSR)
// to ~30ms (edge hit). Editorial copy + image swaps go live within an hour
// of merging; if you need sub-hour freshness on a specific page, override
// with a smaller value or remove this line.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Terms of Service | Seven Arrows Recovery',
  description:
    'The terms governing your use of sevenarrowsrecoveryarizona.com — including SMS messaging program terms, disclaimers, and limitations of liability.',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/terms',
  },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <article className="bg-white">
      <header className="border-b border-neutral-200 bg-warm-bg/40">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Legal</p>
          <h1
            className="mt-3 text-3xl sm:text-4xl font-semibold text-neutral-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="space-y-8 text-[15px] leading-relaxed text-neutral-700">
          <Section title="Agreement">
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the website at{' '}
              <span className="font-medium">sevenarrowsrecoveryarizona.com</span> (the &ldquo;Site&rdquo;) and the
              communications you exchange with Seven Arrows Recovery (&ldquo;Seven Arrows,&rdquo; &ldquo;we,&rdquo;
              &ldquo;us,&rdquo; or &ldquo;our&rdquo;), including phone calls, emails, and text messages. By using
              the Site or by opting in to receive messages from us, you agree to these Terms. If you do not agree,
              do not use the Site or opt in.
            </p>
          </Section>

          <Section title="Use of the Site">
            <p>
              You agree to use the Site only for lawful purposes. You will not interfere with the Site&rsquo;s
              operation, attempt to access non-public areas, or use the Site to transmit unlawful, harassing,
              defamatory, or harmful content.
            </p>
          </Section>

          <Section title="Health information disclaimer">
            <p>
              Content on the Site is for general informational purposes and does not constitute medical advice,
              diagnosis, or treatment. Always seek the advice of a qualified healthcare provider with questions
              about a medical or behavioral-health condition. If you are experiencing a medical emergency, call{' '}
              <span className="font-mono">911</span>. The Substance Abuse and Mental Health Services Administration
              (SAMHSA) National Helpline is available 24/7 at{' '}
              <span className="font-mono">1-800-662-HELP (4357)</span>.
            </p>
          </Section>

          {/* SMS Messaging Terms — this whole section is what
              carriers (Twilio / The Campaign Registry) cite during
              10DLC vetting. Required elements: program description,
              frequency, opt-out keyword, help keyword, "Message and
              data rates may apply" verbatim, and the carrier-not-
              liable statement. Don't reword these without legal +
              carrier review. */}
          <Section title="SMS messaging terms">
            <p>
              Seven Arrows Recovery operates an SMS messaging program (the &ldquo;Program&rdquo;) for prospective
              and current clients and their authorized representatives. By opting in — through a web form, paper
              or in-person intake form, verbal consent to a staff member, sending a keyword to one of our numbers,
              or scanning a QR code — you agree to the following terms.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">Program description</h3>
            <p>
              The Program sends informational and transactional messages relating to admissions, insurance
              verification, intake logistics, appointment reminders, and follow-up care, plus marketing and
              promotional messages where you have separately consented to receive them.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">Message frequency</h3>
            <p>Message frequency varies based on your interaction with us.</p>

            <h3 className="mt-4 font-semibold text-neutral-900">Costs</h3>
            <p className="font-semibold text-neutral-900">Message and data rates may apply.</p>

            <h3 className="mt-4 font-semibold text-neutral-900">How to opt out</h3>
            <p>
              You can cancel the Program at any time by replying <span className="font-mono">STOP</span> to any
              message we send you. After replying <span className="font-mono">STOP</span>, you will receive one
              confirmation message and then no further messages, except as required to comply with law. To rejoin,
              opt in again the same way you originally did.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">How to get help</h3>
            <p>
              For help, reply <span className="font-mono">HELP</span> to any message, call{' '}
              <a href={`tel:${RANCH_PHONE_TEL}`} className="text-primary hover:underline">
                {RANCH_PHONE}
              </a>
              , or email us using the contact details below.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">Carriers and message delivery</h3>
            <p className="font-semibold text-neutral-900">
              Carriers are not liable for delayed or undelivered messages.
            </p>
            <p className="mt-2">
              Mobile carrier networks may not be available or may cause messages to be delayed. We are not
              responsible for delays in receipt of, or any failure to deliver, any message sent through the
              Program.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">Privacy</h3>
            <p>
              Your mobile information — including the phone number you provide and the record of your consent —
              is handled in accordance with our{' '}
              <Link href="/privacy-policy" className="text-primary underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              . No mobile information will be shared with third parties or affiliates for marketing or promotional
              purposes.
            </p>

            <h3 className="mt-4 font-semibold text-neutral-900">Eligibility</h3>
            <p>
              The Program is available to U.S. residents who are 18 or older (or who have the consent of a parent
              or legal guardian) and who use a mobile device on a participating carrier.
            </p>
          </Section>

          <Section title="Privacy">
            <p>
              Your use of the Site and our messaging programs is also governed by our{' '}
              <Link href="/privacy-policy" className="text-primary underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </Section>

          <Section title="Intellectual property">
            <p>
              The Site, its content, and the Seven Arrows Recovery name and logos are owned by Seven Arrows
              Recovery or its licensors and are protected by U.S. and international intellectual-property laws.
              You may view and print Site content for your personal, non-commercial use.
            </p>
          </Section>

          <Section title="Third-party links">
            <p>
              The Site may link to third-party sites we do not control. We are not responsible for the content,
              policies, or practices of any third-party site. Visiting a linked site is at your own risk.
            </p>
          </Section>

          <Section title="Disclaimers">
            <p>
              The Site and our communications are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
              without warranties of any kind, express or implied, including warranties of merchantability,
              fitness for a particular purpose, and non-infringement. We do not warrant that the Site will be
              uninterrupted, error-free, or free of harmful components.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the maximum extent permitted by law, Seven Arrows Recovery and its officers, employees, and
              affiliates will not be liable for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits or revenues, arising out of or relating to your use of the Site or
              our messaging programs.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to indemnify and hold Seven Arrows Recovery harmless from claims, damages, and expenses
              (including reasonable attorneys&rsquo; fees) arising out of your violation of these Terms or your
              misuse of the Site.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by the laws of the State of Arizona, without regard to its conflict-of-laws
              rules. Any dispute arising out of these Terms or your use of the Site will be resolved exclusively
              in the state or federal courts located in Cochise County, Arizona.
            </p>
          </Section>

          <Section title="Changes to these Terms">
            <p>
              We may update these Terms from time to time. The &ldquo;last updated&rdquo; date above shows when
              changes took effect. Continued use of the Site or our messaging programs after a change means you
              accept the updated Terms.
            </p>
          </Section>

          <Section title="Contact">
            <p>Questions about these Terms? Contact Seven Arrows Recovery:</p>
            <ul className="mt-3 space-y-1">
              <li>
                <span className="font-medium">Phone:</span>{' '}
                <a href={`tel:${RANCH_PHONE_TEL}`} className="text-primary hover:underline">
                  {RANCH_PHONE}
                </a>
              </li>
              <li>
                <span className="font-medium">Mail:</span> {RANCH_ADDRESS.streetAddress},{' '}
                {RANCH_ADDRESS.locality}, {RANCH_ADDRESS.region} {RANCH_ADDRESS.postalCode}
              </li>
              <li>
                <span className="font-medium">Web:</span>{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  Contact form
                </Link>
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="mb-3 text-xl font-semibold text-neutral-900"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
