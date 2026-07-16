'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

// Home-screen 7A bank-balance pill. Super-admin only — the RLS on
// mercury_accounts already locks the read to is_super_admin, so a
// non-super-admin's select returns zero rows and the chip just
// hides. The runtime isSuperAdmin check below is a belt-and-braces
// guard that also avoids the network round-trip for everyone else.
//
// Hover opens a rich popover with the last 10 transactions on the
// 7A account, a 'Only available for super admins' note, and the
// names of the super admins. CSS-driven (group-hover) so the
// popover appears instantly — no native title-attribute delay.

interface AccountRow {
  id: string;
  balance: number | null;
  currency: string | null;
}

interface TxnRow {
  id: string;
  posted_at: string | null;
  created_at_mercury: string;
  amount: number;
  currency: string | null;
  counterparty_name: string | null;
  status: string | null;
}

interface SuperAdminRow {
  full_name: string | null;
  email: string;
}

function fmtMoneyShort(amount: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString()}`;
  }
}

function fmtMoneySigned(amount: number, currency: string | null): string {
  const sign = amount < 0 ? '−' : '+';
  try {
    const abs = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return `${sign}${abs}`;
  } catch {
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeMercuryBalanceChip() {
  const { user, session, isSuperAdmin } = useAuth();
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [admins, setAdmins] = useState<SuperAdminRow[]>([]);
  // Clicking the chip collapses the dollar figure into a plain bank
  // icon (for over-the-shoulder privacy); clicking the icon brings it
  // back. Canonical store is user_prefs (key 'balance_chip_hidden') so
  // the choice follows the admin across devices; localStorage seeds the
  // first paint so the balance never flashes while the DB read is in
  // flight.
  const [balanceHidden, setBalanceHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem('feather:balance-chip-hidden') === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (!user?.id || !isSuperAdmin) return;
    let cancelled = false;
    void (async () => {
      const rows = await db({
        action: 'select',
        table: 'user_prefs',
        match: { user_id: user.id, key: 'balance_chip_hidden' },
        select: 'value',
      });
      if (cancelled || !Array.isArray(rows) || !rows[0]) return;
      const v = (rows[0] as { value: unknown }).value === true;
      setBalanceHidden(v);
      try { window.localStorage.setItem('feather:balance-chip-hidden', v ? '1' : '0'); } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isSuperAdmin]);

  const toggleBalanceHidden = () => {
    const next = !balanceHidden;
    setBalanceHidden(next);
    try { window.localStorage.setItem('feather:balance-chip-hidden', next ? '1' : '0'); } catch { /* ignore */ }
    if (user?.id) {
      void db({
        action: 'upsert',
        table: 'user_prefs',
        data: { user_id: user.id, key: 'balance_chip_hidden', value: next, updated_at: new Date().toISOString() },
        onConflict: 'user_id,key',
      });
    }
  };

  useEffect(() => {
    if (!session?.access_token || !isSuperAdmin) return;
    let cancelled = false;
    void (async () => {
      // 7A is the operating checking account identified by the last-4
      // '5394'. Pulled by last-4 instead of nickname so a future
      // rename in Mercury doesn't break the chip.
      const { data: accountData } = await supabase
        .from('mercury_accounts')
        .select('id, balance, currency')
        .eq('account_number_last4', '5394')
        .maybeSingle();
      if (cancelled || !accountData) return;
      const acct = accountData as AccountRow;
      setAccount(acct);

      const [txnsRes, adminsRes] = await Promise.all([
        supabase
          .from('mercury_transactions')
          .select('id, posted_at, created_at_mercury, amount, currency, counterparty_name, status')
          .eq('account_id', acct.id)
          .order('posted_at', { ascending: false, nullsFirst: false })
          .order('created_at_mercury', { ascending: false })
          .limit(10),
        supabase
          .from('users')
          .select('full_name, email')
          .eq('is_super_admin', true)
          .order('full_name', { ascending: true }),
      ]);
      if (cancelled) return;
      if (txnsRes.data) setTxns(txnsRes.data as TxnRow[]);
      if (adminsRes.data) setAdmins(adminsRes.data as SuperAdminRow[]);
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, isSuperAdmin]);

  if (!isSuperAdmin) return null;
  if (!account || account.balance == null) return null;

  // Collapsed state: just a little bank icon. Clicking it restores the
  // full balance chip. No hover popover while hidden — the point is
  // that nothing on screen reveals the number until it's toggled back.
  if (balanceHidden) {
    return (
      <button
        type="button"
        onClick={toggleBalanceHidden}
        aria-label="Show 7A bank balance"
        className="inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-foreground/60 hover:bg-white hover:text-foreground hover:border-primary/45 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M5 18h14" />
          <path d="M7 18v-7M12 18v-7M17 18v-7" />
          <path d="M3.5 9.5 12 4l8.5 5.5z" />
        </svg>
      </button>
    );
  }

  return (
    <span className="relative inline-flex group/sa-balance">
      <button
        type="button"
        onClick={toggleBalanceHidden}
        aria-label={`Hide 7A bank balance — currently ${fmtMoneyShort(account.balance, account.currency)} (super admins only)`}
        className="inline-flex items-center gap-1.5 h-9 lg:h-10 pl-2.5 pr-3 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 text-foreground hover:bg-white hover:border-primary/45 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Same mask icon used in the sidebar's super-admin badge so a
            super admin instantly recognises the chip as restricted. */}
        <span aria-hidden="true" className="inline-flex items-center text-amber-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11c0-1 1-2 2-2h14c1 0 2 1 2 2v1c0 1-1 2-2 2h-3.2c-.4 1.6-1.9 2.7-3.8 2.7s-3.4-1.1-3.8-2.7H5c-1 0-2-1-2-2v-1z" />
            <circle cx="8.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/55">
          7A
        </span>
        <span className="text-[13px] font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
          {fmtMoneyShort(account.balance, account.currency)}
        </span>
      </button>

      {/* Hover popover. CSS-only so it appears instantly on hover —
          no native title-tooltip delay. Anchored to the right edge
          of the chip so it doesn't get clipped off-screen when the
          chip is itself near the right edge of the header.
          `invisible` (not just opacity-0) while closed so the Open
          Mercury link inside can't be clicked/tabbed/hovered through
          an invisible box; pt-2 (instead of an mt-2 gap) keeps hover
          alive while the pointer travels from chip to popover. */}
      <span
        role="tooltip"
        className="invisible absolute top-full right-0 pt-2 w-[320px] z-50 opacity-0 translate-y-1 group-hover/sa-balance:visible group-hover/sa-balance:opacity-100 group-hover/sa-balance:translate-y-0 transition-[opacity,transform] duration-150 ease-out text-left"
        style={{ fontFamily: 'var(--font-body)' }}
      >
       <span className="block rounded-xl bg-foreground/95 text-white shadow-xl backdrop-blur p-3">
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden="true" className="inline-flex items-center text-amber-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11c0-1 1-2 2-2h14c1 0 2 1 2 2v1c0 1-1 2-2 2h-3.2c-.4 1.6-1.9 2.7-3.8 2.7s-3.4-1.1-3.8-2.7H5c-1 0-2-1-2-2v-1z" />
              <circle cx="8.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-amber-200 font-semibold">
            Only available for super admins
          </span>
        </div>

        {admins.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/45 mb-1">
              Super admins
            </p>
            <p className="text-[12px] text-white/85 leading-snug">
              {admins.map((a) => a.full_name || a.email).join(' · ')}
            </p>
          </div>
        )}

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/45">
              Last 10 transactions
            </p>
            <p className="text-[11px] text-white/55 tabular-nums">
              {fmtMoneyShort(account.balance, account.currency)} balance
            </p>
          </div>
          {txns.length === 0 ? (
            <p className="text-[11px] text-white/45 italic">No transactions yet.</p>
          ) : (
            <ul className="space-y-1">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-white/55 tabular-nums w-9 shrink-0">
                    {fmtDate(t.posted_at ?? t.created_at_mercury)}
                  </span>
                  <span className="text-white/90 truncate flex-1">
                    {t.counterparty_name || '(no counterparty)'}
                  </span>
                  <span
                    className={`tabular-nums font-semibold shrink-0 ${
                      t.amount < 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {fmtMoneySigned(t.amount, t.currency || account.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The chip's click now toggles hide, so navigation moved here. */}
        <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between">
          <span className="text-[10px] text-white/40">Click the chip to hide it</span>
          <Link
            href="/feather/mercury"
            className="text-[11px] font-semibold text-amber-200 hover:text-amber-100 transition-colors"
          >
            Open Mercury →
          </Link>
        </div>
       </span>
      </span>
    </span>
  );
}
