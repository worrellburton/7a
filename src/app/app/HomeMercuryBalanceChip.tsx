'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

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
  const { session, isSuperAdmin } = useAuth();
  const [account, setAccount] = useState<AccountRow | null>(null);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [admins, setAdmins] = useState<SuperAdminRow[]>([]);

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

  return (
    <span className="relative inline-flex group/sa-balance">
      <Link
        href="/app/mercury"
        aria-label={`7A bank balance — ${fmtMoneyShort(account.balance, account.currency)} (super admins only)`}
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
      </Link>

      {/* Hover popover. CSS-only so it appears instantly on hover —
          no native title-tooltip delay. Anchored to the right edge
          of the chip so it doesn't get clipped off-screen when the
          chip is itself near the right edge of the header. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 mt-2 w-[320px] z-50 opacity-0 translate-y-1 group-hover/sa-balance:opacity-100 group-hover/sa-balance:translate-y-0 transition-[opacity,transform] duration-150 ease-out rounded-xl bg-foreground/95 text-white shadow-xl backdrop-blur p-3 text-left"
        style={{ fontFamily: 'var(--font-body)' }}
      >
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
      </span>
    </span>
  );
}
