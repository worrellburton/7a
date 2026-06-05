'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import PageAnalyticsPanel from '@/components/PageAnalyticsPanel';
import { usePagePermissions } from '@/lib/PagePermissions';

// Post-publish-style dashboard for hand-coded blog posts (the ones
// whose body lives in /src/app/(site)/.../content.tsx). Editor can
// change byline, mark-reviewed-today, generate FAQ + Article schema,
// and inspect analytics — without touching the .tsx file. Overrides
// live in public.static_blog_meta and the live page picks them up
// via reconcileStaticMeta() in the rendering layer.

interface EpisodeOut {
  number: number;
  slug: string;
  title: string;
  blurb: string;
  publishedAt: string;
  publishedDisplay: string;
  image: string;
  imageAlt: string;
  path: string;
  href?: string;
  authorSlug?: string;
  reviewerSlug?: string;
  lastReviewedAt?: string;
}

interface MetaRow {
  slug: string;
  author_slug: string | null;
  reviewer_slug: string | null;
  last_reviewed_at: string | null;
  schema_json: { faq?: { question: string; answer: string }[]; article?: Record<string, unknown> } | null;
  schema_generated_at: string | null;
  updated_at: string;
}

interface AuthorOption {
  slug: string;
  name: string;
  title: string;
  credentials?: string;
  avatarUrl?: string;
  isMedicalReviewer?: boolean;
  source?: 'db' | 'fallback';
}

const NONE_SLUG = '__none__';

