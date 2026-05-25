'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

type Kind = 'book' | 'webinar' | 'therapy_group' | 'hobby' | 'outlet';

interface Resource {
  id: string;
  kind: Kind;
  title: string;
  description: string | null;
  url: string | null;
  author_or_host: string | null;
  tags: string[];
  status: 'pending' | 'published' | 'rejected';
  submitted_by: string | null;
}

const TABS: Array<{ key: Kind; label: string; emoji: string; placeholder: string }> = [
  { key: 'book',          label: 'Books',          emoji: '📚', placeholder: 'What did the book unlock for you?' },
  { key: 'webinar',       label: 'Webinars',       emoji: '🎥', placeholder: 'Free or low-cost talk worth two hours.' },
  { key: 'therapy_group', label: 'Therapy groups', emoji: '🪑', placeholder: 'Where it meets, who it serves.' },
  { key: 'hobby',         label: 'Hobbies',        emoji: '🎨', placeholder: 'A craft / sport / habit that fills the bored hours.' },
  { key: 'outlet',        label: 'Outlets',        emoji: '🌱', placeholder: 'Anything else that helped — a podcast, a routine, a place.' },
];

export default function ResourcesContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Kind>('book');
  const [rows, setRows] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('alumni_resources')
      .select('id, kind, title, description, url, author_or_host, tags, status, submitted_by')
      .eq('status', 'published')
      .eq('kind', tab)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as Resource[]);
    setLoading(false);
  }, [tab]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Recovery resources</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            What helped, from people who lived it.
          </h1>
          <p className="mt-1 text-sm text-foreground/65 max-w-xl">
            Submitted by alumni, lightly moderated before publishing. Every entry below has a story behind it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSubmitOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 shrink-0"
        >
          ➕ Submit a resource
        </button>
      </header>

      <div className="flex flex-wrap gap-1 mb-5 border-b border-black/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'text-foreground/65 hover:bg-warm-bg/60'
            }`}
          >
            <span className="mr-1" aria-hidden="true">{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/40 px-6 py-10 text-center">
          <p className="text-3xl mb-2" aria-hidden="true">{TABS.find((t) => t.key === tab)?.emoji}</p>
          <p className="text-[13px] text-foreground/60">Nothing here yet. Be the first to share something that helped you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((r) => <ResourceCard key={r.id} r={r} />)}
        </div>
      )}

      {submitOpen && user?.id && (
        <SubmitResourceModal
          userId={user.id}
          initialKind={tab}
          onClose={() => setSubmitOpen(false)}
          onSubmitted={() => { setSubmitOpen(false); void load(); }}
        />
      )}
    </div>
  );
}

function ResourceCard({ r }: { r: Resource }) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5">
      <h3 className="text-[15px] font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{r.title}</h3>
      {r.author_or_host && <p className="text-[11.5px] text-foreground/55 mt-0.5">{r.author_or_host}</p>}
      {r.description && <p className="mt-2 text-[13px] text-foreground/70 leading-relaxed">{r.description}</p>}
      {r.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {r.tags.map((t) => (
            <span key={t} className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}
      {r.url && (
        <a href={r.url} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline">
          Open ↗
        </a>
      )}
    </article>
  );
}

function SubmitResourceModal({
  userId, initialKind, onClose, onSubmitted,
}: {
  userId: string;
  initialKind: Kind;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true); setError(null);
    try {
      const { error } = await supabase.from('alumni_resources').insert({
        kind,
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim() || null,
        author_or_host: author.trim() || null,
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
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1">Submit a resource</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            What helped you?
          </h2>
          <p className="text-[12px] text-foreground/55 mt-1">Goes to a quick staff review before publishing.</p>
        </header>
        <div className="px-5 py-4 space-y-3">
          {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]">
              {TABS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">Author / host (optional)</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">URL (optional)</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">Why it helped</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={TABS.find((t) => t.key === kind)?.placeholder ?? ''}
              className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] resize-y"
            />
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
