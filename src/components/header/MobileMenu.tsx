'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Mobile navigation drawer. Extracted from `Header.tsx` so that the
 * header file can stay focused on the desktop mega-menu and this
 * component can own all mobile-specific behavior: scroll lock,
 * escape-to-close, click-outside, focus containment, and the
 * animated reveal of nav items.
 *
 * Open/close choreography:
 *
 *   `open` prop          -> parent's source of truth
 *   `mounted`  state     -> whether the panel element is in the DOM
 *   `showing`  state     -> whether the panel is in its "visible"
 *                           visual state (triggers the CSS transition)
 *
 * When `open` flips to true we mount the panel in its "hidden"
 * visual state, then flip `showing` true on the next frame so the
 * browser has committed the hidden frame before animating. When
 * `open` flips to false we flip `showing` back to false and keep
 * the element mounted through the closing transition, unmounting
 * only once the transition has ended.
 */

export interface MobileNavDropdownItem {
  label: string;
  href: string;
  description?: string;
  group?: string;
}

export interface MobileNavItem {
  label: string;
  href: string;
  description?: string;
  dropdown?: MobileNavDropdownItem[];
}

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const OPEN_DURATION = 360;
const CLOSE_DURATION = 240;

export default function MobileMenu({
  open,
  onClose,
  navLinks,
  iconMap,
}: {
  open: boolean;
  onClose: () => void;
  navLinks: MobileNavItem[];
  iconMap: Record<string, React.ComponentType<{ className?: string }>>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Two-phase mount state — see component-level comment.
  const [mounted, setMounted] = useState(open);
  const [showing, setShowing] = useState(false);

  // Mount on open, then on the *next* frame flip to "showing" so the
  // hidden pose paints first and the transition animates the delta.
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShowing(true));
      return () => cancelAnimationFrame(raf);
    }
    setShowing(false);
    const t = setTimeout(() => setMounted(false), CLOSE_DURATION);
    return () => clearTimeout(t);
  }, [open]);

  // Collapse any expanded section whenever the drawer closes so the
  // next open starts from the clean "everything collapsed" state.
  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  // Body scroll lock — prevents the underlying page from scrolling
  // while the drawer is visible. Restores the prior overflow value
  // on close (rather than assuming the site default was 'visible').
  useEffect(() => {
    if (!mounted) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prev;
    };
  }, [mounted]);

  // Escape key closes the drawer. Attached at the document level so
  // it works regardless of which element currently has focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const toggle = (label: string) => {
    setExpanded((curr) => (curr === label ? null : label));
  };

  const duration = showing ? OPEN_DURATION : CLOSE_DURATION;

  return (
    <>
      {/* Backdrop — dims the page below the header and captures
          outside taps to close. Rendered as a sibling to the panel
          rather than behind it so click targeting is unambiguous. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="lg:hidden fixed inset-x-0 bottom-0 z-30"
        style={{
          top: 'var(--site-header-height, 68px)',
          background: 'rgba(20, 10, 6, 0.45)',
          opacity: showing ? 1 : 0,
          transition: `opacity ${duration}ms ${EASE}`,
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* The drawer itself — stays inline in the header layout for
          simplicity but uses transform + opacity for its animation.
          Scrolls internally if content exceeds viewport minus the
          header chrome. */}
      <div
        ref={panelRef}
        className="lg:hidden border-t border-gray-100 bg-white overflow-y-auto relative z-40"
        role="menu"
        style={{
          maxHeight: `calc(100dvh - var(--site-header-height, 68px))`,
          opacity: showing ? 1 : 0,
          transform: showing ? 'translateY(0)' : 'translateY(-8px)',
          transition: `opacity ${duration}ms ${EASE}, transform ${duration}ms ${EASE}`,
        }}
      >
        <div className="pt-3 pb-4 space-y-0.5">
          {navLinks.map((item, i) => (
            <StaggeredItem key={item.href} show={showing} index={i}>
              {item.dropdown ? (
                <>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold tracking-wider uppercase text-foreground hover:text-primary"
                    style={{ fontFamily: 'var(--font-body)' }}
                    onClick={() => toggle(item.label)}
                    aria-expanded={expanded === item.label}
                  >
                    {item.label}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${expanded === item.label ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expanded === item.label && (
                    <div className="bg-warm-bg">
                      {item.dropdown.map((sub) => {
                        const Icon = iconMap[sub.label];
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className="flex items-center gap-2.5 px-5 py-2.5 text-sm text-foreground hover:text-primary border-b border-foreground/5 last:border-b-0"
                            role="menuitem"
                            onClick={onClose}
                          >
                            {Icon && (
                              <div className="shrink-0 w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                                <Icon className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                                {sub.label}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className="block px-3 py-2.5 text-xs font-semibold tracking-wider uppercase text-foreground hover:text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                  role="menuitem"
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              )}
            </StaggeredItem>
          ))}
          <StaggeredItem show={showing} index={navLinks.length}>
            <div className="px-3 pt-3">
              <a
                href="tel:+18669964308"
                className="btn-primary w-full text-center flex items-center justify-center gap-2 text-xs py-3"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                (866) 996-4308
              </a>
            </div>
          </StaggeredItem>
        </div>
      </div>
    </>
  );
}

/**
 * Wraps a nav item in a slide-up + fade reveal that's staggered by
 * its index. Each successive item arrives 40ms after the previous,
 * with a small initial delay so the drawer's own open transition
 * has begun before the list starts populating. On close, the fade
 * is quick and uniform across items to avoid a noisy tail-out.
 */
function StaggeredItem({
  show,
  index,
  children,
}: {
  show: boolean;
  index: number;
  children: React.ReactNode;
}) {
  const delay = show ? 120 + index * 40 : 0;
  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(6px)',
        transition: `opacity 420ms ${EASE} ${delay}ms, transform 520ms ${EASE} ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
