'use client';

import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type AnchorHTMLAttributes, type ReactNode } from 'react';

// Drop-in replacement for next/link that ALSO warms the destination
// route on mouseenter / focus / touchstart. Default next/link only
// prefetches when the link scrolls into view; on dense surfaces
// (large tables, rosters) most rows are visible at once so the
// in-viewport heuristic is no help. This component triggers
// router.prefetch() the moment the user telegraphs intent,
// shaving ~200ms off the click → paint loop without spamming
// the network because each prefetch is idempotent and deduped
// by the router.
//
// SEO-safe: crawlers never fire mouseenter/touchstart/focus, so
// the extra prefetch only runs for real users. Falls back to the
// stock Link prefetch behavior on routes that don't have a hover
// affordance (mobile non-touch contexts, screen readers, etc.).

type Props = LinkProps & {
  children?: ReactNode;
  className?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

export default function HoverPrefetchLink({
  href,
  children,
  onMouseEnter,
  onTouchStart,
  onFocus,
  ...rest
}: Props) {
  const router = useRouter();
  const warmed = useRef(false);

  function warm() {
    if (warmed.current) return;
    warmed.current = true;
    // Next.js types router.prefetch as accepting (href: string) — coerce
    // the LinkProps `href` (which can also be a UrlObject) to its string
    // form for the prefetch call.
    const target = typeof href === 'string' ? href : (href as { pathname?: string }).pathname ?? '';
    if (target) router.prefetch(target);
  }

  return (
    <Link
      href={href}
      {...rest}
      onMouseEnter={(e) => { warm(); onMouseEnter?.(e); }}
      onTouchStart={(e) => { warm(); onTouchStart?.(e); }}
      onFocus={(e) => { warm(); onFocus?.(e); }}
    >
      {children}
    </Link>
  );
}
