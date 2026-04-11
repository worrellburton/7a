'use client';

// Custom centered modal system that replaces window.confirm / window.alert
// throughout the app. Usage:
//
//   const { confirm, alert } = useModal();
//   if (await confirm('Delete this issue?')) { ... }
//   await alert('Saved');
//
// The provider mounts a single portal-style overlay so there's one source
// of truth for styling and no stacking issues.

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
    // Fall back to native dialogs so missing-provider doesn't crash calls.
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

export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ModalRequest | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback(
    (title: string, options?: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
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

  const close = useCallback(
    (result: boolean) => {
      if (!request) return;
      request.resolve(result);
      setRequest(null);
    },
    [request]
  );

  // Esc cancels, Enter confirms
  useEffect(() => {
    if (!request) return;
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
    // Autofocus the primary action so Enter works immediately
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [request, close]);

  // Lock body scroll while open
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
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-[fadeIn_0.15s_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Dim background */}
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          {/* Dialog */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6 animate-[scaleIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="modal-title"
              className="text-lg font-bold text-foreground mb-2"
            >
              {request.title}
            </h2>
            {request.message && (
              <p
                className="text-sm text-foreground/60 mb-5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {request.message}
              </p>
            )}
            {!request.message && <div className="mb-5" />}
            <div className="flex justify-end gap-2">
              {request.kind === 'confirm' && (
                <button
                  onClick={() => close(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-warm-bg text-foreground hover:bg-warm-card transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {request.cancelLabel}
                </button>
              )}
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white transition-colors ${
                  request.tone === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-primary hover:bg-primary-dark'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.96) translateY(8px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </ModalContext.Provider>
  );
}
