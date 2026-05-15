'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { EPISODES } from '@/lib/episodes';

// /app/content — super-admin-only blog pipeline.
//
// Lists every blog: DB-backed posts (created via the AI pipeline) +
// the seven hand-coded posts that already live under
// /who-we-are/blog/<slug>/ (those are read-only here; the row links
// to the file path so a dev can open the TSX directly).
//
// "New blog" opens an inline form that asks for a one-paragraph
// prompt + optional title; submit creates a draft row and routes to
// /app/content/<id> where the user generates → reviews → picks
// images → builds → publishes.

interface DbBlog {
  id: string;
  slug: string;
  title: string | null;
  status: 'draft' | 'reviewing' | 'images' | 'selecting' | 'built' | 'published';
  prompt: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const STATUS_LABELS: Record<DbBlog['status'], string> = {
  draft: 'Draft',
  reviewing: 'Reviewing',
  images: 'Generating images',
  selecting: 'Selecting images',
  built: 'Built',
  published: 'Published',
};
const STATUS_TONES: Record<DbBlog['status'], string> = {
  draft: 'bg-foreground/5 text-foreground/60 border-foreground/15',
  reviewing: 'bg-amber-50 text-amber-700 border-amber-200',
  images: 'bg-sky-50 text-sky-700 border-sky-200',
  selecting: 'bg-sky-50 text-sky-700 border-sky-200',
  built: 'bg-violet-50 text-violet-700 border-violet-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function ContentLanding() {
  const { user, isSuperAdmin, session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<DbBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/content', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setRows(json.rows ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);

  if (!user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>Content</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Super-admin only.</p>
          <p>Publishing on the Seven Arrows blog is restricted to super admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Content</h1>
          <p className="mt-1 text-sm text-foreground/60">Every blog on the site, plus the AI pipeline to draft new ones.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors"
        >
          <span aria-hidden>+</span>
          New blog
        </button>
      </header>

      {showCreate && (
        <NewBlogForm
          token={session?.access_token ?? null}
          onCancel={() => setShowCreate(false)}
          onCreated={(id) => router.push(`/app/content/${id}`)}
        />
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-[0.18em] text-foreground/55 font-bold mb-2">AI-pipeline posts</h2>
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-[13px] text-foreground/50">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-foreground/50">
              No AI-pipeline posts yet. Click <strong>New blog</strong> to start one.
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/app/content/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-warm-bg/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-[14px]">{r.title || '(Untitled)'}</p>
                      <p className="text-[11.5px] text-foreground/55 truncate">{r.slug} · updated {new Date(r.updated_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_TONES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-foreground/55 font-bold mb-2">Hand-coded posts (read-only)</h2>
        <p className="text-[11.5px] text-foreground/50 mb-2">These predate the AI pipeline. Edit them by opening the source files.</p>
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          <ul className="divide-y divide-black/5">
            {EPISODES.map((ep) => (
              <li key={ep.slug} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-[14px]">{ep.title}</p>
                  <p className="text-[11.5px] text-foreground/55 truncate font-mono">src/app/(site)/who-we-are/blog/{ep.slug}/content.tsx</p>
                </div>
                <a
                  href={`/who-we-are/blog/${ep.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[10.5px] font-semibold text-foreground/65 hover:text-foreground border border-black/10 rounded-md px-2 py-1"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function NewBlogForm({ token, onCancel, onCreated }: { token: string | null; onCancel: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!token) return;
    if (!prompt.trim()) { setErr('Add a paragraph first.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim() || undefined, prompt: prompt.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onCreated(json.id as string);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-foreground/55 font-bold mb-2">New blog</p>
      <label className="block mb-3">
        <span className="block text-[11px] font-semibold text-foreground/65 mb-1">Working title (optional)</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Why polyvagal theory matters in early recovery"
          className="w-full rounded-md border border-black/10 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="block mb-3">
        <span className="block text-[11px] font-semibold text-foreground/65 mb-1">Prompt — one paragraph describing the blog you want</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="A long paragraph explaining the angle, audience, and what the reader should walk away knowing…"
          className="w-full rounded-md border border-black/10 px-2.5 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      {err && <p className="mb-2 text-[12px] text-rose-700">{err}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create draft'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-black/10 text-[11.5px] font-semibold text-foreground/65 hover:bg-warm-bg/60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Silence "supabase imported but never used" lint warning — kept in
// scope so future iterations can subscribe to realtime blogs changes
// without re-importing.
void supabase;
