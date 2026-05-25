// Sentry browser SDK — captures unhandled JS errors + unhandled
// promise rejections from every client component on the site.
// Loaded automatically by @sentry/nextjs at the top of every
// client bundle.
//
// DSN is read from NEXT_PUBLIC_SENTRY_DSN so the browser receives
// it; when the env var is unset the SDK initialises in no-op mode
// (no network requests, no errors) — handy for local dev.

import * as Sentry from '@sentry/nextjs';
import { beforeSendScrub } from '@/lib/sentry/scrub';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Conservative sample rates — we don't pay for traces today,
    // and replays carry their own PHI risk. Bump later only if a
    // specific debugging session needs it.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Drop default PII (IPs, request bodies) at the SDK level too
    // so the beforeSend scrub has less to do.
    sendDefaultPii: false,
    // Environment tag drives Sentry's "environment" filter so prod
    // / preview / dev errors don't pile together. Falls back to
    // NODE_ENV when the explicit VERCEL_ENV is absent (dev shell).
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV
      ?? process.env.VERCEL_ENV
      ?? process.env.NODE_ENV
      ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    beforeSend: beforeSendScrub,
  });
}
