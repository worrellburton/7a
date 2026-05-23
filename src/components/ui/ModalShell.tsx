'use client';

import React, { useEffect } from 'react';

// Canonical centered modal shell. Promoted out of the email-
// campaigns builder where the same pattern was reimplemented in
// outreach and incoming-users with subtle drift (different max
// width, no escape-to-close, inconsistent header padding).
//
// Built-ins:
//   · Backdrop scrim with backdrop-blur — tap to close.
//   · Esc key closes the modal.
//   · Body scroll is locked while the modal is mounted so the page
//     behind it doesn't drift on iOS.
//   · max-h-[85svh] + inner overflow-y-auto so tall content scrolls
//     inside the modal instead of off the viewport.
//   · padding clear of the iOS safe-area top so the header isn't
//     hidden behind the notch on phones.
//
// Variant sizes match the existing usages: sm = 480px (pickers),
// md = 720px (default, blog/employee picker), lg = 960px (recipient
// modals, large forms).

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  size?: ModalSize;
  /** Optional footer (e.g. Cancel / Save action row) rendered below
   *  the scrollable body. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
};

export function ModalShell({ title, subtitle, onClose, size = 'md', footer, children }: ModalShellProps) {
  // Esc-to-close + body scroll lock. Both unwind on unmount so the
  // modal doesn't strand the page in a scroll-locked state if the
  // caller forgets to clean up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className={`w-full ${SIZE_CLASS[size]} max-h-[85svh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-black/5 flex items-baseline justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>{title}</h3>
            {subtitle && (
              <p className="text-[11.5px] text-foreground/55 mt-0.5 truncate" style={{ fontFamily: 'var(--font-body)' }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/50 hover:text-foreground text-xl leading-none shrink-0 sa-tap-natural"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <footer className="px-5 py-3 border-t border-black/5 shrink-0">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
