// robots.txt fetcher + minimal parser.
//
// Parses User-agent groups, Allow / Disallow rules, and Sitemap
// directives. We don't need a full Robots Exclusion Protocol matcher;
// the audit only needs to know:
//   - did robots.txt load?
//   - is there a User-agent: * group?
//   - does that group Disallow:/  (catastrophic)?
//   - does it Disallow important top-level paths?
//   - is at least one Sitemap: directive present, and does it point at
//     a sitemap we can resolve?

const FETCH_TIMEOUT_MS = 8_000;

export interface RobotsRule {
  field: 'allow' | 'disallow';
  value: string;
}

export interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

export interface RobotsTxt {
  /** URL fetched (e.g. https://example.com/robots.txt). */
  url: string;
  status: number;
  ok: boolean;
  raw: string;
  groups: RobotsGroup[];
  sitemaps: string[];
  /** Fetch / parse error if any. */
  error: string | null;
}

export async function fetchRobots(origin: string): Promise<RobotsTxt> {
  const url = origin.replace(/\/$/, '') + '/robots.txt';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const out: RobotsTxt = {
    url,
    status: 0,
    ok: false,
    raw: '',
    groups: [],
    sitemaps: [],
    error: null,
  };

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SevenArrowsAuditBot/1.0 (+https://sevenarrowsrecoveryarizona.com)',
        Accept: 'text/plain,*/*;q=0.5',
      },
      cache: 'no-store',
    });
    out.status = res.status;
    out.ok = res.ok;
    out.raw = await res.text();
    if (!res.ok) {
      out.error = `HTTP ${res.status}`;
      return out;
    }
    parseInto(out);
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
  }
  return out;
}

function parseInto(out: RobotsTxt): void {
  let current: RobotsGroup | null = null;
  for (const rawLine of out.raw.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [rawField, ...rest] = line.split(':');
    if (!rawField || rest.length === 0) continue;
    const field = rawField.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (field === 'user-agent') {
      // A new group whenever we see a UA after a rule line; if the
      // previous line was also User-agent we group them together.
      if (!current || current.rules.length > 0) {
        current = { userAgents: [], rules: [] };
        out.groups.push(current);
      }
      current.userAgents.push(value);
    } else if (field === 'allow' || field === 'disallow') {
      if (!current) {
        current = { userAgents: ['*'], rules: [] };
        out.groups.push(current);
      }
      current.rules.push({ field, value });
    } else if (field === 'sitemap') {
      if (value) out.sitemaps.push(value);
    }
    // Other directives (Crawl-delay, Host, etc.) are ignored.
  }
}

/**
 * Cheap path matcher for the Disallow:/ check. Not a full RFC matcher —
 * just enough to spot the catastrophic cases. Returns true if `path`
 * is blocked for `*` user-agents.
 */
export function isPathDisallowed(robots: RobotsTxt, path: string, ua = '*'): boolean {
  // Find the most specific UA group that matches.
  const match = robots.groups.find((g) =>
    g.userAgents.some((u) => u === ua || u === '*'),
  );
  if (!match) return false;
  // Longest-match wins between Allow and Disallow.
  let longest: { rule: RobotsRule; len: number } | null = null;
  for (const r of match.rules) {
    if (!r.value) {
      // Disallow: (empty) means allow all. Skip.
      continue;
    }
    if (path.startsWith(r.value) && (!longest || r.value.length > longest.len)) {
      longest = { rule: r, len: r.value.length };
    }
  }
  return !!longest && longest.rule.field === 'disallow';
}
