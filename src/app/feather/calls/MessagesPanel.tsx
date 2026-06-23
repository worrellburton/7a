'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { formatPhone, formatRelativeTime } from './_shared';

// Text Messages (Aircall Business Text Messaging) on the Calls page.
//
// A launcher chip lives inline on the page; tapping it opens a right-side
// drawer with a thread list (grouped by the contact's phone number) and a
// conversation view + composer. Inbound/outbound messages are mirrored
// into public.aircall_messages by the Aircall webhook and streamed here
// over Supabase Realtime; sending POSTs to /api/aircall/messages.
//
// Until SMS is enabled on the Aircall account (Support must turn on
// Business Text Messaging + 10DLC registration for US/Canada), there will
// be no messages and sends return a clear error — the UI degrades to an
// explanatory banner rather than breaking.

interface MessageRow {
  id: string;
  aircall_message_id: string | null;
  direction: string | null;
  status: string | null;
  channel: string | null;
  number_id: number | null;
  number_name: string | null;
  number_digits: string | null;
  contact_number: string | null;
  raw_to: string | null;
  raw_from: string | null;
  body: string | null;
  media_url: string | null;
  user_name: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string | null;
}

interface Line {
  id: number;
  name: string | null;
  digits: string | null;
}

interface Optimistic {
  tempId: string;
  contact: string;
  numberId: number;
  body: string;
  at: string;
  pending: boolean;
  failed?: boolean;
}

interface BubbleView {
  key: string;
  outbound: boolean;
  body: string;
  at: string;
  status: string | null;
  pending?: boolean;
  failed?: boolean;
}

const msgTime = (m: MessageRow): string => m.created_at ?? m.sent_at ?? m.received_at ?? '';

