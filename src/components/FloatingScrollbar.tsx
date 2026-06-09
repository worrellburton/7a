'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

// Floating horizontal scrollbar that sticks to the bottom of the
// viewport and drives a horizontally-scrollable container above. The
// container's native scrollbar stays hidden — this is the visible
// affordance. Lives in a portal at <body> so the bar floats above
// every other surface and survives table re-renders.
//
// Usage:
//   const ref = useRef<HTMLDivElement | null>(null);
//   return (
//     <>
//       <FloatingScrollbar tableRef={ref} />
//       <div ref={ref} className="overflow-x-auto"> … </div>
//     </>
//   );
//
// Keyboard: Arrow left/right pan by ~18% of the visible width;
// PageUp/PageDown pan ~90%; Home/End jump to the ends (only when
// the bar is hovered/focused or the user has Ctrl/Cmd held so we
// don't hijack arrow keys for the rest of the page).
//
// Optional `engagedSelector` lets a caller declare "if a keypress
// happens inside an element matching this selector, treat arrow
// keys as scroll inputs even without hover" — e.g. `[data-…-table]`
// on the contacts grid so power users can scroll without moving
// the cursor to the bar.
export default function FloatingScrollbar({
  tableRef,
  engagedSelector,
}: {
  tableRef: React.RefObject<HTMLDivElement | null>;
  engagedSelector?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [layout, setLayout] = useState<{ left: number; width: number; thumbLeft: number; thumbWidth: number; visible: boolean; pct: number }>({
    left: 0,
    width: 0,
    thumbLeft: 0,
    thumbWidth: 0,
    visible: false,
    pct: 0,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    function pickLabel(t: HTMLDivElement) {
      const head = t.querySelector('thead');
      if (!head) return null;
      const ths = Array.from(head.querySelectorAll('th'));
      if (!ths.length) return null;
      const probeX = t.getBoundingClientRect().left + t.clientWidth / 2;
      let best: HTMLElement | null = null;
      for (const th of ths) {
        const r = (th as HTMLElement).getBoundingClientRect();
        if (r.left <= probeX && r.right >= probeX) { best = th as HTMLElement; break; }
      }
      const label = (best?.textContent ?? '').trim();
      return label || null;
    }
    function measure() {
      const t = tableRef.current;
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const overflows = t.scrollWidth > t.clientWidth + 1;
      if (!overflows) {
        setLayout((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      const trackW = rect.width;
      const ratio = t.clientWidth / t.scrollWidth;
      const thumbW = Math.max(48, trackW * ratio);
      const maxScroll = t.scrollWidth - t.clientWidth;
      const pct = maxScroll > 0 ? t.scrollLeft / maxScroll : 0;
      const thumbLeft = pct * (trackW - thumbW);
      setLayout((prev) =>
        prev.visible
        && prev.left === rect.left
        && prev.width === trackW
        && prev.thumbLeft === thumbLeft
        && prev.thumbWidth === thumbW
        && prev.pct === pct
          ? prev
          : { left: rect.left, width: trackW, thumbLeft, thumbWidth: thumbW, visible: true, pct },
      );
      setCurrentLabel(pickLabel(t));
    }
    let rafId: number | null = null;
    function scheduleMeasure() {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => { rafId = null; measure(); });
    }
    measure();
    const t = tableRef.current;
    if (!t) return;
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(t);
    Array.from(t.children).forEach((c) => ro.observe(c as Element));
    document.addEventListener('scroll', scheduleMeasure, { capture: true, passive: true });
    window.addEventListener('resize', scheduleMeasure);
    return () => {
      ro.disconnect();
      document.removeEventListener('scroll', scheduleMeasure, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('resize', scheduleMeasure);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [mounted, tableRef]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      const t = tableRef.current;
      if (!t) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (target && target.isContentEditable) return;
      const maxScroll = t.scrollWidth - t.clientWidth;
      if (maxScroll <= 0) return;
      const step = Math.max(60, Math.round(t.clientWidth * 0.18));
      const big = Math.max(step * 3, Math.round(t.clientWidth * 0.9));
      let next: number | null = null;
      if (e.key === 'ArrowLeft') next = Math.max(0, t.scrollLeft - step);
      else if (e.key === 'ArrowRight') next = Math.min(maxScroll, t.scrollLeft + step);
      else if (e.key === 'PageUp') next = Math.max(0, t.scrollLeft - big);
      else if (e.key === 'PageDown') next = Math.min(maxScroll, t.scrollLeft + big);
      else if (e.key === 'Home' && (e.ctrlKey || e.metaKey || hovered || dragging)) next = 0;
      else if (e.key === 'End' && (e.ctrlKey || e.metaKey || hovered || dragging)) next = maxScroll;
      if (next == null) return;
      const overTable = engagedSelector ? target?.closest?.(engagedSelector) : null;
      if (!hovered && !dragging && !overTable && document.activeElement !== trackRef.current) return;
      e.preventDefault();
      t.scrollTo({ left: next, behavior: 'smooth' });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, hovered, dragging, tableRef, engagedSelector]);

  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null);
  function onThumbPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const t = tableRef.current;
    if (!t) return;
    dragRef.current = { startX: e.clientX, startScrollLeft: t.scrollLeft };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onThumbPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const t = tableRef.current;
    if (!drag || !t) return;
    const dx = e.clientX - drag.startX;
    const trackW = layout.width;
    const thumbW = layout.thumbWidth;
    const maxScroll = t.scrollWidth - t.clientWidth;
    const denom = trackW - thumbW;
    if (denom <= 0) return;
    t.scrollLeft = drag.startScrollLeft + (dx * maxScroll) / denom;
  }
  function onThumbPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }
  function onTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const t = tableRef.current;
    const trackEl = trackRef.current;
    if (!t || !trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const trackW = rect.width;
    const thumbW = layout.thumbWidth;
    const maxScroll = t.scrollWidth - t.clientWidth;
    const denom = trackW - thumbW;
    if (denom <= 0) return;
    const target = Math.max(0, Math.min(maxScroll, ((clickX - thumbW / 2) / denom) * maxScroll));
    t.scrollTo({ left: target, behavior: 'smooth' });
  }

  if (!mounted || !layout.visible) return null;

  const showTooltip = dragging || hovered;
  const tooltipText = currentLabel
    ? `${currentLabel} · ${Math.round(layout.pct * 100)}%`
    : `${Math.round(layout.pct * 100)}%`;
  const thumbCenter = layout.thumbLeft + layout.thumbWidth / 2;

  return createPortal(
    <div
      ref={trackRef}
      tabIndex={0}
      role="scrollbar"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(layout.pct * 100)}
      onPointerDown={onTrackPointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={`hidden md:block fixed bottom-4 z-[60] rounded-full border border-white/40 ring-1 ring-black/5 backdrop-blur-2xl backdrop-saturate-150 outline-none transition-[height,box-shadow,background-color] duration-200 ease-out ${dragging || hovered ? 'h-5 shadow-[0_18px_44px_-14px_rgba(60,48,42,0.45),inset_0_1px_0_rgba(255,255,255,0.85)] bg-white/55' : 'h-4 shadow-[0_10px_28px_-10px_rgba(60,48,42,0.32),inset_0_1px_0_rgba(255,255,255,0.7)] bg-white/40'}`}
      style={{ left: layout.left, width: layout.width }}
    >
      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        onPointerMove={onThumbPointerMove}
        onPointerUp={onThumbPointerUp}
        onPointerCancel={onThumbPointerUp}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={`absolute inset-y-[3px] rounded-full ring-1 ring-white/50 cursor-grab active:cursor-grabbing transition-[transform,box-shadow,background-image,filter] duration-200 ease-out will-change-transform bg-gradient-to-b from-[#d6896b] via-[#bc6b4a] to-[#a85a3c] hover:from-[#e0997b] hover:via-[#c87557] hover:to-[#b1644a] active:from-[#e7a48a] active:via-[#d18066] active:to-[#bb6e54] shadow-[0_4px_10px_-2px_rgba(188,107,74,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] ${dragging ? 'scale-y-110 shadow-[0_8px_18px_-3px_rgba(188,107,74,0.6),inset_0_1px_0_rgba(255,255,255,0.5)] brightness-110' : ''}`}
        style={{ left: layout.thumbLeft, width: layout.thumbWidth }}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-9 -translate-x-1/2 px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap text-foreground/85 bg-white/65 backdrop-blur-2xl backdrop-saturate-150 border border-white/60 ring-1 ring-black/5 shadow-[0_8px_22px_-10px_rgba(60,48,42,0.35)] transition-all duration-200 ease-out ${showTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        style={{ left: thumbCenter }}
      >
        {tooltipText}
      </div>
    </div>,
    document.body,
  );
}
