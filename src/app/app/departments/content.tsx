'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department_id: string | null;
}

const palette = [
  '#a0522d', // primary
  '#c67a4a',
  '#d4a574',
  '#6b8e4e',
  '#4a7a8c',
  '#8e4a6b',
  '#c9a227',
  '#5c6bc0',
];

export default function DepartmentsContent() {
  const { user, session, isAdmin } = useAuth();
  const router = useRouter();
  const { confirm } = useModal();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(palette[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null);
  const [dragUserId, setDragUserId] = useState<string | null>(null);
  // Drop-target id: a department UUID, 'unassigned', or null.
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Drag-and-drop handlers. dataTransfer carries the user id so the browser
  // can still relay it if our React state gets interrupted.
  function onUserDragStart(e: React.DragEvent<HTMLDivElement>, userId: string) {
    e.dataTransfer.setData('text/plain', userId);
    e.dataTransfer.effectAllowed = 'move';
    setDragUserId(userId);
  }

  function onUserDragEnd() {
    setDragUserId(null);
    setDragOverTargetId(null);
  }

  function onTargetDragOver(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    if (!dragUserId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTargetId !== targetId) setDragOverTargetId(targetId);
  }

  function onTargetDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear when the pointer actually exits this element (not on entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOverTargetId((curr) => (curr ? null : curr));
  }

  async function onTargetDrop(
    e: React.DragEvent<HTMLDivElement>,
    departmentId: string | null
  ) {
    e.preventDefault();
    const userId = e.dataTransfer.getData('text/plain') || dragUserId;
    setDragUserId(null);
    setDragOverTargetId(null);
    if (!userId) return;
    const current = users.find((u) => u.id === userId);
    if (!current) return;
    if (current.department_id === departmentId) return; // no-op
    await assignUser(userId, departmentId);
  }

  useEffect(() => {
    if (!session?.access_token) return;
    if (!isAdmin) {
      router.replace('/app');
      return;
    }

    async function load() {
      const [deptData, userData] = await Promise.all([
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
        db({ action: 'select', table: 'users', order: { column: 'full_name', ascending: true } }),
      ]);
      if (Array.isArray(deptData)) setDepartments(deptData);
      if (Array.isArray(userData)) setUsers(userData);
      setLoading(false);
    }
    load();
  }, [session, isAdmin, router]);

  async function createDepartment() {
    const name = newName.trim();
    if (!name) {
      showToast('Name is required');
      return;
    }
    const row = {
      name,
      description: newDescription.trim() || null,
      color: newColor,
    };
    const result = await db({ action: 'insert', table: 'departments', data: row });
    if (result?.error) {
      showToast(`Failed to create: ${result.error}`);
      return;
    }
    setDepartments((prev) => [...prev, result as Department].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
    setNewDescription('');
    setNewColor(palette[0]);
    setCreating(false);
    showToast(`${name} created`);
  }

  async function deleteDepartment(id: string, name: string) {
    const ok = await confirm(`Delete ${name}?`, {
      message: 'Users in this department will become unassigned.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const result = await db({ action: 'delete', table: 'departments', match: { id } });
    if (result?.error) {
      showToast(`Failed to delete: ${result.error}`);
      return;
    }
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    setUsers((prev) => prev.map((u) => (u.department_id === id ? { ...u, department_id: null } : u)));
    showToast(`${name} deleted`);
  }

  async function saveEdit(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const result = await db({ action: 'update', table: 'departments', data: { name: trimmed }, match: { id } });
    if (result?.error) {
      showToast(`Failed to update: ${result.error}`);
      return;
    }
    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name: trimmed } : d)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingId(null);
  }

  async function assignUser(userId: string, departmentId: string | null) {
    const result = await db({ action: 'update', table: 'users', data: { department_id: departmentId }, match: { id: userId } });
    if (result?.error) {
      showToast(`Failed to assign: ${result.error}`);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, department_id: departmentId } : u)));
    const dept = departments.find((d) => d.id === departmentId);
    const person = users.find((u) => u.id === userId);
    showToast(`${person?.full_name || 'User'} assigned to ${dept?.name || '—'}`);
  }

  if (!user || !isAdmin) return null;

  const membersByDept = departments.reduce<Record<string, AppUser[]>>((acc, d) => {
    acc[d.id] = users.filter((u) => u.department_id === d.id);
    return acc;
  }, {});
  const unassigned = users.filter((u) => !u.department_id);

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Departments</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Drag people between departments and the unassigned pool, or use the dropdowns.
          </p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Department
        </button>
      </div>

      {creating && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createDepartment(); }}
                placeholder="Clinical, Operations, etc."
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Description</label>
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional"
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Color</label>
              <div className="flex flex-wrap gap-2">
                {palette.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Pick color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <button
              onClick={() => { setCreating(false); setNewName(''); setNewDescription(''); }}
              className="px-4 py-2 text-xs font-semibold text-foreground/60 hover:text-foreground uppercase tracking-wider transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
            <button
              onClick={createDepartment}
              className="px-4 py-2 bg-foreground text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-primary-dark transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Create
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${unassigned.length > 0 ? 'lg:grid-cols-3' : ''} gap-5`}>
          {/* Department cards */}
          <div className={`${unassigned.length > 0 ? 'lg:col-span-2' : ''} space-y-4`}>
            {departments.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                  No departments yet. Create your first one to get started.
                </p>
              </div>
            ) : (
              departments.map((d) => {
                const members = membersByDept[d.id] || [];
                const expanded = expandedDeptId === d.id;
                const isDropTarget = dragOverTargetId === d.id;
                return (
                  <div
                    key={d.id}
                    onDragOver={(e) => onTargetDragOver(e, d.id)}
                    onDragLeave={onTargetDragLeave}
                    onDrop={(e) => onTargetDrop(e, d.id)}
                    className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                      isDropTarget
                        ? 'border-primary ring-2 ring-primary/30 scale-[1.01]'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="p-5 flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: d.color || '#a0522d' }}
                      >
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === d.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => saveEdit(d.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(d.id); if (e.key === 'Escape') setEditingId(null); }}
                            className="w-full text-base font-semibold text-foreground px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
                            style={{ fontFamily: 'var(--font-body)' }}
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingId(d.id); setEditingName(d.name); }}
                            className="text-base font-semibold text-foreground text-left hover:text-primary transition-colors"
                          >
                            {d.name}
                          </button>
                        )}
                        {d.description && (
                          <p className="text-xs text-foreground/50 mt-0.5 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                            {d.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Member avatars inline */}
                        {members.length > 0 && (
                          <div className="flex -space-x-2">
                            {members.slice(0, 6).map((m) => (
                              <div key={m.id} className="relative group/avatar">
                                {m.avatar_url ? (
                                  <img
                                    src={m.avatar_url}
                                    alt={m.full_name || m.email}
                                    className="w-7 h-7 rounded-full border-2 border-white"
                                  />
                                ) : (
                                  <div
                                    className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                                    style={{ backgroundColor: d.color || '#a0522d' }}
                                  >
                                    {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                {/* Tooltip */}
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-lg bg-foreground text-white text-[10px] whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                                  {m.full_name || m.email}
                                  {m.job_title ? ` — ${m.job_title}` : ''}
                                </span>
                              </div>
                            ))}
                            {members.length > 6 && (
                              <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-foreground/50 text-[10px] font-bold">
                                +{members.length - 6}
                              </div>
                            )}
                          </div>
                        )}
                        <span className="text-xs font-medium text-foreground/40 tabular-nums" style={{ fontFamily: 'var(--font-body)' }}>
                          {members.length}
                        </span>
                        <button
                          onClick={() => setExpandedDeptId(expanded ? null : d.id)}
                          className="text-foreground/30 hover:text-foreground transition-colors"
                          aria-label={expanded ? 'Collapse' : 'Expand'}
                        >
                          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteDepartment(d.id, d.name)}
                          className="text-foreground/20 hover:text-red-500 transition-colors"
                          aria-label={`Delete ${d.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <div className="border-t border-gray-100 bg-warm-bg/30 p-5">
                        {members.length === 0 ? (
                          <p className="text-xs text-foreground/40 italic mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                            No members yet. Add someone from the list on the right.
                          </p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {members.map((m) => (
                              <div
                                key={m.id}
                                draggable
                                onDragStart={(e) => onUserDragStart(e, m.id)}
                                onDragEnd={onUserDragEnd}
                                className={`flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100 cursor-grab active:cursor-grabbing ${
                                  dragUserId === m.id ? 'opacity-40' : ''
                                }`}
                              >
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                    {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{m.full_name || m.email}</p>
                                  {m.job_title && <p className="text-[10px] text-foreground/40 truncate">{m.job_title}</p>}
                                </div>
                                <button
                                  onClick={() => assignUser(m.id, null)}
                                  className="text-xs text-foreground/40 hover:text-red-500 transition-colors"
                                  aria-label={`Remove ${m.full_name || m.email}`}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {unassigned.length > 0 && (
                          <div>
                            <label className="block text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                              Add unassigned user
                            </label>
                            <select
                              value=""
                              onChange={(e) => { if (e.target.value) assignUser(e.target.value, d.id); }}
                              className="text-xs px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white w-full max-w-xs"
                              style={{ fontFamily: 'var(--font-body)' }}
                            >
                              <option value="">Pick a user…</option>
                              {unassigned.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Unassigned panel — only visible when there are unassigned users or during drag */}
          {(unassigned.length > 0 || dragUserId) && (
            <div
              onDragOver={(e) => onTargetDragOver(e, 'unassigned')}
              onDragLeave={onTargetDragLeave}
              onDrop={(e) => onTargetDrop(e, null)}
              className={`bg-white rounded-2xl shadow-sm border p-5 h-fit lg:sticky lg:top-5 transition-all ${
                dragOverTargetId === 'unassigned'
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Unassigned</h2>
                <span className="text-[11px] font-medium text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                  {unassigned.length}
                </span>
              </div>
              {unassigned.length === 0 ? (
                <p className="text-xs text-foreground/40 italic" style={{ fontFamily: 'var(--font-body)' }}>
                  Drop here to unassign.
                </p>
              ) : (
                <div className="space-y-2">
                  {unassigned.map((u) => (
                    <div
                      key={u.id}
                      draggable
                      onDragStart={(e) => onUserDragStart(e, u.id)}
                      onDragEnd={onUserDragEnd}
                      className={`flex items-center gap-2.5 cursor-grab active:cursor-grabbing ${
                        dragUserId === u.id ? 'opacity-40' : ''
                      }`}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-warm-bg flex items-center justify-center text-foreground/50 text-[10px] font-bold shrink-0">
                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{u.full_name || u.email}</p>
                      </div>
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) assignUser(u.id, e.target.value); }}
                        className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white max-w-[100px]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <option value="">Assign…</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
