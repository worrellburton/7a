// Next.js 13+ instrumentation hook. Runs ONCE per runtime when the
// app boots, before any handler executes. Branches on the runtime
// because @sentry/nextjs ships a different SDK for Node vs. Edge
// vs. browser — only the matching config file is loaded.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Surface request errors from Next.js's nested-router layer (server
// components, server actions) into Sentry. Without this hook a
// React server component that throws renders the error.tsx
// boundary but never reports the underlying exception upstream.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
