'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions, type PageConfig } from '@/lib/PagePermissions';
import { useRouter } from 'next/navigation';
import { pageIcons } from '../PlatformShell';

export default function PagesContent() {
  const { user, isAdmin } = useAuth();
  const { pages, setPageAdminOnly, updatePageLayout } = usePagePermissions();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const dragItem = useRef<{ path: string; section: 'nav' | 'popup' } | null>(null);
  const dragOverItem = useRef<{ path: string; section: 'nav' | 'popup' } | null>(null);

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

  const sorted = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  const navPages = sorted.filter((p) => p.section === 'nav');
  const popupPages = sorted.filter((p) => p.section === 'popup');

  function handleDragStart(e: React.DragEvent, path: string, section: 'nav' | 'popup') {
    dragItem.current = { path, section };
    // Firefox requires dataTransfer to be set or dragstart is cancelled.
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, path: string, section: 'nav' | 'popup') {
    e.preventDefault();
    // Stop bubble so the section handler doesn't clobber our precise target
    // with '__end__' — that was the bug making everything drop at the bottom.
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    dragOverItem.current = { path, section };
  }

  function handleDragOverSection(e: React.DragEvent, section: 'nav' | 'popup') {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Only treat a section-level dragover as "drop at end" when it isn't
    // already pointing at a row in this section.
    const current = dragOverItem.current;
    if (!current || current.section !== section) {
      dragOverItem.current = { path: '__end__', section };
    }
  }

  function handleDrop(e: React.DragEvent, targetSection: 'nav' | 'popup') {
    e.preventDefault();
    if (!dragItem.current || !dragOverItem.current) return;

    const dragPath = dragItem.current.path;
    const overPath = dragOverItem.current.path;
    const overSection = dragOverItem.current.section;

    const updated = pages.map((p) => ({ ...p }));
    const dragPage = updated.find((p) => p.path === dragPath);
    if (!dragPage) return;

    // Move to new section
    dragPage.section = overSection;

    // Recompute sort orders for both sections
    const newNav = updated.filter((p) => p.section === 'nav').sort((a, b) => a.sort_order - b.sort_order);
    const newPopup = updated.filter((p) => p.section === 'popup').sort((a, b) => a.sort_order - b.sort_order);

    function reorder(list: PageConfig[], movedPath: string, targetPath: string) {
      const moved = list.find((p) => p.path === movedPath);
      if (!moved) return;
      const filtered = list.filter((p) => p.path !== movedPath);
      if (targetPath === '__end__') {
        filtered.push(moved);
      } else {
        const idx = filtered.findIndex((p) => p.path === targetPath);
        if (idx >= 0) filtered.splice(idx, 0, moved);
        else filtered.push(moved);
      }
      // Re-assign sort_order
      filtered.forEach((p, i) => { p.sort_order = i; });
      // Copy back
      list.length = 0;
      list.push(...filtered);
    }

    if (overSection === 'nav') reorder(newNav, dragPath, overPath);
    else reorder(newPopup, dragPath, overPath);

    // Reassign sort_order for both
    newNav.forEach((p, i) => { p.sort_order = i; });
    newPopup.forEach((p, i) => { p.sort_order = i; });

    const final = [...newNav, ...newPopup];
    updatePageLayout(final);
    showToast(`Moved ${dragPage.label}`);

    dragItem.current = null;
    dragOverItem.current = null;
  }

  function renderRow(page: PageConfig) {
    const locked = page.path === '/app/users' || page.path === '/app/pages';
    return (
      <div
        key={page.path}
        draggable
        onDragStart={(e) => handleDragStart(e, page.path, page.section)}
        onDragOver={(e) => handleDragOver(e, page.path, page.section)}
        onDragEnd={() => { dragItem.current = null; dragOverItem.current = null; }}
        className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors cursor-grab active:cursor-grabbing group"
      >
        <svg className="w-4 h-4 text-foreground/20 shrink-0 group-hover:text-foreground/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
        <span className="text-foreground/40 shrink-0">{pageIcons[page.path] || null}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{page.label}</p>
          <p className="text-xs text-foreground/30 font-mono">{page.path}</p>
        </div>
        <button
          onClick={() => handleToggle(page.path, page.adminOnly)}
          disabled={locked}
          className={`w-5 h-5 rounded border-2 transition-colors inline-flex items-center justify-center shrink-0 ${
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
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Pages</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Drag pages between sections to reorganize. Reorder by dragging within a section.
        </p>
      </div>

      <div className="space-y-6">
        {/* Sidebar Navigation Section */}
        <div>
          <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-1" style={{ fontFamily: 'var(--font-body)' }}>
            Sidebar Navigation
          </h2>
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            onDragOver={(e) => handleDragOverSection(e, 'nav')}
            onDrop={(e) => handleDrop(e, 'nav')}
          >
            {navPages.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                Drag pages here to show in the sidebar
              </div>
            ) : (
              navPages.map(renderRow)
            )}
          </div>
        </div>

        {/* Popup Menu Section */}
        <div>
          <h2 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 px-1" style={{ fontFamily: 'var(--font-body)' }}>
            Popup Menu
          </h2>
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            onDragOver={(e) => handleDragOverSection(e, 'popup')}
            onDrop={(e) => handleDrop(e, 'popup')}
          >
            {popupPages.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                Drag pages here to show in the popup menu
              </div>
            ) : (
              popupPages.map(renderRow)
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-foreground/30 mt-4" style={{ fontFamily: 'var(--font-body)' }}>
        Users and Pages are always admin-only and cannot be changed. Changes apply to all users.
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
