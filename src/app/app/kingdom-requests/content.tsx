'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { logActivity } from '@/lib/activity';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import FeatureRequestModal from './FeatureRequestModal';

interface FeatureRequest {
  id: string;
  text: string;
  done: boolean;
  done_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  page_path: string | null;
  page_label: string | null;
  created_at: string;
  updated_at: string;
}

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function KingdomRequestsContent() {
  const { user, session } = useAuth();
  const { confirm } = useModal();
  const searchParams = useSearchParams();

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');
  const [pageFilter, setPageFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const data = await db({ action: 'select', table: 'feature_requests', order: { column: 'created_at', ascending: false } });
      if (Array.isArray(data)) setRequests(data as FeatureRequest[]);
      setLoading(false);
    }
    load();
  }, [session]);

  function onCreated(row: { id: string; text: string; page_path: string | null; page_label: string | null }) {
    // Reload to pick up the full row (done defaults to false on server)
    const row2: FeatureRequest = {
      id: row.id,
      text: row.text,
      done: false,
      done_at: null,
      created_by: user?.id || null,
      created_by_name: (user?.user_metadata?.full_name as string) || user?.email || null,
      page_path: row.page_path,
      page_label: row.page_label,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setRequests((prev) => [row2, ...prev]);
  }

  async function toggleDone(r: FeatureRequest) {
    const nextDone = !r.done;
    const res = await db({
      action: 'update',
      table: 'feature_requests',
      data: { done: nextDone, done_at: nextDone ? new Date().toISOString() : null },
      match: { id: r.id },
    });
    if (res && (res as { ok?: boolean }).ok) {
      setRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, done: nextDone, done_at: nextDone ? new Date().toISOString() : null } : x)));
      if (user) {
        logActivity({
          userId: user.id,
          type: nextDone ? 'feature_request.completed' : 'feature_request.reopened',
          targetKind: 'feature_request',
          targetId: r.id,
          targetLabel: r.text.slice(0, 80),
          targetPath: '/app/kingdom-requests',
        });
      }
    }
  }

  async function deleteRequest(r: FeatureRequest) {
    const ok = await confirm('Delete this request?', { message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    const res = await db({ action: 'delete', table: 'feature_requests', match: { id: r.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setRequests((prev) => prev.filter((x) => x.id !== r.id));
    }
  }

  const visible = requests.filter((r) => {
    if (filter === 'open' && r.done) return false;
    if (filter === 'done' && !r.done) return false;
    if (pageFilter) {
      const key = r.page_path || r.page_label || '';
      if (key !== pageFilter) return false;
    }
    return true;
  });

  const openCount = requests.filter((r) => !r.done).length;
  const doneCount = requests.filter((r) => r.done).length;

  const pageOptions = Array.from(
    new Set(requests.map((r) => r.page_path || r.page_label).filter((v): v is string => Boolean(v)))
  ).sort();
  const labelFor = (key: string) => {
    const r = requests.find((x) => (x.page_path || x.page_label) === key);
    return r?.page_label || key;
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Kingdom Requests</h1>
          </div>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Feature requests from the team. Check them off when they ship.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          <span className="hidden sm:inline">New request</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          {(['open', 'done', 'all'] as const).map((f) => {
            const count = f === 'open' ? openCount : f === 'done' ? doneCount : requests.length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${filter === f ? 'bg-primary text-white' : 'text-foreground/60 hover:bg-warm-bg'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {f === 'open' ? 'Open' : f === 'done' ? 'Done' : 'All'} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        {pageOptions.length > 0 && (
          <select
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-gray-200 text-xs font-semibold text-foreground/70 focus:border-primary focus:outline-none"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <option value="">All pages</option>
            {pageOptions.map((key) => <option key={key} value={key}>{labelFor(key)}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-foreground/40">
          <p className="text-sm font-medium">{filter === 'done' ? 'Nothing shipped yet.' : filter === 'open' ? 'No open requests.' : 'No requests yet.'}</p>
          {filter !== 'done' && <p className="text-xs mt-1">Click &quot;New request&quot; to add one.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-100 bg-warm-bg/30">
                <th className="w-10 px-3 py-3" />
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Request</th>
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Page</th>
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Submitted</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="group border-b border-gray-100 last:border-0 hover:bg-warm-bg/40 transition-colors">
                  <td className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={r.done}
                      onChange={() => toggleDone(r)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-3 sm:px-5 py-3">
                    <p className={`text-sm ${r.done ? 'line-through text-foreground/40' : 'text-foreground'}`}>{r.text}</p>
                    <div className="md:hidden mt-1 flex items-center gap-2 flex-wrap">
                      {r.page_label && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {r.page_label}
                        </span>
                      )}
                      <span className="text-[10px] text-foreground/40">{r.created_by_name || 'Someone'} · {fmtWhen(r.created_at)}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-5 py-3 hidden md:table-cell">
                    {r.page_label ? (
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {r.page_label}
                        {!r.page_path && <span className="ml-1 opacity-60">(new)</span>}
                      </span>
                    ) : (
                      <span className="text-[11px] text-foreground/30">—</span>
                    )}
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-xs text-foreground/60 hidden md:table-cell">
                    <div>{r.created_by_name || 'Someone'}</div>
                    <div className="text-[10px] text-foreground/40">{fmtWhen(r.created_at)}</div>
                    {r.done && r.done_at && <div className="text-[10px] text-primary/70">shipped {fmtWhen(r.done_at)}</div>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => deleteRequest(r)}
                      className="p-1.5 rounded-lg text-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <FeatureRequestModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={onCreated} />
    </div>
  );
}
