'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Renders an inline error banner for the Analytics page. When the
// underlying error string looks like Google OAuth went sour
// (invalid_grant, expired/revoked, "Google is not connected"), an
// admin gets a Reconnect button that runs the in-app OAuth flow.
// Otherwise it's a plain red error card.

interface Props {
  label: string;
  error: string;
  /** Path to send the admin back to after a successful reconnect. */
  returnTo?: string;
}

function looksLikeAuthFailure(err: string): boolean {
  return /invalid_grant|expired or revoked|not connected|Reconnect Google/i.test(err);
}

export default function GoogleReconnectBanner({ label, error, returnTo }: Props) {
  const { isAdmin } = useAuth();
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Pick up ?google_oauth=success|error redirect crumbs from the
  // callback so the admin gets a confirmation toast inside the same
  // banner they clicked from.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setParams(new URLSearchParams(window.location.search));
  }, []);

  const showAuthCta = looksLikeAuthFailure(error);
  const reconnectFailed = params?.get('google_oauth') === 'error';
  const reason = params?.get('reason') ?? null;

  async function handleReconnect() {
    setBusy(true);
    setStartError(null);
    try {
      const url = new URL('/api/google/oauth/start', window.location.origin);
      if (returnTo) url.searchParams.set('returnTo', returnTo);
      else url.searchParams.set('returnTo', window.location.pathname + window.location.search);
      const res = await fetch(url.toString(), { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        setStartError(json?.error || `Failed to start OAuth (${res.status})`);
        return;
      }
      window.location.assign(json.url);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>
        <strong>Couldn&apos;t load {label}:</strong> {error}
      </p>
      {reconnectFailed && (
        <p className="mt-2 text-xs text-red-700/85">
          Last reconnect attempt failed{reason ? ` (${reason})` : ''}. Try again.
        </p>
      )}
      {showAuthCta && isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReconnect}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-red-700 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-800 disabled:opacity-50"
          >
            {busy ? 'Opening Google…' : 'Reconnect Google'}
          </button>
          <span className="text-[11px] text-red-700/75">
            Sign in as the Workspace admin who owns the GA4 + Search Console
            properties. Google will mint a fresh refresh token.
          </span>
        </div>
      )}
      {startError && (
        <p className="mt-2 text-xs text-red-700/85">{startError}</p>
      )}
    </div>
  );
}
