'use client';

import { useState } from 'react';
import { LANDING_EDITABLE_FILES, landingFileLabel } from '@/lib/landing-files';

// Landing → Code tab. The admin describes a change to the public
// landing page in plain English; the server (/api/landing/code) has
// Claude propose surgical source edits, then commits them to a branch
// and opens a PR for review. Nothing ships until the admin merges that
// PR — this panel only ever produces a pull request.

interface CodeResult {
  ok: true;
  summary: string;
  prUrl: string;
  prNumber: number;
  branch: string;
  changedFiles: string[];
}

export default function LandingCodePanel({ token }: { token: string | null }) {
  const [instruction, setInstruction] = useState('');
  const [paths, setPaths] = useState<Set<string>>(new Set());
  const [showScope, setShowScope] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CodeResult | null>(null);

  function togglePath(p: string) {
    setPaths((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
  }

  async function submit() {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/landing/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ instruction: text, paths: paths.size > 0 ? [...paths] : undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
      setResult(json as CodeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Landing &middot; Code
        </h1>
        <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
          Describe a change to the public landing page in plain English. Claude edits the
          page&rsquo;s code and opens a <strong>pull request</strong> for you to review &mdash;
          nothing goes live until you approve and merge it.
        </p>
      </header>

      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <label htmlFor="landing-code-instruction" className="block text-[10px] uppercase tracking-[0.18em] text-foreground/45 font-bold mb-2">
          What should change?
        </label>
        <textarea
          id="landing-code-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={5}
          placeholder={'e.g. "Make the hero headline punchier and shorten the subhead." or "Add a short insurance-accepted line under the trust badges."'}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13.5px] leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />

        <button
          type="button"
          onClick={() => setShowScope((v) => !v)}
          className="mt-3 text-[11.5px] font-semibold text-foreground/55 hover:text-foreground"
        >
          {showScope ? '▾' : '▸'} Limit to specific sections (optional)
        </button>
        {showScope && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {LANDING_EDITABLE_FILES.map((p) => (
              <label key={p} className="flex items-center gap-2 text-[12px] text-foreground/70 rounded-md px-2 py-1 hover:bg-warm-bg/50 cursor-pointer">
                <input type="checkbox" checked={paths.has(p)} onChange={() => togglePath(p)} className="accent-primary" />
                <span className="truncate">{landingFileLabel(p)}</span>
              </label>
            ))}
            <p className="col-span-full text-[11px] text-foreground/40 mt-1">
              Leave all unchecked to let Claude find the right section.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !instruction.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy && <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />}
            {busy ? 'Drafting a pull request…' : 'Propose change'}
          </button>
          <span className="text-[11px] text-foreground/45">Opens a PR &mdash; review before it ships.</span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <p className="text-[13px] font-semibold text-emerald-900">Pull request #{result.prNumber} opened</p>
            <p className="text-[12.5px] text-foreground/70 mt-0.5">{result.summary}</p>
            {result.changedFiles.length > 0 && (
              <p className="text-[11.5px] text-foreground/50 mt-1">
                Changed: {result.changedFiles.map((f) => landingFileLabel(f)).join(', ')}
              </p>
            )}
            <a
              href={result.prUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold hover:bg-foreground/90"
            >
              Review &amp; merge on GitHub →
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
