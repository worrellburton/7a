import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/TopBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleReviewsBadge from "@/components/GoogleReviewsBadge";

export const metadata: Metadata = {
  metadataBase: new URL("https://sevenarrowsrecovery.com"),
  title: {
    default: "Seven Arrows Recovery | Drug Rehab in Arizona",
    template: "%s | Seven Arrows Recovery",
  },
  description:
    "Seven Arrows Recovery is a boutique drug and alcohol rehab center in Arizona offering clinical and residential treatment in a small group setting at the base of the Swisshelm Mountains.",
  keywords: [
    "drug rehab Arizona",
    "alcohol rehab Arizona",
    "addiction treatment center Arizona",
    "substance abuse treatment",
    "residential treatment Arizona",
    "holistic rehab",
    "trauma-focused treatment",
    "TraumAddiction",
    "boutique rehab",
    "Swisshelm Mountains rehab",
    "dual diagnosis treatment",
    "Arizona drug treatment",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Seven Arrows Recovery",
    title: "Seven Arrows Recovery | Drug Rehab in Arizona",
    description:
      "A boutique drug and alcohol rehab center in Arizona. Clinical and residential treatment in a small group setting.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Seven Arrows Recovery - A Place to Heal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seven Arrows Recovery | Drug Rehab in Arizona",
    description:
      "A boutique drug and alcohol rehab center in Arizona. Clinical and residential treatment in a small group setting.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://sevenarrowsrecovery.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#a0522d" />
        <meta name="geo.region" content="US-AZ" />
        <meta name="geo.placename" content="Cochise County, Arizona" />
      </head>
      <body className="min-h-screen flex flex-col antialiased pb-16 lg:pb-0">
        <TopBar />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <GoogleReviewsBadge />
      </body>
    </html>
  );
}
