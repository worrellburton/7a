'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import SevenArrowsMark from '../team-member/SevenArrowsMark';
import { useReducedMotion } from '../team-member/motion';

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
  const pathname = usePathname();
  const reduced = useReducedMotion();

  // Determine which top-level item represents the current page.
  // A nav item is active when its href matches the current path
  // exactly, when the path starts with its href plus a slash, or
  // when any of its dropdown children matches. Returns the label
  // of the active item or null.
  const activeLabel = (() => {
    if (!pathname) return null;
    for (const item of navLinks) {
      const prefix = item.href.endsWith('/') ? item.href.slice(0, -1) : item.href;
      if (pathname === prefix || pathname.startsWith(prefix + '/')) return item.label;
      if (item.dropdown?.some((d) => pathname === d.href || pathname.startsWith(d.href + '/'))) {
        return item.label;
      }
    }
    return null;
  })();

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

  // When the drawer opens, pre-expand the section that contains
  // the current page so visitors can see siblings to their current
  // route without an extra tap. On close, collapse everything so
  // the next open starts clean.
  useEffect(() => {
    if (open) {
      setExpanded(activeLabel);
    } else {
      setExpanded(null);
    }
    // activeLabel is derived from navLinks + pathname which are
    // stable at mount; we intentionally only re-run on open flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Escape key closes the drawer, and Tab is intercepted so focus
  // stays trapped inside the panel while the drawer is modal.
  // Initial focus moves into the panel shortly after open; on close
  // we return focus to whatever triggered the open (typically the
  // hamburger button).
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Defer the initial focus by a frame so the drawer's entry
    // animation has started and the element is actually focusable.
    const focusRaf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      // Focus trap — the drawer is modal, so Tab should cycle within
      // the panel's focusable elements instead of escaping to the
      // underlying page.
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null); // skip hidden
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(focusRaf);
      document.removeEventListener('keydown', onKey);
      // Return focus only when the drawer actually closes, not on
      // unmount from e.g. HMR. We check that we're not inside the
      // panel anymore when restoring focus.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
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
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        style={{
          maxHeight: `calc(100dvh - var(--site-header-height, 68px))`,
          opacity: showing ? 1 : 0,
          transform: showing ? 'translateY(0)' : 'translateY(-8px)',
          transition: `opacity ${duration}ms ${EASE}, transform ${duration}ms ${EASE}`,
        }}
      >
        {/* Brand flourish — a faint SevenArrowsMark anchored to the
            bottom-right corner of the drawer. Draws itself in with
            its standard mount animation after the drawer has
            finished settling, so the arrival sequence is
            drawer → nav items → brand mark, each handing off to
            the next. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4"
          style={{
            opacity: showing ? 0.08 : 0,
            transition: `opacity 700ms ${EASE} 320ms`,
          }}
        >
          <SevenArrowsMark size={240} animated={showing} tone="warm" />
        </div>
        <div className="pt-3 pb-4 space-y-0.5">
          {navLinks.map((item, i) => (
            <StaggeredItem key={item.href} show={showing} index={i}>
              {item.dropdown ? (
                <>
                  <button
                    type="button"
                    className={`relative flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold tracking-wider uppercase hover:text-primary ${
                      activeLabel === item.label ? 'text-primary' : 'text-foreground'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                    onClick={() => toggle(item.label)}
                    aria-expanded={expanded === item.label}
                    aria-current={activeLabel === item.label ? 'page' : undefined}
                  >
                    {/* Active-page indicator — a tiny copper dot
                        to the left of the current section's label.
                        Scales in when the drawer opens on an active
                        page, providing a clear "you are here" cue
                        without clashing with the expand-accent
                        rail that appears inside the open section. */}
                    <ActiveDot active={activeLabel === item.label} show={showing} />
                    {item.label}
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        transform: expanded === item.label ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: `transform 380ms ${EASE}`,
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Accordion body — uses the CSS grid-rows "0fr
                      ↔ 1fr" trick to transition intrinsic height
                      without measuring it in JS. The child has
                      overflow:hidden so content is clipped while
                      the row shrinks/grows. A copper accent bar
                      runs up the left edge whenever the section is
                      open. */}
                  <div
                    className="grid relative"
                    style={{
                      gridTemplateRows: expanded === item.label ? '1fr' : '0fr',
                      transition: `grid-template-rows 380ms ${EASE}`,
                    }}
                  >
                    <div className="overflow-hidden bg-warm-bg">
                      {/* Copper accent bar on the left edge — scales
                          up from 0 as the accordion opens. */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 bottom-0 w-[3px] bg-primary origin-top"
                        style={{
                          transform: expanded === item.label ? 'scaleY(1)' : 'scaleY(0)',
                          transition: `transform 420ms ${EASE} ${expanded === item.label ? '80ms' : '0ms'}`,
                        }}
                      />
                      {item.dropdown.map((sub, subIndex) => {
                        const Icon = iconMap[sub.label];
                        const subShow = expanded === item.label;
                        const subActive =
                          pathname === sub.href || (pathname?.startsWith(sub.href + '/') ?? false);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm border-b border-foreground/5 last:border-b-0 hover:text-primary ${
                              subActive ? 'text-primary font-semibold' : 'text-foreground'
                            }`}
                            role="menuitem"
                            onClick={onClose}
                            tabIndex={subShow ? 0 : -1}
                            aria-hidden={subShow ? undefined : true}
                            aria-current={subActive ? 'page' : undefined}
                            style={{
                              opacity: subShow ? 1 : 0,
                              transform: subShow ? 'translateX(0)' : 'translateX(-8px)',
                              transition: `opacity 360ms ${EASE} ${subShow ? 140 + subIndex * 30 : 0}ms, transform 380ms ${EASE} ${subShow ? 140 + subIndex * 30 : 0}ms`,
                            }}
                          >
                            {Icon && (
                              <div
                                className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                                  subActive ? 'bg-primary' : 'bg-primary/10'
                                }`}
                              >
                                <Icon className={`w-3 h-3 ${subActive ? 'text-white' : 'text-primary'}`} />
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
                  </div>
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`relative block px-3 py-2.5 text-xs font-semibold tracking-wider uppercase hover:text-primary ${
                    activeLabel === item.label ? 'text-primary' : 'text-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                  role="menuitem"
                  onClick={onClose}
                  aria-current={activeLabel === item.label ? 'page' : undefined}
                >
                  <ActiveDot active={activeLabel === item.label} show={showing} />
                  {item.label}
                </Link>
              )}
            </StaggeredItem>
          ))}
          <StaggeredItem show={showing} index={navLinks.length}>
            <div className="px-3 pt-3">
              <PhoneCTA reduced={reduced} />
            </div>
          </StaggeredItem>
        </div>
      </div>
    </>
  );
}

/**
 * Drawer footer CTA — the big copper "(866) 996-4308" pill. Three
 * layered treatments beyond the base btn-primary styling:
 *
 *  - A diagonal copper shimmer that sweeps across the button on
 *    a slow 6s loop, giving the pill a quiet sense of liveness
 *    without being a distracting pulse.
 *  - A press state that drops the button a pixel and deepens its
 *    shadow so it feels physically tactile on mobile.
 *  - An SVG phone glyph whose receiver subtly wobbles when the
 *    pill is pressed, mirroring the "calling" gesture.
 */
function PhoneCTA({ reduced }: { reduced: boolean }) {
  return (
    <a
      href="tel:+18669964308"
      className="group/phone btn-primary relative overflow-hidden w-full text-center flex items-center justify-center gap-2 text-xs py-3 active:translate-y-px active:shadow-[0_4px_14px_-6px_rgba(188,107,74,0.55)]"
      style={{ transition: `transform 160ms ${EASE}, box-shadow 200ms ${EASE}` }}
    >
      {/* Copper shimmer — a diagonal white-translucent band that
          drifts across the pill. Clipped by the button's overflow
          so it never escapes the pill edge. Disabled under
          prefers-reduced-motion. */}
      {!reduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)',
            transform: 'translateX(-120%)',
            animation: 'sa-phone-shimmer 6s ease-in-out infinite',
          }}
        />
      )}
      <style>{`
        @keyframes sa-phone-shimmer {
          0%, 25% { transform: translateX(-120%); }
          55% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes sa-phone-wobble {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          80% { transform: rotate(2deg); }
        }
      `}</style>
      <svg
        className="relative w-3.5 h-3.5 group-active/phone:[animation:sa-phone-wobble_0.6s_ease-out]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
      </svg>
      <span className="relative">(866) 996-4308</span>
    </a>
  );
}

/**
 * Active-page dot — rendered inside each top-level nav button / link
 * when its section represents the current route. Sits flush left of
 * the label text and scales up from zero when the drawer reveals,
 * so the "you are here" cue arrives as part of the open choreography.
 */
function ActiveDot({ active, show }: { active: boolean; show: boolean }) {
  if (!active) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 align-middle"
      style={{
        transform: show ? 'scale(1)' : 'scale(0)',
        transition: `transform 420ms ${EASE} 220ms`,
      }}
    />
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