export default function StaticBlogDashboard({ slug }: { slug: string }) {
  const { user, isAdmin, isSuperAdmin, departmentId, session, profileLoading } = useAuth();
  const { userOverrides, userExtraDepartmentIds, loading: permLoading } = usePagePermissions();
  // Mirror /app/content + /app/content/[id] + the server gate.
  const MARKETING_DEPT_ID = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9';
  const inMarketing = departmentId === MARKETING_DEPT_ID || userExtraDepartmentIds.includes(MARKETING_DEPT_ID);
  const hasContentAccess = isSuperAdmin || isAdmin || inMarketing || userOverrides['/app/content'] === true;

  const [episode, setEpisode] = useState<EpisodeOut | null>(null);
  const [meta, setMeta] = useState<MetaRow | null>(null);
  const [teamAuthors, setTeamAuthors] = useState<AuthorOption[]>([]);
  const [teamReviewers, setTeamReviewers] = useState<AuthorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = session?.access_token ?? null;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content/static/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      setEpisode(json.episode as EpisodeOut);
      setMeta((json.meta as MetaRow | null) ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('/api/blog-authors', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setTeamAuthors((j.authors ?? []) as AuthorOption[]);
        setTeamReviewers((j.reviewers ?? []) as AuthorOption[]);
      })
      .catch(() => { /* fall back to plain inputs */ });
    return () => { cancelled = true; };
  }, [token]);

  async function patch(field: 'author_slug' | 'reviewer_slug' | 'last_reviewed_at', value: string | null) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`/api/content/static/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      setMeta((json.meta as MetaRow) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!user) return null;
  if (profileLoading || permLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    );
  }
  if (!hasContentAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>Content</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Content access required.</p>
          <p>Ask a super admin to flip your toggle on in <strong>Admin → User Permissions → Content</strong>.</p>
        </div>
      </div>
    );
  }
  if (loading && !episode) return <div className="px-4 py-10 text-center text-foreground/55">Loading…</div>;
  if (!episode) return <div className="px-4 py-10 text-center text-foreground/55">{error ?? 'Not found.'}</div>;

  const authorSlug = meta?.author_slug ?? null;
  const reviewerSlug = meta?.reviewer_slug ?? null;
  const lastReviewedAt = meta?.last_reviewed_at ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mb-3">
        <Link href="/app/content" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; All content</Link>
      </div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Hand-coded blog</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{episode.title}</h1>
        <p className="mt-1 text-[12px] text-foreground/50 font-mono">Episode {episode.number} · slug: {episode.slug}</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

      <div className="space-y-5">
        <HeroCard episode={episode} />
        <ActionBar episode={episode} onMarkReviewed={() => void patch('last_reviewed_at', new Date().toISOString())} />
        <SourceNote episode={episode} />
        <BylineCard
          authorSlug={authorSlug}
          reviewerSlug={reviewerSlug}
          lastReviewedAt={lastReviewedAt ?? episode.lastReviewedAt ?? null}
          authors={teamAuthors}
          reviewers={teamReviewers}
          episodeAuthorSlug={episode.authorSlug}
          episodeReviewerSlug={episode.reviewerSlug}
          onChange={patch}
        />
        <SchemaCard slug={episode.slug} path={episode.path} token={token} onChange={load} schemaGeneratedAt={meta?.schema_generated_at ?? null} />
        <AnalyticsCardCollapsible path={episode.path} token={token} />
      </div>
    </div>
  );
}

function HeroCard({ episode }: { episode: EpisodeOut }) {
  const [copied, setCopied] = useState(false);
  const liveUrl = `https://sevenarrowsrecoveryarizona.com${episode.path}`;
  return (
    <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/60 via-warm-bg/30 to-white p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border border-emerald-300 bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              Live
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-foreground/45">
              Published {new Date(episode.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {episode.title}
          </h2>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(liveUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-foreground/55 hover:text-foreground hover:bg-white/60 border border-transparent hover:border-black/10 transition-colors"
            title="Copy the live URL"
          >
            <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="9" height="9" rx="1.5" />
              <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
            </svg>
            <span className="truncate max-w-[480px]">{episode.path}</span>
            {copied && <span className="text-emerald-700">· copied</span>}
          </button>
        </div>
      </div>
    </section>
  );
}

function ActionBar({ episode, onMarkReviewed }: { episode: EpisodeOut; onMarkReviewed: () => void }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={episode.path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-[0_10px_28px_-10px_rgba(188,107,74,0.55)]"
        >
          View as visitor
          <span aria-hidden>↗</span>
        </Link>
        <button
          type="button"
          onClick={onMarkReviewed}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground/75 text-[12px] font-semibold hover:bg-warm-bg/60 transition-colors"
          title="Stamps lastReviewed today on MedicalWebPage. AI search engines deprioritise medical content over ~12 months without a fresh review stamp."
        >
          Mark reviewed today
        </button>
      </div>
    </section>
  );
}

function SourceNote({ episode }: { episode: EpisodeOut }) {
  const filepath = `src/app/(site)${episode.path.startsWith('/who-we-are/blog/') ? episode.path : episode.path}/content.tsx`;
  return (
    <section className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/30 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/45 mb-1">Body</p>
      <p className="text-[12.5px] text-foreground/70 leading-relaxed">
        Prose lives in <code className="font-mono text-[11px] px-1 py-[1px] rounded bg-white/70 border border-black/10">{filepath}</code> — edit via PR.
        Everything else (byline, schema, last-reviewed) is editable here without touching the file.
      </p>
    </section>
  );
}

function BylineCard({
  authorSlug,
  reviewerSlug,
  lastReviewedAt,
  authors,
  reviewers,
  episodeAuthorSlug,
  episodeReviewerSlug,
  onChange,
}: {
  authorSlug: string | null;
  reviewerSlug: string | null;
  lastReviewedAt: string | null;
  authors: AuthorOption[];
  reviewers: AuthorOption[];
  episodeAuthorSlug?: string;
  episodeReviewerSlug?: string;
  onChange: (field: 'author_slug' | 'reviewer_slug' | 'last_reviewed_at', value: string | null) => void;
}) {
  // "Effective" = what the live page renders. When no override set,
  // the resolver falls back to the episode's authorSlug → the
  // seeded DEFAULT_*_SLUG. Mirror that here so the dropdown
  // placeholder reads back the actual byline.
  const effectiveAuthor = useMemo(() => {
    if (authorSlug && authorSlug !== NONE_SLUG) return authors.find((a) => a.slug === authorSlug) ?? null;
    if (episodeAuthorSlug) return authors.find((a) => a.slug === episodeAuthorSlug) ?? null;
    return authors.find((a) => a.slug === 'lindsay-rothschild') ?? null;
  }, [authorSlug, authors, episodeAuthorSlug]);
  const effectiveReviewer = useMemo(() => {
    if (reviewerSlug && reviewerSlug !== NONE_SLUG) return reviewers.find((a) => a.slug === reviewerSlug) ?? null;
    if (episodeReviewerSlug) return reviewers.find((a) => a.slug === episodeReviewerSlug) ?? null;
    return reviewers.find((a) => a.slug === 'lindsay-rothschild') ?? null;
  }, [reviewerSlug, reviewers, episodeReviewerSlug]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">E-E-A-T</p>
          <h3 className="text-base font-semibold text-foreground">Byline</h3>
        </div>
      </div>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        Drives the visible byline + MedicalWebPage JSON-LD. Overrides live in
        {' '}<code className="font-mono text-[11px] px-1 py-[1px] rounded bg-warm-bg/70 border border-black/10">static_blog_meta</code>{' '}
        — the .tsx file isn&apos;t touched.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SimplePicker
          label="Written by"
          value={authorSlug}
          options={authors}
          effectiveName={effectiveAuthor?.name}
          onChange={(v) => onChange('author_slug', v)}
        />
        <SimplePicker
          label="Medically reviewed by"
          value={reviewerSlug}
          options={reviewers}
          effectiveName={effectiveReviewer?.name}
          onChange={(v) => onChange('reviewer_slug', v)}
        />
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">Last reviewed</span>
          <p className="text-[12.5px] text-foreground/85 mb-1">
            {lastReviewedAt
              ? new Date(lastReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Never (defaults to publish date)'}
          </p>
          <button
            type="button"
            onClick={() => onChange('last_reviewed_at', new Date().toISOString())}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-black/15 bg-white hover:bg-warm-bg/60"
          >
            Mark reviewed today
          </button>
        </div>
      </div>
    </section>
  );
}

function SimplePicker({
  label,
  value,
  options,
  effectiveName,
  onChange,
}: {
  label: string;
  value: string | null;
  options: AuthorOption[];
  effectiveName?: string;
  onChange: (next: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">{label}</span>
      <select
        value={value === null ? '' : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '') onChange(null);
          else onChange(v);
        }}
        className="w-full rounded-md border border-black/10 px-2 py-1.5 text-[12.5px] bg-white"
      >
        <option value="">— Default{effectiveName ? ` · ${effectiveName}` : ''} —</option>
        <option value={NONE_SLUG}>— None (no byline) —</option>
        <option disabled>──────────</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}{o.credentials ? `, ${o.credentials}` : ''} · {o.title}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[10.5px] text-foreground/55 truncate">
        {value === NONE_SLUG
          ? 'No byline on live post.'
          : value
            ? options.find((o) => o.slug === value)?.title ?? ''
            : effectiveName
              ? `Currently showing: ${effectiveName}.`
              : ''}
      </p>
    </label>
  );
}

function SchemaCard({
  slug,
  path,
  token,
  onChange,
  schemaGeneratedAt,
}: {
  slug: string;
  path: string;
  token: string | null;
  onChange: () => void;
  schemaGeneratedAt: string | null;
}) {
  const [blocks, setBlocks] = useState<{ type: string; json: unknown }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(path, { cache: 'no-store' });
      const html = await res.text();
      const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      const found: { type: string; json: unknown }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(m[1].trim()) as { '@type'?: string };
          const t = typeof parsed['@type'] === 'string' ? parsed['@type'] : 'Unknown';
          found.push({ type: t, json: parsed });
        } catch {
          /* skip malformed */
        }
      }
      setBlocks(found);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { void load(); }, [load]);

  async function regenerate() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/static/${slug}/generate-schema`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
      onChange();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggle(i: number) {
    setOpenIdx((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const liveUrl = `https://sevenarrowsrecoveryarizona.com${path}`;
  const richResultsUrl = `https://search.google.com/test/rich-results?url=${encodeURIComponent(liveUrl)}`;

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">Search schema</p>
          <h3 className="text-base font-semibold text-foreground">JSON-LD on the live page</h3>
        </div>
        <a
          href={richResultsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-primary hover:text-primary/85"
        >
          Test in Google Rich Results ↗
        </a>
      </div>
      {loading ? (
        <p className="text-[12px] text-foreground/55">Reading live page…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="text-[12.5px] text-foreground/80">
                <span className="font-semibold">{blocks.length}</span> JSON-LD block{blocks.length === 1 ? '' : 's'} emitted
                {blocks.length > 0 && <> · {blocks.map((b) => b.type).join(' · ')}</>}
              </p>
              {schemaGeneratedAt && (
                <p className="text-[11px] text-foreground/45 mt-0.5">
                  AI schema last generated {new Date(schemaGeneratedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={busy}
              className="px-3 py-2 rounded-md border border-black/15 bg-white text-foreground/80 text-[11.5px] font-semibold hover:bg-warm-bg/60 disabled:opacity-50"
            >
              {busy ? 'Regenerating…' : schemaGeneratedAt ? 'Regenerate FAQ + Article' : 'Generate FAQ + Article'}
            </button>
          </div>
          {blocks.length === 0 ? (
            <p className="text-[12px] text-foreground/55 italic">No JSON-LD detected on the live page.</p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b, i) => (
                <li key={i} className="rounded-lg border border-black/10 bg-warm-bg/20">
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
                    aria-expanded={openIdx.has(i)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-foreground/[0.06] text-foreground/65 border border-black/5">
                        {b.type}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border transition-transform ${openIdx.has(i) ? 'rotate-180 bg-foreground text-white border-foreground' : 'bg-white text-foreground/55 border-black/10'}`}
                      aria-hidden
                    >
                      <svg viewBox="0 0 16 16" width={9} height={9} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </span>
                  </button>
                  {openIdx.has(i) && (
                    <div className="border-t border-black/5 bg-white/60 p-2">
                      <div className="flex items-center justify-end gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(b.json, null, 2))}
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded border border-black/10 bg-white text-foreground/65 hover:text-foreground hover:bg-warm-bg/60"
                        >
                          Copy JSON
                        </button>
                      </div>
                      <pre className="text-[11px] leading-relaxed font-mono text-foreground/85 max-h-[360px] overflow-auto whitespace-pre-wrap break-all bg-warm-bg/30 rounded-md p-2">
{JSON.stringify(b.json, null, 2)}
                      </pre>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {err && <p className="mt-2 text-[11.5px] text-red-700">{err}</p>}
    </section>
  );
}

function AnalyticsCardCollapsible({ path, token }: { path: string; token: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-warm-bg/30 transition-colors rounded-2xl"
        aria-expanded={open}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">Analytics</p>
          <h3 className="text-base font-semibold text-foreground">Open, click, response · per channel</h3>
        </div>
        <span
          className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all ${open ? 'bg-foreground text-white border-foreground rotate-180' : 'bg-white text-foreground/55 border-black/10'}`}
          aria-hidden
        >
          <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-black/5 bg-warm-bg/30 rounded-b-2xl">
          <PageAnalyticsPanel path={path} token={token} />
        </div>
      )}
    </section>
  );
}
