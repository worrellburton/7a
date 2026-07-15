import type { Metadata } from 'next';
import LogFlowContent from './content';

export const metadata: Metadata = {
  title: 'New log',
};

export default function LogPage() {
  return <LogFlowContent />;
}
