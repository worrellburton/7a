// Sentry Node SDK — captures unhandled errors thrown inside
// server components, server actions, route handlers (/app/api/**),
// and middleware running on the Node runtime.
//
// DSN is read from SENTRY_DSN (server-side env var, never exposed
// to the browser). When unset the SDK is inert — safe for local
// dev without a Sentry project.

import * as Sentry from '@sentry/nextjs';
import { beforeSendScrub } from '@/lib/sentry/scrub';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Higher trace rate on the server than the client — server
    // events are much cheaper (no PageView spam) and the visibility
    // into slow API routes is the primary observability win.
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
    environment: process.env.SENTRY_ENV
      ?? process.env.VERCEL_ENV
      ?? process.env.NODE_ENV
      ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    beforeSend: beforeSendScrub,
  });
}
