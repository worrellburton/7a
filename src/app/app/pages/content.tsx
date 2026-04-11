'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions, type PageConfig } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { pageIcons } from '../PlatformShell';

interface Department {
  id: string;
  name: string;
  color: string | null;
}

export default function PagesContent() {
  const { user, session, isAdmin } = useAuth();
  const { pages, setPageDepartments, updatePageLayout } = usePagePermissions();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissionsFor, setPermissionsFor] = useState<string | null>(null); // path being edited
  const dragItem = useRef<{ path: string; section: 'nav' | 'popup' } | null>(null);
  const dragOverItem = useRef<{ path: string; section: 'nav' | 'popup' } | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function loadDepartments() {
      const data = await db({
        action: 'select',
        table: 'departments',
        select: 'id, name, color',
        order: { column: 'name', ascending: true },
      });
      if (Array.isArray(data)) setDepartments(data as Department[]);
    }
    loadDepartments();
  }, [session]);

  if (!user || !isAdmin) {
    if (typeof window !== 'undefined') router.replace('/app');
    return null;
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const editingPage = permissionsFor ? pages.find((p) => p.path === permissionsFor) || null : null;

  function toggleDepartmentForPage(path: string, departmentId: string) {
    const page = pages.find((p) => p.path === path);
    if (!page) return;
    const set = new Set(page.allowedDepartments);
    if (set.has(departmentId)) set.delete(departmentId);
    else set.add(departmentId);
    setPageDepartments(path, Array.from(set));
  }

  function clearDepartmentsForPage(path: string) {
    setPageDepartments(path, []);
    const page = pages.find((p) => p.path === path);
    showToast(`${page?.label || path} is now visible to everyone`);
  }

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
    const restricted = page.allowedDepartments.length > 0;
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
          onClick={() => !locked && setPermissionsFor(page.path)}
          disabled={locked}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
            restricted
              ? 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
              : 'bg-warm-bg/60 text-foreground/50 hover:bg-warm-bg border border-gray-200'
          } ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ fontFamily: 'var(--font-body)' }}
          aria-label={`Set permissions for ${page.label}`}
          title={locked ? 'Always admin only' : 'Set department permissions'}
        >
          {/* Lock/shield icon */}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {restricted ? (
              <>
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </>
            ) : (
              <>
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 019.9-1" />
              </>
            )}
          </svg>
          {restricted
            ? `${page.allowedDepartments.length} dept${page.allowedDepartments.length === 1 ? '' : 's'}`
            : 'Everyone'}
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
        Click the permissions chip to restrict a page to specific departments. Empty means everyone
        sees it. Admins always see every page. Users, Pages, and Departments are always admin-only.
      </p>

      {/* Permissions modal */}
      {editingPage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="perm-modal-title"
        >
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setPermissionsFor(null)}
          />
          <div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="perm-modal-title"
              className="text-lg font-bold text-foreground mb-1"
            >
              {editingPage.label} permissions
            </h2>
            <p className="text-xs text-foreground/50 mb-5" style={{ fontFamily: 'var(--font-body)' }}>
              Pick the departments whose users can see <span className="font-mono">{editingPage.path}</span>.
              Leaving this empty means everyone can see it. Admins always have access.
            </p>

            {departments.length === 0 ? (
              <p className="text-sm text-foreground/40 py-4 text-center">
                No departments yet. Create some on the Departments page first.
              </p>
            ) : (
              <div className="space-y-1.5 mb-5">
                {departments.map((d) => {
                  const checked = editingPage.allowedDepartments.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDepartmentForPage(editingPage.path, d.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                        checked
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-white border-gray-200 hover:bg-warm-bg/30'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-primary border-primary text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {checked && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color || '#0071e3' }}
                      />
                      <span className="text-sm font-medium text-foreground flex-1">{d.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => clearDepartmentsForPage(editingPage.path)}
                className="text-xs font-semibold uppercase tracking-wider text-foreground/50 hover:text-foreground transition-colors px-2 py-1.5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Clear (everyone)
              </button>
              <button
                onClick={() => setPermissionsFor(null)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider text-white bg-primary hover:bg-primary-dark transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
