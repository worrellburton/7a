import type { Metadata } from 'next';
import RCMPipelineContent from './content';

export const metadata: Metadata = {
  title: 'RCM Pipeline',
};

export default function RCMPipelinePage() {
  return <RCMPipelineContent />;
}
