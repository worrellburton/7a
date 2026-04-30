import type { Metadata } from 'next';
import Link from 'next/link';
import { RANCH_ADDRESS, RANCH_PHONE, RANCH_PHONE_TEL } from '@/components/RanchAddress';

// Privacy Policy — required by SMS carrier registration (10DLC) and
// linked from the global footer. The mobile-information clause below
// is the verbatim language carriers look for when reviewing campaign
// applications: opt-in data and consent are never shared with third
// parties or affiliates for marketing. Update LAST_UPDATED whenever
// substantive language changes so visitors see when it last moved.
const LAST_UPDATED = 'April 30, 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy | Seven Arrows Recovery',
  description:
    'How Seven Arrows Recovery collects, uses, and protects your information — including HIPAA-protected health data and SMS opt-in consent.',
  alternates: {
    canonical: 'https://sevenarrowsrecoveryarizona.com/privacy-policy',
  },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="bg-white">
      <header className="border-b border-neutral-200 bg-warm-bg/40">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Legal</p>
          <h1
            className="mt-3 text-3xl sm:text-4xl font-semibold text-neutral-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="space-y-8 text-[15px] leading-relaxed text-neutral-700">
          <Section title="Who we are">
            <p>
              Seven Arrows Recovery (&ldquo;Seven Arrows,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
              operates a residential addiction-treatment program at {RANCH_ADDRESS.streetAddress},{' '}
              {RANCH_ADDRESS.locality}, {RANCH_ADDRESS.region} {RANCH_ADDRESS.postalCode}, and the website at{' '}
              <span className="font-medium">sevenarrowsrecoveryarizona.com</span> (the &ldquo;Site&rdquo;). This
              policy explains what information we collect, how we use it, and the choices you have.
            </p>
          </Section>

          <Section title="Information we collect">
            <p>We collect information you give us directly and information collected automatically.</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              <li>
                <span className="font-medium">Contact information</span> — name, phone number, email address, and
                postal address you submit through forms, calls, or text messages.
              </li>
              <li>
                <span className="font-medium">Health and insurance information</span> — substance-use history,
                clinical screening responses, and insurance details you share to verify benefits or begin admissions.
                This information is treated as Protected Health Information (PHI) under HIPAA.
              </li>
              <li>
                <span className="font-medium">Communications</span> — content of calls, text messages, emails, and
                webform submissions, plus metadata about when they occurred.
              </li>
              <li>
                <span className="font-medium">Technical data</span> — IP address, device type, browser, pages
                viewed, referring URL, and approximate location, captured through cookies, server logs, and
                analytics tools.
              </li>
            </ul>
          </Section>

          <Section title="How we use your information">
            <ul className="list-disc space-y-1.5 pl-6">
              <li>To respond to your inquiries and provide admissions, clinical, and aftercare services.</li>
              <li>To verify insurance benefits and process payments.</li>
              <li>To send appointment reminders, intake instructions, and clinical follow-up.</li>
              <li>To send you informational and marketing messages you have opted in to receive.</li>
              <li>To improve the Site, our services, and the quality of our communications.</li>
              <li>To meet legal, regulatory, and accreditation obligations.</li>
            </ul>
          </Section>

          <Section title="HIPAA and Protected Health Information">
            <p>
              When you become a client (or representative of a prospective client), the health information you share
              with us is protected by HIPAA and a separate Notice of Privacy Practices that we will provide to you.
              That notice — not this policy — governs how PHI is used and disclosed for treatment, payment, and
              healthcare operations.
            </p>
          </Section>

          {/* SMS / mobile opt-in clause — this paragraph is the
              specific language SMS carriers (Twilio / The Campaign
              Registry) look for during 10DLC vetting. Do not reword
              the "no mobile information will be shared with third
              parties or affiliates for marketing or promotional
              purposes" sentence without legal + carrier review. */}
          <Section title="SMS messaging and opt-in consent">
            <p>
              When you opt in to receive text messages from Seven Arrows Recovery — by submitting a web form,
              completing a paper or in-person intake form, providing verbal consent to a staff member, sending a
              keyword to one of our numbers, or scanning a QR code — we collect the mobile phone number you provide
              and a record of your consent (the timestamp, the channel, and the language you agreed to).
            </p>
            <p className="mt-3 font-semibold text-neutral-900">
              No mobile information will be shared with third parties or affiliates for marketing or promotional
              purposes. All categories listed in this Privacy Policy exclude text-messaging originator opt-in data
              and consent; this information will not be shared with any third parties.
            </p>
            <p className="mt-3">
              You can stop receiving messages at any time by replying <span className="font-mono">STOP</span> to any
              message we send. Reply <span className="font-mono">HELP</span> for help, or contact us using the
              details below. Message and data rates may apply. Message frequency varies. See our{' '}
              <Link href="/terms" className="text-primary underline-offset-2 hover:underline">
                Terms of Service
              </Link>{' '}
              for the full SMS program terms.
            </p>
          </Section>

          <Section title="How we share information">
            <p>We share personal information only as described below.</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              <li>
                <span className="font-medium">Service providers</span> who host our website, send our messages,
                process payments, verify insurance, and otherwise help us operate. These providers are bound by
                contracts limiting how they may use your information.
              </li>
              <li>
                <span className="font-medium">Healthcare partners</span> — labs, referring clinicians, aftercare
                providers — only to the extent permitted by HIPAA and our Notice of Privacy Practices.
              </li>
              <li>
                <span className="font-medium">When required by law</span>, including in response to subpoenas,
                court orders, or to protect the safety of clients or staff.
              </li>
              <li>
                <span className="font-medium">In a business transition</span>, such as a merger, acquisition, or
                sale of assets, subject to the continued protection of your information.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell personal information, and we do not share SMS opt-in data or consent with third
              parties or affiliates for marketing purposes.
            </p>
          </Section>

          <Section title="Cookies and analytics">
            <p>
              The Site uses cookies and similar technologies to remember your preferences, measure traffic, and
              improve performance. You can control cookies through your browser settings; disabling them may affect
              parts of the Site.
            </p>
          </Section>

          <Section title="Your choices and rights">
            <ul className="list-disc space-y-1.5 pl-6">
              <li>
                <span className="font-medium">Email</span> — every marketing email includes an unsubscribe link.
              </li>
              <li>
                <span className="font-medium">Text messages</span> — reply <span className="font-mono">STOP</span>{' '}
                to opt out, <span className="font-mono">HELP</span> for help.
              </li>
              <li>
                <span className="font-medium">Access, correction, deletion</span> — you may request a copy of the
                personal information we hold about you, ask us to correct it, or request deletion, subject to legal
                and clinical record-keeping requirements.
              </li>
              <li>
                <span className="font-medium">California residents</span> may have additional rights under the
                CCPA/CPRA, including the right to know what we collect and the right to opt out of any sale or
                sharing (we do not sell or share personal information for cross-context behavioral advertising).
              </li>
            </ul>
          </Section>

          <Section title="Data security">
            <p>
              We use administrative, technical, and physical safeguards designed to protect personal information.
              No method of transmission or storage is 100% secure; if you have reason to believe your information
              has been compromised, contact us right away.
            </p>
          </Section>

          <Section title="Children">
            <p>
              The Site is intended for adults. We do not knowingly collect personal information from children under
              13. If you believe a child has provided us information, contact us and we will delete it.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. The &ldquo;last updated&rdquo; date at the top
              shows when changes took effect. Material changes will be communicated through the Site or by other
              reasonable means.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              Questions about this policy or your information? Contact Seven Arrows Recovery:
            </p>
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
