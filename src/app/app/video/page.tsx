import type { Metadata } from 'next';
import VideoContent from './content';

export const metadata: Metadata = {
  title: 'Video - Feather',
};

export default function VideoPage() {
  return <VideoContent />;
}
