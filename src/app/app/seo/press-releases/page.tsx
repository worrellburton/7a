import type { Metadata } from 'next';
import OutreachContent from '../outreach/OutreachContent';

export const metadata: Metadata = {
  title: 'Press releases - Patient Portal',
};

export default function PressReleasesPage() {
  return <OutreachContent channel="press_release" />;
}
