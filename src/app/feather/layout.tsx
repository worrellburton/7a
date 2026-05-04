import type { Metadata } from 'next';
import PlatformShell from './PlatformShell';
import { PagePermissionsProvider } from '@/lib/PagePermissions';

export const metadata: Metadata = {
  title: { default: 'Patient Portal', template: '%s | Seven Arrows Recovery' },
  description: null,
  openGraph: null,
  twitter: null,
  robots: 'noindex, nofollow',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PagePermissionsProvider>
      <PlatformShell>{children}</PlatformShell>
    </PagePermissionsProvider>
  );
}
