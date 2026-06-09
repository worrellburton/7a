'use client';

import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, useRef, type AnchorHTMLAttributes, type ForwardedRef, type ReactNode } from 'react';

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
// the extra prefetch only runs for real users.

type Props = LinkProps & {
  children?: ReactNode;
  className?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

function HoverPrefetchLinkBase(
  { href, children, onMouseEnter, onTouchStart, onFocus, ...rest }: Props,
  ref: ForwardedRef<HTMLAnchorElement>,
) {
  const router = useRouter();
  const warmed = useRef(false);

  function warm() {
    if (warmed.current) return;
    warmed.current = true;
    const target = typeof href === 'string' ? href : (href as { pathname?: string }).pathname ?? '';
    if (target) router.prefetch(target);
  }

  return (
    <Link
      ref={ref}
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

const HoverPrefetchLink = forwardRef<HTMLAnchorElement, Props>(HoverPrefetchLinkBase);
HoverPrefetchLink.displayName = 'HoverPrefetchLink';
export default HoverPrefetchLink;
