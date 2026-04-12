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

interface AppUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  department_id: string | null;
}

export default function PagesContent() {
  const { user, session, isAdmin } = useAuth();
  const { pages, setPageAdminOnly, setPageDepartments, setPageDepartmentGroup, updatePageLayout } = usePagePermissions();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [permissionsFor, setPermissionsFor] = useState<string | null>(null); // path being edited
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set());
  const [dragOverDeptId, setDragOverDeptId] = useState<string | null>(null);
  const dragItem = useRef<{ path: string; section: 'nav' | 'popup' } | null>(null);
  const dragOverItem = useRef<{ path: string; section: 'nav' | 'popup' } | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function loadData() {
      const [deptData, userData] = await Promise.all([
        db({ action: 'select', table: 'departments', select: 'id, name, color', order: { column: 'name', ascending: true } }),
        db({ action: 'select', table: 'users', select: 'id, full_name, avatar_url, email, department_id' }),
      ]);
      if (Array.isArray(deptData)) setDepartments(deptData as Department[]);
      if (Array.isArray(userData)) setAllUsers(userData as AppUser[]);
    }
    loadData();
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

  function toggleAdminOnly(path: string) {
    const page = pages.find((p) => p.path === path);
    if (!page) return;
    setPageAdminOnly(path, !page.adminOnly);
    showToast(`${page.label} ${!page.adminOnly ? 'restricted to super admins' : 'open to all'}`);
  }

  const sorted = [...pages].sort((a, b) => a.sort_order - b.sort_order);
  const navPages = sorted.filter((p) => p.section === 'nav');
  const popupPages = sorted.filter((p) => p.section === 'popup');

  // Helpers for department/user display
  const getDeptName = (deptId: string) => departments.find(d => d.id === deptId)?.name || 'Unknown';
  const getDeptColor = (deptId: string) => departments.find(d => d.id === deptId)?.color || '#a0522d';
  const getUsersInDept = (deptId: string) => allUsers.filter(u => u.department_id === deptId);

  function handleDragStart(e: React.DragEvent, path: string, section: 'nav' | 'popup') {
    dragItem.current = { path, section };
    e.dataTransfer.setData('text/plain', path);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, path: string, section: 'nav' | 'popup') {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    dragOverItem.current = { path, section };
  }

  function handleDragOverSection(e: React.DragEvent, section: 'nav' | 'popup') {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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

    dragPage.section = overSection;

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
      filtered.forEach((p, i) => { p.sort_order = i; });
      list.length = 0;
      list.push(...filtered);
    }

    if (overSection === 'nav') reorder(newNav, dragPath, overPath);
    else reorder(newPopup, dragPath, overPath);

    newNav.forEach((p, i) => { p.sort_order = i; });
    newPopup.forEach((p, i) => { p.sort_order = i; });

    const final = [...newNav, ...newPopup];
    updatePageLayout(final);
    showToast(`Moved ${dragPage.label}`);

    dragItem.current = null;
    dragOverItem.current = null;
  }

  function handleDropOnDeptGroup(e: React.DragEvent, deptId: string | null) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDeptId(null);
    if (!dragItem.current) return;
    const dragPath = dragItem.current.path;
    const page = pages.find((p) => p.path === dragPath);
    if (!page) return;
    // Assign to the department group (or ungroup if null)
    setPageDepartmentGroup(dragPath, deptId);
    showToast(`${page.label} ${deptId ? `moved to ${getDeptName(deptId)}` : 'ungrouped'}`);
    // If dropping into a collapsed group, expand it
    if (deptId && collapsedDepts.has(deptId)) {
      setCollapsedDepts(prev => {
        const next = new Set(prev);
        next.delete(deptId);
        return next;
      });
    }
    dragItem.current = null;
    dragOverItem.current = null;
  }

  function toggleCollapseDept(deptId: string) {
    setCollapsedDepts(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  }

  function renderRow(page: PageConfig, indented = false) {
    const locked = page.path === '/app/users' || page.path === '/app/pages';
    const restricted = page.allowedDepartments.length > 0;
    return (
      <div
        key={page.path}
        draggable
        onDragStart={(e) => handleDragStart(e, page.path, page.section)}
        onDragOver={(e) => handleDragOver(e, page.path, page.section)}
        onDragEnd={() => { dragItem.current = null; dragOverItem.current = null; setDragOverDeptId(null); }}
        className={`flex items-center gap-4 py-3.5 border-b border-gray-100 last:border-b-0 hover:bg-warm-bg/30 transition-colors cursor-grab active:cursor-grabbing group ${indented ? 'pl-10 pr-5' : 'px-5'}`}
      >
        <svg className="w-4 h-4 text-foreground/20 shrink-0 group-hover:text-foreground/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
        <span className="text-foreground/40 shrink-0">{pageIcons[page.path] || null}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{page.label}</p>
          <p className="text-xs text-foreground/30 font-mono">{page.path}</p>
        </div>

        {/* Nav group selector */}
        {page.section === 'nav' && (
          <select
            value={page.departmentId || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value || null;
              setPageDepartmentGroup(page.path, val);
              showToast(`${page.label} ${val ? `moved to ${getDeptName(val)}` : 'ungrouped'}`);
            }}
            className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 bg-white text-foreground/60 focus:border-primary focus:outline-none cursor-pointer shrink-0"
            style={{ fontFamily: 'var(--font-body)' }}
            title="Move to group"
          >
            <option value="">No group</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {/* Super Admin Only toggle */}
        <button
          onClick={() => !locked && toggleAdminOnly(page.path)}
          disabled={locked}
          className={`relative w-5 h-5 rounded-full border-2 transition-all shrink-0 ${
            page.adminOnly
              ? 'bg-primary border-primary'
              : 'border-gray-300 hover:border-primary/50'
          } ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={`${page.adminOnly ? 'Remove' : 'Set'} super admin only for ${page.label}`}
          title={locked ? 'Always super admin only' : page.adminOnly ? 'Super admin only — click to open' : 'Click to restrict to super admins'}
        >
          {page.adminOnly && (
            <svg className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Department permissions chip */}
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
          {restricted ? (
            <>
              {page.allowedDepartments.map(deptId => {
                const deptUsers = getUsersInDept(deptId);
                return (
                  <span key={deptId} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getDeptColor(deptId) }}
                    />
                    <span>{getDeptName(deptId)}</span>
                    {deptUsers.length > 0 && (
                      <span className="flex -space-x-1.5 ml-0.5">
                        {deptUsers.slice(0, 4).map(u => (
                          <span key={u.id} className="relative group/avatar">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.full_name || u.email}
                                className="w-4 h-4 rounded-full border border-white"
                              />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[8px] font-bold flex items-center justify-center border border-white">
                                {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-lg bg-foreground text-white text-[10px] whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                              {u.full_name || u.email}
                            </span>
                          </span>
                        ))}
                        {deptUsers.length > 4 && (
                          <span className="w-4 h-4 rounded-full bg-gray-200 text-foreground/50 text-[8px] font-bold flex items-center justify-center border border-white">
                            +{deptUsers.length - 4}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                );
              })}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 019.9-1" />
              </svg>
              Everyone
            </>
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
              (() => {
                const ungrouped = navPages.filter(p => !p.departmentId);
                return (
                  <>
                    {/* Ungrouped pages */}
                    {ungrouped.map(p => renderRow(p))}

                    {/* All department groups (including empty ones for drop targets) */}
                    {departments.map(dept => {
                      const deptPages = navPages.filter(p => p.departmentId === dept.id);
                      const isCollapsed = collapsedDepts.has(dept.id);
                      const isDragOver = dragOverDeptId === dept.id;
                      return (
                        <div key={dept.id}>
                          {/* Department header row — drop target */}
                          <div
                            onClick={() => toggleCollapseDept(dept.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverDeptId(dept.id);
                            }}
                            onDragLeave={(e) => {
                              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                              setDragOverDeptId(null);
                            }}
                            onDrop={(e) => handleDropOnDeptGroup(e, dept.id)}
                            className={`flex items-center gap-3 px-5 py-3 border-b border-gray-100 cursor-pointer select-none transition-all ${
                              isDragOver
                                ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                                : 'bg-warm-bg/40 hover:bg-warm-bg/60'
                            }`}
                          >
                            <svg
                              className={`w-3.5 h-3.5 text-foreground/30 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: dept.color || '#a0522d' }}
                            />
                            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                              {dept.name}
                            </span>
                            <span className="text-[10px] text-foreground/30 ml-auto" style={{ fontFamily: 'var(--font-body)' }}>
                              {deptPages.length} page{deptPages.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {/* Pages in this group */}
                          {!isCollapsed && deptPages.map(p => renderRow(p, true))}
                        </div>
                      );
                    })}
                  </>
                );
              })()
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
              popupPages.map(p => renderRow(p))
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-foreground/30 mt-4" style={{ fontFamily: 'var(--font-body)' }}>
        The circle toggle restricts a page to super admins only.
        Click the permissions chip to restrict to specific departments. Empty means everyone
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
                  const deptUsers = getUsersInDept(d.id);
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
                        style={{ backgroundColor: d.color || '#a0522d' }}
                      />
                      <span className="text-sm font-medium text-foreground flex-1">{d.name}</span>
                      {/* Member avatars in modal */}
                      {deptUsers.length > 0 && (
                        <span className="flex -space-x-1.5">
                          {deptUsers.slice(0, 5).map(u => (
                            u.avatar_url ? (
                              <img key={u.id} src={u.avatar_url} alt={u.full_name || ''} className="w-5 h-5 rounded-full border-2 border-white" />
                            ) : (
                              <span key={u.id} className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center border-2 border-white">
                                {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                              </span>
                            )
                          ))}
                          {deptUsers.length > 5 && (
                            <span className="w-5 h-5 rounded-full bg-gray-200 text-foreground/50 text-[9px] font-bold flex items-center justify-center border-2 border-white">
                              +{deptUsers.length - 5}
                            </span>
                          )}
                        </span>
                      )}
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
