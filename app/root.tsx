import type { MetaFunction, LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import TopBar from "~/components/TopBar";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import GoogleReviewsBadge from "~/components/GoogleReviewsBadge";
import ThemeToggle from "~/components/ThemeToggle";
import FloatingContactCTA from "~/components/FloatingContactCTA";
import BottomTicker from "~/components/BottomTicker";
import "./globals.css";

export const meta: MetaFunction = () => [
  { charSet: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { title: "Seven Arrows Recovery | Drug Rehab in Arizona" },
  {
    name: "description",
    content:
      "Seven Arrows Recovery is a boutique drug and alcohol rehab center in Arizona offering clinical and residential treatment in a small group setting at the base of the Swisshelm Mountains.",
  },
  {
    name: "keywords",
    content:
      "drug rehab Arizona,alcohol rehab Arizona,addiction treatment center Arizona,substance abuse treatment,residential treatment Arizona,holistic rehab,trauma-focused treatment,TraumAddiction,boutique rehab,Swisshelm Mountains rehab,dual diagnosis treatment,Arizona drug treatment",
  },
  { property: "og:type", content: "website" },
  { property: "og:locale", content: "en_US" },
  { property: "og:site_name", content: "Seven Arrows Recovery" },
  { property: "og:title", content: "Seven Arrows Recovery | Drug Rehab in Arizona" },
  {
    property: "og:description",
    content:
      "A boutique drug and alcohol rehab center in Arizona. Clinical and residential treatment in a small group setting.",
  },
  { property: "og:image", content: "/images/og-image.jpg" },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: "Seven Arrows Recovery - A Place to Heal" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "Seven Arrows Recovery | Drug Rehab in Arizona" },
  {
    name: "twitter:description",
    content:
      "A boutique drug and alcohol rehab center in Arizona. Clinical and residential treatment in a small group setting.",
  },
  { name: "robots", content: "index, follow" },
  { name: "theme-color", content: "#a0522d" },
  { name: "geo.region", content: "US-AZ" },
  { name: "geo.placename", content: "Cochise County, Arizona" },
];

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap",
  },
  { rel: "canonical", href: "https://sevenarrowsrecovery.com" },
];

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://sevenarrowsrecovery.com/#organization",
  name: "Seven Arrows Recovery",
  url: "https://sevenarrowsrecovery.com",
  logo: "https://sevenarrowsrecovery.com/images/logo.png",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-866-996-4308",
    contactType: "admissions",
    areaServed: "US",
    availableLanguage: ["English", "Spanish"],
    hoursAvailable: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
  },
  sameAs: [
    "https://www.facebook.com/sevenarrowsrecovery",
    "https://www.instagram.com/sevenarrowsrecovery",
  ],
  address: {
    "@type": "PostalAddress",
    addressRegion: "AZ",
    addressCountry: "US",
    addressLocality: "Cochise County",
  },
  foundingDate: "2020",
  numberOfEmployees: { "@type": "QuantitativeValue", minValue: 10, maxValue: 50 },
  areaServed: [
    { "@type": "State", name: "Arizona" },
    { "@type": "City", name: "Phoenix" },
    { "@type": "City", name: "Scottsdale" },
    { "@type": "City", name: "Tucson" },
    { "@type": "City", name: "Mesa" },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Seven Arrows Recovery",
  url: "https://sevenarrowsrecovery.com",
  publisher: { "@id": "https://sevenarrowsrecovery.com/#organization" },
  potentialAction: {
    "@type": "SearchAction",
    target: "https://sevenarrowsrecovery.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased pb-16 lg:pb-0">
        <TopBar />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <GoogleReviewsBadge />
        <ThemeToggle />
        <FloatingContactCTA />
        <BottomTicker />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
