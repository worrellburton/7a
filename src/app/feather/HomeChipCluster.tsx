'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Right-cluster wrapper for the home header's info chips
// (HomeMercuryBalanceChip, HomeDailyLogsChip, HomeHardwareChip).
//
// Desktop: chips render inline in a row, same as before.
// Mobile:  the chips collapse behind a single round trigger button.
//          Tapping it opens a dropdown panel positioned below the
//          button with the chips stacked vertically.
//
// Why this is portaled: the home page wraps its content in a
// stacking-context-creating element (`isolation: isolate` +
// `overflow-hidden` on the inner viewport container). A plain
// absolutely-positioned dropdown inside that ancestor is either
// clipped or stacked behind sibling content — the popup looked
// "broken" because it was rendering invisibly behind the page.
// Portaling the dropdown straight onto <body> escapes both traps,
// matching the pattern HomeHardwareChip already uses for its modal.
//
// Children render once (in the desktop-inline path) AND inside the
// portal when the mobile sheet is open — but to keep each chip's
// internal state alive across opens, we only mount the children in
// ONE place at a time, swapping the render slot rather than
// duplicating. See `desktopSlotRef` / `mobileSlotRef` below.

export default function HomeChipCluster({ children, menuExtras, indicator }: { children: ReactNode; menuExtras?: ReactNode; indicator?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  // Set after first render so the portal target (document.body) is
  // available. SSR-safe — `mounted` stays false on the server.
  useEffect(() => setMounted(true), []);

  // Track viewport size to pick which render path actually mounts
  // the children. Below the sm breakpoint (640px) → mobile sheet;
  // above → inline row. matchMedia is cheap and keeps state in
  // sync if the user rotates a tablet between portrait/landscape.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Position the portaled panel against the trigger button so it
  // visually feels anchored even though it lives on document.body.
  // Re-measure on open + on window resize / scroll so a virtual
  // keyboard opening or a rotation doesn't strand the panel.
  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8, // 8px gap below the button
        right: Math.max(8, window.innerWidth - rect.right), // mirror right edge, clamp to viewport
      });
    }
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  // Outside-click + Escape to close. Skip the trigger itself so the
  // toggle click doesn't immediately re-close from the same event.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Render path: on desktop the children render inline. On mobile
  // they live in the portaled sheet — which stays MOUNTED (hidden via
  // display:none) the whole time the page is open, so the chips fetch
  // their data on page load and the menu opens instantly with real
  // numbers instead of loading states.
  const renderInline = !isMobile;

  return (
    <>
      <div className="relative inline-flex items-center gap-2">
        {/* Mobile trigger. Hidden on sm+. */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={open ? 'Hide quick stats' : 'Show quick stats'}
          className="relative sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-foreground hover:bg-white hover:border-primary/45 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="6" cy="12" r="1.4" fill="currentColor" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" />
            <circle cx="18" cy="12" r="1.4" fill="currentColor" />
          </svg>
          {indicator && !open && (
            <>
              <span aria-hidden className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-primary animate-ping" />
              <span aria-hidden className="absolute top-1 right-1 block w-2 h-2 rounded-full bg-primary" />
            </>
          )}
        </button>

        {/* Desktop inline slot — mounts the chips for sm+ viewports. */}
        {renderInline && (
          <div className="hidden sm:flex items-center gap-2">{children}</div>
        )}
      </div>

      {/* Portaled mobile sheet. Lives on document.body to escape the
          page's overflow-hidden + isolation:isolate ancestor that
          was hiding the old absolute-positioned dropdown.

          z-index pegged at 2147483647 (max signed 32-bit int) so the
          panel is unambiguously above every other stacking context
          on the page. The orbit ring uses z-40 on its root and z-50
          internally for tooltip glyphs, and at the old z-60 the
          ring's avatars were painting on top of the panel because of
          how the home page's isolation:isolate ancestor flattens
          stack ordering. Going max-int sidesteps that for good.

          Background is fully opaque (bg-white, no translucency) so
          partial transparency can't make avatars bleed through and
          look like they're in front of the panel even when they
          aren't. */}
      {mounted && isMobile && createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            right: pos?.right ?? 8,
            zIndex: 2147483647,
            // Pre-mounted but invisible until opened — see render-path
            // comment above.
            display: open && pos ? undefined : 'none',
          }}
          className="flex flex-col items-stretch gap-2 bg-white border border-foreground/15 shadow-2xl p-3 rounded-2xl min-w-[220px] max-w-[calc(100vw-16px)]"
        >
          {children}
          {menuExtras && (
            <>
              <div aria-hidden="true" className="h-px bg-foreground/10 my-1" />
              {menuExtras}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
