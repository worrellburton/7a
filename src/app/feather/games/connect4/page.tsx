import type { Metadata } from 'next';
import Content from './content';

export const metadata: Metadata = {
  title: 'Connect-4 Tournament — Feather',
};

export default function Connect4Page() {
  return <Content />;
}
