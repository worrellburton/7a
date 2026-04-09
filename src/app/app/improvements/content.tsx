'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

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
  const { user, session } = useAuth();
  const [items, setItems] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All');
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
        console.error('Failed to fetch issues:', data);
        showToast(`Failed to load: ${data?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Fetch issues error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.access_token) fetchIssues();
  }, [session, fetchIssues]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setNewPhotos((prev) => [...prev, ...newFiles]);

    // Generate previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewPhotoPreview((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    const aVal = a[sortKey as keyof Issue] as string;
    const bVal = b[sortKey as keyof Issue] as string;
    return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
  });

  async function uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `issues/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('issue-photos').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('issue-photos').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  }

  const addItem = async () => {
    if (!newItem.location || !newItem.issue.trim()) return;
    setSubmitting(true);

    let photoUrls: string[] = [];
    if (newPhotos.length > 0) {
      photoUrls = await uploadPhotos(newPhotos);
    }

    const row = {
      location: newItem.location,
      issue: newItem.issue.trim(),
      priority: newItem.priority,
      status: 'Open' as Status,
      reported: new Date().toISOString().split('T')[0],
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

  const deleteIssue = async (id: string) => {
    await db({ action: 'delete', table: 'facilities_issues', match: { id } });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setExpandedId(null);
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
    ['submitted_by', 'Submitted By'],
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">New Issue</h3>
            <button
              onClick={() => {
                const url = `${window.location.origin}/submit`;
                navigator.clipboard.writeText(url);
                alert(`Public link copied!\n${url}`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Live Link
            </button>
          </div>
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
          {/* Photo upload */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-foreground/50 hover:border-primary hover:text-primary transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Add Photos
            </button>
            {newPhotoPreview.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {newPhotoPreview.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={photo} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                    <button
                      onClick={() => {
                        setNewPhotos((prev) => prev.filter((_, j) => j !== i));
                        setNewPhotoPreview((prev) => prev.filter((_, j) => j !== i));
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addItem}
              disabled={submitting || !newItem.location || !newItem.issue.trim()}
              className="px-4 py-2 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {submitting ? 'Submitting...' : 'Add Issue'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewItem({ location: '', issue: '', priority: 'Medium', notes: '' }); setNewPhotos([]); setNewPhotoPreview([]); }}
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

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 && !showAddForm ? (
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
                      <td className="px-5 py-3.5 text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="inline-flex items-center gap-2">
                          {item.issue}
                          {item.photo_urls.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-foreground/30">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                              {item.photo_urls.length}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{item.submitted_by}</td>
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
                              <p className="text-sm text-foreground/70 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                                {item.notes || 'No additional notes.'}
                              </p>
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
                            <div className="flex gap-2 shrink-0">
                              {item.status !== 'In Progress' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'In Progress'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  Mark In Progress
                                </button>
                              )}
                              {item.status !== 'Completed' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateStatus(item.id, 'Completed'); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  Mark Complete
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteIssue(item.id); }}
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
      {/* Photo lightbox */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={viewingPhoto}
            alt=""
            className="max-w-full max-h-[85vh] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl ${
            toast.startsWith('Failed') ? 'bg-red-600 text-white' : 'bg-foreground text-white'
          }`}>
            {!toast.startsWith('Failed') && (
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
