import { headers } from 'next/headers';
import type { Metadata } from 'next';
import TopBar from '@/components/TopBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BeforeFooterCTA from '@/components/BeforeFooterCTA';
import InsuranceVerification from '@/components/InsuranceVerification';
import BottomTicker from '@/components/BottomTickerServer';
import GoogleReviewsBadge from '@/components/GoogleReviewsBadge';
import FloatingContactCTA from '@/components/FloatingContactCTA';
import StickyMobileCTA from '@/components/StickyMobileCTA';

const ORIGIN = 'https://sevenarrowsrecoveryarizona.com';

// Per-request canonical + og:url. middleware.ts forwards the request
// pathname as `x-pathname` on every public-site request; we read it
// here to set a self-referencing canonical (so 0/100 → 100/100 on the
// audit's Canonical URLs category) and a per-page og:url (closing the
// "Missing OG tags: og:url" gap on 33 pages). Per-page metadata still
// shallow-merges over this — pages that already declare their own
// alternates.canonical (e.g. blog posts) win as expected.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const pathname = h.get('x-pathname') || '/';
  const url = `${ORIGIN}${pathname}`;
  return {
    alternates: { canonical: url },
    openGraph: { url },
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <Header />
      <main className="flex-1">{children}</main>
      <BeforeFooterCTA />
      <InsuranceVerification />
      <Footer />
      <BottomTicker />
      <GoogleReviewsBadge />
      <FloatingContactCTA />
      {/* Mobile-only floating call pill, rendered globally so the
          phone number is always one tap away on every inner page. */}
      <StickyMobileCTA />
    </>
  );
}
