'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useEffect, useState } from 'react';

interface Vehicle {
  id: string;
  vehicle_name: string;
  status: string;
  purpose: string | null;
  vehicle_type: string | null;
  tags: string | null;
  tags_expire_on: string | null;
  tags_renewed: boolean | null;
  vin_code: string | null;
  next_service: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  maintenance: 'bg-amber-50 text-amber-700',
  'out of service': 'bg-red-50 text-red-600',
};

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function FleetContent() {
  const { user, session } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      try {
        const data = await db({ action: 'select', table: 'fleet_vehicles', order: { column: 'vehicle_name', ascending: true } });
        if (Array.isArray(data)) setVehicles(data as Vehicle[]);
      } catch { /* DB unavailable */ }
      setLoading(false);
    }
    load();
  }, [session]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Fleet</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warm-bg/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="11" width="16" height="7" rx="2" />
              <path d="M17 11V7a2 2 0 0 1 2-2h1l3 5v7a1 1 0 0 1-1 1h-1" />
              <circle cx="6" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </div>
          <p className="text-foreground/40 text-sm" style={{ fontFamily: 'var(--font-body)' }}>No vehicles yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Vehicle</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden sm:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>VIN</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Tags</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Tags Expire</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden xl:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Next Service</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden xl:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Comments</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id} className="border-b border-gray-50 last:border-b-0 hover:bg-warm-bg/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-foreground whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{v.vehicle_name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[v.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel(v.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground/60 hidden sm:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{v.vehicle_type || <span className="text-foreground/20">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-foreground/60 hidden md:table-cell font-mono text-xs" style={{ fontFamily: 'var(--font-body)' }}>{v.vin_code || <span className="text-foreground/20">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-foreground/60 hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{v.tags || <span className="text-foreground/20">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-foreground/60 hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{v.tags_expire_on || <span className="text-foreground/20">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-foreground/60 hidden xl:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{v.next_service || <span className="text-foreground/20">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-foreground/60 hidden xl:table-cell max-w-[200px] truncate" style={{ fontFamily: 'var(--font-body)' }}>{v.comments || <span className="text-foreground/20">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
