'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  // Also set a `data-mobile-nav-open` flag on <html> so other
  // floating UI (the StickyMobileCTA call pill) can hide via CSS
  // while the drawer is up — otherwise it overlaps the menu.
  useEffect(() => {
    if (!mounted) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = 'hidden';
    document.documentElement.dataset.mobileNavOpen = 'true';
    return () => {
      body.style.overflow = prev;
      delete document.documentElement.dataset.mobileNavOpen;
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
    <div
      ref={panelRef}
      // Full-screen fixed panel pinned below the nav (TopBar +
      // Header). Escapes the parent <nav>'s max-w-7xl / px
      // container so the drawer spans the entire viewport width
      // rather than being cropped into the centered column. A tap
      // on the hamburger (now the X) or pressing Escape is the
      // only way to close — no need for a separate backdrop since
      // the panel owns the whole lower viewport.
      className="lg:hidden fixed left-0 right-0 bottom-0 z-40 bg-white overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Main navigation"
      style={{
        top: 'var(--site-header-height, 68px)',
        opacity: showing ? 1 : 0,
        transform: showing ? 'translateY(0)' : 'translateY(-8px)',
        transition: `opacity ${duration}ms ${EASE}, transform ${duration}ms ${EASE}`,
      }}
    >
      <div className="pt-4 pb-6 px-4 space-y-0.5">
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
                    {/* Group the active-page dot and label into one
                        flex child so the row always reads as
                        [label][chevron] regardless of whether the
                        dot is rendered — otherwise three flex
                        children + justify-between would push the
                        label to the center on active sections only,
                        making the active item visually misalign with
                        its siblings. */}
                    <span className="inline-flex items-center">
                      <ActiveDot active={activeLabel === item.label} show={showing} />
                      {item.label}
                    </span>
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
          <StaggeredItem show={showing} index={navLinks.length + 1}>
            <DrawerReview open={open} />
          </StaggeredItem>
        </div>
    </div>
  );
}

interface RandomReview {
  authorName: string | null;
  profilePhotoUrl: string | null;
  rating: number;
  relativeTime: string | null;
  text: string;
}

/**
 * Small verified-review card shown in the empty space below the phone
 * CTA in the mobile drawer. Fetches a pool of random real Google
 * reviews once, then picks a fresh one every time the drawer opens so
 * the visitor sees different social proof on repeat visits.
 */
function DrawerReview({ open }: { open: boolean }) {
  const [pool, setPool] = useState<RandomReview[]>([]);
  const [current, setCurrent] = useState<RandomReview | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews/random', { cache: 'no-store' })
      .then(async (r) => (r.ok ? ((await r.json()) as { rows: RandomReview[] }) : null))
      .then((json) => {
        if (cancelled || !json) return;
        setPool(json.rows || []);
      })
      .catch(() => { /* non-fatal — section just stays empty */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!open || pool.length === 0) return;
    setCurrent(pool[Math.floor(Math.random() * pool.length)]);
  }, [open, pool]);

  if (!current) return null;
  const text = current.text.length > 180 ? current.text.slice(0, 180).replace(/\s+\S*$/, '') + '…' : current.text;

  return (
    <div className="px-3 pt-6">
      <div className="rounded-2xl border border-black/10 bg-warm-bg/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <GoogleG />
          <div className="flex items-center gap-0.5 text-[#f5a623]">
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} className={`w-3 h-3 ${i < Math.round(current.rating) ? '' : 'opacity-30'}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
          </div>
          <span className="ml-auto text-[10px] tracking-[0.18em] uppercase font-semibold text-foreground/50">
            Verified Google review
          </span>
        </div>
        <p className="text-[13px] text-foreground/80 leading-snug">&ldquo;{text}&rdquo;</p>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-foreground/60">
          {current.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.profilePhotoUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-full object-cover ring-1 ring-black/10"
              loading="lazy"
            />
          ) : (
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
              {(current.authorName || '?').trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-semibold text-foreground/75">{current.authorName || 'Verified Google review'}</span>
          {current.relativeTime && <span className="text-foreground/40">· {current.relativeTime}</span>}
        </p>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
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
