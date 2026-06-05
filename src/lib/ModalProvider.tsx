'use client';

// In-app modal system that replaces every window.confirm /
// window.alert callsite. One central component so the look + motion
// stay consistent: liquid-glass card (translucent fill + backdrop
// blur + soft inner highlight), scale+fade entry, scale+fade exit,
// centered, dimmed and blurred page behind. Esc cancels, Enter
// confirms.
//
//   const { confirm, alert } = useModal();
//   if (await confirm('Delete this issue?', { message: '...', tone: 'danger' })) { … }
//   await alert('Saved');

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ModalKind = 'confirm' | 'alert';
type ToneVariant = 'default' | 'danger';

interface ModalRequest {
  kind: ModalKind;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ToneVariant;
  resolve: (value: boolean) => void;
}

interface ConfirmOptions {
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ToneVariant;
}

interface AlertOptions {
  message?: string;
  confirmLabel?: string;
}

interface ModalContextValue {
  confirm: (title: string, options?: ConfirmOptions) => Promise<boolean>;
  alert: (title: string, options?: AlertOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    // Missing-provider fallback — keeps callsites alive without
    // crashing during SSR / tests, even though the elegant in-app
    // modal won't render.
    return {
      confirm: (title) =>
        Promise.resolve(typeof window !== 'undefined' ? window.confirm(title) : false),
      alert: (title) => {
        if (typeof window !== 'undefined') window.alert(title);
        return Promise.resolve();
      },
    };
  }
  return ctx;
}

