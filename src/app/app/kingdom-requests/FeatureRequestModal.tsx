'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { usePagePermissions } from '@/lib/PagePermissions';
import { useEffect, useRef, useState } from 'react';

const NEW_PAGE = '__new__';

interface FeatureRequestModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (row: { id: string; text: string; page_path: string | null; page_label: string | null }) => void;
  defaultPagePath?: string | null;
}

export default function FeatureRequestModal({ open, onClose, onCreated, defaultPagePath }: FeatureRequestModalProps) {
  const { user } = useAuth();
  const { pages } = usePagePermissions();

  const [text, setText] = useState('');
  const [pagePath, setPagePath] = useState<string>('');
  const [newPageLabel, setNewPageLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setNewPageLabel('');
      setPagePath(defaultPagePath || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultPagePath]);

  const sortedPages = [...pages].sort((a, b) => {
    if (a.section !== b.section) return a.section === 'nav' ? -1 : 1;
    return a.sort_order - b.sort_order;
  });

  async function submit() {
    if (!user) return;
    const body = text.trim();
    if (!body) return;
    setSaving(true);

    let page_path: string | null = null;
    let page_label: string | null = null;
    if (pagePath === NEW_PAGE) {
      page_label = newPageLabel.trim() || 'New page';
      page_path = null;
    } else if (pagePath) {
      const match = pages.find((p) => p.path === pagePath);
      page_path = pagePath;
      page_label = match?.label || null;
    }

    const payload = {
      text: body,
      done: false,
      created_by: user.id,
      created_by_name: (user.user_metadata?.full_name as string) || user.email || null,
      page_path,
      page_label,
    };
    const data = await db({ action: 'insert', table: 'feature_requests', data: payload });
    if (data && (data as { id?: string }).id) {
      const row = data as { id: string; text: string; page_path: string | null; page_label: string | null };
      logActivity({
        userId: user.id,
        type: 'feature_request.created',
        targetKind: 'feature_request',
        targetId: row.id,
        targetLabel: body.slice(0, 80),
        targetPath: '/app/kingdom-requests',
        metadata: { page_path, page_label },
      });
      onCreated?.(row);
      onClose();
    }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <h2 className="text-lg font-bold text-foreground">New feature request</h2>
          </div>
          <p className="text-xs text-foreground/50 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
            Tell us what to build. You can tag it to a page so we know where it belongs.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Request</label>
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
                }}
                rows={4}
                placeholder="What should we build?"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Page</label>
              <select
                value={pagePath}
                onChange={(e) => setPagePath(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">— No page —</option>
                {sortedPages.map((p) => (
                  <option key={p.path} value={p.path}>{p.label}</option>
                ))}
                <option value={NEW_PAGE}>+ New page</option>
              </select>
            </div>

            {pagePath === NEW_PAGE && (
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>New page name</label>
                <input
                  value={newPageLabel}
                  onChange={(e) => setNewPageLabel(e.target.value)}
                  placeholder="e.g. Volunteers"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={submit}
              disabled={saving || !text.trim() || (pagePath === NEW_PAGE && !newPageLabel.trim())}
              className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {saving ? 'Submitting…' : 'Submit'}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 text-foreground/50 text-sm font-medium hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
              Cancel
            </button>
            <span className="ml-auto text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>⌘/Ctrl + Enter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
