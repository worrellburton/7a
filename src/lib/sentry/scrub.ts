// PII scrubbing for Sentry events. Strips any object key matching
// the PHI/PII pattern before the event leaves the runtime. Applied
// from sentry.client.config, sentry.server.config, and
// sentry.edge.config via the shared `beforeSend` hook below.
//
// Healthcare context: this codebase carries client + alumni
// records, insurance verification data, contact-form
// submissions, and an admin database of teammates. Anything that
// could re-identify a patient or surface PHI must NOT land in
// Sentry's hosted store. The scrub here is defense-in-depth
// (the routes themselves should be careful too), but a single
// shared filter is the only place we can guarantee universal
// coverage.

import type { ErrorEvent, EventHint } from '@sentry/nextjs';

// Match any key that LOOKS like PII — case-insensitive,
// substring-y. Bias toward false positives (scrubbing too much)
// over false negatives (leaking PHI). If a future field name
// surfaces and we need it un-scrubbed we can add a positive
// allowlist, but the default must be "redact".
const PII_KEY_PATTERN = /email|phone|dob|date_of_birth|ssn|social|name|address|street|city|zip|postal|insurance|policy|member|patient|client_id|alumni|notes|comments|message|body|signature|password|secret|token|api_key|access_token|refresh_token|cookie|authorization|jwt/i;

const REDACTED = '[redacted]';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && (v.constructor === Object || v.constructor === undefined);
}

/**
 * Walk an arbitrary value tree and redact any key matching the PII
 * pattern. Arrays + nested objects are traversed; primitives pass
 * through. Returns a new structure — the input is never mutated so
 * Sentry's internal event reuse can't accidentally re-scrub.
 *
 * Recursion depth is capped at 8 levels — Sentry events are wide
 * but rarely deep, and a circular ref would otherwise stack-overflow.
 */
export function scrubPii<T>(value: T, depth = 0): T {
  if (depth > 8) return REDACTED as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => scrubPii(v, depth + 1)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (PII_KEY_PATTERN.test(k)) {
        out[k] = REDACTED;
      } else {
        out[k] = scrubPii(v, depth + 1);
      }
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Sentry `beforeSend` hook — runs on every event before it
 * leaves the runtime. We:
 *   1. Drop the IP + user.email/username if the SDK auto-attached
 *      them (Sentry does this by default in some integrations).
 *   2. Recursively scrub the contexts, extra, tags, and request
 *      body trees for PII keys.
 *   3. Strip the URL's query string from request.url since
 *      ?email=…&phone=… patterns sometimes show up in form posts.
 */
export function beforeSendScrub(event: ErrorEvent, _hint?: EventHint): ErrorEvent | null {
  // Authenticated user info — keep only the stable id, drop everything
  // else. Sentry's `user` block is the place most identity data leaks
  // from, so we whitelist instead of blacklist here.
  if (event.user) {
    event.user = {
      id: event.user.id,
      // Explicit nulls so the Sentry UI shows "redacted" not "missing".
      email: undefined,
      ip_address: undefined,
      username: undefined,
    };
  }
  // Request: strip query string, scrub headers + body. Cookie, set-
  // cookie, and authorization are caught by the PII regex too but
  // explicit deletion is safer.
  if (event.request) {
    if (typeof event.request.url === 'string') {
      const i = event.request.url.indexOf('?');
      if (i >= 0) event.request.url = event.request.url.slice(0, i);
    }
    if (event.request.headers) {
      delete (event.request.headers as Record<string, unknown>)['cookie'];
      delete (event.request.headers as Record<string, unknown>)['authorization'];
      delete (event.request.headers as Record<string, unknown>)['x-supabase-auth'];
      event.request.headers = scrubPii(event.request.headers) as typeof event.request.headers;
    }
    if (event.request.data) {
      event.request.data = scrubPii(event.request.data);
    }
  }
  if (event.contexts) event.contexts = scrubPii(event.contexts);
  if (event.extra) event.extra = scrubPii(event.extra);
  if (event.tags) event.tags = scrubPii(event.tags);
  // Breadcrumbs: same scrub on their `data` payloads. Don't drop
  // the breadcrumb itself — the type + message + timestamp are
  // useful and rarely contain PII on their own.
  if (Array.isArray(event.breadcrumbs)) {
    for (const b of event.breadcrumbs) {
      if (b.data) b.data = scrubPii(b.data);
    }
  }
  return event;
}
