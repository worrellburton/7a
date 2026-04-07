import type { Metadata } from 'next';
import SubmitContent from './content';

export const metadata: Metadata = {
  title: 'Submit Issue - Seven Arrows',
};

export default function SubmitPage() {
  return <SubmitContent />;
}
