import TopBar from '@/components/TopBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BeforeFooterCTA from '@/components/BeforeFooterCTA';
import InsuranceVerification from '@/components/InsuranceVerification';
import BottomTicker from '@/components/BottomTickerServer';
import GoogleReviewsBadge from '@/components/GoogleReviewsBadge';
import FloatingContactCTA from '@/components/FloatingContactCTA';
import StickyMobileCTA from '@/components/StickyMobileCTA';

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