// Exit animation duration in ms. Matches the keyframe at the bottom
// of this file. Bumping the keyframe? Bump this too or the resolve
// will fire mid-animation.
const EXIT_MS = 180;

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ModalRequest | null>(null);
  // While a modal is closing we keep the request mounted but flag
  // `closing=true` so the wrapper plays the exit animation instead
  // of cutting to a blank screen. Once the keyframe ends we drop
  // the request entirely.
  const [closing, setClosing] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  const confirm = useCallback(
    (title: string, options?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setClosing(false);
        setRequest({
          kind: 'confirm',
          title,
          message: options?.message,
          confirmLabel: options?.confirmLabel || 'OK',
          cancelLabel: options?.cancelLabel || 'Cancel',
          tone: options?.tone || 'default',
          resolve,
        });
      }),
    []
  );

  const alertFn = useCallback(
    (title: string, options?: AlertOptions) =>
      new Promise<void>((resolve) => {
        setClosing(false);
        setRequest({
          kind: 'alert',
          title,
          message: options?.message,
          confirmLabel: options?.confirmLabel || 'OK',
          tone: 'default',
          resolve: () => resolve(),
        });
      }),
    []
  );

  const value = useMemo<ModalContextValue>(
    () => ({ confirm, alert: alertFn }),
    [confirm, alertFn]
  );

  // Two-phase close: resolve the promise immediately so callers can
  // continue, then run the exit animation, then unmount. If a new
  // confirm() lands during the exit we cancel the timer and stay
  // mounted with the new request (avoids a visible flicker between
  // back-to-back confirms).
  const close = useCallback(
    (result: boolean) => {
      if (!request || closing) return;
      request.resolve(result);
      setClosing(true);
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = window.setTimeout(() => {
        setRequest(null);
        setClosing(false);
        exitTimerRef.current = null;
      }, EXIT_MS);
    },
    [request, closing]
  );

  // Esc cancels, Enter confirms — only while a request is open and
  // not in the middle of closing (so the keys don't double-fire on
  // a rapidly dismissed modal).
  useEffect(() => {
    if (!request || closing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        close(true);
      }
    };
    window.addEventListener('keydown', onKey);
    // Autofocus the primary action so Enter works immediately.
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [request, closing, close]);

  // Lock body scroll while open — including during the exit
  // animation so the page doesn't jump.
  useEffect(() => {
    if (!request) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [request]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {request && (
        <div
          className={`sa-modal-root fixed inset-0 z-[100] flex items-center justify-center px-4 ${closing ? 'sa-modal-closing' : 'sa-modal-entering'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop — translucent foreground tint + heavy blur for
              the depth-of-field "liquid glass" read. Click to dismiss
              treats the click as Cancel (or "OK" on an alert, since
              alerts have nothing to cancel). */}
          <div
            className="sa-modal-backdrop absolute inset-0 bg-foreground/35 backdrop-blur-md"
            onClick={() => close(request.kind === 'alert')}
          />
          {/* The card itself. Translucent white fill + saturate-boost
              backdrop blur reads as frosted glass; the inset top
              highlight gives the round-edge gleam Apple-style glass
              has. supports-[backdrop-filter] gates the blur so
              browsers without backdrop-filter still get a solid card
              instead of a transparent ghost. */}
          <div
            className="sa-modal-card relative w-full max-w-md rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glass fill — separated so the top-edge highlight can
                ride on top without inheriting the saturate filter. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-white/82 supports-[backdrop-filter]:bg-white/55 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150 border border-white/70 rounded-3xl shadow-[0_24px_60px_-20px_rgba(40,30,25,0.45),0_8px_24px_-12px_rgba(40,30,25,0.25)]"
            />
            {/* Inner top gleam — half-pixel white line at the very
                top of the card, fading out into the card. The
                tell-tale glassmorphism cue. */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent rounded-t-3xl"
            />
            <div className="relative p-6 sm:p-7">
              <h2
                id="modal-title"
                className="text-lg sm:text-xl font-bold text-foreground leading-snug"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {request.title}
              </h2>
              {request.message && (
                <p
                  className="mt-2 text-[13.5px] text-foreground/70 leading-relaxed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {request.message}
                </p>
              )}
              <div className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-2 ${request.message ? 'mt-6' : 'mt-5'}`}>
                {request.kind === 'confirm' && (
                  <button
                    type="button"
                    onClick={() => close(false)}
                    className="px-5 py-2.5 rounded-full text-[12.5px] font-semibold uppercase tracking-[0.14em] bg-white/70 supports-[backdrop-filter]:bg-white/55 supports-[backdrop-filter]:backdrop-blur border border-black/8 text-foreground/80 hover:bg-white hover:text-foreground hover:border-black/15 transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {request.cancelLabel}
                  </button>
                )}
                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={() => close(true)}
                  className={`px-5 py-2.5 rounded-full text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white transition-all shadow-[0_4px_14px_-4px_rgba(188,107,74,0.55)] ${
                    request.tone === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-[0_4px_14px_-4px_rgba(225,29,72,0.55)]'
                      : 'bg-primary hover:bg-primary-dark'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {request.confirmLabel}
                </button>
              </div>
            </div>
          </div>
          <style>{`
            /* Entry — backdrop fades in while the card lifts + scales
               from a slight zoom-out. The card delay (60ms) lets the
               backdrop start first so the eye sees the dim first,
               then the card lands on top. */
            @keyframes sa-modal-backdrop-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes sa-modal-card-in {
              from { opacity: 0; transform: scale(0.94) translateY(10px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
            /* Exit — gentle scale-down + fade. Backdrop fades slower
               than the card so the card "lifts away" without leaving
               a hard edge behind. */
            @keyframes sa-modal-backdrop-out {
              from { opacity: 1; }
              to   { opacity: 0; }
            }
            @keyframes sa-modal-card-out {
              from { opacity: 1; transform: scale(1) translateY(0); }
              to   { opacity: 0; transform: scale(0.96) translateY(4px); }
            }
            .sa-modal-entering .sa-modal-backdrop {
              animation: sa-modal-backdrop-in 0.18s ease-out both;
            }
            .sa-modal-entering .sa-modal-card {
              animation: sa-modal-card-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both;
            }
            .sa-modal-closing .sa-modal-backdrop {
              animation: sa-modal-backdrop-out 0.18s ease-in both;
            }
            .sa-modal-closing .sa-modal-card {
              animation: sa-modal-card-out 0.16s ease-in both;
            }
            @media (prefers-reduced-motion: reduce) {
              .sa-modal-entering .sa-modal-backdrop,
              .sa-modal-entering .sa-modal-card,
              .sa-modal-closing .sa-modal-backdrop,
              .sa-modal-closing .sa-modal-card {
                animation-duration: 0.01ms !important;
              }
            }
          `}</style>
        </div>
      )}
    </ModalContext.Provider>
  );
}
