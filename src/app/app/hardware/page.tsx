import type { Metadata } from 'next';
import HardwareContent from './content';

export const metadata: Metadata = {
  title: 'Hardware — Feather',
};

export default function HardwarePage() {
  return <HardwareContent />;
}
