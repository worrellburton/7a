import TopBar from '@/components/TopBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BeforeFooterCTA from '@/components/BeforeFooterCTA';
import BottomTicker from '@/components/BottomTickerServer';
import GoogleReviewsBadge from '@/components/GoogleReviewsBadge';
import FloatingContactCTA from '@/components/FloatingContactCTA';
import StickyMobileCTA from '@/components/StickyMobileCTA';
import SiteBackground from '@/components/site-background/SiteBackground';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Site-wide WebGL ambient background. Fixed behind every page
          section so it only shows through transparent regions — pure
          atmosphere, never competes with content. */}
      <SiteBackground />
      <TopBar />
      <Header />
      <main className="flex-1">{children}</main>
      <BeforeFooterCTA />
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
