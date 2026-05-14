import type { Metadata } from 'next';
import CreatePostContent from './content';

export const metadata: Metadata = {
  title: 'Create Post — Social Media',
};

export default function CreatePostPage() {
  return <CreatePostContent />;
}
