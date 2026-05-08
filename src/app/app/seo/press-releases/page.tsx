import type { Metadata } from 'next';
import OutreachContent from '../outreach/OutreachContent';

export const metadata: Metadata = {
  title: 'Press releases - Feather',
};

export default function PressReleasesPage() {
  return <OutreachContent channel="press_release" />;
}
