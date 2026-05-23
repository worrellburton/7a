import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthProvider } from '@/lib/AuthProvider';
import ModalProvider from '@/lib/ModalProvider';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { JsonLd } from '@/components/JsonLd';
import { buildOrganizationSchema, buildWebSiteSchema } from '@/lib/seo/schema';
import './globals.css';

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
        url: '/images/facility-exterior-mountains.jpg',
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
    images: ['/images/facility-exterior-mountains.jpg'],
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600;700&display=swap"
        />
        {/* No hardcoded canonical here — every page declared the
            same homepage URL, scoring 0/100 on the audit's Canonical
            URLs category. (site)/layout.tsx now emits a per-request
            self-canonical via generateMetadata + the x-pathname
            header set in middleware.ts. */}
        <JsonLd data={[buildOrganizationSchema(), buildWebSiteSchema()]} />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <GoogleAnalytics />
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
