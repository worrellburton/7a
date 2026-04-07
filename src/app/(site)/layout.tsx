import TopBar from '@/components/TopBar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleReviewsBadge from '@/components/GoogleReviewsBadge';
import FloatingContactCTA from '@/components/FloatingContactCTA';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <GoogleReviewsBadge />
      <FloatingContactCTA />
    </>
  );
}