function fmtClock(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Best human label for a thread's contact: a raw number with country code
// when we have one, otherwise the formatted digits key.
function contactDisplay(msgs: MessageRow[], key: string): string {
  for (const m of msgs) {
    const raw = m.direction === 'inbound' ? m.raw_from : m.raw_to;
    if (raw) return formatPhone(raw);
  }
  return formatPhone(key);
}

function PhoneTextIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function MessagesPanel({ token }: { token: string | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [numbers, setNumbers] = useState<Line[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [newTo, setNewTo] = useState('');
  const [newLineId, setNewLineId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [optimistic, setOptimistic] = useState<Optimistic[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token],
  );

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/aircall/messages', { headers: { ...authHeaders }, cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to load messages (${res.status})`);
      }
      const j = (await res.json()) as { messages: MessageRow[]; numbers: Line[]; configured: boolean };
      setMessages(j.messages ?? []);
      setNumbers(j.numbers ?? []);
      setConfigured(j.configured !== false);
      setError(null);
      // Drop optimistic bubbles now confirmed on the server (same contact,
      // same outbound text) — keep failed ones so the user can see/retry.
      setOptimistic((prev) =>
        prev.filter((o) => {
          if (o.failed) return true;
          const confirmed = (j.messages ?? []).some(
            (m) => m.direction === 'outbound' && (m.contact_number ?? '') === o.contact && (m.body ?? '').trim() === o.body.trim(),
          );
          return !confirmed;
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  // Initial + on-open load.
  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  // Realtime: any change to aircall_messages refreshes the view.
  useEffect(() => {
    if (!token) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('aircall_messages_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aircall_messages' }, () => {
        if (t) clearTimeout(t);
        t = setTimeout(() => void load(), 250);
      })
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [token, load]);

  // Default the new-message line to the only/first available line.
  useEffect(() => {
    if (newLineId == null && numbers.length > 0) setNewLineId(numbers[0].id);
  }, [numbers, newLineId]);

  // Group messages into threads keyed by contact number.
  const byThread = useMemo(() => {
    const m = new Map<string, MessageRow[]>();
    for (const msg of messages) {
      const key = msg.contact_number ?? 'unknown';
      const arr = m.get(key);
      if (arr) arr.push(msg);
      else m.set(key, [msg]);
    }
    return m;
  }, [messages]);

  const threads = useMemo(() => {
    const out: Array<{ key: string; display: string; lastBody: string; lastAt: string; lastDir: string | null; numberId: number | null; numberName: string | null }> = [];
    for (const [key, msgs] of byThread) {
      const last = msgs[msgs.length - 1];
      out.push({
        key,
        display: contactDisplay(msgs, key),
        lastBody: last.body ?? (last.media_url ? '📎 Attachment' : ''),
        lastAt: msgTime(last),
        lastDir: last.direction,
        numberId: last.number_id,
        numberName: last.number_name,
      });
    }
    out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    return out;
  }, [byThread]);

  const activeThread = useMemo(() => threads.find((t) => t.key === activeKey) ?? null, [threads, activeKey]);

  const activeMessages = useMemo<BubbleView[]>(() => {
    if (!activeKey) return [];
    const server: BubbleView[] = (byThread.get(activeKey) ?? []).map((m) => ({
      key: m.id,
      outbound: m.direction === 'outbound',
      body: m.body ?? (m.media_url ? '📎 Attachment' : ''),
      at: msgTime(m),
      status: m.status,
    }));
    const opt: BubbleView[] = optimistic
      .filter((o) => o.contact === activeKey)
      .map((o) => ({ key: o.tempId, outbound: true, body: o.body, at: o.at, status: o.failed ? 'failed' : o.pending ? 'sending' : 'sent', pending: o.pending, failed: o.failed }));
    return [...server, ...opt].sort((a, b) => a.at.localeCompare(b.at));
  }, [activeKey, byThread, optimistic]);

  // Auto-scroll the conversation to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && (activeKey || composing)) el.scrollTop = el.scrollHeight;
  }, [activeMessages.length, activeKey, composing]);

  const recentInbound = useMemo(
    () => messages.some((m) => m.direction === 'inbound' && Date.now() - new Date(msgTime(m)).getTime() < 30 * 60 * 1000),
    [messages],
  );

  async function doSend(opts: { to: string; numberId: number; contactKey: string; text: string }) {
    const text = opts.text.trim();
    if (!text || !opts.numberId) return;
    const tempId = `tmp-${Date.now()}`;
    setOptimistic((p) => [...p, { tempId, contact: opts.contactKey, numberId: opts.numberId, body: text, at: new Date().toISOString(), pending: true }]);
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/aircall/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders },
        body: JSON.stringify({ to: opts.to, body: text, numberId: opts.numberId }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Send failed.');
      setOptimistic((p) => p.map((o) => (o.tempId === tempId ? { ...o, pending: false } : o)));
      setTimeout(() => void load(), 1200);
    } catch (e) {
      setOptimistic((p) => p.map((o) => (o.tempId === tempId ? { ...o, pending: false, failed: true } : o)));
      setError(e instanceof Error ? e.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  }

  function sendReply() {
    if (!activeKey || !draft.trim()) return;
    const numberId = activeThread?.numberId ?? newLineId ?? numbers[0]?.id ?? null;
    if (!numberId) {
      setError('No Aircall line available to send from.');
      return;
    }
    void doSend({ to: activeKey, numberId, contactKey: activeKey, text: draft });
    setDraft('');
  }

  function sendNew() {
    const to = newTo.trim();
    const numberId = newLineId ?? numbers[0]?.id ?? null;
    if (!to || !draft.trim() || !numberId) {
      setError(!numberId ? 'Pick a line to send from.' : 'Enter a number and a message.');
      return;
    }
    const contactKey = to.replace(/\D/g, '');
    void doSend({ to, numberId, contactKey, text: draft });
    setDraft('');
    setComposing(false);
    setActiveKey(contactKey);
  }

  const openInbox = () => { setComposing(false); setActiveKey(null); setError(null); setOpen(true); };

  // Compact button (lives in the Calls header, upper right). Opens the full
  // SMS inbox drawer; a badge shows the conversation count and a dot flags a
  // recent inbound text.
  const card = (
    <button
      onClick={openInbox}
      className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/85 border border-white/70 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-white transition-colors shadow-sm"
      style={{ fontFamily: 'var(--font-body)' }}
      aria-label="Open text messages"
    >
      <PhoneTextIcon className="w-3.5 h-3.5 text-primary" />
      Texts
      {threads.length > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary/10 text-primary text-[10px] tabular-nums">{threads.length}</span>
      )}
      {recentInbound && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </button>
  );

  const drawer =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true">
            <button aria-label="Close messages" onClick={() => setOpen(false)} className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" />
            <div className="relative h-full w-full sm:w-[420px] bg-warm-bg border-l border-foreground/10 shadow-2xl flex flex-col" style={{ fontFamily: 'var(--font-body)' }}>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-foreground/10 bg-white/60 backdrop-blur">
                <div className="flex items-center gap-2 min-w-0">
                  {(activeKey || composing) && (
                    <button
                      onClick={() => { setActiveKey(null); setComposing(false); setError(null); }}
                      className="shrink-0 text-foreground/50 hover:text-foreground -ml-1 p-1"
                      aria-label="Back to conversations"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {composing ? 'New message' : activeThread ? activeThread.display : 'Text messages'}
                    </p>
                    <p className="text-[11px] text-foreground/45 truncate">
                      {composing
                        ? 'Send an SMS'
                        : activeThread
                          ? `via ${activeThread.numberName ?? 'Aircall'}`
                          : 'Aircall SMS'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!activeKey && !composing && configured && (
                    <button
                      onClick={() => { setComposing(true); setError(null); }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary text-white text-[11px] font-semibold px-2.5 py-1.5 hover:bg-primary-dark transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>
                      New
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} aria-label="Close" className="text-foreground/40 hover:text-foreground p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {!configured && (
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-[12px] text-amber-900 leading-snug">
                  Aircall SMS isn’t enabled yet. Ask Aircall Support to turn on Business Text Messaging (and complete 10DLC/toll-free registration for US/Canada numbers); messages will appear here once it’s active.
                </div>
              )}
              {error && (
                <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-[12px] text-rose-700 leading-snug">{error}</div>
              )}

              {/* Body */}
              {composing ? (
                <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">To</label>
                  <input
                    value={newTo}
                    onChange={(e) => setNewTo(e.target.value)}
                    inputMode="tel"
                    placeholder="(602) 555-0142"
                    className="w-full rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">From line</label>
                  <select
                    value={newLineId ?? ''}
                    onChange={(e) => setNewLineId(Number(e.target.value) || null)}
                    className="w-full rounded-xl border border-foreground/15 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {numbers.length === 0 && <option value="">No lines found</option>}
                    {numbers.map((n) => (
                      <option key={n.id} value={n.id}>{n.name || (n.digits ? formatPhone(n.digits) : `Line ${n.id}`)}</option>
                    ))}
                  </select>
                </div>
              ) : activeKey ? (
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {activeMessages.length === 0 && (
                    <p className="text-center text-[12px] text-foreground/40 py-8">No messages in this conversation yet.</p>
                  )}
                  {activeMessages.map((b) => (
                    <div key={b.key} className={`flex ${b.outbound ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${b.outbound ? (b.failed ? 'bg-rose-100 text-rose-900 border border-rose-200' : 'bg-primary text-white') : 'bg-white text-foreground border border-foreground/10'}`}>
                        <p className="whitespace-pre-wrap break-words">{b.body}</p>
                        <p className={`mt-1 text-[10px] ${b.outbound ? (b.failed ? 'text-rose-500' : 'text-white/70') : 'text-foreground/40'}`}>
                          {b.failed ? 'Failed to send' : b.pending ? 'Sending…' : fmtClock(b.at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {threads.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <p className="text-sm text-foreground/50">{loading ? 'Loading…' : 'No conversations yet.'}</p>
                      {configured && !loading && (
                        <button onClick={() => setComposing(true)} className="mt-3 text-[12px] font-semibold text-primary hover:underline">Start a new message</button>
                      )}
                    </div>
                  ) : (
                    <ul className="divide-y divide-foreground/5">
                      {threads.map((t) => (
                        <li key={t.key}>
                          <button onClick={() => { setActiveKey(t.key); setError(null); }} className="w-full text-left px-4 py-3 hover:bg-white/60 transition-colors flex items-start gap-3">
                            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                              <PhoneTextIcon className="w-4 h-4" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-semibold text-foreground truncate">{t.display}</span>
                                <span className="text-[10px] text-foreground/40 shrink-0">{t.lastAt ? formatRelativeTime(t.lastAt) : ''}</span>
                              </span>
                              <span className="block text-[12px] text-foreground/55 truncate">
                                {t.lastDir === 'outbound' ? 'You: ' : ''}{t.lastBody}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Composer — shown in a conversation or while composing a new message. */}
              {(activeKey || composing) && configured && (
                <div className="border-t border-foreground/10 bg-white/70 backdrop-blur px-3 py-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          composing ? sendNew() : sendReply();
                        }
                      }}
                      rows={1}
                      placeholder="Type a message…"
                      className="flex-1 resize-none max-h-28 rounded-2xl border border-foreground/15 bg-white px-3 py-2 text-[13px] outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => (composing ? sendNew() : sendReply())}
                      disabled={sending || !draft.trim() || (composing && !newTo.trim())}
                      className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      aria-label="Send"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-foreground/35">Enter to send · Shift+Enter for a new line</p>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {card}
      {drawer}
    </>
  );
}
