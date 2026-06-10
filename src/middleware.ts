import { NextResponse, type NextRequest } from 'next/server';

// Admin-managed 301/302 redirects for the WordPress → Next.js
// migration. The active redirect map lives in Supabase and is served
// by /api/seo/redirects/active; we fetch it here with a 60s tag-based
// revalidate so edits in the admin bust the cache on save.
//
// Matching strategy: exact match on the request pathname, with and
// without a trailing slash so a single admin entry like
// `/treatment-services/detox/` also catches `/treatment-services/detox`.

interface RedirectEntry {
  to: string;
  status: number;
}

type RedirectMap = Record<string, RedirectEntry>;

// Module-scope cache. `next: { revalidate }` is silently ignored in
// middleware (no Data Cache there), so before this every request
// paid a same-origin HTTP hop + lambda + Supabase query before TTFB.
// The /active route now also sends s-maxage=60 so the CDN absorbs
// most fetches; this cache is belt-and-braces for the instances that
// stay warm between requests. 60s staleness matches the admin-edit
// expectation already documented on the route.
const REDIRECT_CACHE_TTL_MS = 60_000;
let cachedMap: RedirectMap | null = null;
let cachedAt = 0;
let inflight: Promise<RedirectMap> | null = null;

async function fetchRedirectMap(origin: string): Promise<RedirectMap> {
  const now = Date.now();
  if (cachedMap && now - cachedAt < REDIRECT_CACHE_TTL_MS) return cachedMap;
  // Coalesce concurrent misses into one upstream fetch — a traffic
  // burst on a cold instance shouldn't fan out into N parallel
  // identical requests.
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${origin}/api/seo/redirects/active`, {
        next: { revalidate: 60, tags: ['redirects'] },
      });
      if (!res.ok) return cachedMap ?? {};
      const json = (await res.json()) as { map?: RedirectMap };
      cachedMap = json.map ?? {};
      cachedAt = Date.now();
      return cachedMap;
    } catch {
      // Network hiccup: serve the stale map if we have one rather
      // than dropping every redirect on the floor.
      return cachedMap ?? {};
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function lookup(map: RedirectMap, pathname: string): RedirectEntry | null {
  if (map[pathname]) return map[pathname];
  // Try the toggled-slash variant so one seed row covers both forms.
  const toggled = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname === '/' ? pathname : `${pathname}/`;
  if (map[toggled]) return map[toggled];
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;

  // Forward the request pathname as a header so server components
  // (specifically the (site) layout's generateMetadata) can build a
  // self-referencing canonical + og:url without each page re-declaring
  // its own URL. Every NextResponse.next() below uses the same forwarded
  // headers so the value is available on every passthrough request.
  const forwarded = new Headers(req.headers);
  forwarded.set('x-pathname', pathname);
  const passthrough = () =>
    NextResponse.next({ request: { headers: forwarded } });

  // OAuth fallback: if Supabase's Site URL config ever drops a visitor
  // back at the root with ?code=... (instead of /auth/callback), funnel
  // the code through our real callback route so they still land on /feather
  // instead of stranding on the marketing homepage with a dangling code.
  const oauthCode = searchParams.get('code');
  if (oauthCode && !pathname.startsWith('/auth/')) {
    const callback = req.nextUrl.clone();
    callback.pathname = '/auth/callback';
    if (!callback.searchParams.get('next')) {
      callback.searchParams.set('next', '/feather');
    }
    return NextResponse.redirect(callback);
  }

  // Never redirect the admin surface, API, auth callback, Next
  // internals, or obvious static asset extensions.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/feather') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    /\.[a-z0-9]{2,5}(?:\?|$)/i.test(pathname)
  ) {
    return passthrough();
  }

  // Trailing-slash → no-slash 301 is handled by the redirects()
  // entry in next.config.mjs. That fires before middleware so
  // doing it here was a no-op (Next.js already responded with the
  // built-in 308 by the time middleware ran).

  const map = await fetchRedirectMap(req.nextUrl.origin);
  const hit = lookup(map, pathname);
  if (!hit) return passthrough();

  // Build the destination. Relative `to` stays on the current host;
  // absolute URLs (http://…) pass through untouched.
  let destination: string;
  let destinationPath: string | null = null;
  if (/^https?:\/\//i.test(hit.to)) {
    destination = hit.to;
    try {
      const u = new URL(hit.to);
      // Only guard same-host loops; cross-origin redirects are always
      // safe because the origin changes.
      if (u.host === req.nextUrl.host) destinationPath = u.pathname;
    } catch {
      // Malformed absolute URL — treat as external and let the browser
      // report the error rather than silently dropping the redirect.
    }
  } else {
    const url = req.nextUrl.clone();
    url.pathname = hit.to;
    url.search = search; // preserve ?utm= etc.
    destination = url.toString();
    destinationPath = hit.to;
  }

  // Self-loop guard: if the destination resolves to the same path on
  // the same host (with/without trailing slash), pass through instead
  // of redirecting. Catches misconfigured `/ -> /` or
  // `/foo -> /foo/` rows without waiting for a cache bust.
  if (destinationPath) {
    const norm = (p: string) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);
    if (norm(destinationPath) === norm(pathname)) {
      return passthrough();
    }
  }

  // Fire-and-forget hit counter — non-blocking so the redirect is
  // still instant even if the bump endpoint is slow.
  fetch(`${req.nextUrl.origin}/api/seo/redirects/hit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ from_path: pathname }),
    cache: 'no-store',
  }).catch(() => { /* best-effort */ });

  return NextResponse.redirect(destination, hit.status);
}

export const config = {
  // Run on every request except obvious non-HTML assets. The function
  // itself also exits early on /api, /feather, /_next.
  matcher: [
    '/((?!api|feather|auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
