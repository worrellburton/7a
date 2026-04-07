'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Open' | 'In Progress' | 'Completed';

interface Improvement {
  id: number;
  facility: string;
  issue: string;
  priority: Priority;
  status: Status;
  reported: string;
}

const improvements: Improvement[] = [
  { id: 1, facility: 'Mesa', issue: 'HVAC system needs replacement in Wing B', priority: 'High', status: 'In Progress', reported: '2026-03-15' },
  { id: 2, facility: 'Scottsdale', issue: 'Exterior lighting upgrade for parking area', priority: 'Medium', status: 'Open', reported: '2026-03-20' },
  { id: 3, facility: 'Phoenix', issue: 'Flooring replacement in common area', priority: 'Medium', status: 'Open', reported: '2026-03-22' },
  { id: 4, facility: 'Tucson', issue: 'Roof leak repair in therapy room 3', priority: 'High', status: 'In Progress', reported: '2026-03-10' },
  { id: 5, facility: 'Mesa', issue: 'ADA ramp installation at east entrance', priority: 'High', status: 'Open', reported: '2026-03-28' },
  { id: 6, facility: 'Scottsdale', issue: 'Landscaping refresh for courtyard garden', priority: 'Low', status: 'Completed', reported: '2026-02-14' },
  { id: 7, facility: 'Phoenix', issue: 'Fire alarm system update', priority: 'High', status: 'Completed', reported: '2026-02-20' },
  { id: 8, facility: 'Tucson', issue: 'Paint touch-up in residential hallways', priority: 'Low', status: 'Open', reported: '2026-04-01' },
  { id: 9, facility: 'Mesa', issue: 'Kitchen appliance replacement', priority: 'Medium', status: 'Open', reported: '2026-04-03' },
  { id: 10, facility: 'Scottsdale', issue: 'Window seal repairs in group room', priority: 'Medium', status: 'In Progress', reported: '2026-03-05' },
];

const priorityStyle: Record<Priority, string> = {
  High: 'bg-red-50 text-red-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-green-50 text-green-700',
};

const statusStyle: Record<Status, string> = {
  Open: 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  Completed: 'bg-emerald-50 text-emerald-700',
};

export default function ImprovementsContent() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('All');

  if (!user) return null;

  const filtered = filterStatus === 'All' ? improvements : improvements.filter((i) => i.status === filterStatus);

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Facilities</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Track improvements needed across all locations.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        {['All', 'Open', 'In Progress', 'Completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === status
                ? 'bg-foreground text-white'
                : 'bg-white text-foreground/60 hover:bg-warm-card border border-gray-100'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Facility</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Issue</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Priority</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Status</th>
                <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Reported</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-warm-bg/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{item.facility}</td>
                  <td className="px-5 py-3.5 text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{item.issue}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${priorityStyle[item.priority]}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{item.reported}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No improvements match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
