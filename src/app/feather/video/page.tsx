import type { Metadata } from 'next';
import VideoContent from './content';

export const metadata: Metadata = {
  title: 'Video - Patient Portal',
};

export default function VideoPage() {
  return <VideoContent />;
}
