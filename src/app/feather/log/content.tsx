'use client';

// New-log flow — a full page (not a popup) that rebuilds the quick-log
// as a minimal, animated, mobile-first sequence:
//   who  → search a name (autocomplete), tag as many people as you want
//   how  → pick the method
//   note → optional duration + notes, then save
//   done → success, log another / back
//
// Saving records the SAME touch against every tagged contact (a joint
// touchpoint), find-or-creating each one, reusing the same
// /api/contacts + /api/contacts/:id/log-contact endpoints the old
// sheet used. The name search shares the glass/glow styling with the
// Contacts list search (see ../glassSearch).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { CONTACT_METHODS, type ContactMethod } from '@/lib/contact-methods';
import { fmtAgo, type QuickLogPerson } from '../QuickLog';
import { GLASS_SEARCH_INPUT, GLASS_SEARCH_WRAP } from '../glassSearch';

type Step = 'who' | 'how' | 'note' | 'done';

interface Picked {
  id: string | null; // null → will be created on save
  name: string;
  company: string | null;
}

// Methods offered in the flow (Data Entry is system-only). Duration is
// hidden for methods where it's meaningless.
const FLOW_METHODS = CONTACT_METHODS.filter((m) => m.value !== 'Data Entry');
const NO_DURATION = new Set<ContactMethod>(['Left Message', 'Text Message', 'Email']);
const DURATION_PRESETS = [5, 10, 15, 30];

