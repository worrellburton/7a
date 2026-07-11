'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { CONTACT_METHODS, type ContactMethod } from '@/lib/contact-methods';

// Shared Quick Log — the "log a touchpoint in five seconds" sheet.
//
// Grew out of the contacts page's NewLogModal and now serves three
// surfaces: the Contacts mobile FAB / desktop Add-Log pill, the
// /feather/logs page header, and the home Create menu. The contacts
// page keeps its own optimistic submit path (QuickLogHost with
// custom onSubmit/onUndo); the other surfaces use StandaloneQuickLog,
// which fetches the roster from /api/contacts/quick-log-context and
// submits through the same find-or-create + log-contact endpoints.
//
// UX inventory (each earned its place from a real complaint):
// - Custom combobox, NOT <datalist> — iOS Safari never renders
//   datalist options as tappable suggestions.
// - Recents row when the field is empty — most logs repeat recent
//   people, so the common case is zero typing.
// - Fuzzy, typo-tolerant matching with company + last-touch context
//   on each suggestion so two Lindsays are tellable apart.
// - Live match line: existing contact (with last-touch context) vs
//   new-contact-will-be-created vs near-duplicate warning with a
//   one-tap "use existing" escape hatch.
// - Method memory (localStorage) — preselects your last-used method.
// - Duration hidden for methods where it's meaningless (text /
//   email / voicemail) and one-tap presets when it isn't.
// - Dictation button on notes where the Web Speech API exists.
// - Mobile: one fixed Save pill that rides ABOVE the iOS keyboard
//   (visualViewport), swipe-down-to-dismiss with a dirty-form
//   confirm, and a post-save toast with Undo + Log another.

// ─── Types ───────────────────────────────────────────────────────

export interface QuickLogPerson {
  id: string;
  name: string;
  company: string | null;
  lastAt: string | null;
  lastMethod: string | null;
}

export interface QuickLogResult {
  logId: string | null;
  contactId: string;
  contactName: string;
  createdContact: boolean;
  method: ContactMethod;
  durationSeconds: number;
}

export type QuickLogSubmit = (
  name: string,
  method: ContactMethod,
  comments: string,
  durationSeconds: number,
) => Promise<QuickLogResult | null>;

// ─── Constants ───────────────────────────────────────────────────

// 'Data Entry' is system-generated (field fills) and the log-contact
// route rejects it, so it never belongs in a hand-picked list.
const QUICK_METHODS = CONTACT_METHODS.filter((m) => m.value !== 'Data Entry');
const PRIMARY_METHOD_COUNT = 5; // Phone / In Person / Left Message / Text / Email

// Methods where a duration makes no sense — hide the field entirely
// and force 0 so the sheet stays short.
const NO_DURATION_METHODS = new Set<ContactMethod>(['Left Message', 'Text Message', 'Email']);

const METHOD_MEMORY_KEY = 'feather:quick-log:last-method';
const DURATION_PRESETS = [5, 10, 15, 30];

// ─── Small helpers ───────────────────────────────────────────────

