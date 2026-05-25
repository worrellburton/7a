import { headers } from 'next/headers';
import type { Metadata } from 'next';
import TopBar from '@/components/TopBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
      {/* Bottom padding on mobile reserves the height of the
          StickyMobileCTA + GoogleReviewsBadge stack so the last
          row of page content isn't tucked behind the floating
          call pill. lg:pb-0 drops the reservation on desktop
          (the pill is lg:hidden there). The padding stays even
          when the user dismisses the bar — losing a small empty
          band at the bottom is cheaper than reflowing the page
          every time the bar comes / goes. */}
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-0">{children}</main>
      {/* Pre-footer conversion block. The dark InsuranceVerification
          form replaces the older "Change your life with a single
          call" CTA (BeforeFooterCTA) — both said the same thing in
          adjacent sections, which read as repetitive. The form is
          the better next-step affordance: it captures benefits
          info on the spot. Mobile-only sticky phone bar (rendered
          below) keeps tap-to-call always available regardless. */}
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
