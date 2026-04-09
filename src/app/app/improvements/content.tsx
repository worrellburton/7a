'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';

const locations = ['Lodge', 'Barn', 'Admin Building', 'Grounds', 'Other'] as const;

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Open' | 'In Progress' | 'Completed';
type SortKey = 'location' | 'issue' | 'priority' | 'status' | 'reported' | 'submitted_by' | 'daysOutstanding';
type SortDir = 'asc' | 'desc';

interface Issue {
  id: string;
  location: string;
  issue: string;
  priority: Priority;
  status: Status;
  reported: string;
  submitted_by: string;
  notes: string;
  photo_urls: string[];
}

function azDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

function formatDate(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });
  } catch { return d; }
}

function daysOutstanding(reported: string): number {
  const diff = Date.now() - new Date(reported + 'T12:00:00').getTime();
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
  const { user, session } = useAuth();
  const [items, setItems] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'list'>('table');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('reported');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ location: '', issue: '', priority: 'Medium' as Priority, notes: '' });
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string[]>([]);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editingIssueDraft, setEditingIssueDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchIssues = useCallback(async () => {
    try {
      const data = await db({ action: 'select', table: 'facilities_issues', order: { column: 'reported', ascending: false } });
      if (Array.isArray(data)) {
        setItems(data as Issue[]);
      } else {
        showToast(`Failed to load: ${data?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Fetch issues error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    fetchIssues();
    db({ action: 'select', table: 'users', select: 'full_name, avatar_url' }).then((data) => {
      if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach((u: { full_name: string | null; avatar_url: string | null }) => {
          if (u.full_name && u.avatar_url) map[u.full_name] = u.avatar_url;
        });
        setUserAvatars(map);
      }
    });
  }, [session, fetchIssues]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setNewPhotos((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setNewPhotoPreview((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!user) return null;

  const userName = user.user_metadata?.full_name || user.email || 'Unknown';

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  let filtered = items;
  if (filterStatus !== 'All') filtered = filtered.filter((i) => i.status === filterStatus);
  if (filterLocation !== 'All') filtered = filtered.filter((i) => i.location === filterLocation);

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'priority') return (priorityOrder[a.priority] - priorityOrder[b.priority]) * dir;
    if (sortKey === 'daysOutstanding') return (daysOutstanding(a.reported) - daysOutstanding(b.reported)) * dir;
    const aVal = a[sortKey as keyof Issue] as string;
    const bVal = b[sortKey as keyof Issue] as string;
    return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
  });

  const addItem = async () => {
    if (!newItem.location || !newItem.issue.trim()) return;
    setSubmitting(true);

    let photoUrls: string[] = [];
    for (const file of newPhotos) {
      const url = await uploadFile(file);
      if (url) photoUrls.push(url);
    }

    const row = {
      location: newItem.location,
      issue: newItem.issue.trim(),
      priority: newItem.priority,
      status: 'Open' as Status,
      reported: azDate(),
      submitted_by: userName,
      notes: newItem.notes.trim(),
      photo_urls: photoUrls,
    };

    const data = await db({ action: 'insert', table: 'facilities_issues', data: row });
    if (data && data.id) {
      setItems((prev) => [data as Issue, ...prev]);
      showToast('Issue reported');
    } else {
      showToast(`Failed to save: ${data?.error || 'Unknown error'}`);
    }

    setNewItem({ location: '', issue: '', priority: 'Medium', notes: '' });
    setNewPhotos([]);
    setNewPhotoPreview([]);
    setShowAddForm(false);
    setSubmitting(false);
  };

  const updateStatus = async (id: string, status: Status) => {
    await db({ action: 'update', table: 'facilities_issues', data: { status }, match: { id } });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const updatePriority = async (id: string, priority: Priority) => {
    await db({ action: 'update', table: 'facilities_issues', data: { priority }, match: { id } });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, priority } : i)));
  };

  const saveIssueText = async (id: string) => {
    const trimmed = editingIssueDraft.trim();
    if (!trimmed) { setEditingIssueId(null); return; }
    await db({ action: 'update', table: 'facilities_issues', data: { issue: trimmed }, match: { id } });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, issue: trimmed } : i)));
    setEditingIssueId(null);
  };

  const deleteIssue = async (id: string) => {
    if (!confirm('Delete this issue?')) return;
    await db({ action: 'delete', table: 'facilities_issues', match: { id } });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setExpandedId(null);
  };

  const SortIcon = ({ column }: { column: SortKey }) => (
    <svg className={`w-3.5 h-3.5 inline ml-1 ${sortKey === column ? 'text-foreground/60' : 'text-foreground/20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      {sortKey === column && sortDir === 'desc'
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />}
    </svg>
  );

  const columns: [SortKey, string][] = [
    ['location', 'Location'], ['issue', 'Issue'], ['submitted_by', 'Submitted By'],
    ['priority', 'Priority'], ['status', 'Status'], ['reported', 'Reported'], ['daysOutstanding', 'Days Out'],
  ];

  const Avatar = ({ name }: { name: string }) => userAvatars[name]
    ? <img src={userAvatars[name]} alt="" className="w-6 h-6 rounded-full shrink-0" />
    : <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">{(name || '?').charAt(0).toUpperCase()}</div>;

  const TrashButton = ({ id }: { id: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); deleteIssue(id); }}
      className="text-foreground/15 hover:text-red-500 transition-colors"
      aria-label="Delete issue"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  );

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Facilities</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Track improvements needed across all locations.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="w-10 h-10 rounded-xl bg-foreground text-white flex items-center justify-center hover:bg-foreground/80 transition-colors shadow-sm" aria-label="Add new issue">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" /></svg>
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">New Issue</h3>
            <button onClick={() => { const url = `${window.location.origin}/submit`; navigator.clipboard.writeText(url); alert(`Public link copied!\n${url}`); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Live Link
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="relative">
              <select value={newItem.location} onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary cursor-pointer" style={{ fontFamily: 'var(--font-body)' }}>
                <option value="">Select location...</option>
                {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div className="relative">
              <select value={newItem.priority} onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as Priority })} className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary cursor-pointer" style={{ fontFamily: 'var(--font-body)' }}>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <input type="text" placeholder="Describe the issue..." value={newItem.issue} onChange={(e) => setNewItem({ ...newItem, issue: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary mb-3" style={{ fontFamily: 'var(--font-body)' }} />
          <textarea placeholder="Additional notes (optional)" value={newItem.notes} onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary mb-4 resize-none" style={{ fontFamily: 'var(--font-body)' }} />
          <div className="mb-4">
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-foreground/50 hover:border-primary hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
              Add Photos
            </button>
            {newPhotoPreview.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {newPhotoPreview.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={photo} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                    <button onClick={() => { setNewPhotos((prev) => prev.filter((_, j) => j !== i)); setNewPhotoPreview((prev) => prev.filter((_, j) => j !== i)); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} disabled={submitting || !newItem.location || !newItem.issue.trim()} className="px-4 py-2 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>{submitting ? 'Submitting...' : 'Add Issue'}</button>
            <button onClick={() => { setShowAddForm(false); setNewItem({ location: '', issue: '', priority: 'Medium', notes: '' }); setNewPhotos([]); setNewPhotoPreview([]); }} className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter bar + view toggle */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative">
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer" style={{ fontFamily: 'var(--font-body)' }}>
              <option value="All">All Locations</option>
              {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer" style={{ fontFamily: 'var(--font-body)' }}>
              <option value="All">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <div className="ml-auto flex items-center gap-1 bg-warm-bg rounded-lg p-1">
            <button onClick={() => setView('table')} className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`} aria-label="Table view">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`} aria-label="List view">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading / Empty */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 && !showAddForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-warm-bg flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-foreground/25" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-16 0H3m2-10h4m-4 4h4m6-4h4m-4 4h4" /></svg>
          </div>
          <p className="text-sm font-medium text-foreground/50 mb-1">No issues reported yet</p>
          <p className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>Click the + button to report a new issue.</p>
        </div>
      ) : view === 'table' && sorted.length > 0 ? (
        /* ── TABLE VIEW ── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  {columns.map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)} className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider cursor-pointer hover:text-foreground/60 select-none whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                      {label}<SortIcon column={key} />
                    </th>
                  ))}
                  <th className="px-3 py-3.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <Fragment key={item.id}>
                    <tr onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className="border-b border-gray-50 hover:bg-warm-bg/50 transition-colors cursor-pointer group">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{item.location}</td>
                      <td className="px-5 py-3.5 text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }} onClick={(e) => e.stopPropagation()}>
                        {editingIssueId === item.id ? (
                          <input autoFocus value={editingIssueDraft} onChange={(e) => setEditingIssueDraft(e.target.value)} onBlur={() => saveIssueText(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveIssueText(item.id); if (e.key === 'Escape') setEditingIssueId(null); }} className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full max-w-[280px]" />
                        ) : (
                          <span className="inline-flex items-center gap-2 cursor-text hover:text-foreground transition-colors" onClick={() => { setEditingIssueId(item.id); setEditingIssueDraft(item.issue); }}>
                            {item.issue}
                            {item.photo_urls.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-foreground/30">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                                {item.photo_urls.length}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={item.submitted_by} />
                          <span className="text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{item.submitted_by}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <select value={item.priority} onChange={(e) => updatePriority(item.id, e.target.value as Priority)} className={`appearance-none px-2.5 py-1 pr-6 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${priorityStyle[item.priority]}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value as Status)} className={`appearance-none px-2.5 py-1 pr-6 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${statusStyle[item.status]}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}>
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{formatDate(item.reported)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground/60 text-center">
                        {item.status === 'Completed' ? <span className="text-emerald-600">Done</span> : <span className={daysOutstanding(item.reported) > 14 ? 'text-red-600' : ''}>{daysOutstanding(item.reported)}</span>}
                      </td>
                      <td className="px-3 py-3.5 opacity-0 group-hover:opacity-100 transition-opacity"><TrashButton id={item.id} /></td>
                    </tr>
                    {expandedId === item.id && (
                      <tr className="bg-warm-bg/30">
                        <td colSpan={8} className="px-5 py-4">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Notes</p>
                            <p className="text-sm text-foreground/70 mb-3" style={{ fontFamily: 'var(--font-body)' }}>{item.notes || 'No additional notes.'}</p>
                            {item.photo_urls.length > 0 && (
                              <>
                                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Photos</p>
                                <div className="flex gap-2 flex-wrap">
                                  {item.photo_urls.map((photo, i) => (
                                    <button key={i} onClick={(e) => { e.stopPropagation(); setViewingPhoto(photo); }}>
                                      <img src={photo} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer" />
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {sorted.length === 0 && <div className="text-center py-12"><p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No issues match these filters.</p></div>}
        </div>
      ) : view === 'list' && sorted.length > 0 ? (
        /* ── LIST / CARD VIEW ── */
        <div className="space-y-3">
          {sorted.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><TrashButton id={item.id} /></div>
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={item.submitted_by} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{item.location}</span>
                    <span className="text-xs text-foreground/30">·</span>
                    <span className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{formatDate(item.reported)}</span>
                  </div>
                  {editingIssueId === item.id ? (
                    <input autoFocus value={editingIssueDraft} onChange={(e) => setEditingIssueDraft(e.target.value)} onBlur={() => saveIssueText(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') saveIssueText(item.id); if (e.key === 'Escape') setEditingIssueId(null); }} className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full" />
                  ) : (
                    <p className="text-sm text-foreground/70 cursor-text hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }} onClick={() => { setEditingIssueId(item.id); setEditingIssueDraft(item.issue); }}>{item.issue}</p>
                  )}
                  {item.notes && <p className="text-xs text-foreground/40 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{item.notes}</p>}
                </div>
              </div>
              {item.photo_urls.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-3 ml-9">
                  {item.photo_urls.map((photo, i) => (
                    <button key={i} onClick={() => setViewingPhoto(photo)}>
                      <img src={photo} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 ml-9">
                <select value={item.priority} onChange={(e) => updatePriority(item.id, e.target.value as Priority)} className={`appearance-none px-2.5 py-1 pr-6 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none ${priorityStyle[item.priority]}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value as Status)} className={`appearance-none px-2.5 py-1 pr-6 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none ${statusStyle[item.status]}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
                {item.status !== 'Completed' && (
                  <span className={`text-xs font-medium ml-auto ${daysOutstanding(item.reported) > 14 ? 'text-red-600' : 'text-foreground/40'}`} style={{ fontFamily: 'var(--font-body)' }}>
                    {daysOutstanding(item.reported)}d outstanding
                  </span>
                )}
                {item.status === 'Completed' && <span className="text-xs font-medium text-emerald-600 ml-auto" style={{ fontFamily: 'var(--font-body)' }}>Completed</span>}
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 && items.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12">
          <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No issues match these filters.</p>
        </div>
      ) : null}

      {/* Photo lightbox */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <button onClick={() => setViewingPhoto(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={viewingPhoto} alt="" className="max-w-full max-h-[85vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl ${toast.startsWith('Failed') ? 'bg-red-600 text-white' : 'bg-foreground text-white'}`}>
            {!toast.startsWith('Failed') && <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
