'use client';

// Mobile-first select replacement.
//
// Native <select> elements work on iOS/Android in principle, but in
// our filter row a few things conspire to make them flaky on mobile:
//  - appearance-none + custom chevron clips the tap area on some
//    iOS WebKit builds, so the dropdown won't open from the right
//    half of the chip.
//  - the native picker UI (especially Safari's "wheel") is a poor
//    fit for short, named lists like Direction or Operator.
//  - the option labels render with the system font, ignoring the
//    surrounding design language.
//
// MobileSelect uses a real <button> on mobile that opens a bottom-
// sheet, and falls back to a plain styled <select> on >= md screens
// where the native picker is fine. The two share the same options
// array so callers don't have to know which mode is rendering.

import { useEffect, useRef, useState } from 'react';

export interface MobileSelectOption {
  value: string;
  label: string;
}

export function MobileSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  options: MobileSelectOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value);

  // Body scroll lock + Escape close while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      {/* Desktop: native select. The native picker is fine here and
          keeps keyboard nav free. */}
      <div className={`relative hidden md:inline-block ${className ?? ''}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          className="appearance-none pl-3 pr-7 py-2 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Mobile: button + bottom sheet. min-h-[44px] for a real
          tap target; the chevron sits inside the button rather
          than overlapping it (no clipped tap area). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`md:hidden inline-flex items-center justify-between gap-2 min-h-[44px] px-3 rounded-lg text-sm font-medium bg-white border border-gray-100 text-foreground/80 active:bg-warm-bg/40 ${className ?? ''}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span className="truncate">{selected?.label ?? placeholder ?? 'Select…'}</span>
        <svg className="w-3 h-3 text-foreground/45 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className="md:hidden fixed inset-0 z-[100] flex items-end"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] motion-reduce:backdrop-blur-none" />
          <div
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full bg-white rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col animate-sheet-slide motion-reduce:animate-none"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', fontFamily: 'var(--font-body)' }}
          >
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-foreground/15" aria-hidden="true" />
            </div>
            <div className="flex items-center justify-between px-4 pt-1 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-foreground">{ariaLabel}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-foreground/55 hover:text-foreground min-h-[36px] px-2"
              >
                Close
              </button>
            </div>
            <ul role="listbox" className="overflow-y-auto py-1">
              {options.map((o) => {
                const isSelected = o.value === value;
                return (
                  <li key={o.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-3 text-left min-h-[48px] text-[15px] active:bg-warm-bg/40 ${
                        isSelected ? 'text-primary font-semibold' : 'text-foreground/80'
                      }`}
                    >
                      <span className="truncate pr-3">{o.label}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