function initials(name: string): string {
  return name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

export default function LogFlowContent() {
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.access_token ?? null;

  const [roster, setRoster] = useState<QuickLogPerson[]>([]);
  const [recents, setRecents] = useState<QuickLogPerson[]>([]);

  const [step, setStep] = useState<Step>('who');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState<ContactMethod | null>(null);
  const [durationMin, setDurationMin] = useState('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Pull the roster + this rep's recents once. The sheet works without
  // it (free-typed names still create), it just can't suggest.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/contacts/quick-log-context', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const j = (await r.json()) as { roster?: QuickLogPerson[]; recents?: QuickLogPerson[] };
        if (!cancelled) {
          setRoster(j.roster ?? []);
          setRecents(j.recents ?? []);
        }
      } catch {
        /* suggestions optional */
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Focus the name field whenever we land on the 'who' step.
  useEffect(() => {
    if (step === 'who') {
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [step]);

  const chosenKeys = useMemo(
    () => new Set(picked.map((p) => (p.id ? `id:${p.id}` : `name:${p.name.toLowerCase()}`))),
    [picked],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = roster.filter((p) => !chosenKeys.has(`id:${p.id}`) && !chosenKeys.has(`name:${p.name.toLowerCase()}`));
    if (!q) return recents.filter((p) => !chosenKeys.has(`id:${p.id}`)).slice(0, 6);
    const hits = pool.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.company ?? '').toLowerCase().includes(q),
    );
    hits.sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs || a.name.localeCompare(b.name);
    });
    return hits.slice(0, 8);
  }, [query, roster, recents, chosenKeys]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return roster.find((p) => p.name.toLowerCase() === q) ?? null;
  }, [query, roster]);

  const addPerson = useCallback((p: Picked) => {
    setPicked((prev) => {
      const key = p.id ? `id:${p.id}` : `name:${p.name.toLowerCase()}`;
      const has = prev.some((s) => (s.id ? `id:${s.id}` : `name:${s.name.toLowerCase()}`) === key);
      return has ? prev : [...prev, p];
    });
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const removePerson = useCallback((i: number) => {
    setPicked((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const canSave = picked.length > 0 && method != null && !saving;

  const save = useCallback(async () => {
    if (!token || picked.length === 0 || method == null) return;
    setSaving(true);
    setError(null);
    const durationSeconds = NO_DURATION.has(method) ? 0 : (parseInt(durationMin || '0', 10) || 0) * 60;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    let ok = 0;
    let firstError: string | null = null;
    const failedNames: string[] = [];
    for (const p of picked) {
      try {
        let contactId = p.id;
        if (!contactId) {
          const res = await fetch('/api/contacts', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: p.name }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            firstError = firstError ?? ((j as { error?: string }).error ?? `Couldn't create ${p.name}`);
            failedNames.push(p.name);
            continue;
          }
          const row = (await res.json()) as { id: string };
          contactId = row.id;
          // Remember the created id on the picked entry — if the log
          // call below fails and the user hits Save again, re-creating
          // the contact would duplicate the row (POST /api/contacts is
          // a blind insert, not find-or-create).
          p.id = contactId;
        }
        const res = await fetch(`/api/contacts/${contactId}/log-contact`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ method, comments, duration_seconds: durationSeconds }),
        });
        if (res.ok) ok += 1;
        else {
          const j = await res.json().catch(() => ({}));
          firstError = firstError ?? ((j as { error?: string }).error ?? `Couldn't log ${p.name}`);
          failedNames.push(p.name);
        }
      } catch (e) {
        firstError = firstError ?? (e instanceof Error ? e.message : String(e));
        failedNames.push(p.name);
      }
    }
    setSaving(false);
    setSavedCount(ok);
    if (ok === 0) {
      setError(firstError ?? 'Nothing was logged.');
      return;
    }
    if (failedNames.length > 0) {
      // Partial success: stay on the note step with the failures named
      // so the user can retry (successes won't double-log — only the
      // failed people are still un-logged, and created ids are kept).
      setPicked((prev) => prev.filter((p) => failedNames.includes(p.name)));
      setError(`Logged ${ok}, but failed for ${failedNames.join(', ')}${firstError ? ` — ${firstError}` : ''}. Tap save to retry them.`);
      return;
    }
    setStep('done');
  }, [token, picked, method, durationMin, comments]);

  const reset = useCallback(() => {
    setPicked([]);
    setQuery('');
    setMethod(null);
    setDurationMin('');
    setComments('');
    setSavedCount(0);
    setError(null);
    setStep('who');
  }, []);

  const stepIndex = step === 'who' ? 0 : step === 'how' ? 1 : step === 'note' ? 2 : 3;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full flex flex-col" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Header: back + title + progress dots */}
      <header className="flex items-center gap-3 px-4 pt-5 pb-2 max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={() => (step === 'who' || step === 'done' ? router.push('/feather/contacts') : setStep(step === 'note' ? 'how' : 'who'))}
          aria-label="Back"
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-foreground/60 hover:text-foreground hover:bg-black/5 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="flex-1 text-[15px] font-semibold text-foreground">New log</h1>
        {step !== 'done' && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`block h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-5 bg-primary' : i < stepIndex ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-foreground/15'}`}
              />
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 max-w-md w-full mx-auto px-4 pb-28">
        {/* Keyed wrapper so each step animates in. */}
        <div key={step} className="lf-step">
          {step === 'who' && (
            <section>
              <p className="mt-3 mb-3 text-[13px] text-foreground/55">Who did you reach out to?</p>

              {/* Selected people as animated chips */}
              {picked.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {picked.map((p, i) => (
                    <span key={`${p.id ?? p.name}-${i}`} className="lf-chip inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/70 supports-[backdrop-filter]:backdrop-blur-md border border-white/70 shadow-[0_2px_8px_-4px_rgba(160,82,45,0.35)]">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{initials(p.name)}</span>
                      <span className="text-[12.5px] font-semibold text-foreground max-w-[9rem] truncate">{p.name}</span>
                      {!p.id && <span className="text-[9px] uppercase tracking-wide text-primary/70 font-bold">new</span>}
                      <button type="button" onClick={() => removePerson(i)} aria-label={`Remove ${p.name}`} className="text-foreground/40 hover:text-foreground">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Glass + glow name search */}
              <div className={GLASS_SEARCH_WRAP}>
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (suggestions[0]) addPerson({ id: suggestions[0].id, name: suggestions[0].name, company: suggestions[0].company });
                      else if (query.trim() && !exactMatch) addPerson({ id: null, name: query.trim(), company: null });
                    }
                  }}
                  placeholder={picked.length ? 'Tag another name…' : 'Search a name…'}
                  className={`${GLASS_SEARCH_INPUT} pl-11 pr-4 py-3`}
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                />
              </div>

              {/* Autocomplete list */}
              {(suggestions.length > 0 || (query.trim() && !exactMatch)) && (
                <ul className="mt-2 rounded-2xl border border-white/70 bg-white/70 supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:backdrop-blur-xl shadow-[0_10px_30px_-14px_rgba(160,82,45,0.4)] overflow-hidden divide-y divide-black/5">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => addPerson({ id: p.id, name: p.name, company: p.company })} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0">{initials(p.name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-foreground truncate">{p.name}</span>
                          {(p.company || p.lastAt) && (
                            <span className="block text-[11px] text-foreground/45 truncate">
                              {[p.company, p.lastAt ? fmtAgo(p.lastAt) : null].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                  {query.trim() && !exactMatch && (
                    <li>
                      <button type="button" onClick={() => addPerson({ id: null, name: query.trim(), company: null })} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-[13px] font-bold shrink-0">+</span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-foreground truncate">Create “{query.trim()}”</span>
                          <span className="block text-[11px] text-foreground/45">New contact</span>
                        </span>
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </section>
          )}

          {step === 'how' && (
            <section>
              <p className="mt-3 mb-4 text-[13px] text-foreground/55">
                How did you reach {picked.length === 1 ? picked[0].name.split(' ')[0] : `these ${picked.length} people`}?
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {FLOW_METHODS.map(({ value, label, Icon, tone }, i) => {
                  const selected = method === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setMethod(value); setStep('note'); }}
                      className={`lf-pop flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-4 text-[11px] font-semibold transition-all ${selected ? `${tone} ring-2 ring-current/30` : 'bg-white/60 supports-[backdrop-filter]:backdrop-blur-md text-foreground/70 border-white/70 hover:border-primary/30 hover:shadow-[0_6px_18px_-8px_rgba(160,82,45,0.4)]'}`}
                      style={{ ['--d' as string]: `${i * 35}ms` }}
                    >
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-white/60' : 'bg-warm-bg/60 text-foreground/55'}`}><Icon /></span>
                      <span className="leading-tight text-center">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 'note' && method && (
            <section>
              <p className="mt-3 mb-3 text-[13px] text-foreground/55">Anything to note?</p>

              {!NO_DURATION.has(method) && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45 mb-1.5">Duration</p>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMin(String(m))}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${durationMin === String(m) ? 'bg-primary text-white border-primary shadow-[0_0_18px_-4px_rgba(160,82,45,0.6)]' : 'bg-white/60 text-foreground/65 border-white/70 hover:border-primary/30'}`}
                      >
                        {m}m
                      </button>
                    ))}
                    <input
                      value={durationMin}
                      onChange={(e) => setDurationMin(e.target.value.replace(/[^\d]/g, ''))}
                      inputMode="numeric"
                      placeholder="min"
                      className="w-16 px-3 py-1.5 rounded-full text-[12px] text-center bg-white/60 supports-[backdrop-filter]:backdrop-blur-md border border-white/70 text-foreground focus:outline-none focus:border-primary/50 focus:shadow-[0_0_18px_-4px_rgba(160,82,45,0.5)] transition-all"
                    />
                  </div>
                </div>
              )}

              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={5}
                placeholder="What did you talk about? Any next steps?"
                className="w-full rounded-2xl px-4 py-3 text-[14px] text-foreground/90 bg-white/55 supports-[backdrop-filter]:bg-white/45 supports-[backdrop-filter]:backdrop-blur-xl border border-white/70 shadow-[0_2px_10px_-2px_rgba(160,82,45,0.14)] resize-y focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_4px_rgba(160,82,45,0.10),0_0_24px_-4px_rgba(160,82,45,0.5)] transition-[box-shadow,border-color] duration-300"
              />

              {error && <p className="mt-3 text-[12.5px] text-rose-600">{error}</p>}
            </section>
          )}

          {step === 'done' && (
            <section className="pt-16 flex flex-col items-center text-center">
              <span className="lf-check inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500 text-white shadow-[0_0_40px_-6px_rgba(16,185,129,0.7)]">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <p className="mt-6 text-[17px] font-semibold text-foreground">
                Logged {savedCount} {savedCount === 1 ? 'touch' : 'touches'}
              </p>
              <p className="mt-1 text-[13px] text-foreground/50">
                {picked.map((p) => p.name.split(' ')[0]).join(', ')}
              </p>
              <div className="mt-8 flex flex-col gap-2.5 w-full">
                <button type="button" onClick={reset} className="w-full py-3 rounded-2xl bg-primary text-white text-[14px] font-semibold shadow-[0_0_28px_-4px_rgba(160,82,45,0.6)] active:scale-[0.99] transition-transform">
                  Log another
                </button>
                <button type="button" onClick={() => router.push('/feather/contacts')} className="w-full py-3 rounded-2xl bg-white/60 supports-[backdrop-filter]:backdrop-blur-md border border-white/70 text-foreground/70 text-[14px] font-semibold hover:text-foreground transition-colors">
                  Back to contacts
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Sticky action bar — Continue / Save, glowing, above the safe area. */}
      {step !== 'done' && (
        <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
          <div className="max-w-md mx-auto px-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {step === 'who' && (
              <button
                type="button"
                disabled={picked.length === 0}
                onClick={() => setStep('how')}
                className="pointer-events-auto w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-all disabled:opacity-40 disabled:shadow-none bg-primary shadow-[0_0_30px_-4px_rgba(160,82,45,0.65)] active:scale-[0.99]"
              >
                {picked.length > 1 ? `Continue with ${picked.length}` : 'Continue'}
              </button>
            )}
            {step === 'note' && (
              <button
                type="button"
                disabled={!canSave}
                onClick={save}
                className="pointer-events-auto w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-all disabled:opacity-40 disabled:shadow-none bg-primary shadow-[0_0_30px_-4px_rgba(160,82,45,0.65)] active:scale-[0.99]"
              >
                {saving ? 'Saving…' : `Save log${picked.length > 1 ? ` · ${picked.length}` : ''}`}
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes lf-step-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .lf-step { animation: lf-step-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes lf-chip-in { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        .lf-chip { animation: lf-chip-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes lf-pop-in { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .lf-pop { animation: lf-pop-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms) both; }
        @keyframes lf-check-in { 0% { opacity: 0; transform: scale(0.4); } 60% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
        .lf-check { animation: lf-check-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .lf-step, .lf-chip, .lf-pop, .lf-check { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
