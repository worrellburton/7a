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
// Sits next to HomeDailyLogsChip / HomeHardwareChip in the home
// header's right cluster. Links to /app/mercury. The mask icon +
// 'Only available for Super Admins' tooltip match the sidebar
// badge so it reads as the same affordance.

interface AccountRow {
  balance: number | null;
  currency: string | null;
}

function fmtMoney(amount: number, currency: string | null): string {
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

export default function HomeMercuryBalanceChip() {
  const { session, isSuperAdmin } = useAuth();
  const [account, setAccount] = useState<AccountRow | null>(null);

  useEffect(() => {
    if (!session?.access_token || !isSuperAdmin) return;
    let cancelled = false;
    void (async () => {
      // 7A is the operating checking account identified by the last-4
      // '5394'. Pulled by last-4 instead of nickname so a future
      // rename in Mercury doesn't break the chip.
      const { data } = await supabase
        .from('mercury_accounts')
        .select('balance, currency')
        .eq('account_number_last4', '5394')
        .maybeSingle();
      if (cancelled) return;
      if (data) setAccount(data as AccountRow);
    })();
    return () => { cancelled = true; };
  }, [session?.access_token, isSuperAdmin]);

  if (!isSuperAdmin) return null;
  if (!account || account.balance == null) return null;

  return (
    <Link
      href="/app/mercury"
      title="Only available for Super Admins"
      aria-label={`7A bank balance — ${fmtMoney(account.balance, account.currency)} (super admins only)`}
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
        {fmtMoney(account.balance, account.currency)}
      </span>
    </Link>
  );
}
