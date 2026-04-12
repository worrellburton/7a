'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: string;
  vehicle_name: string;
  status: string;
  purpose: string | null;
  vehicle_type: string | null;
  tags: string | null;
  tags_expire_on: string | null;
  tags_renewed: boolean;
  vin_code: string | null;
  next_service: string | null;
  comments: string | null;
  created_at: string;
}

type ViewMode = 'table' | 'grid';

const STATUS_OPTIONS = ['active', 'broken', 'in_repair'] as const;
const TYPE_OPTIONS = ['Van', 'Crossover', 'Bus', 'Truck', 'SUV', 'Cart', 'Trailer', 'Other'] as const;

function statusBadge(status: string) {
  const s = status.toLowerCase().replace(/\s+/g, '_');
  if (s === 'active') return { label: 'Active', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (s === 'broken') return { label: 'Broken', cls: 'bg-red-100 text-red-800 border-red-200' };
  if (s === 'in_repair') return { label: 'In Repair', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  return { label: status, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export default function FleetContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const [toast, setToast] = useState<string | null>(null);

  // Add vehicle form
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState('active');
  const [newPurpose, setNewPurpose] = useState('');
  const [newType, setNewType] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newVin, setNewVin] = useState('');
  const [newExpire, setNewExpire] = useState('');
  const [newNextService, setNewNextService] = useState('');
  const [newComments, setNewComments] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const data = await db({ action: 'select', table: 'fleet_vehicles', order: { column: 'vehicle_name', ascending: true } });
      if (Array.isArray(data)) setVehicles(data as Vehicle[]);
      setLoading(false);
    }
    load();
  }, [session]);

  async function addVehicle() {
    const name = newName.trim();
    if (!name) { showToast('Vehicle name is required'); return; }
    const row: Record<string, unknown> = {
      vehicle_name: name,
      status: newStatus || 'active',
      purpose: newPurpose.trim() || null,
      vehicle_type: newType || null,
      tags: newTags.trim() || null,
      vin_code: newVin.trim() || null,
      tags_expire_on: newExpire || null,
      next_service: newNextService || null,
      comments: newComments.trim() || null,
    };
    const result = await db({ action: 'insert', table: 'fleet_vehicles', data: row });
    if (result?.error) { showToast(`Failed: ${result.error}`); return; }
    setVehicles((prev) => [...prev, result as Vehicle].sort((a, b) => a.vehicle_name.localeCompare(b.vehicle_name)));
    resetForm();
    showToast(`${name} added`);
  }

  function resetForm() {
    setAdding(false);
    setNewName(''); setNewStatus('active'); setNewPurpose(''); setNewType('');
    setNewTags(''); setNewVin(''); setNewExpire(''); setNewNextService(''); setNewComments('');
  }

  async function deleteVehicle(v: Vehicle) {
    if (!window.confirm(`Delete ${v.vehicle_name}?`)) return;
    await db({ action: 'delete', table: 'fleet_vehicles', match: { id: v.id } });
    setVehicles((prev) => prev.filter((x) => x.id !== v.id));
    showToast(`${v.vehicle_name} deleted`);
  }

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Fleet</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Manage vehicles, track tags, service dates, and documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-full border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'table' ? 'bg-foreground text-white' : 'text-foreground/50 hover:bg-warm-bg'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" /></svg>
              Table
            </button>
            <button
              onClick={() => setView('grid')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'grid' ? 'bg-foreground text-white' : 'text-foreground/50 hover:bg-warm-bg'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
              Grid
            </button>
          </div>
          <button
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Add vehicle form */}
      {adding && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Vehicle Name *</label>
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addVehicle(); }}
                placeholder="2024 Ford Transit" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white" style={{ fontFamily: 'var(--font-body)' }}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusBadge(s).label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Purpose</label>
              <input value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)}
                placeholder="Transport, Facilities, etc." className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white" style={{ fontFamily: 'var(--font-body)' }}>
                <option value="">—</option>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Tags (Plate)</label>
              <input value={newTags} onChange={(e) => setNewTags(e.target.value)}
                placeholder="ABC 123" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Tags Expire On</label>
              <input type="date" value={newExpire} onChange={(e) => setNewExpire(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>VIN</label>
              <input value={newVin} onChange={(e) => setNewVin(e.target.value)}
                placeholder="1FBZX2ZM8GKA37773" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none font-mono" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Next Service</label>
              <input type="date" value={newNextService} onChange={(e) => setNewNextService(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Comments</label>
              <input value={newComments} onChange={(e) => setNewComments(e.target.value)}
                placeholder="Optional notes" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-xs font-semibold text-foreground/60 hover:text-foreground uppercase tracking-wider transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
            <button onClick={addVehicle} className="px-4 py-2 bg-foreground text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Add Vehicle</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.25"><rect x="2" y="10" width="20" height="8" rx="2" /><path d="M6 10V7a2 2 0 0 1 2-2h2l2 3h6a2 2 0 0 1 2 2v0" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
          <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            No vehicles yet. Add your first one to get started.
          </p>
        </div>
      ) : view === 'table' ? (
        /* ─── Table View ─── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/40">
                  {['Vehicle', 'Status', 'Purpose', 'Type', 'Tags', 'Expires', 'VIN', 'Next Service', 'Comments', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => {
                  const badge = statusBadge(v.status);
                  return (
                    <tr key={v.id} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/20 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground whitespace-nowrap">{v.vehicle_name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`} style={{ fontFamily: 'var(--font-body)' }}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{v.purpose || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{v.vehicle_type || '—'}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-foreground/70">{v.tags || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground/60 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{fmtDate(v.tags_expire_on)}</td>
                      <td className="px-5 py-3.5 text-[11px] font-mono text-foreground/50">{v.vin_code || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground/60 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{fmtDate(v.next_service)}</td>
                      <td className="px-5 py-3.5 text-xs text-foreground/50 max-w-[150px] truncate" style={{ fontFamily: 'var(--font-body)' }}>{v.comments || '—'}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => deleteVehicle(v)} className="text-foreground/20 hover:text-red-500 transition-colors" aria-label={`Delete ${v.vehicle_name}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t-2 border-gray-200 bg-warm-bg/30 px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
              {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      ) : (
        /* ─── Grid View ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const badge = statusBadge(v.status);
            return (
              <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warm-bg flex items-center justify-center">
                      <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><rect x="2" y="10" width="20" height="8" rx="2" /><path d="M6 10V7a2 2 0 0 1 2-2h2l2 3h6a2 2 0 0 1 2 2v0" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{v.vehicle_name}</p>
                      <p className="text-[11px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{v.vehicle_type || 'Vehicle'}{v.purpose ? ` · ${v.purpose}` : ''}</p>
                    </div>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${badge.cls}`} style={{ fontFamily: 'var(--font-body)' }}>{badge.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                  <div>
                    <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">Tags</span>
                    <p className="text-foreground/70 font-mono">{v.tags || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">Expires</span>
                    <p className="text-foreground/70">{fmtDate(v.tags_expire_on)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">VIN</span>
                    <p className="text-foreground/50 font-mono text-[10px] truncate">{v.vin_code || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider">Next Service</span>
                    <p className="text-foreground/70">{fmtDate(v.next_service)}</p>
                  </div>
                </div>

                {v.comments && (
                  <p className="text-xs text-foreground/40 truncate border-t border-gray-100 pt-2" style={{ fontFamily: 'var(--font-body)' }}>{v.comments}</p>
                )}

                <div className="flex justify-end">
                  <button onClick={() => deleteVehicle(v)} className="text-[11px] text-foreground/30 hover:text-red-500 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
