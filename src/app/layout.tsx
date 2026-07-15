import type { Metadata } from 'next';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthProvider } from '@/lib/AuthProvider';
import ModalProvider from '@/lib/ModalProvider';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { JsonLd } from '@/components/JsonLd';
import { buildMedicalBusinessSchema, buildWebSiteSchema, RANCH_GOOGLE_MAP_URL } from '@/lib/seo/schema';
import './globals.css';

// Hotjar site id. Hard-coded here so it's auditable in source rather
// than buried in env config that can drift between preview / prod.
// If we ever need a per-env split, switch this to a NEXT_PUBLIC_HOTJAR_ID
// and reference it from the inline script below.
const HOTJAR_ID = 5269906;
const HOTJAR_SV = 6;

export const metadata: Metadata = {
  metadataBase: new URL('https://sevenarrowsrecoveryarizona.com'),
  // Pages already include " | Seven Arrows Recovery" in their full
  // title strings; template `%s` renders them as-is so we don't get
  // 'X | Seven Arrows Recovery | Seven Arrows Recovery'.
  title: {
    default: 'Seven Arrows Recovery | Drug Rehab in Arizona',
    template: '%s',
  },
  description:
    'Premier drug and alcohol rehab in Arizona — residential treatment on a 160-acre ranch at the base of the Swisshelm Mountains. Call (866) 718-1665.',
  keywords:
    'drug rehab Arizona,alcohol rehab Arizona,addiction treatment center Arizona,substance abuse treatment,residential treatment Arizona,holistic rehab,trauma-focused treatment,Forward-Facing Accelerated Recovery,boutique rehab,Swisshelm Mountains rehab,dual diagnosis treatment,Arizona drug treatment',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Seven Arrows Recovery',
    title: 'Seven Arrows Recovery | Drug Rehab in Arizona',
    description:
      'Premier drug and alcohol rehab in Arizona — residential treatment on a 160-acre ranch at the base of the Swisshelm Mountains. Call (866) 718-1665.',
    images: [
      {
        url: '/hero/facility-exterior-mountains.jpg',
        width: 2000,
        height: 1235,
        alt: 'Seven Arrows Recovery - A Place to Heal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seven Arrows Recovery | Drug Rehab in Arizona',
    description:
      'Premier drug and alcohol rehab in Arizona — residential treatment on a 160-acre ranch at the base of the Swisshelm Mountains. Call (866) 718-1665.',
    images: ['/hero/facility-exterior-mountains.jpg'],
  },
  robots: 'index, follow',
  other: {
    'theme-color': '#a0522d',
    'geo.region': 'US-AZ',
    'geo.placename': 'Cochise County, Arizona',
  },
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale — iOS Safari was trapping pinch-out attempts
  // and re-interpreting the touch as a swipe-back gesture, which
  // closed the page entirely when users tried to zoom out of a
  // momentarily over-wide layout. Letting the user pinch is the
  // right escape hatch even when the underlying layout is fixed.
};

// Schemas now live in src/lib/seo/schema.ts so the NAP, social URLs,
// geo, and opening hours stay in sync across every surface that
// emits JSON-LD. Builders are pure functions; call them at render
// time so the schema travels with the page.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Hero video source — preconnect so the TLS handshake happens
            during HTML parse instead of after React mounts <video>. */}
        <link rel="preconnect" href="https://customer-1sijhr9xl3yqixxu.cloudflarestream.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* AI-crawler discovery: point answer engines at the structured,
            citable /llms.txt summary. Placed here in the raw <head>
            rather than via metadata.alternates.types because
            (site)/layout.tsx sets alternates.canonical in
            generateMetadata, and Next shallow-merges alternates as a
            whole — a root-level alternates.types would be overwritten
            (dropped) on every public-site page. A direct <link> renders
            unconditionally on every route. */}
        <link rel="alternate" type="text/plain" href="https://sevenarrowsrecoveryarizona.com/llms.txt" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600;700&display=swap"
        />
        {/* No hardcoded canonical here — every page declared the
            same homepage URL, scoring 0/100 on the audit's Canonical
            URLs category. (site)/layout.tsx now emits a per-request
            self-canonical via generateMetadata + the x-pathname
            header set in middleware.ts. */}
        {/* Global business object — combined Organization +
            MedicalBusiness + LocalBusiness on the same @id so every
            page on the site references the single canonical business
            entity. medicalSpecialty, geo, address, openingHours,
            telephone and contactPoint are all baked in by the
            builder; pass hasMap so Google's Knowledge Panel surfaces
            the maps deep-link. */}
        <JsonLd
          data={[
            buildMedicalBusinessSchema({ hasMap: RANCH_GOOGLE_MAP_URL }),
            buildWebSiteSchema(),
          ]}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <GoogleAnalytics />
        {/* Hotjar — session recording + heatmaps. afterInteractive so
            it doesn't block hydration; the vendor script itself
            lazy-loads the actual recorder. Identical to the snippet
            Hotjar ships, just lifted into next/script so we get the
            framework's load-order guarantees. */}
        <Script id="hotjar" strategy="afterInteractive">
          {`(function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${HOTJAR_ID},hjsv:${HOTJAR_SV}};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}
        </Script>
        <AuthProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
