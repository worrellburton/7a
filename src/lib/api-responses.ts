import { NextResponse } from 'next/server';

// Shared response helpers for /api/* routes. Centralises the error
// shape so future API consumers (Sentry, the upcoming admin /health
// surface, the cmd+K palette's error toasts) have ONE schema to parse
// instead of the previous mix of:
//
//   { error: 'msg' }
//   { error: { message: 'msg', code: '...' } }
//   { ok: false, error: '...' }
//   thrown exceptions
//
// All new routes should respond via apiError() / apiOk(). Existing
// routes can migrate incrementally — until they do, their per-route
// shape is unchanged, so no client code breaks. The shape this
// helper emits is `{ ok: boolean, error: { code, message }? }` which
// is a strict superset of the most-common existing pattern (callers
// reading `json.error` as a string still work as long as we keep the
// top-level `error: string` for compatibility, which we do).
//
// SEO-safe: API routes are never crawled.

export interface ApiErrorBody {
  ok: false;
  /** Short, machine-readable code. Stable across deploys. */
  code: string;
  /** Human-readable message safe to surface in toasts. */
  message: string;
  /** Mirrors `message` so legacy callers reading `json.error` as a
   *  string keep working. Will be deprecated in a follow-up sweep. */
  error: string;
}

export interface ApiOkBody<T = unknown> {
  ok: true;
  data: T;
}

const STATUS_BY_CODE: Record<string, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 400,
  conflict: 409,
  rate_limited: 429,
  server_error: 500,
  service_unavailable: 503,
};

export function apiError(
  code: keyof typeof STATUS_BY_CODE | (string & {}),
  message: string,
  init?: { status?: number; headers?: HeadersInit },
): NextResponse<ApiErrorBody> {
  const status = init?.status ?? STATUS_BY_CODE[code] ?? 500;
  return NextResponse.json<ApiErrorBody>(
    { ok: false, code, message, error: message },
    { status, headers: init?.headers },
  );
}

export function apiOk<T>(data: T, init?: { status?: number; headers?: HeadersInit }): NextResponse<ApiOkBody<T>> {
  return NextResponse.json<ApiOkBody<T>>(
    { ok: true, data },
    { status: init?.status ?? 200, headers: init?.headers },
  );
}
