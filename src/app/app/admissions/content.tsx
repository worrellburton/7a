'use client';

import { useMemo, useState } from 'react';

// Admissions — logistics board for incoming admissions. Tracks each upcoming
// arrival with transportation details, flight info, pickup arrangements, and
// readiness status. Organized by day so the admissions team can see the
// week ahead at a glance.

type TransportMode = 'airport_pickup' | 'personal_vehicle' | 'family_drop_off' | 'rideshare' | 'bus' | 'other';
type AdmissionStatus = 'confirmed' | 'tentative' | 'in_transit' | 'arrived' | 'cancelled';

interface Admission {
  id: string;
  client_name: string;
  arrival_date: string; // YYYY-MM-DD
  arrival_time: string | null; // HH:MM
  transport_mode: TransportMode;
  origin_city: string | null;
  flight_number: string | null;
  flight_arrival_airport: string | null;
  flight_arrival_time: string | null;
  driver_name: string | null;
  vehicle: string | null;
  coordinator: string | null;
  insurance: string | null;
  level_of_care: string | null;
  notes: string | null;
  status: AdmissionStatus;
}

const transportLabels: Record<TransportMode, string> = {
  airport_pickup: 'Airport Pickup',
  personal_vehicle: 'Personal Vehicle',
  family_drop_off: 'Family Drop-off',
  rideshare: 'Rideshare',
  bus: 'Bus',
  other: 'Other',
};

const transportStyle: Record<TransportMode, string> = {
  airport_pickup: 'bg-sky-50 text-sky-700 border-sky-200',
  personal_vehicle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  family_drop_off: 'bg-purple-50 text-purple-700 border-purple-200',
  rideshare: 'bg-amber-50 text-amber-700 border-amber-200',
  bus: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

const statusStyle: Record<AdmissionStatus, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  tentative: 'bg-amber-50 text-amber-700',
  in_transit: 'bg-blue-50 text-blue-700',
  arrived: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-700',
};

