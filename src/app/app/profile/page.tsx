import type { Metadata } from 'next';
import ProfileContent from './content';

export const metadata: Metadata = {
  title: 'My Profile - Patient Portal',
};

export default function ProfilePage() {
  return <ProfileContent />;
}
