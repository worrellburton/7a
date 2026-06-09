// Sentry Edge SDK — captures errors from anything running on
// Vercel's Edge runtime: middleware, edge route handlers, and
// any route that opts into `export const runtime = 'edge'`.
// Today most of this app's API routes are Node, but the edge
// config still needs to exist so `@sentry/nextjs` can wire its
// instrumentation regardless of which runtime a future handler
// uses.

import * as Sentry from '@sentry/nextjs';
import { beforeSendScrub } from '@/lib/sentry/scrub';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
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
