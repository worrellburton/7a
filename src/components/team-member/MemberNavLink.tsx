'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';

/**
 * Drop-in replacement for a `next/link` Link targeting a team-member
 * detail page. When the browser supports `document.startViewTransition`
 * and the user hasn't opted out of motion, it wraps the client-side
 * navigation in a view transition so that named elements (e.g. the
 * avatar image with `view-transition-name: avatar-<slug>`) morph
 * smoothly between the grid and the hero.
 *
 * Falls back to a plain Link when the API is unavailable — Firefox
 * today, or modifier-click / middle-click on any browser.
 */
export default function MemberNavLink({
  href,
  children,
  className,
  style,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle modifier-clicks, middle-clicks, and
    // right-clicks normally — those users expect a new tab / context
    // menu, not a cross-page animation.
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    type DocWithVT = Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    const doc = (typeof document !== 'undefined' ? (document as DocWithVT) : null);
    if (!doc?.startViewTransition || reduced) {
      return; // Fall through to Link's default navigation.
    }

    e.preventDefault();
    doc.startViewTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}
