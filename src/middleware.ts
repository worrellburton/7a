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

async function fetchRedirectMap(origin: string): Promise<RedirectMap> {
  try {
    const res = await fetch(`${origin}/api/seo/redirects/active`, {
      next: { revalidate: 60, tags: ['redirects'] },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { map?: RedirectMap };
    return json.map ?? {};
  } catch {
    return {};
  }
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
  const { pathname, search } = req.nextUrl;

  // Never redirect the admin surface, API, auth callback, Next
  // internals, or obvious static asset extensions.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    /\.[a-z0-9]{2,5}(?:\?|$)/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const map = await fetchRedirectMap(req.nextUrl.origin);
  const hit = lookup(map, pathname);
  if (!hit) return NextResponse.next();

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
      return NextResponse.next();
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
  // itself also exits early on /api, /app, /_next.
  matcher: [
    '/((?!api|app|auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
