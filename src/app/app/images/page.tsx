import type { Metadata } from 'next';
import ImagesContent from './content';

export const metadata: Metadata = {
  title: 'Images - Patient Portal',
};

export default function ImagesPage() {
  return <ImagesContent />;
}
