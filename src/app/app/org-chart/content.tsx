'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface OrgUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  is_admin: boolean;
  department_id: string | null;
  org_x: number | null;
  org_y: number | null;
}

interface Department {
  id: string;
  name: string;
  color: string | null;
}

// Card + canvas layout constants
const CARD_WIDTH = 220;
const CARD_HEIGHT = 110;
const GAP_X = 40;
const GAP_Y = 50;
const CANVAS_PADDING = 40;

function defaultPosition(index: number): { x: number; y: number } {
  const COLS = 4;
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: CANVAS_PADDING + col * (CARD_WIDTH + GAP_X),
    y: CANVAS_PADDING + row * (CARD_HEIGHT + GAP_Y),
  };
}

export default function OrgChartContent() {
  const { user, session, isAdmin } = useAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!session?.access_token) return;

    async function load() {
      const [userData, deptData] = await Promise.all([
        db({ action: 'select', table: 'users', order: { column: 'created_at', ascending: true } }),
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
      ]);
      if (Array.isArray(userData)) {
        // Hydrate default positions for users without saved coordinates
        const hydrated = userData.map((u: OrgUser, i: number) => {
          if (u.org_x == null || u.org_y == null) {
            const { x, y } = defaultPosition(i);
            return { ...u, org_x: x, org_y: y };
          }
          return u;
        });
        setUsers(hydrated);
      }
      if (Array.isArray(deptData)) setDepartments(deptData);
      setLoading(false);
    }
    load();
  }, [session]);

  const deptById = useMemo(() => {
    const m = new Map<string, Department>();
    for (const d of departments) m.set(d.id, d);
    return m;
  }, [departments]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, userId: string) => {
      if (!isAdmin) return;
      e.preventDefault();
      const target = users.find((u) => u.id === userId);
      if (!target) return;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const pointerX = e.clientX - canvasRect.left;
      const pointerY = e.clientY - canvasRect.top;
      dragOffset.current = {
        x: pointerX - (target.org_x ?? 0),
        y: pointerY - (target.org_y ?? 0),
      };
      setDraggingId(userId);
    },
    [isAdmin, users]
  );

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const pointerX = e.clientX - canvasRect.left;
      const pointerY = e.clientY - canvasRect.top;
      const nextX = Math.max(0, pointerX - dragOffset.current.x);
      const nextY = Math.max(0, pointerY - dragOffset.current.y);
      setUsers((prev) =>
        prev.map((u) => (u.id === draggingId ? { ...u, org_x: nextX, org_y: nextY } : u))
      );
    };

    const handleMouseUp = async () => {
      const target = users.find((u) => u.id === draggingId);
      setDraggingId(null);
      if (!target) return;
      const result = await db({
        action: 'update',
        table: 'users',
        data: { org_x: target.org_x, org_y: target.org_y },
        match: { id: target.id },
      });
      if (result?.error) showToast(`Failed to save: ${result.error}`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, users]);

  // Compute canvas extents so the scroll region grows with placement
  const canvasSize = useMemo(() => {
    let maxX = 800;
    let maxY = 500;
    for (const u of users) {
      if ((u.org_x ?? 0) + CARD_WIDTH + CANVAS_PADDING > maxX)
        maxX = (u.org_x ?? 0) + CARD_WIDTH + CANVAS_PADDING;
      if ((u.org_y ?? 0) + CARD_HEIGHT + CANVAS_PADDING > maxY)
        maxY = (u.org_y ?? 0) + CARD_HEIGHT + CANVAS_PADDING;
    }
    return { width: maxX, height: maxY };
  }, [users]);

  async function autoLayout() {
    if (!isAdmin) return;
    const next = users.map((u, i) => {
      const { x, y } = defaultPosition(i);
      return { ...u, org_x: x, org_y: y };
    });
    setUsers(next);
    // Batch update via multiple small updates; no upsert because users rows already exist.
    for (const u of next) {
      await db({
        action: 'update',
        table: 'users',
        data: { org_x: u.org_x, org_y: u.org_y },
        match: { id: u.id },
      });
    }
    showToast('Layout reset');
  }

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Org Chart</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {isAdmin
              ? 'Drag any card to rearrange the team. Changes save automatically.'
              : 'Team layout. Only admins can move cards.'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={autoLayout}
            className="px-4 py-2 bg-warm-bg text-foreground rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-warm-card transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Reset layout
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
          <div
            ref={canvasRef}
            className="relative select-none"
            style={{
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px',
              backgroundImage:
                'radial-gradient(circle, rgba(160, 82, 45, 0.07) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          >
            {users.map((u) => {
              const dept = u.department_id ? deptById.get(u.department_id) : null;
              const isDragging = draggingId === u.id;
              return (
                <div
                  key={u.id}
                  onMouseDown={(e) => handleMouseDown(e, u.id)}
                  className={`absolute bg-white rounded-2xl border transition-shadow ${
                    isDragging
                      ? 'border-primary shadow-2xl z-20 scale-[1.02]'
                      : 'border-gray-200 shadow-sm hover:shadow-md z-10'
                  } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                  style={{
                    left: (u.org_x ?? 0) + 'px',
                    top: (u.org_y ?? 0) + 'px',
                    width: CARD_WIDTH + 'px',
                    height: CARD_HEIGHT + 'px',
                    transitionProperty: 'box-shadow, transform, border-color',
                  }}
                >
                  <div className="p-4 h-full flex items-start gap-3">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full shrink-0" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: dept?.color || '#a0522d' }}
                      >
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {u.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-foreground/50 truncate mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                        {u.job_title || <span className="italic text-foreground/30">No title</span>}
                      </p>
                      {dept && (
                        <span
                          className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: dept.color || '#a0522d' }}
                        >
                          {dept.name}
                        </span>
                      )}
                      {u.is_admin && !dept && (
                        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                  No team members yet.
                </p>
              </div>
            )}
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
