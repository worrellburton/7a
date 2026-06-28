import { headers } from 'next/headers';
import type { Metadata } from 'next';
import TopBar from '@/components/TopBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BeforeFooterCTA from '@/components/BeforeFooterCTA';
import InsuranceVerification from '@/components/InsuranceVerification';
import BottomTicker from '@/components/BottomTickerServer';
import FloatingContactCTA from '@/components/FloatingContactCTA';
import StickyMobileCTA from '@/components/StickyMobileCTA';
import SmoothScroll from '@/components/SmoothScroll';

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
      {/* Site-wide smooth scrolling (Lenis). Client-only; no-ops under
          prefers-reduced-motion. Scoped to the public site, not feather. */}
      <SmoothScroll />
      {/* Skip link — the first focusable element on every public page so
          keyboard and screen-reader users can jump past the TopBar +
          Header nav straight to the content (WCAG 2.4.1 Bypass Blocks).
          Visually hidden until focused, so it changes nothing visually. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <TopBar />
      <Header />
      {/* No bottom padding here anymore. The previous mobile
          pb-[calc(env(safe-area-inset-bottom)+96px)] was reserving
          height for the floating StickyMobileCTA pill, but it had
          the side effect of dropping a ~96-120px empty white band
          BETWEEN the page's last section and the BeforeFooterCTA
          below (visible in the screenshot the user flagged: dark
          contact CTA → big white gap → "Change your life with a
          single call"). The Footer is the bottom-most element and
          carries its own bottom padding for the floating pill's
          safe-area on mobile (see Footer.tsx); reserving space
          here just stacks white space mid-page. */}
      <main id="main-content" className="flex-1 overflow-x-hidden">{children}</main>
      {/* Pre-footer conversion stack. Brought BeforeFooterCTA back
          above the form — the dog-photo "Change your life with a
          single call" block is the warm hook (anyone, casual), then
          InsuranceVerification is the actionable form (people ready
          to commit benefits info). Reading order: emotional → form.
          Mobile-only sticky phone bar (rendered below) keeps
          tap-to-call always available regardless. */}
      <BeforeFooterCTA />
      <InsuranceVerification />
      <Footer />
      <BottomTicker />
      <FloatingContactCTA />
      {/* Mobile-only sticky phone-call ribbon pinned to the
          bottom of every inner page. GoogleReviewsBadge was
          previously stacked below this; removed to keep the
          ribbon a single clean row. */}
      <StickyMobileCTA />
    </>
  );
}
