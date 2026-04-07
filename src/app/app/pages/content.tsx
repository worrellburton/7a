'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import { useRouter } from 'next/navigation';

export default function PagesContent() {
  const { user, isAdmin } = useAuth();
  const { pages, setPageAdminOnly } = usePagePermissions();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  if (!user || !isAdmin) {
    if (typeof window !== 'undefined') router.replace('/app');
    return null;
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggle = (path: string, currentAdminOnly: boolean) => {
    if (path === '/app/users' || path === '/app/pages') return;
    setPageAdminOnly(path, !currentAdminOnly);
    const page = pages.find((p) => p.path === path);
    showToast(`${page?.label || path} is now ${!currentAdminOnly ? 'admin only' : 'visible to all'}`);
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Pages</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Control which pages are visible to all users or restricted to admins.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-warm-bg/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Page</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Path</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Admin Only</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const locked = page.path === '/app/users' || page.path === '/app/pages';
              return (
                <tr key={page.path} className="border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{page.label}</td>
                  <td className="px-6 py-4 text-sm text-foreground/40 font-mono" style={{ fontSize: '12px' }}>{page.path}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggle(page.path, page.adminOnly)}
                      disabled={locked}
                      className={`w-5 h-5 rounded border-2 transition-colors inline-flex items-center justify-center ${
                        page.adminOnly
                          ? 'bg-primary border-primary text-white'
                          : 'border-gray-300 hover:border-primary/50'
                      } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={`Toggle admin only for ${page.label}`}
                    >
                      {page.adminOnly && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-foreground/30 mt-3" style={{ fontFamily: 'var(--font-body)' }}>
        Users and Pages are always admin-only and cannot be changed.
      </p>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
