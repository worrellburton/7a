'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export interface Client {
  id: string;
  name: string;
  pronouns: string | null;
  date_of_birth: string | null;
  age: number | null;
  primary_substance: string | null;
  admission_date: string | null;
  expected_admission_date: string | null;
  expected_discharge_date: string | null;
  status: string;
  admission_type: string | null;
  asam_level: string | null;
  mrn: string | null;
  primary_clinician: string | null;
  insurance_payer: string | null;
  avatar_url: string | null;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  admitted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  discharged: 'bg-slate-50 text-slate-700 border-slate-200',
  on_leave: 'bg-blue-50 text-blue-700 border-blue-200',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysIn(admissionDate: string | null): string {
  if (!admissionDate) return '—';
  const n = Math.floor((Date.now() - new Date(admissionDate + 'T00:00:00').getTime()) / 86400000);
  return `${n}d`;
}

export default function ClientsContent() {
  const { session } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'admission_date' | 'mrn' | 'status' | 'primary_clinician'>('admission_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('clients:viewMode') : null;
    if (saved === 'list' || saved === 'grid') setViewMode(saved);
  }, []);
  function changeViewMode(m: 'list' | 'grid') {
    setViewMode(m);
    try { window.localStorage.setItem('clients:viewMode', m); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const data = await db({ action: 'select', table: 'fake_clients', order: { column: 'admission_date', ascending: false } });
      if (Array.isArray(data)) setClients(data as Client[]);
      setLoading(false);
    }
    load();
  }, [session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = clients.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.mrn || '').toLowerCase().includes(q) ||
        (c.primary_clinician || '').toLowerCase().includes(q) ||
        (c.insurance_payer || '').toLowerCase().includes(q)
      );
    });
    const cmp = (a: Client, b: Client): number => {
      const pick = (c: Client) => {
        if (sortBy === 'name') return c.name || '';
        if (sortBy === 'admission_date') return c.admission_date || '';
        if (sortBy === 'mrn') return c.mrn || '';
        if (sortBy === 'status') return c.status || '';
        return c.primary_clinician || '';
      };
      const va = pick(a), vb = pick(b);
      if (va === vb) return 0;
      return va < vb ? -1 : 1;
    };
    const sorted = [...rows].sort(cmp);
    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [clients, search, statusFilter, sortBy, sortDir]);

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      {/* Test-data banner */}
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Not real information</p>
          <p className="text-xs mt-0.5 text-amber-800/80" style={{ fontFamily: 'var(--font-body)' }}>
            Every client on this page is fabricated for testing. No PHI, no real people — names, insurance details, auth numbers, and addresses are all fake.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Clients</h1>
          <p className="text-xs sm:text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {clients.filter((c) => c.status === 'admitted').length} in care · {clients.filter((c) => c.status === 'pending').length} admitting soon
          </p>
        </div>
        <div className="inline-flex items-center gap-1 bg-warm-bg rounded-lg p-1">
          <button
            onClick={() => changeViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
            aria-label="Spreadsheet view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
          </button>
          <button
            onClick={() => changeViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, MRN…" className="flex-1 min-w-[200px] max-w-sm px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
          <option value="">All statuses</option>
          <option value="admitted">Admitted</option>
          <option value="pending">Pending</option>
          <option value="discharged">Discharged</option>
          <option value="on_leave">On leave</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <p className="text-sm font-medium">No clients match your filters.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/30">
                  {([
                    { key: 'name', label: 'Name', alwaysShow: true },
                    { key: 'mrn', label: 'MRN', alwaysShow: false },
                    { key: 'status', label: 'Status', alwaysShow: true },
                    { key: 'admission_date', label: 'Admitted', alwaysShow: false },
                    { key: 'primary_clinician', label: 'Primary Clinician', alwaysShow: false },
                  ] as const).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => {
                        if (sortBy === col.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        else { setSortBy(col.key); setSortDir(col.key === 'admission_date' ? 'desc' : 'asc'); }
                      }}
                      className={`text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider cursor-pointer select-none hover:text-foreground/80 transition-colors ${col.alwaysShow ? '' : 'hidden md:table-cell'}`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortBy === col.key && (
                          <svg className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" /></svg>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Payer</th>
                  <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>LOS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-warm-bg/40 transition-colors cursor-pointer" onClick={() => router.push(`/app/clients/${c.id}`)}>
                    <td className="px-3 sm:px-5 py-3">
                      <div className="flex items-center gap-3">
                        {c.avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                          <div className="text-[11px] text-foreground/40 truncate">{c.pronouns || ''}{c.age ? ` · Age ${c.age}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-xs text-foreground/60 font-mono hidden md:table-cell">{c.mrn || '—'}</td>
                    <td className="px-3 sm:px-5 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[c.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {c.status === 'admitted' ? 'Admitted' : c.status === 'pending' ? 'Admitting soon' : c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-xs text-foreground/60 hidden md:table-cell">
                      {c.status === 'pending' ? (
                        <span>Expected {fmtDate(c.expected_admission_date)}</span>
                      ) : (
                        fmtDate(c.admission_date)
                      )}
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-xs text-foreground/70 hidden md:table-cell">{c.primary_clinician || '—'}</td>
                    <td className="px-3 sm:px-5 py-3 text-xs text-foreground/60 hidden lg:table-cell">{c.insurance_payer || '—'}</td>
                    <td className="px-3 sm:px-5 py-3 text-xs text-foreground/60 hidden lg:table-cell">{c.status === 'admitted' ? daysIn(c.admission_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/app/clients/${c.id}`)}
              className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                {c.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {c.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-[11px] text-foreground/40 truncate">{c.mrn || '—'} · {c.pronouns || ''}{c.age ? ` · ${c.age}` : ''}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] || 'bg-gray-50 text-gray-700 border-gray-200'} shrink-0`}>
                  {c.status === 'admitted' ? 'In care' : c.status === 'pending' ? 'Soon' : c.status}
                </span>
              </div>
              <div className="space-y-1.5 text-[11px] text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
                <div className="flex justify-between gap-2"><span className="text-foreground/40">Primary</span><span className="truncate">{c.primary_clinician || '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-foreground/40">Payer</span><span className="truncate">{c.insurance_payer || '—'}</span></div>
                <div className="flex justify-between gap-2"><span className="text-foreground/40">Admitted</span><span>{c.status === 'pending' ? `${fmtDate(c.expected_admission_date)} (est.)` : fmtDate(c.admission_date)}</span></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
