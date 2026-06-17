'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { toAvatarThumb } from '@/lib/avatarThumb';

// Alumni gratitude board. A single shared wall where alumni answer
// "What are you grateful for today?". Anyone signed in can read it
// (alumni on their portal, super admins auditing), but only alumni
// see the composer, and authors can edit or delete their own posts.
// Data + RLS live in supabase/migrations/20260617_alumni_gratitude_posts.sql
// (select=any authed, insert/update/delete=own rows only).

const MAX_LEN = 1000;

interface Post {
  id: string;
  user_id: string;
  body: string;
  edited_at: string | null;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

// "just now" / "12m ago" / "3h ago" / "Apr 5" — compact, no seconds.
function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const m = Math.round((Date.now() - t) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function GratitudeBoardContent() {
  const { user, userKind } = useAuth();
  const isAlumni = userKind === 'alumni';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: selErr } = await supabase
      .from('alumni_gratitude_posts')
      .select('id, user_id, body, edited_at, created_at, users:user_id(full_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (selErr) {
      setError(selErr.message);
      setLoading(false);
      return;
    }
    const rows: Post[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const usr = (Array.isArray(row.users) ? row.users[0] : row.users) as
        | { full_name?: string | null; avatar_url?: string | null }
        | null;
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        body: (row.body as string) ?? '',
        edited_at: (row.edited_at as string | null) ?? null,
        created_at: (row.created_at as string) ?? '',
        full_name: usr?.full_name ?? null,
        avatar_url: usr?.avatar_url ?? null,
      };
    });
    setPosts(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitPost = async () => {
    const body = draft.trim();
    if (!body || !user?.id || posting) return;
    setPosting(true);
    setError(null);
    const { error: insErr } = await supabase
      .from('alumni_gratitude_posts')
      .insert({ user_id: user.id, body: body.slice(0, MAX_LEN) });
    if (insErr) {
      setError(insErr.message);
      setPosting(false);
      return;
    }
    setDraft('');
    setPosting(false);
    await load();
  };

  const beginEdit = (p: Post) => {
    setConfirmDeleteId(null);
    setEditingId(p.id);
    setEditDraft(p.body);
  };

  const saveEdit = async (id: string) => {
    const body = editDraft.trim();
    if (!body || savingId) return;
    setSavingId(id);
    setError(null);
    const { error: updErr } = await supabase
      .from('alumni_gratitude_posts')
      .update({ body: body.slice(0, MAX_LEN), edited_at: new Date().toISOString() })
      .eq('id', id);
    if (updErr) {
      setError(updErr.message);
      setSavingId(null);
      return;
    }
    setSavingId(null);
    setEditingId(null);
    setEditDraft('');
    await load();
  };

  const deletePost = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    const { error: delErr } = await supabase
      .from('alumni_gratitude_posts')
      .delete()
      .eq('id', id);
    if (delErr) {
      setError(delErr.message);
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
    await load();
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>

      <header className="mt-3 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Gratitude board</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          What are you grateful for today?
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-xl">
          A shared wall for the alumni community. Post what&rsquo;s on your heart, read what others
          are grateful for, and come back any time.
        </p>
      </header>

      {/* Composer — alumni only. Super admins auditing the portal see a
          quiet note instead so they don't post into the community wall. */}
      {isAlumni ? (
        <div className="mb-7 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/8 via-warm-bg/40 to-white p-4 sm:p-5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            rows={3}
            placeholder="Today I'm grateful for…"
            className="w-full resize-y rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-foreground/40 tabular-nums">{draft.trim().length}/{MAX_LEN}</span>
            <button
              type="button"
              onClick={() => void submitPost()}
              disabled={posting || draft.trim().length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-7 rounded-xl border border-dashed border-black/15 bg-warm-bg/40 px-4 py-3 text-[12.5px] text-foreground/55">
          You&rsquo;re viewing the alumni gratitude board. Only alumni can post here.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">{error}</p>
      )}

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/40 px-6 py-10 text-center">
          <p className="text-3xl mb-2" aria-hidden="true">🌅</p>
          <p className="text-[13px] text-foreground/60">
            Nothing on the board yet. {isAlumni ? 'Be the first to share what you’re grateful for.' : 'Check back soon.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const mine = !!user?.id && p.user_id === user.id;
            const editing = editingId === p.id;
            const initial = (p.full_name || '?').charAt(0).toUpperCase();
            return (
              <li key={p.id} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-start gap-3">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toAvatarThumb(p.avatar_url, 200) ?? p.avatar_url}
                      alt={p.full_name || ''}
                      referrerPolicy="no-referrer"
                      className="shrink-0 w-9 h-9 rounded-full object-cover ring-1 ring-primary/30"
                    />
                  ) : (
                    <span aria-hidden className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary text-[12px] font-bold ring-1 ring-primary/30 inline-flex items-center justify-center">
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {p.full_name || 'Alumni'}
                        {mine && <span className="ml-1.5 text-[10.5px] font-normal text-foreground/40">(you)</span>}
                      </p>
                      <span className="text-[11px] text-foreground/45">{timeAgo(p.created_at)}</span>
                      {p.edited_at && <span className="text-[10.5px] text-foreground/35 italic">· edited</span>}
                    </div>

                    {editing ? (
                      <div className="mt-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_LEN))}
                          rows={3}
                          className="w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2 text-[13.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEdit(p.id)}
                            disabled={savingId === p.id || editDraft.trim().length === 0}
                            className="px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
                          >
                            {savingId === p.id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setEditDraft(''); }}
                            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-[14px] text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">
                        {p.body}
                      </p>
                    )}

                    {mine && !editing && (
                      <div className="mt-2 flex items-center gap-3">
                        {confirmDeleteId === p.id ? (
                          <>
                            <span className="text-[11.5px] text-foreground/60">Delete this post?</span>
                            <button
                              type="button"
                              onClick={() => void deletePost(p.id)}
                              disabled={deletingId === p.id}
                              className="text-[11.5px] font-semibold text-red-700 hover:underline disabled:opacity-50"
                            >
                              {deletingId === p.id ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11.5px] font-semibold text-foreground/55 hover:underline"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => beginEdit(p)}
                              className="text-[11.5px] font-semibold text-foreground/55 hover:text-primary"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingId(null); setConfirmDeleteId(p.id); }}
                              className="text-[11.5px] font-semibold text-foreground/55 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
