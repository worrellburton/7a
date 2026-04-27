// SerpAPI client.
//
// Auth: API key in the query string (?api_key=…). Each engine maps
// 1:1 to a SerpAPI engine (google, google_local, google_autocomplete,
// google_related_questions, google_maps_reviews, google_trends).
//
// Cost note: SerpAPI bills per successful search. The keyword-rank
// route already tops out around the curated set (~50 calls); adding
// local-pack + PAA + competitor sweeps could 4-5× that, so this
// module enforces a daily cap before issuing any HTTP request. The
// counter lives in process memory — good enough until we have a
// usage table (deferred to a later phase because the Supabase MCP
// auth flow is currently broken and we won't ship code that reads
// columns that don't exist yet).
//
// Env:
//   SERPAPI_KEY            required — issue from serpapi.com
//   SERPAPI_DAILY_CAP      optional, default 200 calls/day
//   SERPAPI_DEFAULT_GL     optional, default "us"
//   SERPAPI_DEFAULT_HL     optional, default "en"

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const DEFAULT_DAILY_CAP = 200;
const DEFAULT_TIMEOUT_MS = 20_000;

export type SerpEngine =
  | 'google'
  | 'google_local'
  | 'google_autocomplete'
  | 'google_related_questions'
  | 'google_maps_reviews'
  | 'google_trends';

export class SerpApiError extends Error {
  status: number;
  engine: SerpEngine | null;
  constructor(message: string, status: number, engine: SerpEngine | null = null) {
    super(message);
    this.status = status;
    this.engine = engine;
    this.name = 'SerpApiError';
  }
}

export function hasSerpApi(): boolean {
  return !!process.env.SERPAPI_KEY;
}

export function serpapiDailyCap(): number {
  const raw = process.env.SERPAPI_DAILY_CAP;
  if (!raw) return DEFAULT_DAILY_CAP;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_CAP;
}

// ── In-process daily counter ─────────────────────────────────────
//
// Keyed by UTC date so a deployment that spans midnight rolls over
// cleanly. This is per-process — multiple Vercel lambdas each have
// their own counter, so the real ceiling is roughly cap × concurrent
// instances. Acceptable for now; a real DB-backed counter is on the
// Phase-1-followup list once the Supabase MCP works.
interface DailyCounter {
  date: string;
  count: number;
}
let counter: DailyCounter = { date: utcDate(), count: 0 };

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function bumpCounter(): { count: number; cap: number; date: string } {
  const today = utcDate();
  if (counter.date !== today) counter = { date: today, count: 0 };
  counter.count += 1;
  return { count: counter.count, cap: serpapiDailyCap(), date: counter.date };
}

export interface SerpApiUsage {
  date: string;
  count: number;
  cap: number;
  remaining: number;
}

/** Read-only snapshot of today's usage in this process. */
export function readSerpApiUsage(): SerpApiUsage {
  const today = utcDate();
  const c = counter.date === today ? counter.count : 0;
  const cap = serpapiDailyCap();
  return { date: today, count: c, cap, remaining: Math.max(0, cap - c) };
}

// ── Core fetch ───────────────────────────────────────────────────

interface SerpApiCallOptions {
  engine: SerpEngine;
  /** Free-form params merged into the SerpAPI query string. */
  params: Record<string, string | number | undefined>;
  /** Override per-call timeout (ms). */
  timeoutMs?: number;
  /** When true, the daily cap is bypassed — only for cron / admin. */
  ignoreCap?: boolean;
}

interface SerpApiResult<T> {
  json: T;
  /** SerpAPI's `search_metadata.id` if present — useful for debugging. */
  searchId: string | null;
  durationMs: number;
}

