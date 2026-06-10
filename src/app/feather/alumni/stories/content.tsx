'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

type StoryKind = 'voice' | 'staff_talk';

interface Story {
  id: string;
  kind: StoryKind;
  title: string;
  body: string | null;
  media_url: string | null;
  status: 'pending' | 'published' | 'rejected';
  published_at: string | null;
}

export default function StoriesContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState<StoryKind>('voice');
  const [rows, setRows] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('alumni_stories')
      .select('id, kind, title, body, media_url, status, published_at')
      .eq('status', 'published')
      .eq('kind', tab)
      .order('published_at', { ascending: false, nullsFirst: false });
    setRows((data ?? []) as Story[]);
    setLoading(false);
  }, [tab]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Voices & talks</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {tab === 'voice' ? 'What you’re living, in your own words.' : 'Continuing-ed from the clinical team.'}
          </h1>
          <p className="mt-1 text-sm text-foreground/65 max-w-xl">
            {tab === 'voice'
              ? 'Milestones, anniversaries, and overcoming-challenge stories submitted by alumni. Lightly edited before publishing.'
              : 'Articles + recorded talks from the Seven Arrows clinical team — trauma, neuroscience, family systems, and more.'}
          </p>
        </div>
        {tab === 'voice' && (
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 shrink-0"
          >
            ✍️ Submit a story
          </button>
        )}
      </header>

      <div className="flex gap-1 mb-5 border-b border-black/10 pb-2">
        <button
          type="button"
          onClick={() => setTab('voice')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${tab === 'voice' ? 'bg-primary text-white' : 'text-foreground/65 hover:bg-warm-bg/60'}`}
        >
          Alumni voices
        </button>
        <button
          type="button"
          onClick={() => setTab('staff_talk')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${tab === 'staff_talk' ? 'bg-primary text-white' : 'text-foreground/65 hover:bg-warm-bg/60'}`}
        >
          Staff talks
        </button>
      </div>

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/40 px-6 py-10 text-center">
          <p className="text-3xl mb-2" aria-hidden="true">{tab === 'voice' ? '✍️' : '🎓'}</p>
          <p className="text-[13px] text-foreground/60">
            {tab === 'voice'
              ? 'Be the first to share. Your story might be exactly what someone else needs to read this week.'
              : 'Staff posts will publish here as they go through review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((s) => (
            <article key={s.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-[18px] font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{s.title}</h2>
              {s.published_at && (
                <p className="text-[11px] text-foreground/45 mt-0.5">
                  {new Date(s.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {s.body && <p className="mt-2 text-[14px] text-foreground/75 leading-relaxed whitespace-pre-line">{s.body}</p>}
              {s.media_url && (
                <a href={s.media_url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline">
                  Open media ↗
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      {submitOpen && user?.id && (
        <SubmitStoryModal userId={user.id} onClose={() => setSubmitOpen(false)} onSubmitted={() => { setSubmitOpen(false); void load(); }} />
      )}
    </div>
  );
}

function SubmitStoryModal({ userId, onClose, onSubmitted }: {
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true); setError(null);
    try {
      const { error } = await supabase.from('alumni_stories').insert({
        kind: 'voice',
        title: title.trim(),
        body: body.trim() || null,
        submitted_by: userId,
        status: 'pending',
      });
      if (error) throw error;
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()} style={{ fontFamily: 'var(--font-body)' }}>
        <header className="px-5 pt-5 pb-3 border-b border-black/5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1">Share your story</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>What do you want to put on the record?</h2>
          <p className="text-[12px] text-foreground/55 mt-1">Reviewed by staff before it publishes. You&rsquo;ll get a note when it&rsquo;s up.</p>
        </header>
        <div className="px-5 py-4 space-y-3">
          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="3 years sober. Here&rsquo;s what changed."
              className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">Story</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] resize-y" />
          </div>
        </div>
        <footer className="px-5 py-3 border-t border-black/5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-black/10 text-foreground/65 text-[12.5px] font-semibold hover:bg-warm-bg/60">Cancel</button>
          <button onClick={() => void submit()} disabled={saving || !title.trim()}
            className="px-4 py-1.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50">
            {saving ? 'Submitting…' : 'Submit for review'}
          </button>
        </footer>
      </div>
    </div>
  );
}
