'use client';

import { useEffect, useState } from 'react';
import { PlatformIcon, type PlatformId } from './PlatformIcon';

// Top-right delivery toast for "Post now" / "Schedule post". Three
// phases of life:
//
//   1. sending  — animated progress bar, list of target platforms
//                 each marked "Pending"
//   2. settled  — replaces the bar with per-platform success / error
//                 rows; errors expand inline so the admin can read
//                 Ayrshare's actual rejection without bouncing to
//                 Recent Posts at the bottom of the page
//   3. dismissed — slides out on auto-dismiss (success only) or on
//                  the close button click (any state)
//
// Auto-dismiss only fires when every platform succeeded; partial
// failures stick until manually closed so the admin can't miss
// "Instagram failed because alt text is required".

export type PostStatusPhase = 'sending' | 'settled' | 'dismissed';

export interface PerPlatformResult {
  platform: PlatformId;
  ok: boolean;
  message?: string;
  postUrl?: string;
}

export interface PostStatus {
  phase: PostStatusPhase;
  platforms: PlatformId[];
  /** Filled in when phase flips from 'sending' → 'settled'. */
  results?: PerPlatformResult[];
  /** Top-level error (couldn't talk to Ayrshare, validation failed
   *  before any platform was attempted, etc.). When set, results
   *  may be empty even at phase='settled'. */
  fatalError?: string;
  /** Were we scheduling for later? Changes the success copy. */
  scheduled?: boolean;
}

const AUTO_DISMISS_SUCCESS_MS = 4500;

export function PostStatusToast({
  status, onClose,
}: {
  status: PostStatus | null;
  onClose: () => void;
}) {
  // Mount/unmount with a slide animation. Using a separate visible
  // state so the dismiss tween can play before unmounting.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!status) { setVisible(false); return; }
    if (status.phase === 'dismissed') {
      setVisible(false);
      return;
    }
    // Trigger entry animation on next frame so the initial
    // translate-down state actually paints before we transition.
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [status]);

  // Auto-dismiss success.
  useEffect(() => {
    if (!status || status.phase !== 'settled') return;
    if (status.fatalError) return;
    const allOk = (status.results ?? []).every((r) => r.ok);
    if (!allOk) return;
    const t = window.setTimeout(onClose, AUTO_DISMISS_SUCCESS_MS);
    return () => window.clearTimeout(t);
  }, [status, onClose]);

  if (!status) return null;

  const isSending = status.phase === 'sending';
  const successCount = (status.results ?? []).filter((r) => r.ok).length;
  const failCount = (status.results ?? []).filter((r) => !r.ok).length;
  const totalCount = status.platforms.length;
  const allOk = !status.fatalError && status.phase === 'settled' && failCount === 0;
  const anyFail = status.fatalError != null || failCount > 0;

  const headerCopy = isSending
    ? `Posting to ${totalCount} platform${totalCount === 1 ? '' : 's'}…`
    : status.fatalError
    ? 'Post failed'
    : allOk
    ? status.scheduled ? 'Scheduled' : 'Posted'
    : `Posted to ${successCount} of ${totalCount}`;

  const headerTone = isSending
    ? 'border-primary/30 bg-primary/5 text-foreground'
    : allOk
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-red-200 bg-red-50 text-red-900';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-[300] w-[360px] max-w-[calc(100vw-2rem)]"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 240ms cubic-bezier(0.16,1,0.3,1), transform 240ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div className="rounded-2xl border shadow-lg overflow-hidden bg-white">
        {/* Header strip — tone changes with phase. */}
        <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${headerTone}`}>
          {isSending ? (
            <Spinner />
          ) : allOk ? (
            <CheckIcon className="text-emerald-600" />
          ) : (
            <ExclamIcon className="text-red-600" />
          )}
          <p className="flex-1 text-sm font-bold">{headerCopy}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-foreground/45 hover:text-foreground"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar — indeterminate sweep while sending,
            green/red filled bar after. */}
        <div className="h-1 bg-foreground/5 relative overflow-hidden">
          {isSending ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-1/3 bg-primary"
              style={{ animation: 'post-toast-sweep 1.4s linear infinite' }}
            />
          ) : (
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 ${anyFail ? 'bg-red-400' : 'bg-emerald-500'} transition-[width] duration-500`}
              style={{ width: `${(successCount / Math.max(1, totalCount)) * 100}%` }}
            />
          )}
        </div>

        {/* Body — fatal error OR per-platform list. */}
        <div className="px-4 py-3">
          {status.fatalError && (
            <p className="text-[12px] text-red-800 leading-relaxed mb-2 break-words">
              {status.fatalError}
            </p>
          )}
          <ul className="space-y-2">
            {status.platforms.map((p) => {
              const result = status.results?.find((r) => r.platform === p);
              const sending = isSending && !result;
              return (
                <li key={p} className="flex items-start gap-2 text-[12px]">
                  <PlatformIcon platform={p} size={14} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground/85 capitalize">
                        {p === 'gmb' ? 'Google Business' : p === 'twitter' ? 'X (Twitter)' : p}
                      </span>
                      <span className={`text-[11px] uppercase tracking-wider font-semibold ${
                        sending ? 'text-foreground/45'
                        : result?.ok ? 'text-emerald-700'
                        : 'text-red-700'
                      }`}>
                        {sending ? 'Pending' : result?.ok ? 'Posted' : 'Failed'}
                      </span>
                    </div>
                    {result && !result.ok && result.message && (
                      <p className="text-[11px] text-red-700 mt-0.5 leading-snug break-words">
                        {result.message}
                      </p>
                    )}
                    {result && result.ok && result.postUrl && (
                      <a
                        href={result.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-700 hover:underline mt-0.5 inline-block truncate max-w-full"
                      >
                        View post ↗
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes post-toast-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-primary" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className ?? ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function ExclamIcon({ className }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className ?? ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}
