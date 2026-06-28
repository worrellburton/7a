'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fileLabel } from '@/lib/editable-pages';
import SpaceBackground from './SpaceBackground';

// Landing → Code tab. A Claude-Code-style chat for the public website:
// describe a change (optionally with screenshots), and the agent finds
// the right file across the whole site and edits it. Nothing goes live
// until you press "Push live", which merges + deploys the change.
// Iterate with follow-ups; every change is logged and one-click revertable.
// Themed as a "space console" — deliberately unlike the rest of Feather.

interface ChangeResult {
  summary: string;
  prUrl: string;
  prNumber: number;
  changedFiles: string[];
  deployed?: boolean;
}
interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  images?: string[];        // preview data URLs (user turns)
  change?: ChangeResult;    // a deployed change (assistant turns)
  error?: boolean;
}
interface HistoryItem {
  id: string;
  pr_number: number;
  pr_url: string;
  title: string;
  summary: string | null;
  changed_files: string[];
  requested_by_name: string | null;
  requested_by_email: string | null;
  reverts_pr_number: number | null;
  created_at: string;
  status: 'open' | 'closed' | 'merged' | null;
}
interface PastedImage { id: string; media_type: string; data: string; preview: string }

const COOKING_LINES = [
  'Finding the right file…',
  'Reading the source…',
  'Stirring the components…',
  'Whisking up some JSX…',
  'Plating the change…',
  'Writing it up…',
];

