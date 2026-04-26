// Semrush analytics v1 client.
//
// Auth: API key on the query string (?key=…). The legacy /v1/
// analytics endpoint is what powers Domain / Backlinks / Keyword
// research; the newer v4 OAuth API is overkill for what we need.
//
// Cost note: every row Semrush returns counts against your API
// units quota. callers should keep `display_limit` modest and
// rely on caching — this module enforces a 100-row hard cap on
// backlinks pulls so a runaway loop can't burn through the budget.
//
// Env:
//   SEMRUSH_API_KEY              required — issue from
//                                 semrush.com/api/units/api-key
//   SEMRUSH_TARGET_DOMAIN        optional default for queries —
//                                 "sevenarrowsrecoveryarizona.com"

const SEMRUSH_BASE = 'https://api.semrush.com/analytics/v1/';
const SEMRUSH_PROJECT_BASE = 'https://api.semrush.com/';

export function hasSemrush(): boolean {
  return !!process.env.SEMRUSH_API_KEY;
}

export function semrushDefaultTarget(): string | null {
  return process.env.SEMRUSH_TARGET_DOMAIN ?? null;
}

// Semrush returns CSV-style text for v1 endpoints — first line is
// header, subsequent lines are records. Columns are semicolon-
// separated by default (not comma) because URLs and anchors
// contain commas. Empty body = no rows.
function parseSemrushCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(';');
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(';');
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j += 1) {
      obj[headers[j]] = cells[j] ?? '';
    }
    rows.push(obj);
  }
  return rows;
}

interface SemrushFetchOptions {
  type: string;
  target: string;
  target_type?: 'root_domain' | 'domain' | 'url';
  export_columns?: string[];
  display_limit?: number;
  display_offset?: number;
  display_sort?: string;
  display_filter?: string;
  /** Override base url for non-/analytics/v1/ endpoints. */
  base?: string;
  /** Extra raw query string params. */
  extra?: Record<string, string | number | undefined>;
}

export class SemrushError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'SemrushError';
  }
}

async function semrushFetch(opts: SemrushFetchOptions): Promise<{
  rows: Record<string, string>[];
  raw: string;
}> {
  const key = process.env.SEMRUSH_API_KEY;
  if (!key) {
    throw new SemrushError('SEMRUSH_API_KEY is not set', 412);
  }
  const base = opts.base ?? SEMRUSH_BASE;
  const params = new URLSearchParams();
  params.set('key', key);
  params.set('type', opts.type);
  params.set('target', opts.target);
  if (opts.target_type) params.set('target_type', opts.target_type);
  if (opts.export_columns?.length) params.set('export_columns', opts.export_columns.join(','));
  if (opts.display_limit != null) params.set('display_limit', String(opts.display_limit));
  if (opts.display_offset != null) params.set('display_offset', String(opts.display_offset));
  if (opts.display_sort) params.set('display_sort', opts.display_sort);
  if (opts.display_filter) params.set('display_filter', opts.display_filter);
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      if (v != null) params.set(k, String(v));
    }
  }

  const url = `${base}?${params.toString()}`;
  const res = await fetch(url, {
    cache: 'no-store',
    // Semrush sometimes returns 200 with an "ERROR …" body — handle
    // both shapes below.
  });
  const text = await res.text();
  if (!res.ok) {
    throw new SemrushError(`Semrush HTTP ${res.status}: ${text.slice(0, 400)}`, res.status);
  }
  // Semrush prepends "ERROR <code> :: <message>" on errors that
  // come back with a 200. Detect and surface as a real failure.
  if (/^ERROR\b/i.test(text.trim())) {
    throw new SemrushError(text.trim().slice(0, 400), 502);
  }
  return { rows: parseSemrushCsv(text), raw: text };
}

// ─── Backlinks ─────────────────────────────────────────────────

