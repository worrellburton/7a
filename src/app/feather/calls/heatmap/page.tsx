import type { Metadata } from 'next';
import CallsHeatmapContent from './content';

export const metadata: Metadata = {
  title: 'Call Heatmap - Patient Portal',
};

export default function CallsHeatmapPage() {
  return <CallsHeatmapContent />;
}
