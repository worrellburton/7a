'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { logActivity } from '@/lib/activity';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface FeatureRequest {
  id: string;
  text: string;
  done: boolean;
  done_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
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
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when ?new=1 is passed (from home dashboard button)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      inputRef.current?.focus();
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

  async function addRequest() {
    const text = newText.trim();
    if (!text || !user) return;
    setSaving(true);
    const payload = {
      text,
      done: false,
      created_by: user.id,
      created_by_name: (user.user_metadata?.full_name as string) || user.email || null,
    };
    const data = await db({ action: 'insert', table: 'feature_requests', data: payload });
    if (data && (data as FeatureRequest).id) {
      setRequests((prev) => [data as FeatureRequest, ...prev]);
      setNewText('');
      logActivity({
        userId: user.id,
        type: 'feature_request.created',
        targetKind: 'feature_request',
        targetId: (data as FeatureRequest).id,
        targetLabel: text.slice(0, 80),
        targetPath: '/app/kingdom-requests',
      });
    }
    setSaving(false);
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
    if (filter === 'open') return !r.done;
    if (filter === 'done') return r.done;
    return true;
  });

  const openCount = requests.filter((r) => !r.done).length;
  const doneCount = requests.filter((r) => r.done).length;

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Kingdom Requests</h1>
        </div>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Feature requests from the team. Type one in, we&apos;ll check it off when it ships.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequest(); } }}
            placeholder="Type a feature request and press Enter..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={addRequest}
            disabled={saving || !newText.trim()}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 mb-4">
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-foreground/40">
          <p className="text-sm font-medium">{filter === 'done' ? 'Nothing shipped yet.' : filter === 'open' ? 'No open requests.' : 'No requests yet.'}</p>
          {filter !== 'done' && <p className="text-xs mt-1">Type one in above to get started.</p>}
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {visible.map((r) => (
            <li key={r.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-warm-bg/40 transition-colors">
              <label className="flex items-center pt-0.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={r.done}
                  onChange={() => toggleDone(r)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </label>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${r.done ? 'line-through text-foreground/40' : 'text-foreground'}`}>{r.text}</p>
                <p className="text-[11px] text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {r.created_by_name || 'Someone'} &middot; {fmtWhen(r.created_at)}
                  {r.done && r.done_at && <span className="text-primary/70"> &middot; shipped {fmtWhen(r.done_at)}</span>}
                </p>
              </div>
              <button
                onClick={() => deleteRequest(r)}
                className="p-1.5 rounded-lg text-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
