'use client';

// Phase 6 + 7 — pick contacts to receive the campaign.
//
// At the top of the page the subject line is shown, editable. On
// first mount, if generated_subject is empty we call
// /api/email-campaigns/subject to auto-calculate one from the
// campaign's prompt + HTML so the marketer doesn't have to come
// up with it from scratch.
//
// The body lists every contact with a non-empty `email` column.
// Search + bulk-select-all keep it manageable for the ~500-row
// contact table. Hitting "Finalize and send" persists the
// selected recipient set + status='finalizing' and routes to
// /app/email-campaigns/[id]/finalize.

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface CampaignRow {
  id: string;
  prompt: string;
  generated_html: string | null;
  generated_subject: string | null;
  status: string;
}

interface ContactRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  location: string | null;
  // Type is a multi-value column on contacts (Detox, PHP, IOP, etc.).
  // Surfaced here so the recipient picker can filter the list by
  // touchpoint type — e.g. send a campaign only to Interventionists.
  type: string[] | null;
}

// Canonical type-filter options. Matches the chips on the contact-
// edit modal so the two surfaces feel like the same vocabulary.
const TYPE_OPTIONS = [
  'Detox',
  'PHP',
  'IOP',
  'RTC',
  'Outpatient',
  'Extended Care',
  'Interventionist',
  'Therapist',
] as const;

