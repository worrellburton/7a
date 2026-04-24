import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/lib/AuthProvider';
import ModalProvider from '@/lib/ModalProvider';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sevenarrowsrecovery.com'),
  title: {
    default: 'Seven Arrows Recovery | Drug Rehab in Arizona',
    template: '%s | Seven Arrows Recovery',
  },
  description:
    'Seven Arrows Recovery is a boutique drug and alcohol rehab center in Arizona offering clinical and residential treatment in a small group setting at the base of the Swisshelm Mountains.',
  keywords:
    'drug rehab Arizona,alcohol rehab Arizona,addiction treatment center Arizona,substance abuse treatment,residential treatment Arizona,holistic rehab,trauma-focused treatment,TraumAddiction,boutique rehab,Swisshelm Mountains rehab,dual diagnosis treatment,Arizona drug treatment',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Seven Arrows Recovery',
    title: 'Seven Arrows Recovery | Drug Rehab in Arizona',
    description:
      'A boutique drug and alcohol rehab center in Arizona. Clinical and residential treatment in a small group setting.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Seven Arrows Recovery - A Place to Heal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seven Arrows Recovery | Drug Rehab in Arizona',
    description:
      'A boutique drug and alcohol rehab center in Arizona. Clinical and residential treatment in a small group setting.',
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
  maximumScale: 1,
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://sevenarrowsrecovery.com/#organization',
  name: 'Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com',
  logo: 'https://sevenarrowsrecovery.com/images/logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-866-996-4308',
    contactType: 'admissions',
    areaServed: 'US',
    availableLanguage: ['English', 'Spanish'],
    hoursAvailable: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  },
  sameAs: [
    'https://www.facebook.com/sevenarrowsrecovery',
    'https://www.instagram.com/sevenarrowsrecovery',
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: '2491 W Jefferson Rd',
    addressLocality: 'Elfrida',
    addressRegion: 'AZ',
    postalCode: '85610',
    addressCountry: 'US',
  },
  foundingDate: '2020',
  numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10, maxValue: 50 },
  areaServed: [
    { '@type': 'State', name: 'Arizona' },
    { '@type': 'City', name: 'Phoenix' },
    { '@type': 'City', name: 'Scottsdale' },
    { '@type': 'City', name: 'Tucson' },
    { '@type': 'City', name: 'Mesa' },
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Seven Arrows Recovery',
  url: 'https://sevenarrowsrecovery.com',
  publisher: { '@id': 'https://sevenarrowsrecovery.com/#organization' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600;700&display=swap"
        />
        <link rel="canonical" href="https://sevenarrowsrecovery.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <GoogleAnalytics />
        <AuthProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
