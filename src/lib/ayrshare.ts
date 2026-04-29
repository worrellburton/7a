// Server-side Ayrshare API helper. All fetches go through here so
// the API key + Profile-Key headers are added in exactly one place
// and the client never sees them.
//
// The two env vars are:
//   AYRSHARE_API_KEY     — required. Long alphanumeric string from
//                          the Ayrshare dashboard (Account → API).
//   AYRSHARE_PROFILE_KEY — optional. The User Profile RefId.
//                          When set, every request scopes to that
//                          User Profile (Business plan multi-profile).
//                          When unset, requests act on the master
//                          account's default-connected accounts.
//
// We return the raw JSON envelope from Ayrshare so callers can
// surface platform-specific status fields ({ success, postIds,
// errors[], etc. }) without a lossy normalization layer.

const AYRSHARE_BASE = 'https://api.ayrshare.com/api';

export class AyrshareNotConfigured extends Error {
  constructor() {
    super('AYRSHARE_API_KEY is not set in the environment');
    this.name = 'AyrshareNotConfigured';
  }
}

function authHeaders(): Record<string, string> {
  const key = process.env.AYRSHARE_API_KEY;
  if (!key) throw new AyrshareNotConfigured();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
  };
  const profile = process.env.AYRSHARE_PROFILE_KEY;
  if (profile) headers['Profile-Key'] = profile;
  return headers;
}

export interface AyrshareResponse {
  status?: 'success' | 'error' | string;
  // Ayrshare also returns lots of endpoint-specific shapes; we accept
  // anything and let the route normalize what it cares about.
  [key: string]: unknown;
}

/**
 * GET against Ayrshare. Returns parsed JSON + the HTTP status code so
 * the caller can decide whether to translate a 4xx into a friendly
 * error or pass it back as-is.
 */
export async function ayrshareGet(path: string, query?: Record<string, string | number | undefined>): Promise<{ status: number; body: AyrshareResponse }> {
  const url = new URL(`${AYRSHARE_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { ...authHeaders(), Accept: 'application/json' },
    cache: 'no-store',
  });
  const body = (await safeJson(res)) as AyrshareResponse;
  return { status: res.status, body };
}

/**
 * POST against Ayrshare with a JSON body.
 */
export async function ayrsharePost(path: string, body: Record<string, unknown>): Promise<{ status: number; body: AyrshareResponse }> {
  const res = await fetch(`${AYRSHARE_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const json = (await safeJson(res)) as AyrshareResponse;
  return { status: res.status, body: json };
}

/**
 * DELETE against Ayrshare with a JSON body. Ayrshare's `/delete`
 * endpoint expects the post id in the request body, hence the
 * non-standard "DELETE with body" shape.
 */
export async function ayrshareDelete(path: string, body: Record<string, unknown>): Promise<{ status: number; body: AyrshareResponse }> {
  const res = await fetch(`${AYRSHARE_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const json = (await safeJson(res)) as AyrshareResponse;
  return { status: res.status, body: json };
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    // Non-JSON 5xx responses (HTML error page, empty body, etc.).
    // Return a synthetic envelope so the route doesn't crash.
    return { status: 'error', message: `Non-JSON response (HTTP ${res.status})` };
  }
}

// Platforms Ayrshare supports today. Pinned here so the UI picker
// renders a stable order and the validator on /api/social-media/post
// can reject typos.
export const AYRSHARE_PLATFORMS = [
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
  'tiktok',
  'youtube',
  'pinterest',
  'gmb', // Google Business Profile
  'reddit',
  'threads',
  'bluesky',
] as const;

export type AyrsharePlatform = typeof AYRSHARE_PLATFORMS[number];

export const AYRSHARE_PLATFORM_LABELS: Record<AyrsharePlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  gmb: 'Google Business',
  reddit: 'Reddit',
  threads: 'Threads',
  bluesky: 'Bluesky',
};
