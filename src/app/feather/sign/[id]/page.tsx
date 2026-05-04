import type { Metadata } from 'next';
import SignContent from './content';

export const metadata: Metadata = {
  title: 'Sign Job Description - Seven Arrows',
};

export default function SignPage() {
  return <SignContent />;
}
