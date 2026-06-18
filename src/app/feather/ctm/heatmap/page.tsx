import type { Metadata } from 'next';
import CallsHeatmapContent from './content';

export const metadata: Metadata = {
  title: 'Call Heatmap - Feather',
};

export default function CallsHeatmapPage() {
  return <CallsHeatmapContent />;
}
