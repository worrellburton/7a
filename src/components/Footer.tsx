import Link from 'next/link';
import { RANCH_ADDRESS, RANCH_PHONE, RANCH_PHONE_TEL, ranchDirectionsUrl } from './RanchAddress';

/* ── Footer (links + legal) ───────────────────────────────────────── */

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden text-white"
      style={{
        background: 'linear-gradient(180deg, #2a0f0a 0%, #1a1a1a 35%, #111111 100%)',
      }}
      role="contentinfo"
    >
      <div className="relative z-10">
        {/* ─── Footer Links ─── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 lg:pt-20 lg:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-5" aria-label="Seven Arrows Recovery">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo.png" alt="Seven Arrows Recovery" className="h-14 w-auto brightness-0 invert" />
              </Link>
              <p className="text-white/40 text-xs leading-relaxed mb-5">
                A boutique drug and alcohol rehab center nestled at the base of the Swisshelm Mountains in Arizona.
              </p>
              {/* Postal address — every page sees the footer, so this
                  is the highest-traffic surface for the address.
                  Wrapped in <address> for semantic + microdata
                  reasons; the JSON-LD schema in src/app/layout.tsx
                  carries the structured copy for crawlers. */}
              <address className="not-italic text-xs leading-relaxed text-white/65">
                <p>{RANCH_ADDRESS.streetAddress}</p>
                <p>{RANCH_ADDRESS.locality}, {RANCH_ADDRESS.region} {RANCH_ADDRESS.postalCode}</p>
                <a
                  href={`tel:${RANCH_PHONE_TEL}`}
                  className="block mt-1 text-white/85 font-semibold hover:text-white transition-colors"
                >
                  {RANCH_PHONE}
                </a>
                <a
                  href={ranchDirectionsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-primary/90 font-semibold hover:text-primary transition-colors"
                >
                  Get directions
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </address>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 text-white/70">Quick Links</h3>
              <ul className="space-y-2.5" role="list">
                {[
                  { label: 'Who We Are', href: '/who-we-are' },
                  { label: 'Our Program', href: '/our-program' },
                  { label: 'Treatment', href: '/treatment' },
                  { label: 'What We Treat', href: '/what-we-treat' },
                  { label: 'Admissions', href: '/admissions' },
                  { label: 'Areas We Serve', href: '/who-we-are/areas-we-serve' },
                  { label: 'Indigenous Approach', href: '/our-program/indigenous-approach' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-white/40 text-xs hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* What We Treat */}
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 text-white/70">What We Treat</h3>
              <ul className="space-y-2.5" role="list">
                {['Alcohol Addiction', 'Opioid Addiction', 'Dual-Diagnosis', 'Heroin Addiction'].map((item) => (
                  <li key={item}>
                    <Link href={`/what-we-treat/${item.toLowerCase().replace(/\s+/g, '-')}`} className="text-white/40 text-xs hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 mt-6 text-white/70">Areas We Serve</h3>
              <ul className="space-y-2.5" role="list">
                {[
                  { name: 'Phoenix', href: '/locations/phoenix' },
                  { name: 'Scottsdale', href: '/locations/scottsdale' },
                  { name: 'Tucson', href: '/locations/tucson' },
                  { name: 'Mesa', href: '/locations/mesa' },
                ].map((loc) => (
                  <li key={loc.name}>
                    <Link href={loc.href} className="text-white/40 text-xs hover:text-primary transition-colors">{loc.name}, AZ</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Insurance accepted — links to every carrier landing page
                so each one picks up an inbound from every public page
                (footer is rendered globally), boosting them above the
                ≥3 inbound-link threshold the audit checks. */}
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 text-white/70">Insurance</h3>
              <ul className="space-y-2.5" role="list">
                {[
                  { label: 'Aetna', href: '/insurance/aetna' },
                  { label: 'Blue Cross Blue Shield', href: '/insurance/blue-cross-blue-shield' },
                  { label: 'Cigna', href: '/insurance/cigna' },
                  { label: 'UnitedHealthcare', href: '/insurance/united-healthcare' },
                  { label: 'Humana', href: '/insurance/humana' },
                  { label: 'TRICARE', href: '/insurance/tricare' },
                ].map((carrier) => (
                  <li key={carrier.href}>
                    <Link href={carrier.href} className="text-white/40 text-xs hover:text-primary transition-colors">
                      {carrier.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-xs font-semibold tracking-wider uppercase mb-4 text-white/70">Contact Us</h3>
              <div className="space-y-2.5 text-xs text-white/40">
                <a href="tel:+18669964308" className="block hover:text-primary transition-colors text-sm font-semibold text-white/60">
                  (866) 996-4308
                </a>
                <p>Cochise County, Arizona</p>
                <div className="flex gap-4 pt-2">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" /></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Accreditation strip — Joint Commission Gold Seal + the
              LegitScript seal, both linking to their respective
              verification pages. Keeps the trust signals visible on
              every page, not just the homepage TrustBadges block. */}
          <div className="border-t border-white/[0.06] mt-10 pt-8 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start justify-between">
            <div>
              <p
                className="text-white/45 text-[10px] font-semibold tracking-[0.22em] uppercase mb-4"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Accredited &amp; Certified
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="https://www.qualitycheck.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block opacity-80 hover:opacity-100 transition-opacity"
                  aria-label="The Joint Commission — Gold Seal of Approval"
                  title="Joint Commission Gold Seal of Approval"
                >
                  <img
                    src="https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-gallery/1776808204322-pzyzhrow2ib-joint-commission-gold-seal-of-approval.jpg"
                    alt="Joint Commission Gold Seal of Approval"
                    className="h-16 w-auto rounded"
                    loading="lazy"
                  />
                </a>
                <a
                  href="https://www.legitscript.com/websites/?checker_keywords=sevenarrowsrecovery.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block opacity-85 hover:opacity-100 transition-opacity"
                  aria-label="Verify LegitScript Certification for sevenarrowsrecovery.com"
                  title="LegitScript Certified"
                >
                  <img
                    src="https://static.legitscript.com/seals/11087571.png"
                    alt="LegitScript Certified — verify at legitscript.com"
                    className="h-16 w-auto"
                    width={65}
                    height={79}
                    loading="lazy"
                  />
                </a>
              </div>
              <p
                className="mt-3 text-[10px] uppercase tracking-[0.22em] text-white/35"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                HIPAA Compliant
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-3 text-xs">
              <p className="text-white/25">
                &copy; {new Date().getFullYear()} Seven Arrows Recovery. All rights reserved.
              </p>
              <div className="flex gap-5 text-white/25">
                <Link href="/privacy-policy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