export function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 61) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// Bounded Levenshtein — bails with cap+1 as soon as the distance
// can't come back under the cap, so ranking a ~1000-name roster per
// keystroke stays trivial.
function editDistance(a: string, b: string, cap: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

// Rank roster entries against the query: exact prefix beats
// word-prefix beats substring beats a typo-tolerant prefix match
// ("lindsy" still finds "Lindsay R").
function rankSuggestions(query: string, roster: QuickLogPerson[]): QuickLogPerson[] {
  const q = query.toLowerCase();
  if (!q) return [];
  const typoCap = q.length >= 6 ? 2 : 1;
  const scored: Array<[number, QuickLogPerson]> = [];
  for (const p of roster) {
    const n = p.name.toLowerCase();
    if (n === q) continue; // fully typed — nothing to suggest
    let s = 0;
    if (n.startsWith(q)) s = 100;
    else if (n.split(/\s+/).some((w) => w.startsWith(q))) s = 80;
    else if (n.includes(q)) s = 60;
    else if (q.length >= 3) {
      const words = n.split(/\s+/);
      const candidates = [n.slice(0, q.length), ...words.map((w) => w.slice(0, q.length))];
      const d = Math.min(...candidates.map((c) => editDistance(q, c, typoCap)));
      if (d <= typoCap) s = 40 - d;
    }
    if (s > 0) scored.push([s, p]);
  }
  scored.sort((x, y) => y[0] - x[0] || x[1].name.localeCompare(y[1].name));
  return scored.slice(0, 6).map((x) => x[1]);
}

// Near-duplicate detector for the "Did you mean…?" warning — only
// whole-name closeness counts (a shared first name is not a dup).
function findCloseMatch(query: string, roster: QuickLogPerson[]): QuickLogPerson | null {
  const q = query.toLowerCase();
  if (q.length < 3) return null;
  const cap = q.length >= 6 ? 2 : 1;
  let best: QuickLogPerson | null = null;
  let bestD = cap + 1;
  for (const p of roster) {
    const n = p.name.toLowerCase();
    if (n === q) return null; // exact match — different UI state handles it
    const d = editDistance(q, n, cap);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return bestD <= cap ? best : null;
}

// ─── Keyboard-aware bottom inset ─────────────────────────────────
// Distance in px from the layout viewport's bottom to the visual
// viewport's bottom — i.e. the on-screen keyboard's height on iOS.
// Fixed elements anchor to the layout viewport, so adding this to
// `bottom` keeps the Save pill riding above the keyboard.
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Ignore sub-40px wobble from iOS URL-bar collapse — only a
      // real keyboard should move the pill.
      setInset(bottom > 40 ? Math.round(bottom) : 0);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}

// ─── Speech dictation (Web Speech API, feature-detected) ─────────

type SpeechRecInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecCtor = new () => SpeechRecInstance;

function getSpeechCtor(): SpeechRecCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function useSpeechDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecInstance | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const [supported] = useState(() => getSpeechCtor() !== null);

  const toggle = useCallback(() => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) text += r[0].transcript;
      }
      const t = text.trim();
      if (t) onFinalRef.current(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // Mic permission denied or engine busy — stay quiet, the
      // keyboard's own dictation is always available as fallback.
    }
  }, [listening]);

  useEffect(() => () => recRef.current?.stop(), []);
  return { supported, listening, toggle };
}

// ─── Field wrapper ───────────────────────────────────────────────

