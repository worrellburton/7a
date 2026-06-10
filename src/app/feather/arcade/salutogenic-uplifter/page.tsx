import type { Metadata } from 'next';
import SalutogenicUplifterContent from './content';

export const metadata: Metadata = {
  title: 'Salutogenic Uplifter - Feather',
};

export default function SalutogenicUplifterPage() {
  return <SalutogenicUplifterContent />;
}
