'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/lib/ModalProvider';
import { toAvatarThumb } from '@/lib/avatarThumb';

// Home-screen check-in pill for hardware assignments.
//
// Counts the hardware rows whose `assigned_to` matches the
// signed-in user's full name and renders as a small round chip
// next to the daily-logs button. Clicking opens a modal listing
// those items with two actions per item:
//   - "This looks good"  → no-op (with a small confirmation),
//   - "This isn't right" → writes a row to public.hardware_flags
//                          which surfaces as a red alert on the
//                          Hardware page for an admin to triage.
//
// Same circle shape + sizing as HomeDailyLogsChip's circle variant
// so the two sit side-by-side cleanly in the home header.

interface AssignedItem {
  id: string;
  type: string;
  model: string;
  location: string | null;
  assigned_to: string | null;
}

export default function HomeHardwareChip() {
  const { user, session, avatarUrl } = useAuth();
  const modal = useModal();
  const [items, setItems] = useState<AssignedItem[] | null>(null);
  // Locally-tracked "looks good" + "isn't right" decisions for THIS
  // open of the modal. Used to swap the row's button cluster for a
  // small confirmation pill without re-fetching after every click.
  const [decisions, setDecisions] = useState<Record<string, 'ok' | 'flagged'>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);

  // Pull the canonical full_name from the users table so the
  // assigned_to match isn't fooled by Google's user_metadata
  // first-name-only fallback. Same reason the orbit + alumni roster
  // pull from `users` instead of trusting metadata.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setFullName((data as { full_name: string | null } | null)?.full_name ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Reload the assigned-items list whenever the name resolves or
  // hardware_items changes via realtime so the count stays current
  // even if an admin moves a row in/out of the user's name on
  // /app/hardware while the user is staring at home.
  const reload = useCallback(async () => {
    if (!fullName) { setItems([]); return; }
    const { data } = await supabase
      .from('hardware_items')
      .select('id, type, model, location, assigned_to')
      // Case-insensitive match so "Bobby Burton" vs "bobby burton"
      // don't end up showing different counts on different machines.
      .ilike('assigned_to', fullName);
    if (Array.isArray(data)) setItems(data as AssignedItem[]);
  }, [fullName]);

  useEffect(() => { void reload(); }, [reload]);

  // Realtime: any change to hardware_items might add or remove a
  // row from this user's assignment list, so we re-pull on every
  // event. Cheap (just a single ilike query) compared to maintaining
  // a parallel local index.
  useEffect(() => {
    if (!fullName) return;
    const ch = supabase
      .channel(`home-hardware-${user?.id ?? 'anon'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hardware_items' },
        () => { void reload(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [fullName, user?.id, reload]);

  const count = items?.length ?? 0;

  // "This isn't right" handler. Confirms via modal so a clumsy
  // tap doesn't fire an alert, then writes one row to
  // public.hardware_flags. Marks the item locally so the row
  // collapses into a "Flagged" confirmation pill.
  const flagItem = useCallback(async (item: AssignedItem) => {
    if (!user?.id) return;
    const ok = await modal.confirm(`Flag "${item.model || item.type}"?`, {
      message: 'An admin will be alerted on the Hardware page that this assignment looks wrong. You can leave a short note (optional) when you click Confirm.',
      confirmLabel: 'Flag this',
      tone: 'danger',
    });
    if (!ok) return;
    setDecisions((cur) => ({ ...cur, [item.id]: 'flagged' }));
    const { error } = await supabase.from('hardware_flags').insert({
      item_id: item.id,
      flagged_by: user.id,
      message: null,
      reported_assigned_to: item.assigned_to,
    });
    if (error) {
      // Roll back the local check so the user can retry.
      setDecisions((cur) => {
        const copy = { ...cur };
        delete copy[item.id];
        return copy;
      });
      await modal.alert("Couldn't file the flag", { message: error.message });
    }
  }, [user?.id, modal]);

  const confirmItem = useCallback((item: AssignedItem) => {
    setDecisions((cur) => ({ ...cur, [item.id]: 'ok' }));
  }, []);

  // Hide the pill entirely when the user has nothing assigned —
  // there's no useful state to show, and the chip's whole purpose
  // is the count.
  if (!session) return null;
  if (count === 0) return null;

  const flagged = Object.values(decisions).filter((d) => d === 'flagged').length;

  return (
    <>
      <button
        type="button"
        onClick={() => { setDecisions({}); setModalOpen(true); }}
        aria-label={`Hardware assigned to you: ${count}`}
        title={`${count} hardware item${count === 1 ? '' : 's'} assigned to you · click to verify`}
        className="relative inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-full border border-sky-500/40 bg-white/85 supports-[backdrop-filter]:bg-white/65 backdrop-blur-md hover:border-sky-500/70 transition-all shadow-[0_6px_18px_-10px_rgba(14,116,144,0.45)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span
          className={`relative tabular-nums font-bold leading-none text-sky-700 ${count >= 100 ? 'text-[11px]' : 'text-[14px]'}`}
        >
          {count}
        </span>
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] leading-none border border-white shadow-sm bg-sky-500/95 text-white"
        >
          💻
        </span>
      </button>

      {modalOpen && (
        <HardwareCheckInModal
          items={items ?? []}
          decisions={decisions}
          avatarUrl={avatarUrl}
          fullName={fullName}
          flaggedSoFar={flagged}
          onConfirm={confirmItem}
          onFlag={flagItem}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

function HardwareCheckInModal({
  items,
  decisions,
  avatarUrl,
  fullName,
  flaggedSoFar,
  onConfirm,
  onFlag,
  onClose,
}: {
  items: AssignedItem[];
  decisions: Record<string, 'ok' | 'flagged'>;
  avatarUrl: string | null;
  fullName: string | null;
  flaggedSoFar: number;
  onConfirm: (item: AssignedItem) => void;
  onFlag: (item: AssignedItem) => void;
  onClose: () => void;
}) {
  // Esc closes; outside click closes via the backdrop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hardware-checkin-title"
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-foreground/35 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg max-h-[85vh] rounded-3xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-white/85 supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150 border border-white/70 rounded-3xl shadow-[0_24px_60px_-20px_rgba(40,30,25,0.45)]"
        />
        <div className="relative flex flex-col overflow-hidden">
          <header className="px-6 sm:px-7 pt-6 pb-4 border-b border-black/5 flex items-start gap-3">
            <div className="shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toAvatarThumb(avatarUrl, 80) ?? avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover bg-warm-bg ring-1 ring-black/5"
                />
              ) : (
                <span aria-hidden className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 text-primary text-base font-bold">
                  {(fullName || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/55">Hardware check-in</p>
              <h2 id="hardware-checkin-title" className="text-lg font-bold text-foreground leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                {items.length} item{items.length === 1 ? '' : 's'} assigned to you
              </h2>
              <p className="mt-0.5 text-[12.5px] text-foreground/65 leading-snug">
                Tap <strong>This looks good</strong> if the assignment is correct, or <strong>This isn&apos;t right</strong> if it should be reassigned.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground/55 hover:bg-warm-bg/60 hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div className="relative overflow-y-auto px-3 sm:px-4 py-3 flex-1 min-h-0">
            <ul className="space-y-2">
              {items.map((item) => {
                const decision = decisions[item.id];
                return (
                  <li
                    key={item.id}
                    className={`rounded-2xl border bg-white/85 supports-[backdrop-filter]:bg-white/60 backdrop-blur-sm p-3 ${
                      decision === 'flagged' ? 'border-rose-300' :
                      decision === 'ok' ? 'border-emerald-300' :
                      'border-black/8'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span aria-hidden className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-foreground/8 text-foreground/75 text-[13px] shrink-0">
                        💻
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/50">{item.type}</p>
                        <p className="text-[13.5px] font-semibold text-foreground truncate">{item.model || '(no model)'}</p>
                        {item.location && (
                          <p className="text-[11.5px] text-foreground/55 truncate">📍 {item.location}</p>
                        )}
                      </div>
                    </div>
                    {decision === 'ok' ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                        ✓ Confirmed
                      </p>
                    ) : decision === 'flagged' ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold border border-rose-200">
                        ⚑ Flagged — admin will see this
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onConfirm(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-[0_4px_12px_-4px_rgba(5,150,105,0.45)]"
                        >
                          ✓ This looks good
                        </button>
                        <button
                          type="button"
                          onClick={() => void onFlag(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 transition-colors"
                        >
                          ⚑ This isn&apos;t right
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <footer className="px-6 py-3 border-t border-black/5 bg-warm-bg/40 flex items-center justify-between gap-2">
            <p className="text-[11px] text-foreground/55">
              {flaggedSoFar > 0
                ? `${flaggedSoFar} flag${flaggedSoFar === 1 ? '' : 's'} sent to the Hardware page`
                : 'Tap a button on each row to log your decision'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full text-[11.5px] font-semibold uppercase tracking-[0.12em] bg-foreground text-white hover:bg-foreground/85 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Done
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
