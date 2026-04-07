import type { Metadata } from 'next';
import PlatformShell from './PlatformShell';
import { PagePermissionsProvider } from '@/lib/PagePermissions';

export const metadata: Metadata = {
  title: { default: 'Patient Portal', template: '%s | Seven Arrows Recovery' },
  robots: 'noindex, nofollow',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PagePermissionsProvider>
      <PlatformShell>{children}</PlatformShell>
    </PagePermissionsProvider>
  );
}