let msgSeq = 0;
function newId() { msgSeq += 1; return `m${Date.now()}-${msgSeq}`; }

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Downscale a pasted/dropped image to keep the request small (and under
// Vercel's body limit) — max 1600px on the long edge, re-encoded JPEG.
function fileToImage(file: File): Promise<PastedImage | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const cw = Math.round(img.width * scale);
        const ch = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        const cx = c.getContext('2d');
        if (!cx) return resolve(null);
        cx.drawImage(img, 0, 0, cw, ch);
        const url = c.toDataURL('image/jpeg', 0.85);
        resolve({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, media_type: 'image/jpeg', data: url.split(',')[1], preview: url });
      };
      img.onerror = () => resolve(null);
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function LandingCodePanel({ token }: { token: string | null }) {
  const [instruction, setInstruction] = useState('');
  const [images, setImages] = useState<PastedImage[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [cookIdx, setCookIdx] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [pushingPr, setPushingPr] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const authHeaders = useCallback(
    (): HeadersInit => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
    [token],
  );

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/landing/code', { headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(json.items)) setHistory(json.items as HistoryItem[]);
    } catch { /* history is non-critical */ }
  }, [authHeaders]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  // Universe mode: theme the whole Feather shell dark while open.
  useEffect(() => {
    document.body.classList.add('universe-mode');
    return () => document.body.classList.remove('universe-mode');
  }, []);

  // Autoscroll the thread to the newest message.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) return;
    setCookIdx(0);
    const t = setInterval(() => setCookIdx((i) => (i + 1) % COOKING_LINES.length), 1700);
    return () => clearInterval(t);
  }, [busy]);

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const processed = (await Promise.all(incoming.map(fileToImage))).filter((x): x is PastedImage => !!x);
    if (processed.length) setImages((prev) => [...prev, ...processed].slice(0, 6));
  }

  // Conversation context sent to the agent (text only; errors excluded).
  function buildContextHistory(msgs: ChatMsg[]): Array<{ role: 'user' | 'assistant'; text: string }> {
    return msgs
      .filter((m) => !m.error)
      .map((m) => {
        if (m.role === 'user') return { role: 'user' as const, text: m.text ?? '' };
        if (m.change) return { role: 'assistant' as const, text: `Made a change: ${m.change.summary} (changed ${m.change.changedFiles.map(fileLabel).join(', ') || 'files'}).` };
        return { role: 'assistant' as const, text: m.text ?? '' };
      })
      .filter((m) => m.text.trim());
  }

  async function submit() {
    const text = instruction.trim();
    if (!text || busy) return;
    const priorHistory = buildContextHistory(messages);
    const sentImages = images;
    setMessages((prev) => [...prev, { id: newId(), role: 'user', text, images: sentImages.map((im) => im.preview) }]);
    setInstruction(''); setImages([]); setBusy(true);
    try {
      const res = await fetch('/api/landing/code', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          instruction: text,
          images: sentImages.map((im) => ({ media_type: im.media_type, data: im.data })),
          history: priorHistory,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', error: true, text: (json as { error?: string }).error ?? `Request failed (${res.status})` }]);
      } else if (json.kind === 'change') {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', change: json as ChangeResult }]);
        void loadHistory();
      } else {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', text: (json as { text?: string }).text ?? 'Done.' }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', error: true, text: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setBusy(false);
    }
  }

  async function revert(item: HistoryItem) {
    if (revertingId) return;
    if (!window.confirm(`Revert "${item.title}"? This stages an undo you can then push live.`)) return;
    setRevertingId(item.id);
    try {
      const res = await fetch('/api/landing/code/revert', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ id: item.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', error: true, text: (json as { error?: string }).error ?? `Revert failed (${res.status})` }]);
      } else {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', change: { summary: `Revert staged for "${item.title}". Push it live to ship the undo.`, prUrl: json.prUrl, prNumber: json.prNumber, changedFiles: [], deployed: false } }]);
        void loadHistory();
      }
    } catch (e) {
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', error: true, text: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setRevertingId(null);
    }
  }

  // Push a staged change live: squash-merge its PR into main, then sync
  // main → master to trigger the production deploy. Marks the matching
  // chat card deployed and refreshes the flight log.
  async function pushLive(prNumber: number, msgId?: string) {
    if (pushingPr) return;
    setPushingPr(prNumber);
    try {
      const res = await fetch('/api/landing/code/push', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ prNumber }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', error: true, text: (json as { error?: string }).error ?? `Push live failed (${res.status})` }]);
      } else {
        if (msgId) {
          setMessages((prev) => prev.map((m) => (m.id === msgId && m.change ? { ...m, change: { ...m.change, deployed: true } } : m)));
        } else {
          setMessages((prev) => [...prev, { id: newId(), role: 'assistant', change: { summary: `Pushed PR #${prNumber} live.`, prUrl: `https://github.com/${'worrellburton/7a'}/pull/${prNumber}`, prNumber, changedFiles: [], deployed: true } }]);
        }
        void loadHistory();
      }
    } catch (e) {
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', error: true, text: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setPushingPr(null);
    }
  }

  function ChangeCard({ c, msgId }: { c: ChangeResult; msgId: string }) {
    const pushing = pushingPr === c.prNumber;
    return (
      <div className={`rounded-xl border px-4 py-3 ${c.deployed ? 'border-emerald-400/40 bg-emerald-500/15' : 'border-sky-400/40 bg-sky-500/12'}`}>
        <p className={`text-[13px] font-semibold inline-flex items-center gap-1.5 ${c.deployed ? 'text-emerald-100' : 'text-sky-100'}`}>
          <span className="lc-pop">{c.deployed ? '🚀' : '✨'}</span>
          {c.deployed ? `Pushed live! PR #${c.prNumber} deployed` : `Change ready — PR #${c.prNumber}`}
        </p>
        <p className="text-[12.5px] text-white/80 mt-0.5">{c.summary}</p>
        {c.deployed
          ? <p className="text-[11.5px] text-emerald-200/80 mt-0.5">Live on the site in ~1–2 minutes.</p>
          : <p className="text-[11.5px] text-sky-200/80 mt-0.5">Staged but not live yet. Review it, then push it live.</p>}
        {c.changedFiles.length > 0 && (
          <p className="text-[11.5px] text-white/50 mt-1">Changed: {c.changedFiles.map((f) => fileLabel(f)).join(', ')}</p>
        )}
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {!c.deployed && (
            <button
              type="button"
              onClick={() => pushLive(c.prNumber, msgId)}
              disabled={pushing}
              className="lc-launch inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11.5px] font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pushing ? <><span className="lc-cook">🍳</span> Pushing…</> : <><span>🚀</span> Push live</>}
            </button>
          )}
          <a href={c.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 text-[#0b1020] text-[11.5px] font-bold hover:bg-white transition-colors">View on GitHub →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="lc-root relative -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 lg:-mx-10 lg:-mb-10 mt-2 min-h-[calc(100vh-150px)] overflow-hidden bg-[#070815]">
      <SpaceBackground className="absolute inset-0 z-0" />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-[#070815]" />

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 py-8">
        <header className="lc-in mb-6 flex items-start justify-between gap-4 flex-wrap" style={{ animationDelay: '40ms' }}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300/70 mb-1">Marketing &amp; Admissions · Mission Control</p>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Website &middot; Code
            </h1>
            <p className="mt-1.5 text-sm text-white/65 max-w-2xl">
              Chat with Claude to change any public page. It finds the right file and edits the code &mdash; then
              you press <strong className="text-white/90">Push live</strong> to merge &amp; deploy it.
              Keep replying to refine. Every change is logged and one&#8209;click revertable.
            </p>
          </div>
          {messages.length > 0 && (
            <button type="button" onClick={() => setMessages([])} className="shrink-0 text-[11.5px] font-semibold text-white/55 hover:text-white/90 border border-white/15 rounded-lg px-3 py-1.5 hover:bg-white/5 transition-colors">
              + New chat
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ── Chat ─────────────────────────────────────────── */}
          <section className="lc-in lc-glass lg:col-span-3 rounded-2xl p-4 sm:p-5 flex flex-col" style={{ animationDelay: '120ms' }}>
            {/* Thread */}
            <div ref={threadRef} className="flex-1 overflow-y-auto max-h-[48vh] min-h-[120px] pr-1 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center px-4">
                  <p className="text-[28px] mb-1">🛰️</p>
                  <p className="text-[13px] text-white/65 font-semibold">Tell me what to change on the site.</p>
                  <p className="text-[12px] text-white/40 mt-1 max-w-sm">e.g. &ldquo;On the residential page, make the &lsquo;160 acres&rsquo; stat say 161&rdquo; — paste a screenshot if it helps.</p>
                </div>
              ) : messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`lc-card max-w-[88%] rounded-2xl px-3.5 py-2.5 ${
                    m.role === 'user'
                      ? 'bg-sky-500/18 border border-sky-300/25 text-white'
                      : m.error
                        ? 'bg-rose-500/15 border border-rose-400/40 text-rose-100'
                        : 'bg-white/[0.06] border border-white/12 text-white/90'
                  }`}>
                    {m.images && m.images.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {m.images.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt="screenshot" className="h-14 w-14 object-cover rounded-md border border-white/25" />
                        ))}
                      </div>
                    )}
                    {m.change ? <ChangeCard c={m.change} msgId={m.id} /> : <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3.5 py-2.5 bg-white/[0.06] border border-white/12 inline-flex items-center gap-2">
                    <span className="lc-cook">🍳</span>
                    <span className="lc-fade text-[12.5px] text-sky-200/85">{COOKING_LINES[cookIdx]}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="mt-3 pt-3 border-t border-white/10">
              {images.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {images.map((im) => (
                    <div key={im.id} className="lc-thumb relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={im.preview} alt="screenshot" className="h-14 w-14 object-cover rounded-lg border border-white/25" />
                      <button type="button" onClick={() => setImages((prev) => prev.filter((x) => x.id !== im.id))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 text-white text-[11px] border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove screenshot">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files); }}
                className={`rounded-xl transition-shadow ${dragOver ? 'ring-2 ring-sky-400/70' : ''}`}
              >
                <textarea
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onPaste={(e) => {
                    const imgs = Array.from(e.clipboardData?.items ?? []).filter((it) => it.type.startsWith('image/'));
                    if (imgs.length) { e.preventDefault(); void addFiles(imgs.map((it) => it.getAsFile()).filter((f): f is File => !!f)); }
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); } }}
                  rows={3}
                  placeholder={messages.length ? 'Reply to refine, or describe another change…' : 'Describe a change — paste a screenshot if it helps. (⌘/Ctrl + Enter to send)'}
                  className={`lc-input w-full rounded-xl px-3.5 py-3 text-[14px] leading-relaxed resize-y focus:outline-none ${instruction.trim() ? 'has-text' : ''}`}
                />
              </div>

              <div className="mt-2.5 flex items-center gap-4 flex-wrap">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[11.5px] font-semibold text-sky-300/80 hover:text-sky-200 transition-colors inline-flex items-center gap-1.5">
                  <span>🖼️</span> Add / paste screenshot
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }} />
                <span className="text-[11.5px] text-white/40">Searches the whole public site — no need to pick a page.</span>
              </div>

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button type="button" onClick={submit} disabled={busy || !instruction.trim()} className="lc-launch relative px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
                  {busy ? <><span className="lc-cook">🍳</span> Cooking…</> : <><span>✨</span> Send</>}
                </button>
                <span className="text-[11px] text-white/45">Finds the file &amp; edits it &mdash; push live when you&rsquo;re ready.</span>
              </div>
            </div>
          </section>

          {/* ── Flight log ───────────────────────────────────── */}
          <aside className="lc-in lg:col-span-2" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/55 font-bold">Flight log</h2>
              {history.length > 0 && <span className="text-[11px] text-white/35">{history.length} change{history.length === 1 ? '' : 's'}</span>}
            </div>
            <div className="space-y-2.5">
              {history.length === 0 ? (
                <div className="lc-glass rounded-2xl px-4 py-6 text-center text-[12.5px] text-white/45">
                  No changes yet. Your shipped changes will log here 🛰️
                </div>
              ) : history.map((item, i) => {
                const isRevert = item.reverts_pr_number != null;
                const badge = item.status === 'merged'
                  ? 'bg-violet-500/25 text-violet-100 border-violet-400/40'
                  : item.status === 'closed'
                    ? 'bg-white/10 text-white/55 border-white/20'
                    : 'bg-amber-400/20 text-amber-100 border-amber-300/40';
                return (
                  <div key={item.id} className="lc-card lc-glass rounded-2xl px-4 py-3" style={{ animationDelay: `${260 + i * 55}ms` }}>
                    <div className="flex items-start justify-between gap-2">
                      <a href={item.pr_url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-white hover:text-sky-200 transition-colors leading-snug">
                        {isRevert && <span className="mr-1">↩️</span>}{item.title}
                      </a>
                      <span className={`shrink-0 text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge}`}>
                        {item.status ?? 'open'}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/50">
                      #{item.pr_number} · {item.requested_by_name || item.requested_by_email || 'someone'} · {relTime(item.created_at)}
                    </p>
                    {item.changed_files.length > 0 && (
                      <p className="mt-1 text-[10.5px] text-white/40 truncate">{item.changed_files.map((f) => fileLabel(f)).join(', ')}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <a href={item.pr_url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-sky-300/80 hover:text-sky-200">Open PR →</a>
                      {item.status === 'open' && (
                        <button type="button" onClick={() => pushLive(item.pr_number)} disabled={pushingPr === item.pr_number} className="text-[11px] font-semibold text-emerald-300/90 hover:text-emerald-200 disabled:opacity-50 inline-flex items-center gap-1">
                          {pushingPr === item.pr_number ? <span className="lc-cook">🍳</span> : '🚀'} Push live
                        </button>
                      )}
                      {item.status === 'merged' && !isRevert && (
                        <button type="button" onClick={() => revert(item)} disabled={revertingId === item.id} className="text-[11px] font-semibold text-rose-300/80 hover:text-rose-200 disabled:opacity-50 inline-flex items-center gap-1">
                          {revertingId === item.id ? <span className="lc-cook">🍳</span> : '↩️'} Revert
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .lc-glass {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 18px 50px -24px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .lc-input {
          background: rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.28);
          color: #eef5ff;
          caret-color: #7dd3fc;
          transition: border-color 0.3s, box-shadow 0.3s, text-shadow 0.3s;
        }
        .lc-input::placeholder { color: rgba(255, 255, 255, 0.42); text-shadow: none; }
        .lc-input:focus { border-color: rgba(125, 211, 252, 0.6); box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18); }
        .lc-input.has-text {
          text-shadow: 0 0 8px rgba(125, 211, 252, 0.55), 0 0 18px rgba(99, 102, 241, 0.35);
          animation: lc-glow 2.6s ease-in-out infinite;
        }
        @keyframes lc-glow {
          0%, 100% { text-shadow: 0 0 8px rgba(125, 211, 252, 0.5), 0 0 16px rgba(99, 102, 241, 0.3); }
          50% { text-shadow: 0 0 15px rgba(125, 211, 252, 0.85), 0 0 28px rgba(99, 102, 241, 0.5); }
        }
        .lc-launch {
          background: linear-gradient(135deg, #6d28d9 0%, #2563eb 50%, #0ea5e9 100%);
          background-size: 200% 200%;
          box-shadow: 0 10px 30px -10px rgba(37, 99, 235, 0.7);
          animation: lc-shift 6s ease infinite;
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .lc-launch:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 14px 36px -10px rgba(56, 189, 248, 0.8); }
        .lc-launch:not(:disabled):active { transform: translateY(0); }
        @keyframes lc-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .lc-in { animation: lc-floatin 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lc-card { animation: lc-floatin 0.45s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        @keyframes lc-floatin { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
        .lc-thumb { animation: lc-pop 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards; }
        .lc-rocket { display: inline-block; animation: lc-bob 3s ease-in-out infinite; }
        .lc-cook { display: inline-block; animation: lc-bob 0.9s ease-in-out infinite; }
        @keyframes lc-bob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-3px) rotate(3deg); } }
        .lc-pop { display: inline-block; animation: lc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes lc-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        .lc-fade { animation: lc-fadein 0.5s ease; }
        @keyframes lc-fadein { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .lc-in, .lc-card, .lc-thumb, .lc-rocket, .lc-cook, .lc-pop, .lc-launch, .lc-input.has-text { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