export interface BacklinkRow {
  source_url: string;
  source_title: string;
  target_url: string;
  anchor: string;
  external_num: number;
  internal_num: number;
  first_seen: string;
  last_seen: string;
  /** Semrush returns "1" for follow, empty for nofollow. */
  is_follow: boolean;
  /** rel="nofollow" present? */
  is_nofollow: boolean;
  /** rel="ugc" present? */
  is_ugc: boolean;
  /** rel="sponsored" present? */
  is_sponsored: boolean;
  response_code: number;
  page_score: number;
}

export interface BacklinksOverview {
  domain_score: number | null;
  total: number;
  follows_num: number;
  nofollows_num: number;
  ips_num: number;
  ref_domains_num: number;
  ref_pages_num: number;
}

const BACKLINK_COLUMNS = [
  'source_url',
  'source_title',
  'target_url',
  'anchor',
  'external_num',
  'internal_num',
  'first_seen',
  'last_seen',
  'nofollow',
  'response_code',
  'page_score',
];

export async function fetchBacklinks(opts: {
  target: string;
  target_type?: 'root_domain' | 'domain' | 'url';
  limit?: number;
  offset?: number;
  /** "newest" | "oldest" | "page_score_desc" — passed through verbatim. */
  sort?: string;
}): Promise<BacklinkRow[]> {
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
  const { rows } = await semrushFetch({
    type: 'backlinks',
    target: opts.target,
    target_type: opts.target_type ?? 'root_domain',
    export_columns: BACKLINK_COLUMNS,
    display_limit: limit,
    display_offset: opts.offset ?? 0,
    display_sort: opts.sort ?? 'last_seen_desc',
  });
  return rows.map((r) => {
    // Semrush encodes follow flags inside a comma-separated string
    // in the `nofollow` column: e.g. "0,0,0,0" or "1,0,1,0" for
    // nofollow / ugc / sponsored / image. The "follow" link is the
    // inverse of nofollow.
    const flags = (r.nofollow ?? '').split(',');
    const nofollow = flags[0] === '1';
    const ugc = flags[1] === '1';
    const sponsored = flags[2] === '1';
    return {
      source_url: r.source_url ?? '',
      source_title: r.source_title ?? '',
      target_url: r.target_url ?? '',
      anchor: r.anchor ?? '',
      external_num: Number(r.external_num ?? 0),
      internal_num: Number(r.internal_num ?? 0),
      first_seen: r.first_seen ?? '',
      last_seen: r.last_seen ?? '',
      is_follow: !nofollow && !ugc && !sponsored,
      is_nofollow: nofollow,
      is_ugc: ugc,
      is_sponsored: sponsored,
      response_code: Number(r.response_code ?? 0),
      page_score: Number(r.page_score ?? 0),
    } satisfies BacklinkRow;
  });
}

const OVERVIEW_COLUMNS = [
  'domain_ascore',
  'total',
  'follows_num',
  'nofollows_num',
  'ips_num',
  'domains_num',
  'urls_num',
];

export async function fetchBacklinksOverview(opts: {
  target: string;
  target_type?: 'root_domain' | 'domain' | 'url';
}): Promise<BacklinksOverview | null> {
  const { rows } = await semrushFetch({
    type: 'backlinks_overview',
    target: opts.target,
    target_type: opts.target_type ?? 'root_domain',
    export_columns: OVERVIEW_COLUMNS,
  });
  const r = rows[0];
  if (!r) return null;
  return {
    domain_score: r.domain_ascore ? Number(r.domain_ascore) : null,
    total: Number(r.total ?? 0),
    follows_num: Number(r.follows_num ?? 0),
    nofollows_num: Number(r.nofollows_num ?? 0),
    ips_num: Number(r.ips_num ?? 0),
    ref_domains_num: Number(r.domains_num ?? 0),
    ref_pages_num: Number(r.urls_num ?? 0),
  };
}

// Re-export the project-level base so callers wanting non-analytics
// endpoints (e.g. /units to check remaining quota) can use the same
// auth scheme.
export const SEMRUSH_PROJECT_API_BASE = SEMRUSH_PROJECT_BASE;