function sampleAdmissions(): Admission[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const plus = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
  return [
    {
      id: 'a1',
      client_name: 'M. Garcia',
      arrival_date: plus(0),
      arrival_time: '14:30',
      transport_mode: 'airport_pickup',
      origin_city: 'Chicago, IL',
      flight_number: 'AA 1247',
      flight_arrival_airport: 'PHX',
      flight_arrival_time: '13:45',
      driver_name: 'James K.',
      vehicle: 'Black Tahoe',
      coordinator: 'Bobby Burton',
      insurance: 'BCBS PPO',
      level_of_care: 'Residential',
      notes: 'Will need help with two large bags. Has service dog.',
      status: 'confirmed',
    },
    {
      id: 'a2',
      client_name: 'R. Chen',
      arrival_date: plus(0),
      arrival_time: '18:00',
      transport_mode: 'family_drop_off',
      origin_city: 'Scottsdale, AZ',
      flight_number: null,
      flight_arrival_airport: null,
      flight_arrival_time: null,
      driver_name: null,
      vehicle: null,
      coordinator: 'Pamela Calvo',
      insurance: 'Aetna',
      level_of_care: 'PHP',
      notes: 'Parents driving from Scottsdale.',
      status: 'confirmed',
    },
    {
      id: 'a3',
      client_name: 'D. Williams',
      arrival_date: plus(1),
      arrival_time: '10:15',
      transport_mode: 'airport_pickup',
      origin_city: 'Atlanta, GA',
      flight_number: 'DL 1832',
      flight_arrival_airport: 'PHX',
      flight_arrival_time: '09:30',
      driver_name: 'Rosa A.',
      vehicle: 'White Sprinter',
      coordinator: 'Bobby Burton',
      insurance: 'Cigna',
      level_of_care: 'Residential',
      notes: null,
      status: 'confirmed',
    },
    {
      id: 'a4',
      client_name: 'S. Patel',
      arrival_date: plus(2),
      arrival_time: null,
      transport_mode: 'rideshare',
      origin_city: 'Los Angeles, CA',
      flight_number: 'WN 2104',
      flight_arrival_airport: 'PHX',
      flight_arrival_time: '16:20',
      driver_name: null,
      vehicle: null,
      coordinator: 'Pamela Calvo',
      insurance: 'Private Pay',
      level_of_care: 'IOP',
      notes: 'Self-transport via Uber. Provide arrival instructions.',
      status: 'tentative',
    },
    {
      id: 'a5',
      client_name: 'T. Anderson',
      arrival_date: plus(3),
      arrival_time: '11:00',
      transport_mode: 'personal_vehicle',
      origin_city: 'Tucson, AZ',
      flight_number: null,
      flight_arrival_airport: null,
      flight_arrival_time: null,
      driver_name: null,
      vehicle: '2019 Silver Honda Accord',
      coordinator: 'Bobby Burton',
      insurance: 'United Healthcare',
      level_of_care: 'Residential',
      notes: null,
      status: 'confirmed',
    },
  ];
}

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const isSame = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (isSame(date, today)) return 'Today';
  if (isSame(date, tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(time: string | null): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const hh = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function AdmissionsContent() {
  const [admissions] = useState<Admission[]>(sampleAdmissions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdmissionStatus | 'all'>('all');

  const filtered = useMemo(() => (
    statusFilter === 'all' ? admissions : admissions.filter(a => a.status === statusFilter)
  ), [admissions, statusFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, Admission[]>();
    for (const a of [...filtered].sort((x, y) => (x.arrival_date + (x.arrival_time || '')).localeCompare(y.arrival_date + (y.arrival_time || '')))) {
      if (!map.has(a.arrival_date)) map.set(a.arrival_date, []);
      map.get(a.arrival_date)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: admissions.length,
      today: admissions.filter(a => a.arrival_date === today).length,
      airportPickups: admissions.filter(a => a.transport_mode === 'airport_pickup').length,
      tentative: admissions.filter(a => a.status === 'tentative').length,
    };
  }, [admissions]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Admissions</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Incoming arrivals, transportation, and pickup logistics.
        </p>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Scheduled" value={stats.total} />
        <StatCard label="Arriving Today" value={stats.today} accent="text-primary" />
        <StatCard label="Airport Pickups" value={stats.airportPickups} accent="text-sky-600" />
        <StatCard label="Tentative" value={stats.tentative} accent="text-amber-600" />
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pb-4 flex items-center gap-2 flex-wrap">
        {(['all', 'confirmed', 'tentative', 'in_transit', 'arrived'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-foreground text-white' : 'bg-white border border-gray-100 text-foreground/60 hover:border-primary/30'}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10 space-y-6">
        {byDay.length === 0 && (
          <div className="text-center py-16 text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            No admissions match this filter.
          </div>
        )}
        {byDay.map(([date, list]) => (
          <div key={date}>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-lg font-bold text-foreground">{formatDayLabel(date)}</h2>
              <span className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                {list.length} arrival{list.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
              {list.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}
                  className="w-full text-left px-5 py-4 hover:bg-warm-bg/30 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="w-16 shrink-0">
                      <p className="text-xl font-bold text-foreground tracking-tight">{formatTime(a.arrival_time)}</p>
                      {a.flight_arrival_time && <p className="text-[10px] text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>Flight {formatTime(a.flight_arrival_time)}</p>}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{a.client_name}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusStyle[a.status]}`}>
                          {a.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${transportStyle[a.transport_mode]}`}>
                          {transportLabels[a.transport_mode]}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/60 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                        {a.origin_city || '—'}
                        {a.flight_number && ` · Flight ${a.flight_number}`}
                        {a.level_of_care && ` · ${a.level_of_care}`}
                      </p>
                    </div>
                    <div className="text-right text-xs text-foreground/50 min-w-[140px]" style={{ fontFamily: 'var(--font-body)' }}>
                      {a.coordinator && <p>Coordinator: <span className="text-foreground/80">{a.coordinator}</span></p>}
                      {a.driver_name && <p>Driver: <span className="text-foreground/80">{a.driver_name}</span></p>}
                      {a.vehicle && <p className="text-foreground/40">{a.vehicle}</p>}
                    </div>
                  </div>
                  {selectedId === a.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                      <DetailField label="Insurance" value={a.insurance} />
                      <DetailField label="Level of Care" value={a.level_of_care} />
                      <DetailField label="Flight" value={a.flight_number ? `${a.flight_number} → ${a.flight_arrival_airport || ''}` : null} />
                      <DetailField label="Flight Arrival" value={a.flight_arrival_time ? formatTime(a.flight_arrival_time) : null} />
                      <div className="col-span-2 sm:col-span-4">
                        <DetailField label="Notes" value={a.notes} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value && String(value).trim() ? String(value) : '—';
  return (
    <div>
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-sm ${display === '—' ? 'text-foreground/30' : 'text-foreground/80'}`} style={{ fontFamily: 'var(--font-body)' }}>{display}</p>
    </div>
  );
}