async function callSerpApi<T = Record<string, unknown>>(
  opts: SerpApiCallOptions,
): Promise<SerpApiResult<T>> {
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    throw new SerpApiError('SERPAPI_KEY is not set', 412, opts.engine);
  }

  if (!opts.ignoreCap) {
    const usage = bumpCounter();
    if (usage.count > usage.cap) {
      throw new SerpApiError(
        `SerpAPI daily cap reached (${usage.cap} calls/day). Counter resets at UTC midnight.`,
        429,
        opts.engine,
      );
    }
  }

  const url = new URL(SERPAPI_BASE);
  url.searchParams.set('engine', opts.engine);
  url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(opts.params)) {
    if (v != null && v !== '') url.searchParams.set(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const startedAt = Date.now();
  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      signal: controller.signal,
    });
    const durationMs = Date.now() - startedAt;
    const text = await res.text();
    if (!res.ok) {
      throw new SerpApiError(
        `SerpAPI HTTP ${res.status}: ${text.slice(0, 400)}`,
        res.status,
        opts.engine,
      );
    }
    let json: T & { error?: string; search_metadata?: { id?: string } };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      throw new SerpApiError(
        `SerpAPI returned non-JSON body: ${text.slice(0, 200)}`,
        502,
        opts.engine,
      );
    }
    if (typeof json.error === 'string' && json.error.length > 0) {
      throw new SerpApiError(json.error, 502, opts.engine);
    }
    const searchId = json.search_metadata?.id ?? null;
    // Structured log line — picked up by Vercel/CloudWatch and useful
    // for "where did our credits go this week?" investigations until
    // the usage table lands.
    console.info(
      JSON.stringify({
        kind: 'serpapi.call',
        engine: opts.engine,
        ms: durationMs,
        ok: true,
        search_id: searchId,
      }),
    );
    return { json: json as T, searchId, durationMs };
  } catch (err) {
    if (err instanceof SerpApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new SerpApiError(
        `SerpAPI ${opts.engine} timed out after ${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`,
        504,
        opts.engine,
      );
    }
    throw new SerpApiError(
      err instanceof Error ? err.message : String(err),
      500,
      opts.engine,
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── Engine wrappers ──────────────────────────────────────────────
//
// Each wrapper returns the slice we actually use across the SEO
// surface plus the raw json so callers (debug screens, Phase-4 SERP
// feature detector) can dig deeper without a second API call.

export interface GoogleOrganicResult {
  position: number;
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
}

export interface GoogleSerpFeatures {
  ai_overview: boolean;
  answer_box: boolean;
  knowledge_graph: boolean;
  related_questions: boolean;
  local_pack: boolean;
  inline_videos: boolean;
  inline_images: boolean;
  ads_top: number;
  ads_bottom: number;
}

export interface GoogleSerpResponse {
  organic: GoogleOrganicResult[];
  features: GoogleSerpFeatures;
  raw: Record<string, unknown>;
}

interface RawGoogleJson {
  organic_results?: Array<{
    position?: number;
    title?: string;
    link?: string;
    displayed_link?: string;
    snippet?: string;
  }>;
  ai_overview?: unknown;
  answer_box?: unknown;
  knowledge_graph?: unknown;
  related_questions?: unknown;
  local_results?: unknown;
  inline_videos?: unknown;
  inline_images?: unknown;
  ads?: Array<{ block_position?: string }>;
}

export async function googleSearch(opts: {
  q: string;
  gl?: string;
  hl?: string;
  num?: number;
  /** Pass an explicit lat/lng/zoom string to localize SERPs. */
  location?: string;
  ignoreCap?: boolean;
  timeoutMs?: number;
}): Promise<GoogleSerpResponse> {
  const { json } = await callSerpApi<RawGoogleJson>({
    engine: 'google',
    params: {
      q: opts.q,
      gl: opts.gl ?? process.env.SERPAPI_DEFAULT_GL ?? 'us',
      hl: opts.hl ?? process.env.SERPAPI_DEFAULT_HL ?? 'en',
      num: opts.num ?? 100,
      location: opts.location,
    },
    timeoutMs: opts.timeoutMs,
    ignoreCap: opts.ignoreCap,
  });
  const organic: GoogleOrganicResult[] = (json.organic_results ?? [])
    .filter((o) => typeof o.link === 'string' && o.link.length > 0)
    .map((o, i) => ({
      position: typeof o.position === 'number' ? o.position : i + 1,
      title: o.title ?? '',
      link: o.link as string,
      displayed_link: o.displayed_link,
      snippet: o.snippet,
    }));
  const ads = json.ads ?? [];
  const features: GoogleSerpFeatures = {
    ai_overview: json.ai_overview != null,
    answer_box: json.answer_box != null,
    knowledge_graph: json.knowledge_graph != null,
    related_questions: Array.isArray(json.related_questions) && json.related_questions.length > 0,
    local_pack: Array.isArray(json.local_results) && json.local_results.length > 0,
    inline_videos: Array.isArray(json.inline_videos) && json.inline_videos.length > 0,
    inline_images: Array.isArray(json.inline_images) && json.inline_images.length > 0,
    ads_top: ads.filter((a) => a?.block_position === 'top').length,
    ads_bottom: ads.filter((a) => a?.block_position === 'bottom').length,
  };
  return { organic, features, raw: json as unknown as Record<string, unknown> };
}

// Helper used by the rank route — searches for a query and returns
// the position of the first result whose host matches the supplied
// domain (or null if not in the result set).
export function findRankInOrganic(
  organic: GoogleOrganicResult[],
  domain: string,
): { position: number; url: string } | null {
  const target = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase();
  for (const o of organic) {
    let host: string | null = null;
    try {
      host = new URL(o.link).host.replace(/^www\./, '').toLowerCase();
    } catch {
      continue;
    }
    if (host === target || host.endsWith(`.${target}`)) {
      return { position: o.position, url: o.link };
    }
  }
  return null;
}

export interface GoogleLocalPackEntry {
  position: number;
  title: string;
  rating: number | null;
  reviews: number | null;
  type: string | null;
  address: string | null;
  phone: string | null;
  place_id: string | null;
  link: string | null;
}

interface RawLocalJson {
  local_results?: {
    places?: Array<{
      position?: number;
      title?: string;
      rating?: number;
      reviews?: number;
      type?: string;
      address?: string;
      phone?: string;
      place_id?: string;
      links?: { website?: string };
      website?: string;
    }>;
  };
}

export async function googleLocalPack(opts: {
  q: string;
  /** Free-form location string SerpAPI will geocode (e.g. "Phoenix, Arizona, United States"). */
  location: string;
  hl?: string;
  ignoreCap?: boolean;
}): Promise<GoogleLocalPackEntry[]> {
  const { json } = await callSerpApi<RawLocalJson>({
    engine: 'google_local',
    params: {
      q: opts.q,
      location: opts.location,
      hl: opts.hl ?? process.env.SERPAPI_DEFAULT_HL ?? 'en',
    },
    ignoreCap: opts.ignoreCap,
  });
  const places = json.local_results?.places ?? [];
  return places.map((p, i) => ({
    position: typeof p.position === 'number' ? p.position : i + 1,
    title: p.title ?? '',
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviews: typeof p.reviews === 'number' ? p.reviews : null,
    type: p.type ?? null,
    address: p.address ?? null,
    phone: p.phone ?? null,
    place_id: p.place_id ?? null,
    link: p.links?.website ?? p.website ?? null,
  }));
}

interface RawAutocompleteJson {
  suggestions?: Array<{ value?: string; relevance?: number }>;
}

export async function googleAutocomplete(opts: {
  q: string;
  gl?: string;
  hl?: string;
  ignoreCap?: boolean;
}): Promise<{ value: string; relevance: number | null }[]> {
  const { json } = await callSerpApi<RawAutocompleteJson>({
    engine: 'google_autocomplete',
    params: {
      q: opts.q,
      gl: opts.gl ?? process.env.SERPAPI_DEFAULT_GL ?? 'us',
      hl: opts.hl ?? process.env.SERPAPI_DEFAULT_HL ?? 'en',
    },
    ignoreCap: opts.ignoreCap,
  });
  return (json.suggestions ?? [])
    .filter((s) => typeof s.value === 'string' && s.value.length > 0)
    .map((s) => ({
      value: s.value as string,
      relevance: typeof s.relevance === 'number' ? s.relevance : null,
    }));
}

interface RawRelatedQuestionsJson {
  related_questions?: Array<{
    question?: string;
    snippet?: string;
    title?: string;
    link?: string;
    displayed_link?: string;
  }>;
}

export interface RelatedQuestion {
  question: string;
  snippet: string | null;
  source_title: string | null;
  source_link: string | null;
}

export async function googleRelatedQuestions(opts: {
  q: string;
  gl?: string;
  hl?: string;
  ignoreCap?: boolean;
}): Promise<RelatedQuestion[]> {
  // SerpAPI exposes related_questions as a top-level field on the
  // standard `google` engine response. The dedicated
  // `google_related_questions` engine drills further into a single
  // PAA item to expand it. For the miner pass we want the breadth of
  // the standard engine, so we hit `google` and slice.
  const { json } = await callSerpApi<RawRelatedQuestionsJson>({
    engine: 'google',
    params: {
      q: opts.q,
      gl: opts.gl ?? process.env.SERPAPI_DEFAULT_GL ?? 'us',
      hl: opts.hl ?? process.env.SERPAPI_DEFAULT_HL ?? 'en',
      num: 10,
    },
    ignoreCap: opts.ignoreCap,
  });
  return (json.related_questions ?? [])
    .filter((q) => typeof q.question === 'string' && q.question.length > 0)
    .map((q) => ({
      question: q.question as string,
      snippet: q.snippet ?? null,
      source_title: q.title ?? null,
      source_link: q.link ?? null,
    }));
}

interface RawMapsReviewsJson {
  reviews?: Array<{
    user?: { name?: string };
    rating?: number;
    snippet?: string;
    date?: string;
    iso_date?: string;
  }>;
}

export interface MapsReview {
  author: string | null;
  rating: number | null;
  snippet: string | null;
  date: string | null;
  iso_date: string | null;
}

export async function googleMapsReviews(opts: {
  place_id: string;
  hl?: string;
  ignoreCap?: boolean;
}): Promise<MapsReview[]> {
  const { json } = await callSerpApi<RawMapsReviewsJson>({
    engine: 'google_maps_reviews',
    params: {
      place_id: opts.place_id,
      hl: opts.hl ?? process.env.SERPAPI_DEFAULT_HL ?? 'en',
    },
    ignoreCap: opts.ignoreCap,
  });
  return (json.reviews ?? []).map((r) => ({
    author: r.user?.name ?? null,
    rating: typeof r.rating === 'number' ? r.rating : null,
    snippet: r.snippet ?? null,
    date: r.date ?? null,
    iso_date: r.iso_date ?? null,
  }));
}

interface RawTrendsJson {
  interest_over_time?: {
    timeline_data?: Array<{
      date?: string;
      timestamp?: string;
      values?: Array<{ query?: string; value?: string; extracted_value?: number }>;
    }>;
  };
}

export interface TrendPoint {
  date: string;
  /** 0-100 normalized search interest. */
  value: number;
}

export async function googleTrends(opts: {
  q: string;
  geo?: string;
  /** Time range token, e.g. "today 12-m", "today 5-y". */
  date?: string;
  ignoreCap?: boolean;
}): Promise<TrendPoint[]> {
  const { json } = await callSerpApi<RawTrendsJson>({
    engine: 'google_trends',
    params: {
      q: opts.q,
      geo: opts.geo ?? 'US',
      date: opts.date ?? 'today 12-m',
      data_type: 'TIMESERIES',
    },
    ignoreCap: opts.ignoreCap,
  });
  const timeline = json.interest_over_time?.timeline_data ?? [];
  return timeline
    .map((t) => ({
      date: t.date ?? '',
      value: t.values?.[0]?.extracted_value ?? 0,
    }))
    .filter((p) => p.date.length > 0);
}