function Field({
  label,
  required,
  trailing,
  children,
}: {
  label: string;
  required?: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="block text-[9px] font-bold tracking-[0.18em] uppercase text-foreground/55">
          {label} {required && <span className="text-primary">*</span>}
        </span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

// ─── Compact method picker ───────────────────────────────────────
// Three-across mini tiles. The five everyday methods show by
// default; the novelty trio collapses behind a "More" toggle.
function CompactMethodPicker({
  value,
  onChange,
}: {
  value: ContactMethod;
  onChange: (next: ContactMethod) => void;
}) {
  const novelty = QUICK_METHODS.slice(PRIMARY_METHOD_COUNT);
  const [showAll, setShowAll] = useState(() => novelty.some((m) => m.value === value));
  const visible = showAll ? QUICK_METHODS : QUICK_METHODS.slice(0, PRIMARY_METHOD_COUNT);
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {visible.map(({ value: v, label, tone, Icon, helpText }) => {
          const selected = v === value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              title={helpText}
              aria-pressed={selected}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-[10px] font-semibold leading-tight transition-all ${
                selected
                  ? `${tone} ring-2 ring-current/40 shadow-sm`
                  : 'bg-white text-foreground/70 border-black/10 hover:border-black/25 hover:bg-warm-bg/40'
              }`}
            >
              <span className={selected ? '' : 'text-foreground/50'}>
                <Icon />
              </span>
              <span className="text-center">{label}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setShowAll((s) => !s)}
        className="mt-1.5 text-[10px] font-semibold text-foreground/50 hover:text-foreground transition-colors"
      >
        {showAll ? '▴ Fewer methods' : `▾ More methods (${novelty.length})`}
      </button>
    </div>
  );
}

// ─── The sheet ───────────────────────────────────────────────────

export function QuickLogSheet({
  roster,
  recents,
  rosterLoading = false,
  onClose,
  onSubmit,
}: {
  roster: QuickLogPerson[];
  recents: QuickLogPerson[];
  rosterLoading?: boolean;
  onClose: () => void;
  // Return null to keep the sheet open (submit failed and was
  // already surfaced); any result closes it.
  onSubmit: QuickLogSubmit;
}) {
  const [name, setName] = useState('');
  // Method memory — preselect whatever this rep logged last time.
  const [method, setMethod] = useState<ContactMethod>(() => {
    try {
      const saved = window.localStorage.getItem(METHOD_MEMORY_KEY);
      if (saved && QUICK_METHODS.some((m) => m.value === saved)) return saved as ContactMethod;
    } catch { /* private mode */ }
    return 'Phone';
  });
  const [comments, setComments] = useState('');
  const [durationMin, setDurationMin] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = name.trim();
  const submittable = trimmed.length > 0;
  const durationApplies = !NO_DURATION_METHODS.has(method);
  const totalSeconds = (() => {
    if (!durationApplies) return 0;
    const m = parseInt(durationMin, 10);
    return Number.isFinite(m) && m > 0 ? m * 60 : 0;
  })();

  // ── Combobox ───────────────────────────────────────────────────
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const byLowerName = useMemo(() => {
    const m = new Map<string, QuickLogPerson>();
    for (const p of roster) m.set(p.name.toLowerCase(), p);
    return m;
  }, [roster]);
  const matched = trimmed ? byLowerName.get(trimmed.toLowerCase()) ?? null : null;
  const suggestions = useMemo(() => rankSuggestions(trimmed, roster), [trimmed, roster]);
  const closeMatch = useMemo(
    () => (matched ? null : findCloseMatch(trimmed, roster)),
    [matched, trimmed, roster],
  );
  const comboboxOpen = nameFocused && suggestions.length > 0;
  useEffect(() => { setHighlightIdx(-1); }, [trimmed]);

  const pickPerson = useCallback((personName: string) => {
    setName(personName);
    setHighlightIdx(-1);
    // Drop the keyboard — the remaining steps are taps, and
    // dismissing it reveals the whole form again on a phone.
    inputRef.current?.blur();
  }, []);

  // ── Dictation ──────────────────────────────────────────────────
  const speech = useSpeechDictation((text) => {
    setComments((prev) => (prev.trim() ? `${prev.replace(/\s+$/, '')} ${text}` : text));
  });

  // ── Dismissal (X / backdrop / swipe) with dirty guard ──────────
  const dirty = trimmed.length > 0 || comments.trim().length > 0 || durationMin !== '';
  const attemptClose = useCallback(() => {
    if (submitting) return;
    if (dirty && !window.confirm('Discard this log?')) return;
    onClose();
  }, [submitting, dirty, onClose]);

  // Swipe-down-to-dismiss on the handle + header zone.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const onDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onDragMove = (e: React.TouchEvent) => {
    if (dragStartY.current == null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStartY.current));
  };
  const onDragEnd = () => {
    const shouldClose = dragY > 110;
    dragStartY.current = null;
    setDragging(false);
    setDragY(0);
    if (shouldClose) attemptClose();
  };

  // ── Keyboard-aware Save pill ───────────────────────────────────
  const kbInset = useKeyboardInset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittable || submitting) return;
    setSubmitting(true);
    try {
      const result = await onSubmit(trimmed, method, comments.trim(), totalSeconds);
      if (result) {
        try { window.localStorage.setItem(METHOD_MEMORY_KEY, method); } catch { /* private mode */ }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      onClick={attemptClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 pb-[env(safe-area-inset-bottom)]"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 200ms ease',
        }}
      >
        {/* Drag handle + header — the swipe-to-dismiss zone.
            touch-action: none stops the browser from scrolling the
            sheet body while a dismiss-drag is in flight. */}
        <div
          className="touch-none"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
          onTouchCancel={onDragEnd}
        >
          <div className="sm:hidden pt-2 pb-1 flex justify-center">
            <span className="block w-10 h-1 rounded-full bg-foreground/15" />
          </div>
          <header className="px-5 sm:px-6 py-3 sm:py-4 border-b border-black/5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold tracking-[0.22em] uppercase text-foreground/45">Quick log</p>
              <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                New log
              </h2>
            </div>
            <button
              type="button"
              onClick={attemptClose}
              className="text-foreground/50 hover:text-foreground p-2 -mr-2"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Extra bottom padding on mobile clears the fixed Save pill. */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-24 sm:pb-5 space-y-3.5 sm:space-y-4">
            <Field
              label="Log for"
              required
              trailing={rosterLoading ? (
                <span className="text-[9px] text-foreground/40">Loading contacts…</span>
              ) : undefined}
            >
              <div className="relative">
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && comboboxOpen) {
                      e.preventDefault();
                      setHighlightIdx((i) => Math.min(i + 1, suggestions.length - 1));
                    } else if (e.key === 'ArrowUp' && comboboxOpen) {
                      e.preventDefault();
                      setHighlightIdx((i) => Math.max(i - 1, -1));
                    } else if (e.key === 'Enter') {
                      // Enter never submits from this field — it takes
                      // the arrow-keyed suggestion or drops the keyboard.
                      e.preventDefault();
                      if (comboboxOpen && highlightIdx >= 0) pickPerson(suggestions[highlightIdx].name);
                      else inputRef.current?.blur();
                    } else if (e.key === 'Escape' && comboboxOpen) {
                      e.stopPropagation();
                      inputRef.current?.blur();
                    }
                  }}
                  required
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  enterKeyHint="done"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  aria-controls="quick-log-suggestions"
                  aria-autocomplete="list"
                  name="ql-lookup"
                  className="ql-input"
                  placeholder="Start typing to search…"
                />
                {comboboxOpen && (
                  <ul
                    id="quick-log-suggestions"
                    className="absolute left-0 right-0 top-full mt-1 z-20 max-h-52 overflow-y-auto rounded-xl border border-black/10 bg-white shadow-[0_16px_36px_-16px_rgba(40,30,25,0.35)] py-1"
                  >
                    {suggestions.map((p, i) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          // pointerdown beats the input's blur, so the
                          // tap lands before the dropdown unmounts.
                          onPointerDown={(e) => {
                            e.preventDefault();
                            pickPerson(p.name);
                          }}
                          className={`w-full text-left px-3 py-2 transition-colors ${
                            i === highlightIdx ? 'bg-primary/10' : 'hover:bg-warm-bg/60'
                          }`}
                        >
                          <span className="block text-[13px] text-foreground">{p.name}</span>
                          <span className="block text-[10px] text-foreground/45 truncate">
                            {[p.company, p.lastAt ? `${p.lastMethod ?? 'Touched'} ${fmtAgo(p.lastAt)}` : 'No touchpoints yet']
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Live match feedback — doubles as the field hint. */}
              {trimmed.length === 0 ? (
                <p className="mt-1 text-[10px] text-foreground/45">
                  We&apos;ll match an existing contact or create a new one.
                </p>
              ) : matched ? (
                <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                  ✓ {matched.name}
                  {matched.company ? <span className="text-emerald-700/70"> · {matched.company}</span> : null}
                  <span className="font-normal text-foreground/55">
                    {' '}— {matched.lastAt ? `last touch ${matched.lastMethod ?? ''} ${fmtAgo(matched.lastAt)}` : 'no touchpoints yet'}
                  </span>
                </p>
              ) : closeMatch ? (
                <p className="mt-1 text-[10px] font-semibold text-amber-700">
                  ⚠ Close to &ldquo;{closeMatch.name}&rdquo;.{' '}
                  <button
                    type="button"
                    onClick={() => pickPerson(closeMatch.name)}
                    className="underline underline-offset-2 hover:text-amber-900"
                  >
                    Use them
                  </button>
                  <span className="font-normal text-foreground/55"> — or save to create a new contact.</span>
                </p>
              ) : (
                <p className="mt-1 text-[10px] font-semibold text-primary">
                  + New contact &ldquo;{trimmed}&rdquo; will be created.
                </p>
              )}

              {/* Recents — zero-typing repeat logging. */}
              {trimmed.length === 0 && recents.length > 0 && (
                <div className="mt-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-foreground/40">Recent</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {recents.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickPerson(p.name)}
                        className="max-w-full inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-black/10 bg-white text-[11px] font-semibold text-foreground/75 hover:border-primary/40 hover:text-foreground transition-colors"
                      >
                        <span className="truncate">{p.name}</span>
                        {p.lastAt && (
                          <span className="shrink-0 text-[9px] font-normal text-foreground/40 tabular-nums">
                            {fmtAgo(p.lastAt)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>

            <Field label="Method" required>
              <CompactMethodPicker value={method} onChange={setMethod} />
            </Field>

            {durationApplies && (
              <Field label="Duration">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {DURATION_PRESETS.map((m) => {
                    const active = durationMin === String(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDurationMin(active ? '' : String(m))}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold tabular-nums transition-colors ${
                          active
                            ? 'bg-foreground text-white border-foreground'
                            : 'bg-white text-foreground/70 border-black/10 hover:border-black/25'
                        }`}
                      >
                        {m}m
                      </button>
                    );
                  })}
                  <input
                    type="number"
                    min={0}
                    max={720}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="min"
                    className="ql-input w-20 text-center tabular-nums"
                    aria-label="Minutes"
                    inputMode="numeric"
                  />
                </div>
              </Field>
            )}

            <Field
              label="Comments / notes"
              trailing={speech.supported ? (
                <button
                  type="button"
                  onClick={speech.toggle}
                  aria-pressed={speech.listening}
                  title={speech.listening ? 'Stop dictating' : 'Dictate notes'}
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                    speech.listening ? 'text-rose-600' : 'text-foreground/45 hover:text-foreground'
                  }`}
                >
                  <svg className={`w-3 h-3 ${speech.listening ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4" />
                  </svg>
                  {speech.listening ? 'Listening…' : 'Dictate'}
                </button>
              ) : undefined}
            >
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className="ql-input resize-none sm:min-h-[96px]"
                placeholder="What did you talk about? Any next steps?"
              />
            </Field>
          </div>

          {/* Desktop footer. On mobile the fixed Save pill below is
              the single action — the header X / backdrop / swipe
              handle cancel. */}
          <div className="hidden sm:flex px-6 py-4 border-t border-black/5 bg-warm-bg/30 items-center justify-end gap-2">
            <button
              type="button"
              onClick={attemptClose}
              className="px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-foreground/65 hover:bg-warm-bg/60 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!submittable || submitting}
              className={`px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${submittable && !submitting ? 'bg-foreground text-white hover:bg-foreground/85' : 'bg-foreground/30 text-white/75 cursor-not-allowed'}`}
            >
              {submitting ? 'Logging…' : 'Save log'}
            </button>
          </div>

          {/* Mobile: one fixed Save pill in the FAB's spot. Rides
              above the iOS keyboard via the visualViewport inset so
              a rep can save without dismissing the keyboard. */}
          <div
            className="sm:hidden fixed inset-x-4 z-[60]"
            style={{
              bottom: kbInset > 0 ? `${kbInset + 12}px` : 'max(1rem, env(safe-area-inset-bottom))',
              transition: 'bottom 150ms ease-out',
            }}
          >
            <button
              type="submit"
              disabled={!submittable || submitting}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-sm font-semibold uppercase tracking-wider shadow-[0_12px_28px_-8px_rgba(0,0,0,0.45)] active:scale-[0.98] transition-all duration-200 ${
                submittable && !submitting ? 'bg-foreground text-white' : 'bg-foreground/35 text-white/80'
              }`}
            >
              {submitting ? 'Logging…' : submittable ? 'Save log' : 'Enter a name to save'}
            </button>
          </div>
        </form>

        <style jsx global>{`
          .ql-input {
            width: 100%;
            padding: 0.625rem 0.75rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.1);
            background: white;
            font-size: 16px; /* 16px prevents iOS Safari from zooming the viewport on focus */
            color: var(--color-foreground);
          }
          .ql-input:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(188, 107, 74, 0.15);
          }
          @media (min-width: 640px) {
            .ql-input { font-size: 0.875rem; padding: 0.5rem 0.75rem; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ─── Post-save toast (Undo + Log another) ────────────────────────

function QuickLogToast({
  result,
  onUndo,
  onLogAnother,
  onDone,
}: {
  result: QuickLogResult;
  onUndo: () => Promise<void>;
  onLogAnother: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'shown' | 'undoing' | 'undone'>('shown');
  useEffect(() => {
    if (phase === 'shown') {
      const t = setTimeout(onDone, 6000);
      return () => clearTimeout(t);
    }
    if (phase === 'undone') {
      const t = setTimeout(onDone, 1600);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  const mins = Math.round(result.durationSeconds / 60);
  return (
    <div
      className="fixed inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-[70]"
      // Sits above the New log FAB (which reappears once the sheet
      // closes) so the two never overlap.
      style={{ bottom: 'calc(max(1rem, env(safe-area-inset-bottom)) + 60px)' }}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl border border-black/10 bg-white shadow-[0_18px_40px_-18px_rgba(40,30,25,0.5)] px-4 py-3">
        {phase === 'undone' ? (
          <p className="text-[12.5px] font-semibold text-foreground/75">Log removed.</p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[12.5px] text-foreground">
              <span aria-hidden>🪵</span> Logged <span className="font-semibold">{result.contactName}</span>
              <span className="text-foreground/55"> · {result.method}{mins > 0 ? ` · ${mins}m` : ''}</span>
            </p>
            <div className="shrink-0 flex items-center gap-1">
              {result.logId && (
                <button
                  type="button"
                  disabled={phase === 'undoing'}
                  onClick={async () => {
                    setPhase('undoing');
                    try {
                      await onUndo();
                      setPhase('undone');
                    } catch {
                      setPhase('shown');
                      alert("Couldn't undo — check the contact's history.");
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  {phase === 'undoing' ? '…' : 'Undo'}
                </button>
              )}
              <button
                type="button"
                onClick={onLogAnother}
                className="px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors"
              >
                Log another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Host: sheet + toast + undo orchestration ────────────────────

export function QuickLogHost({
  open,
  onOpenChange,
  roster,
  recents,
  rosterLoading = false,
  onSubmit,
  onUndo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roster: QuickLogPerson[];
  recents: QuickLogPerson[];
  rosterLoading?: boolean;
  onSubmit: QuickLogSubmit;
  onUndo: (result: QuickLogResult) => Promise<void>;
}) {
  const [toast, setToast] = useState<QuickLogResult | null>(null);
  return (
    <>
      {open && (
        <QuickLogSheet
          roster={roster}
          recents={recents}
          rosterLoading={rosterLoading}
          onClose={() => onOpenChange(false)}
          onSubmit={async (name, method, comments, durationSeconds) => {
            const result = await onSubmit(name, method, comments, durationSeconds);
            if (result) {
              onOpenChange(false);
              setToast(result);
            }
            return result;
          }}
        />
      )}
      {toast && !open && (
        <QuickLogToast
          key={toast.logId ?? toast.contactId}
          result={toast}
          onUndo={() => onUndo(toast)}
          onLogAnother={() => {
            setToast(null);
            onOpenChange(true);
          }}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}

// ─── Standalone host (home / logs page) ──────────────────────────
// Self-contained: pulls the roster + per-rep recents from
// /api/contacts/quick-log-context on open, find-or-creates the
// contact on submit, and undoes via the history + contact DELETE
// endpoints. The contacts page does NOT use this — it keeps its own
// optimistic submit path over its live grid rows.

export function StandaloneQuickLog({
  open,
  onOpenChange,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Fires after a successful save AND after an undo, so the calling
  // surface can refresh its own counts / feeds.
  onLogged?: () => void;
}) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [ctx, setCtx] = useState<{ roster: QuickLogPerson[]; recents: QuickLogPerson[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Refetch each time the sheet opens — the roster changes rarely,
  // but recents change with every log.
  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch('/api/contacts/quick-log-context', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const j = (await r.json()) as { roster?: QuickLogPerson[]; recents?: QuickLogPerson[] };
        if (!cancelled) setCtx({ roster: j.roster ?? [], recents: j.recents ?? [] });
      } catch {
        // Sheet still works without a roster — it just can't suggest.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, token]);

  const submit: QuickLogSubmit = async (name, method, comments, durationSeconds) => {
    if (!token) return null;
    const lowered = name.toLowerCase();
    const existing = ctx?.roster.find((p) => p.name.toLowerCase() === lowered) ?? null;
    let contactId = existing?.id ?? null;
    let created = false;
    if (!contactId) {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Couldn't create contact: ${(j as { error?: string }).error ?? res.status}`);
        return null;
      }
      const row = (await res.json()) as { id: string };
      contactId = row.id;
      created = true;
      setCtx((c) =>
        c ? { ...c, roster: [{ id: row.id, name, company: null, lastAt: null, lastMethod: null }, ...c.roster] } : c,
      );
    }
    const res = await fetch(`/api/contacts/${contactId}/log-contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ method, comments, duration_seconds: durationSeconds }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Couldn't log contact: ${(j as { error?: string }).error ?? res.status}`);
      return null;
    }
    const j = (await res.json().catch(() => null)) as { log_id?: string } | null;
    onLogged?.();
    return {
      logId: j?.log_id ?? null,
      contactId,
      contactName: existing?.name ?? name,
      createdContact: created,
      method,
      durationSeconds,
    };
  };

  const undo = useCallback(async (r: QuickLogResult) => {
    if (!token || !r.logId) return;
    const res = await fetch(`/api/contacts/${r.contactId}/history/${r.logId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('undo failed');
    if (r.createdContact) {
      // Don't leave an empty just-created row lying around.
      await fetch(`/api/contacts/${r.contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    onLogged?.();
  }, [token, onLogged]);

  return (
    <QuickLogHost
      open={open}
      onOpenChange={onOpenChange}
      roster={ctx?.roster ?? []}
      recents={ctx?.recents ?? []}
      rosterLoading={loading}
      onSubmit={submit}
      onUndo={undo}
    />
  );
}