export default function RecipientsContent({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [subject, setSubject] = useState('');
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  // Selected type chips (Detox / PHP / IOP / …). Multi-select with
  // OR semantics — a contact matches when ANY of its `type` values
  // is in this set. Empty set = no type filter applied.
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const toggleType = (t: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Map of contact_id → 'sent within the last 7 days' metadata.
  // Drives a per-row warning chip and the pre-send confirmation
  // modal so a marketer doesn't accidentally double-email anyone.
  interface RecentSend { last_sent_at: string; last_subject: string | null; last_campaign_id: string }
  const [recentSends, setRecentSends] = useState<Map<string, RecentSend>>(new Map());
  const [showRecentWarn, setShowRecentWarn] = useState(false);

  // Load campaign + recipients (resume) + contacts in parallel.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [campaignRes, contactsRes, existingRes] = await Promise.all([
        supabase.from('email_campaigns')
          .select('id, prompt, generated_html, generated_subject, status')
          .eq('id', campaignId)
          .maybeSingle(),
        supabase.from('contacts')
          .select('id, name, email, role, location, type')
          .not('email', 'is', null)
          .neq('email', '')
          .order('name', { ascending: true })
          .limit(1000),
        supabase.from('email_campaign_recipients')
          .select('contact_id')
          .eq('campaign_id', campaignId),
      ]);
      if (cancelled) return;
      const c = campaignRes.data as CampaignRow | null;
      setCampaign(c);
      setSubject(c?.generated_subject ?? '');
      setContacts((contactsRes.data ?? []) as ContactRow[]);
      const existing = new Set<string>();
      for (const r of (existingRes.data ?? []) as Array<{ contact_id: string }>) {
        existing.add(r.contact_id);
      }
      setSelected(existing);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  // Fetch the 7-day recently-emailed set in parallel with contacts.
  // The result is cosmetic-only at first (per-row chip); it gates
  // the Finalize button via a confirmation modal when the picked
  // set overlaps the recent set.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/email-campaigns/recent-recipients?days=7', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          recipients: Array<{ contact_id: string; last_sent_at: string; last_subject: string | null; last_campaign_id: string }>;
        };
        if (cancelled) return;
        const next = new Map<string, RecentSend>();
        for (const r of json.recipients ?? []) {
          next.set(r.contact_id, {
            last_sent_at: r.last_sent_at,
            last_subject: r.last_subject,
            last_campaign_id: r.last_campaign_id,
          });
        }
        setRecentSends(next);
      } catch {
        // non-fatal — warning is a guardrail, not a gate
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-calc the subject the first time we land here without one.
  useEffect(() => {
    if (loading || !campaign || !session?.access_token) return;
    if (campaign.generated_subject && campaign.generated_subject.trim().length > 0) return;
    if (!campaign.generated_html || calculating) return;
    let cancelled = false;
    setCalculating(true);
    void (async () => {
      try {
        const res = await fetch('/api/email-campaigns/subject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ campaignId }),
        });
        const json = (await res.json().catch(() => ({}))) as { subject?: string; error?: string };
        if (!cancelled && json.subject) {
          setSubject(json.subject);
        }
      } finally {
        if (!cancelled) setCalculating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, campaign, session?.access_token, calculating, campaignId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasTypes = typeFilter.size > 0;
    if (!q && !hasTypes) return contacts;
    return contacts.filter((c) => {
      if (hasTypes) {
        const ts = Array.isArray(c.type) ? c.type : [];
        if (!ts.some((t) => typeFilter.has(t))) return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q)
        || c.email.toLowerCase().includes(q)
        || (c.role ?? '').toLowerCase().includes(q)
        || (c.location ?? '').toLowerCase().includes(q)
      );
    });
  }, [contacts, query, typeFilter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((c) => next.add(c.id));
      return next;
    });
  };
  const clearAll = () => setSelected(new Set());

  // Selected ids that overlap the recent-send set. Drives the
  // pre-finalize confirmation modal. Memoised so the button can
  // render the count without recomputing on every render.
  const selectedRecentlyContacted = useMemo(() => {
    const out: Array<{ id: string; name: string; email: string; last_sent_at: string; last_subject: string | null }> = [];
    for (const c of contacts) {
      if (!selected.has(c.id)) continue;
      const rec = recentSends.get(c.id);
      if (!rec) continue;
      out.push({
        id: c.id,
        name: c.name,
        email: c.email,
        last_sent_at: rec.last_sent_at,
        last_subject: rec.last_subject,
      });
    }
    return out.sort((a, b) => b.last_sent_at.localeCompare(a.last_sent_at));
  }, [contacts, selected, recentSends]);

  const onFinalizeClick = () => {
    if (selected.size === 0) {
      setError('Pick at least one recipient.');
      return;
    }
    if (subject.trim().length === 0) {
      setError('Subject line cannot be empty.');
      return;
    }
    setError(null);
    // Gate behind a confirmation when any picked recipient has been
    // emailed in the last 7 days. The modal exposes 'remove from
    // send' or 'send anyway'; only after the user picks does the
    // real onFinalize fire.
    if (selectedRecentlyContacted.length > 0) {
      setShowRecentWarn(true);
      return;
    }
    void onFinalize();
  };

  const onFinalize = async () => {
    setShowRecentWarn(false);
    if (selected.size === 0) return;
    if (subject.trim().length === 0) return;
    setError(null);
    setContinuing(true);
    try {
      // Save subject + status + recipient set. Recipients are
      // upserted: anything in `selected` becomes a row, anything
      // not in `selected` gets deleted so re-visits keep the row
      // set in sync with the UI.
      const { error: updErr } = await supabase
        .from('email_campaigns')
        .update({
          generated_subject: subject.trim(),
          status: 'finalizing',
        })
        .eq('id', campaignId);
      if (updErr) throw new Error(updErr.message);

      const wanted = Array.from(selected);
      const wantedSet = new Set(wanted);

      // Delete rows for contacts no longer selected.
      const { data: existingRows } = await supabase
        .from('email_campaign_recipients')
        .select('id, contact_id')
        .eq('campaign_id', campaignId);
      const toDelete = ((existingRows ?? []) as Array<{ id: string; contact_id: string }>)
        .filter((r) => !wantedSet.has(r.contact_id))
        .map((r) => r.id);
      if (toDelete.length > 0) {
        await supabase.from('email_campaign_recipients').delete().in('id', toDelete);
      }

      // Insert new rows for newly-selected contacts.
      const contactById = new Map(contacts.map((c) => [c.id, c]));
      const existingContactIds = new Set(((existingRows ?? []) as Array<{ contact_id: string }>).map((r) => r.contact_id));
      const inserts = wanted
        .filter((id) => !existingContactIds.has(id))
        .map((id) => {
          const c = contactById.get(id);
          return {
            campaign_id: campaignId,
            contact_id: id,
            email: c?.email ?? '',
            send_status: 'pending',
          };
        });
      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from('email_campaign_recipients').insert(inserts);
        if (insErr) throw new Error(insErr.message);
      }

      router.push(`/app/email-campaigns/${campaignId}/finalize`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setContinuing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Email Campaigns · Recipients
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Who is this going to?
          </h1>
        </div>
        <Link
          href={`/app/email-campaigns/new?id=${campaignId}`}
          className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          ← Edit build
        </Link>
      </header>

      {/* Auto-calculated subject — Phase 7 */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Subject
          </p>
          {calculating && (
            <span className="text-[11px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
              Calculating subject line…
            </span>
          )}
        </div>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Auto-calculated subject"
          className="w-full px-3 py-2 rounded-md border border-black/10 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <p className="text-[11px] text-foreground/45 mt-1.5" style={{ fontFamily: 'var(--font-body)' }}>
          Auto-calculated from the body. Edit if you want.
        </p>
      </section>

      {/* Recipient picker */}
      <section className="rounded-2xl border border-black/10 bg-white mb-4">
        <header className="px-4 py-3 border-b border-black/5 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
              Recipients · {selected.size}/{contacts.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
            >
              Select all{query ? ' (matches)' : ''}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
            >
              Clear
            </button>
          </div>
        </header>
        <div className="px-4 py-3 border-b border-black/5 space-y-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, role, or location…"
            className="w-full px-3 py-1.5 rounded-md border border-black/10 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          {/* Type-filter chip row. Picks any combination — OR
              semantics within the row, AND with the search box. */}
          <div className="flex items-center gap-1.5 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="text-[9.5px] font-bold tracking-[0.22em] uppercase text-foreground/45 mr-1">
              Type
            </span>
            {TYPE_OPTIONS.map((t) => {
              const on = typeFilter.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  aria-pressed={on}
                  className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${
                    on
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-black/10 bg-white text-foreground/65 hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              );
            })}
            {typeFilter.size > 0 && (
              <button
                type="button"
                onClick={() => setTypeFilter(new Set())}
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-foreground/55 hover:text-foreground"
              >
                Clear types
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
            Loading contacts…
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
            {contacts.length === 0
              ? 'No contacts have email addresses yet. Add one from /app/outreach.'
              : typeFilter.size > 0 && !query
                ? `No contacts match ${Array.from(typeFilter).join(' · ')}.`
                : 'No contacts match that filter.'}
          </p>
        ) : (
          <ul className="divide-y divide-black/5 max-h-[60vh] overflow-y-auto">
            {filtered.map((c) => {
              const on = selected.has(c.id);
              const recent = recentSends.get(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${on ? 'bg-primary/5' : 'hover:bg-warm-bg/40'}`}
                  >
                    <span
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'bg-primary border-primary' : 'bg-white border-black/20'}`}
                      aria-hidden
                    >
                      {on && <span className="text-white text-[10px] leading-none">✓</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate flex items-center gap-2" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="truncate">{c.name}</span>
                        {/* Recent-send guardrail. Shown whether or
                            not the row is selected so the picker
                            sees it on first scan. */}
                        {recent && (
                          <span
                            className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200"
                            title={`Last emailed ${new Date(recent.last_sent_at).toLocaleString()}${recent.last_subject ? ` — '${recent.last_subject}'` : ''}`}
                          >
                            ⚠ Recently emailed
                          </span>
                        )}
                      </p>
                      <p className="text-[11.5px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                        {c.email}{c.role ? ` · ${c.role}` : ''}{c.location ? ` · ${c.location}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Selected chip strip. Keeps every picked contact visible
          even when the search box is filtering the main list, so
          the marketer never loses track of who's in the batch.
          Each chip is a one-click removal. */}
      {selected.size > 0 && (
        <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
            Selected · {selected.size}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {contacts
              .filter((c) => selected.has(c.id))
              .map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    title={`Remove ${c.name} (${c.email})`}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11.5px] font-semibold hover:bg-primary/10"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span className="truncate max-w-[180px]">{c.name}</span>
                    <span aria-hidden className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] leading-none">×</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {error && <p className="mb-3 text-[12px] text-red-700" role="alert">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/app/email-campaigns"
          className="px-4 py-2 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={onFinalizeClick}
          disabled={continuing || selected.size === 0}
          className="px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {continuing ? 'Saving…' : `Finalize and send → (${selected.size})`}
        </button>
      </div>

      {/* Recent-send confirmation modal. Mounts only when the user
          clicks Finalize AND the picked set overlaps the recent
          emails. Two paths out: remove the overlapping rows from
          the selection ("don't email them twice") or send anyway. */}
      {showRecentWarn && selectedRecentlyContacted.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm send to recently-emailed recipients"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowRecentWarn(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <div className="px-5 py-4 border-b border-black/5 bg-amber-50/60">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-amber-800 mb-1">
                Heads up
              </p>
              <h2 className="text-base font-semibold text-foreground">
                {selectedRecentlyContacted.length} recipient{selectedRecentlyContacted.length === 1 ? ' has' : 's have'} been emailed in the last 7 days
              </h2>
              <p className="text-[12.5px] text-foreground/65 mt-1">
                Sending again now means a second touch in the same week. Remove them from this send, or send anyway.
              </p>
            </div>
            <ul className="divide-y divide-black/5 max-h-[40vh] overflow-y-auto">
              {selectedRecentlyContacted.map((r) => {
                const when = new Date(r.last_sent_at);
                return (
                  <li key={r.id} className="px-5 py-2.5">
                    <p className="text-[13px] font-semibold text-foreground truncate">{r.name}</p>
                    <p className="text-[11.5px] text-foreground/55">
                      {r.email} · last emailed {when.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      {r.last_subject && <> · <span className="italic">{r.last_subject}</span></>}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="px-5 py-3 border-t border-black/5 bg-warm-bg/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRecentWarn(false)}
                className="px-3 py-1.5 rounded-md text-foreground/65 hover:text-foreground text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    for (const r of selectedRecentlyContacted) next.delete(r.id);
                    return next;
                  });
                  setShowRecentWarn(false);
                }}
                className="px-3 py-1.5 rounded-md bg-white border border-black/15 text-foreground text-xs font-semibold hover:bg-warm-bg/60"
              >
                Remove from send
              </button>
              <button
                type="button"
                onClick={() => { void onFinalize(); }}
                className="px-3 py-1.5 rounded-md bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85"
              >
                Send anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
