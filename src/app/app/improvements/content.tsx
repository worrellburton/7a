'use client';

import { Fragment, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

const locations = ['Lodge', 'Barn', 'Admin Building', 'Grounds', 'Other'] as const;

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Open' | 'In Progress' | 'Completed';
type SortKey = 'location' | 'issue' | 'priority' | 'status' | 'reported' | 'submittedBy' | 'daysOutstanding';
type SortDir = 'asc' | 'desc';

interface Improvement {
  id: number;
  location: string;
  issue: string;
  priority: Priority;
  status: Status;
  reported: string;
  submittedBy: string;
  notes: string;
}

function daysOutstanding(reported: string): number {
  const diff = Date.now() - new Date(reported).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const priorityOrder: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

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
  const [items, setItems] = useState<Improvement[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('reported');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ location: '', issue: '', priority: 'Medium' as Priority, notes: '' });

  if (!user) return null;

  const userName = user.user_metadata?.full_name || user.email || 'Unknown';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = filterStatus === 'All' ? items : items.filter((i) => i.status === filterStatus);

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'priority') return (priorityOrder[a.priority] - priorityOrder[b.priority]) * dir;
    if (sortKey === 'daysOutstanding') return (daysOutstanding(a.reported) - daysOutstanding(b.reported)) * dir;
    const aVal = a[sortKey as keyof Improvement] as string;
    const bVal = b[sortKey as keyof Improvement] as string;
    return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
  });

  const addItem = () => {
    if (!newItem.location || !newItem.issue.trim()) return;
    const item: Improvement = {
      id: Date.now(),
      location: newItem.location,
      issue: newItem.issue.trim(),
      priority: newItem.priority,
      status: 'Open',
      reported: new Date().toISOString().split('T')[0],
      submittedBy: userName,
      notes: newItem.notes.trim(),
    };
    setItems([item, ...items]);
    setNewItem({ location: '', issue: '', priority: 'Medium', notes: '' });
    setShowAddForm(false);
  };

  const SortIcon = ({ column }: { column: SortKey }) => (
    <svg className={`w-3.5 h-3.5 inline ml-1 ${sortKey === column ? 'text-foreground/60' : 'text-foreground/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      {sortKey === column && sortDir === 'desc'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      }
    </svg>
  );

  const columns: [SortKey, string][] = [
    ['location', 'Location'],
    ['issue', 'Issue'],
    ['submittedBy', 'Submitted By'],
    ['priority', 'Priority'],
    ['status', 'Status'],
    ['reported', 'Reported'],
    ['daysOutstanding', 'Days Out'],
  ];

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Facilities</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Track improvements needed across all locations.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-10 h-10 rounded-xl bg-foreground text-white flex items-center justify-center hover:bg-foreground/80 transition-colors shadow-sm"
          aria-label="Add new issue"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
          </svg>
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-bold text-foreground mb-4">New Issue</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <select
              value={newItem.location}
              onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="">Select location...</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <select
              value={newItem.priority}
              onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as Priority })}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Describe the issue..."
            value={newItem.issue}
            onChange={(e) => setNewItem({ ...newItem, issue: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <textarea
            placeholder="Additional notes (optional)"
            value={newItem.notes}
            onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary mb-4 resize-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={addItem}
              className="px-4 py-2 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Add Issue
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewItem({ location: '', issue: '', priority: 'Medium', notes: '' }); }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:bg-warm-bg transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      {items.length > 0 && (
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
      )}

      {/* Table or empty state */}
      {items.length === 0 && !showAddForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-warm-bg flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-foreground/25" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2-10h4m-4 4h4m6-4h4m-4 4h4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground/50 mb-1">No issues reported yet</p>
          <p className="text-xs text-foreground/30 mb-5" style={{ fontFamily: 'var(--font-body)' }}>
            Click the + button to report a new issue.
          </p>
        </div>
      ) : items.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  {columns.map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider cursor-pointer hover:text-foreground/60 select-none whitespace-nowrap"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {label}
                      <SortIcon column={key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <Fragment key={item.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="border-b border-gray-50 hover:bg-warm-bg/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{item.location}</td>
                      <td className="px-5 py-3.5 text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{item.issue}</td>
                      <td className="px-5 py-3.5 text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{item.submittedBy}</td>
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
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground/60 text-center">
                        {item.status === 'Completed' ? (
                          <span className="text-emerald-600">Done</span>
                        ) : (
                          <span className={daysOutstanding(item.reported) > 14 ? 'text-red-600' : ''}>
                            {daysOutstanding(item.reported)}
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr className="bg-warm-bg/30">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="flex items-start gap-6">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Notes</p>
                              <p className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
                                {item.notes || 'No additional notes.'}
                              </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {item.status !== 'In Progress' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setItems(items.map(i => i.id === item.id ? { ...i, status: 'In Progress' } : i)); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  Mark In Progress
                                </button>
                              )}
                              {item.status !== 'Completed' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setItems(items.map(i => i.id === item.id ? { ...i, status: 'Completed' } : i)); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  Mark Complete
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setItems(items.filter(i => i.id !== item.id)); setExpandedId(null); }}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No issues match this filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
