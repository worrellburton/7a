import type { Metadata } from 'next';
import ProfileContent from './content';

export const metadata: Metadata = {
  title: 'My Profile - Feather',
};

export default function ProfilePage() {
  return <ProfileContent />;
}
