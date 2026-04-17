'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface HomeClient {
  id: string;
  name: string;
  avatar_url: string | null;
  status: string;
  admission_date: string | null;
  expected_admission_date: string | null;
  expected_discharge_date: string | null;
  primary_clinician: string | null;
  primary_substance: string | null;
  insurance_payer: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const n = Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000);
  return n;
}

function daysLeft(d: string | null): string | null {
  const n = daysUntil(d);
  if (n == null) return null;
  if (n <= 0) return 'Discharging today';
  if (n === 1) return '1 day left';
  return `${n} days left`;
}

export default function HomeClientsRow() {
  const { session } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<HomeClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      const data = await db({ action: 'select', table: 'fake_clients', order: { column: 'admission_date', ascending: false } });
      if (Array.isArray(data)) setClients(data as HomeClient[]);
      setLoading(false);
    })();
  }, [session]);

  if (loading || clients.length === 0) return null;

  const admitted = clients.filter((c) => c.status === 'admitted');
  const upcoming = clients.filter((c) => c.status === 'pending');

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 px-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
          Clients in care
        </p>
        <span className="text-[10px] text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
          {admitted.length} admitted{upcoming.length > 0 && ` · ${upcoming.length} admitting soon`}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Admitted clients */}
        <div className="flex items-center justify-center gap-3 flex-wrap flex-1">
          {admitted.map((c) => {
            const remaining = daysLeft(c.expected_discharge_date);
            return (
              <button
                key={c.id}
                onClick={() => router.push(`/app/clients/${c.id}`)}
                className="relative group"
                title={c.name}
              >
                {c.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.avatar_url} alt={c.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-primary/40 transition-all" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                    {c.name.charAt(0)}
                  </div>
                )}
                <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-xl px-3 py-2 min-w-[200px] text-left">
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap">{c.name}</p>
                    <p className="text-[11px] text-foreground/60 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                      Admitted {fmtDate(c.admission_date)}
                      {c.expected_discharge_date && <> · est. dc {fmtDate(c.expected_discharge_date)}</>}
                    </p>
                    {remaining && (
                      <p className="text-[11px] font-semibold text-primary mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                        {remaining}
                      </p>
                    )}
                    <p className="text-[11px] text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                      {c.primary_clinician || 'No clinician assigned'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Admitting soon — pinned right */}
        {upcoming.length > 0 && (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              Admitting soon
            </p>
            <div className="flex flex-col gap-1.5">
              {upcoming.map((c) => {
                const days = daysUntil(c.expected_admission_date);
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/app/clients/${c.id}`)}
                    className="group relative bg-white rounded-full border border-amber-300 shadow-sm pl-1 pr-3 py-1 flex items-center gap-2 hover:shadow-md transition-all"
                  >
                    {c.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={c.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-semibold text-foreground whitespace-nowrap">{c.name}</p>
                      <p className="text-[10px] text-amber-800 font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                        {days !== null && days <= 0 ? 'Arriving today' : days === 1 ? 'Tomorrow' : days ? `In ${days} days` : 'Pending'}
                      </p>
                    </div>
                    <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white rounded-xl border border-gray-100 shadow-xl px-3 py-2 min-w-[220px] text-left">
                        <p className="text-sm font-semibold text-foreground whitespace-nowrap">{c.name}</p>
                        <p className="text-[11px] text-foreground/60 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                          Expected {fmtDate(c.expected_admission_date)}
                          {c.expected_discharge_date && <> — {fmtDate(c.expected_discharge_date)}</>}
                        </p>
                        <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                          {c.primary_substance || '—'} · {c.insurance_payer || '—'}
                        </p>
                        <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                          {c.primary_clinician || 'No clinician assigned'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
