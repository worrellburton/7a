'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Props {
  clientConfigured: boolean;
  redirectUri: string;
  refreshToken: string | null;
  scope: string | null;
  ok: boolean;
  error: string | null;
}

export default function GoogleReconnectContent({
  clientConfigured,
  redirectUri,
  refreshToken,
  scope,
  ok,
  error,
}: Props) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  async function copy(text: string, setter: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      window.setTimeout(() => setter(false), 1800);
    } catch {
      // noop — secure-context only; admins can fall back to manual copy.
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.22em] uppercase text-primary mb-2">
          Admin · Integrations
        </p>
        <h1 className="text-2xl font-bold text-foreground">Reconnect Google</h1>
        <p className="text-sm text-foreground/60 mt-2">
          Mint a fresh <code className="text-[11px]">GOOGLE_OAUTH_REFRESH_TOKEN</code>.
          Use this when Google Analytics or Search Console starts failing with
          <strong> token has been expired or revoked</strong>. One OAuth client
          covers GA4, Search Console, and Business Profile — one token
          reconnects all three.
        </p>
      </div>

      {!clientConfigured ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>OAuth client not configured.</strong> Set{' '}
          <code>GOOGLE_OAUTH_CLIENT_ID</code> and{' '}
          <code>GOOGLE_OAUTH_CLIENT_SECRET</code> in Vercel before running the
          reconnect flow.
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Reconnect failed:</strong> {error}
          {error === 'state_mismatch' ? (
            <p className="mt-1 text-xs text-red-700">
              The CSRF state cookie didn&apos;t match. Start the flow fresh.
            </p>
          ) : null}
          {error.includes('redirect_uri_mismatch') ? (
            <p className="mt-1 text-xs text-red-700">
              Add the redirect URI below to the OAuth client&apos;s Authorized
              redirect URIs in Google Cloud Console.
            </p>
          ) : null}
        </div>
      ) : null}

      {ok && refreshToken ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-semibold text-base mb-1">New refresh token minted.</p>
          <p className="text-emerald-900/80">
            Paste this value into <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> in
            Vercel (Project → Settings → Environment Variables), then redeploy.
            This panel shows the token once — if you leave the page, start the
            flow again.
          </p>
          <div className="mt-4">
            <label
              htmlFor="reconnect-token"
              className="text-[10px] font-semibold tracking-[0.22em] uppercase text-emerald-900/70"
            >
              GOOGLE_OAUTH_REFRESH_TOKEN
            </label>
            <div className="mt-1 flex gap-2 items-stretch">
              <textarea
                id="reconnect-token"
                readOnly
                value={refreshToken}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 rounded-lg border border-emerald-300 bg-white px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-400"
                rows={3}
              />
              <button
                type="button"
                onClick={() => copy(refreshToken, setCopiedToken)}
                className="shrink-0 self-start inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                {copiedToken ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          {scope ? (
            <p className="mt-3 text-[11px] text-emerald-900/70">
              Scopes granted: <code className="text-[11px]">{scope}</code>
            </p>
          ) : null}
          <ol className="mt-4 list-decimal pl-5 space-y-1 text-[13px] text-emerald-900/90">
            <li>Open the Vercel project and edit <code>GOOGLE_OAUTH_REFRESH_TOKEN</code>.</li>
            <li>Paste the value above; save across Production / Preview / Development.</li>
            <li>Redeploy (or trigger a fresh build) so the server picks it up.</li>
          </ol>
        </div>
      ) : null}

      <section className="rounded-2xl border border-black/5 bg-white p-6 mb-6">
        <h2 className="text-base font-bold text-foreground mb-1">Before you start</h2>
        <p className="text-xs text-foreground/60 mb-4">
          Google will only redirect back to a pre-registered URI. Add this to
          the OAuth client&apos;s <strong>Authorized redirect URIs</strong> in
          the Google Cloud Console (APIs &amp; Services → Credentials → the
          OAuth client that holds <code>GOOGLE_OAUTH_CLIENT_ID</code>):
        </p>
        <div className="flex gap-2 items-stretch">
          <input
            type="text"
            readOnly
            value={redirectUri}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 rounded-lg border border-black/10 bg-warm-bg/40 px-3 py-2 font-mono text-xs text-foreground"
          />
          <button
            type="button"
            onClick={() => copy(redirectUri, setCopiedRedirect)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-warm-bg/40 transition-colors"
          >
            {copiedRedirect ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="mt-4 text-[11px] text-foreground/50">
          You also need to be signed in to Google as a user who has access to
          the GA4 property, the Search Console site, and the Business Profile
          location. The flow will prompt for consent and issue a fresh refresh
          token.
        </p>
      </section>

      <div className="flex items-center gap-3 flex-wrap">
        <a
          href="/api/google/reconnect/start"
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            clientConfigured
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-black/10 text-foreground/40 cursor-not-allowed pointer-events-none'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Start Google reconnect
        </a>
        <Link
          href="/app/apis"
          className="text-xs font-semibold text-foreground/60 hover:text-foreground transition"
        >
          Back to APIs
        </Link>
      </div>
    </div>
  );
}
