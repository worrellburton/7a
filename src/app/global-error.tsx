'use client';

// Top-level error boundary for the App Router. Catches anything
// that throws above every other error.tsx in the tree — the
// nuclear-fallback page. Sentry capture happens in useEffect so a
// runtime error during render still gets reported even when React
// is mid-collapse.

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: '2rem',
          background: '#faf6f1',
          color: '#1a1a1a',
        }}
      >
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#bc6b4a',
              marginBottom: 12,
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>
            We hit an unexpected error.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.65)', marginBottom: 24, lineHeight: 1.5 }}>
            The team has been notified automatically. You can try again, or call us at{' '}
            <a href="tel:8667181665" style={{ color: '#bc6b4a', fontWeight: 600 }}>
              (866) 718-1665
            </a>{' '}
            if this keeps happening.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#bc6b4a',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 24, fontSize: 11, color: 'rgba(26,26,26,0.35)', fontFamily: 'ui-monospace, monospace' }}>
              Ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
