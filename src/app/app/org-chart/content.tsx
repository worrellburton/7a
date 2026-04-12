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
  org_hidden: boolean | null;
}

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface Edge {
  id: string;
  from_user_id: string;
  to_user_id: string;
}

// Card + canvas layout constants
const CARD_WIDTH = 220;
const CARD_HEIGHT = 110;
const GAP_X = 40;
const GAP_Y = 50;
const CANVAS_PADDING = 40;

type ConnectMode =
  | { kind: 'off' }
  | { kind: 'pickingFrom' }
  | { kind: 'pickingTo'; fromId: string };

function defaultPosition(index: number): { x: number; y: number } {
  const COLS = 4;
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: CANVAS_PADDING + col * (CARD_WIDTH + GAP_X),
    y: CANVAS_PADDING + row * (CARD_HEIGHT + GAP_Y),
  };
}

// Midpoint of an elbow path — used for edge box-select hit-testing so an
// edge is counted as "in the box" when its elbow bend lies inside.
function elbowMidpoint(
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number } {
  const sx = from.x + CARD_WIDTH / 2;
  const sy = from.y + CARD_HEIGHT;
  const tx = to.x + CARD_WIDTH / 2;
  const ty = to.y;
  if (ty < sy) {
    return { x: (sx + tx) / 2, y: sy + 20 };
  }
  return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
}

export default function OrgChartContent() {
  const { user, session, isAdmin } = useAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [connectMode, setConnectMode] = useState<ConnectMode>({ kind: 'off' });
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  // Multi-selection state. Cards and edges can be selected independently
  // via click-drag box select, shift-click, or shift-click on edges.
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  // Active box-select rectangle in canvas-local coordinates. Null when
  // not currently drawing.
  const [boxSelect, setBoxSelect] = useState<
    { startX: number; startY: number; curX: number; curY: number } | null
  >(null);
  // Drag bookkeeping — starting positions of every card being dragged
  // (one for single-card drag, many for group drag) plus the pointer
  // location when the drag began. mousemove re-applies `pointer - start`
  // to every card in the map.
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragStartPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!session?.access_token) return;

    async function load() {
      const [userData, deptData, edgeData] = await Promise.all([
        db({ action: 'select', table: 'users', order: { column: 'created_at', ascending: true } }),
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
        db({ action: 'select', table: 'org_chart_edges' }),
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
      if (Array.isArray(edgeData)) setEdges(edgeData);
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
      // In connect mode, a mousedown on a card picks it as from/to — don't drag.
      if (connectMode.kind !== 'off') return;
      // Stop the canvas mousedown from firing and starting a box-select.
      e.stopPropagation();
      e.preventDefault();

      // Shift-click toggles a card's membership in the selection without starting a drag.
      if (e.shiftKey) {
        setSelectedUserIds((prev) => {
          const next = new Set(prev);
          if (next.has(userId)) next.delete(userId);
          else next.add(userId);
          return next;
        });
        return;
      }

      const target = users.find((u) => u.id === userId);
      if (!target) return;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const pointerX = e.clientX - canvasRect.left;
      const pointerY = e.clientY - canvasRect.top;

      // If the clicked card is part of a multi-selection, group-drag all
      // selected cards. Otherwise, clear any existing selection and drag
      // just this card.
      const map = new Map<string, { x: number; y: number }>();
      if (selectedUserIds.has(userId) && selectedUserIds.size > 1) {
        for (const id of selectedUserIds) {
          const u = users.find((x) => x.id === id);
          if (u) map.set(id, { x: u.org_x ?? 0, y: u.org_y ?? 0 });
        }
      } else {
        // Clicking an unselected (or solo-selected) card clears the selection.
        setSelectedUserIds(new Set());
        setSelectedEdgeIds(new Set());
        map.set(userId, { x: target.org_x ?? 0, y: target.org_y ?? 0 });
      }
      dragStartPositions.current = map;
      dragStartPointer.current = { x: pointerX, y: pointerY };
      dragMoved.current = false;
      setDraggingId(userId);
    },
    [isAdmin, users, connectMode, selectedUserIds]
  );

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const pointerX = e.clientX - canvasRect.left;
      const pointerY = e.clientY - canvasRect.top;
      const dx = pointerX - dragStartPointer.current.x;
      const dy = pointerY - dragStartPointer.current.y;
      dragMoved.current = true;
      setUsers((prev) =>
        prev.map((u) => {
          const start = dragStartPositions.current.get(u.id);
          if (!start) return u;
          return {
            ...u,
            org_x: Math.max(0, start.x + dx),
            org_y: Math.max(0, start.y + dy),
          };
        })
      );
    };

    const handleMouseUp = async () => {
      const movedIds = Array.from(dragStartPositions.current.keys());
      setDraggingId(null);
      if (!dragMoved.current) return;
      // Snapshot current positions and persist each moved card.
      for (const id of movedIds) {
        const u = users.find((x) => x.id === id);
        if (!u) continue;
        const result = await db({
          action: 'update',
          table: 'users',
          data: { org_x: u.org_x, org_y: u.org_y },
          match: { id: u.id },
        });
        if (result?.error) {
          showToast(`Failed to save: ${result.error}`);
          break;
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, users]);

  // Click handler for connect-mode card picking
  const handleCardClick = useCallback(
    async (userId: string) => {
      if (!isAdmin) return;
      if (connectMode.kind === 'off') return;
      if (connectMode.kind === 'pickingFrom') {
        setConnectMode({ kind: 'pickingTo', fromId: userId });
        return;
      }
      if (connectMode.kind === 'pickingTo') {
        const fromId = connectMode.fromId;
        if (userId === fromId) {
          showToast('Pick a different card for the target');
          return;
        }
        // Prevent duplicate edges in either direction
        if (edges.some((e) => e.from_user_id === fromId && e.to_user_id === userId)) {
          showToast('Connection already exists');
          setConnectMode({ kind: 'pickingFrom' });
          return;
        }
        const result = await db({
          action: 'insert',
          table: 'org_chart_edges',
          data: { from_user_id: fromId, to_user_id: userId },
        });
        if (result?.error) {
          showToast(`Failed to connect: ${result.error}`);
        } else if (result && !Array.isArray(result) && 'id' in result) {
          setEdges((prev) => [...prev, result as Edge]);
          showToast('Connected');
        }
        setConnectMode({ kind: 'pickingFrom' });
      }
    },
    [isAdmin, connectMode, edges]
  );

  // Start a box-select when the mousedown lands on empty canvas space
  // (i.e. not on a card, not on an edge hit region). Disabled during
  // connect mode so clicks still pick cards.
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isAdmin) return;
      if (connectMode.kind !== 'off') return;
      // Only react when the hit target is the canvas itself or the
      // background SVG — cards/edges call stopPropagation or sit in
      // higher layers.
      const target = e.target as Element;
      if (target !== canvasRef.current && target.tagName !== 'svg') return;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      // Clear any previous selection unless the shift key is held.
      if (!e.shiftKey) {
        setSelectedUserIds(new Set());
        setSelectedEdgeIds(new Set());
      }
      setBoxSelect({ startX: x, startY: y, curX: x, curY: y });
    },
    [isAdmin, connectMode]
  );

  // While a box-select is active, listen for mousemove to update the
  // rectangle, and mouseup to commit the selection.
  useEffect(() => {
    if (!boxSelect) return;
    const startShiftSelectionUsers = new Set(selectedUserIds);
    const startShiftSelectionEdges = new Set(selectedEdgeIds);

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const curX = e.clientX - canvasRect.left;
      const curY = e.clientY - canvasRect.top;
      setBoxSelect((prev) => (prev ? { ...prev, curX, curY } : prev));

      const minX = Math.min(boxSelect.startX, curX);
      const maxX = Math.max(boxSelect.startX, curX);
      const minY = Math.min(boxSelect.startY, curY);
      const maxY = Math.max(boxSelect.startY, curY);

      // Card hit test — any overlap of the card AABB with the box.
      const hitUsers = new Set<string>(startShiftSelectionUsers);
      for (const u of users) {
        if (!showHidden && u.org_hidden) continue;
        const cx = u.org_x ?? 0;
        const cy = u.org_y ?? 0;
        const overlaps =
          cx < maxX && cx + CARD_WIDTH > minX && cy < maxY && cy + CARD_HEIGHT > minY;
        if (overlaps) hitUsers.add(u.id);
      }
      setSelectedUserIds(hitUsers);

      // Edge hit test — include an edge when its elbow midpoint is in the box.
      const hitEdges = new Set<string>(startShiftSelectionEdges);
      for (const edge of edges) {
        const from = users.find((u) => u.id === edge.from_user_id);
        const to = users.find((u) => u.id === edge.to_user_id);
        if (!from || !to) continue;
        if (!showHidden && (from.org_hidden || to.org_hidden)) continue;
        const mid = elbowMidpoint(
          { x: from.org_x ?? 0, y: from.org_y ?? 0 },
          { x: to.org_x ?? 0, y: to.org_y ?? 0 }
        );
        if (mid.x >= minX && mid.x <= maxX && mid.y >= minY && mid.y <= maxY) {
          hitEdges.add(edge.id);
        }
      }
      setSelectedEdgeIds(hitEdges);
    };

    const handleMouseUp = () => {
      setBoxSelect(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // Only re-run when a box-select starts; live pointer state is tracked
    // inside the handler via refs and setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxSelect?.startX, boxSelect?.startY, users, edges, showHidden]);

  // Escape clears any active selection.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedUserIds(new Set());
        setSelectedEdgeIds(new Set());
        setBoxSelect(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  async function deleteEdge(edgeId: string) {
    if (!isAdmin) return;
    const result = await db({ action: 'delete', table: 'org_chart_edges', match: { id: edgeId } });
    if (result?.error) {
      showToast(`Failed to delete: ${result.error}`);
      return;
    }
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }

  async function toggleHidden(userId: string, nextHidden: boolean) {
    if (!isAdmin) return;
    const result = await db({
      action: 'update',
      table: 'users',
      data: { org_hidden: nextHidden },
      match: { id: userId },
    });
    if (result?.error) {
      showToast(`Failed to update: ${result.error}`);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, org_hidden: nextHidden } : u)));
    showToast(nextHidden ? 'Card hidden' : 'Card shown');
  }

  // Build elbow-connector path (bottom-center → top-center via mid-Y)
  function elbowPath(from: OrgUser, to: OrgUser): string {
    const sx = (from.org_x ?? 0) + CARD_WIDTH / 2;
    const sy = (from.org_y ?? 0) + CARD_HEIGHT;
    const tx = (to.org_x ?? 0) + CARD_WIDTH / 2;
    const ty = to.org_y ?? 0;
    // If target is above source, route sideways instead of downward.
    if (ty < sy) {
      const midX = (sx + tx) / 2;
      return `M ${sx},${sy} L ${sx},${sy + 20} L ${midX},${sy + 20} L ${midX},${ty - 20} L ${tx},${ty - 20} L ${tx},${ty}`;
    }
    const midY = (sy + ty) / 2;
    return `M ${sx},${sy} L ${sx},${midY} L ${tx},${midY} L ${tx},${ty}`;
  }

  function usersById(id: string): OrgUser | undefined {
    return users.find((u) => u.id === id);
  }

  // Admins can toggle a "show hidden" mode to see dimmed hidden cards and unhide them.
  const displayedUsers = useMemo(
    () => users.filter((u) => showHidden || !u.org_hidden),
    [users, showHidden]
  );

  // Edges only render when both endpoints are displayed (matches what the user sees).
  const displayedUserIds = useMemo(
    () => new Set(displayedUsers.map((u) => u.id)),
    [displayedUsers]
  );

  // Compute canvas extents so the scroll region grows with placement
  const canvasSize = useMemo(() => {
    let maxX = 800;
    let maxY = 500;
    for (const u of displayedUsers) {
      if ((u.org_x ?? 0) + CARD_WIDTH + CANVAS_PADDING > maxX)
        maxX = (u.org_x ?? 0) + CARD_WIDTH + CANVAS_PADDING;
      if ((u.org_y ?? 0) + CARD_HEIGHT + CANVAS_PADDING > maxY)
        maxY = (u.org_y ?? 0) + CARD_HEIGHT + CANVAS_PADDING;
    }
    return { width: maxX, height: maxY };
  }, [displayedUsers]);

  // Count hidden users for the toggle label
  const hiddenCount = useMemo(
    () => users.filter((u) => u.org_hidden).length,
    [users]
  );

  // Open a print-ready window with a standalone SVG snapshot of the org chart and
  // trigger the browser print dialog. Users choose "Save as PDF" in the destination.
  function exportPdf() {
    // Use only what's currently visible to match what the admin has configured.
    const visible = displayedUsers.filter((u) => !u.org_hidden);
    const visibleIds = new Set(visible.map((u) => u.id));
    const visibleEdges = edges.filter(
      (e) => visibleIds.has(e.from_user_id) && visibleIds.has(e.to_user_id)
    );

    // Compute tight bounding box around visible cards
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    for (const u of visible) {
      const x = u.org_x ?? 0;
      const y = u.org_y ?? 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + CARD_WIDTH > maxX) maxX = x + CARD_WIDTH;
      if (y + CARD_HEIGHT > maxY) maxY = y + CARD_HEIGHT;
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 500; }
    const pad = 80;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = maxX - minX + pad * 2;
    const vbH = maxY - minY + pad * 2;

    const escapeXml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Collect unique departments for legend
    const usedDepts = new Map<string, { name: string; color: string }>();
    for (const u of visible) {
      if (u.department_id) {
        const dept = deptById.get(u.department_id);
        if (dept && !usedDepts.has(dept.id)) {
          usedDepts.set(dept.id, { name: dept.name, color: dept.color || '#94a3b8' });
        }
      }
    }

    // Build SVG edge paths — ultra-thin elegant connectors
    const edgeSvg = visibleEdges
      .map((e) => {
        const from = visible.find((u) => u.id === e.from_user_id);
        const to = visible.find((u) => u.id === e.to_user_id);
        if (!from || !to) return '';
        return `<path d="${elbowPath(from, to)}" fill="none" stroke="#d4d8e0" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="none" marker-end="url(#org-arrow)" />`;
      })
      .join('\n');

    // Build SVG cards — premium Apple/Tesla-inspired design
    const cardSvg = visible
      .map((u, idx) => {
        const x = u.org_x ?? 0;
        const y = u.org_y ?? 0;
        const name = escapeXml(u.full_name || u.email || 'Unknown');
        const title = escapeXml(u.job_title || '');
        const dept = u.department_id ? deptById.get(u.department_id) : null;
        const deptColor = dept?.color || '#94a3b8';
        const deptName = dept ? escapeXml(dept.name) : '';
        const initial = escapeXml((u.full_name || u.email || '?').charAt(0).toUpperCase());
        const clipId = `avatar-clip-${idx}`;
        const avatarCx = x + 36;
        const avatarCy = y + 40;
        const avatarR = 22;

        // Avatar: use <image> with circular clip-path if avatar_url exists, otherwise initial circle
        const avatarSvg = u.avatar_url
          ? `<defs>
              <clipPath id="${clipId}">
                <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" />
              </clipPath>
            </defs>
            <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 1.5}" fill="#f1f5f9" />
            <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 0.5}" fill="#e8ecf1" />
            <image href="${escapeXml(u.avatar_url)}" x="${avatarCx - avatarR}" y="${avatarCy - avatarR}" width="${avatarR * 2}" height="${avatarR * 2}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice" />`
          : `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="${deptColor}" opacity="0.08"/>
            <circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="none" stroke="${deptColor}" stroke-width="1.2" opacity="0.3"/>
            <text x="${avatarCx}" y="${avatarCy + 6}" text-anchor="middle" font-family="'SF Pro Display',system-ui,-apple-system,'Segoe UI',sans-serif" font-size="17" font-weight="600" fill="${deptColor}" opacity="0.7">${initial}</text>`;

        // Department pill badge
        const deptBadgeWidth = Math.min(deptName.length * 5.6 + 16, CARD_WIDTH - 80);
        const deptBadge = deptName
          ? `<rect x="${x + 66}" y="${y + 68}" width="${deptBadgeWidth}" height="19" rx="9.5" ry="9.5" fill="${deptColor}" opacity="0.1"/>
             <text x="${x + 66 + deptBadgeWidth / 2}" y="${y + 81}" text-anchor="middle" font-family="'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif" font-size="8.5" font-weight="600" fill="${deptColor}" letter-spacing="0.3">${deptName}</text>`
          : '';

        // Admin badge — subtle green pill
        const adminBadge = u.is_admin
          ? `<rect x="${x + CARD_WIDTH - 50}" y="${y + 9}" width="38" height="17" rx="8.5" ry="8.5" fill="#ecfdf5" stroke="#bbf7d0" stroke-width="0.5"/>
             <text x="${x + CARD_WIDTH - 31}" y="${y + 20.5}" text-anchor="middle" font-family="'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif" font-size="7.5" font-weight="700" fill="#15803d" letter-spacing="0.4">Admin</text>`
          : '';

        return `
          <g>
            <!-- Card shadow (layered for depth) -->
            <rect x="${x + 1}" y="${y + 3}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" ry="16" fill="black" opacity="0.03" filter="url(#card-shadow-soft)"/>
            <rect x="${x}" y="${y + 1}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" ry="16" fill="black" opacity="0.02" filter="url(#card-shadow-close)"/>
            <!-- Card background -->
            <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" ry="16" fill="white" stroke="#e8ecf1" stroke-width="0.75"/>
            <!-- Department accent bar at top (full width, clipped to card radius) -->
            <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="4" rx="0" ry="0" fill="${deptColor}" opacity="0.85" clip-path="url(#card-top-clip-${idx})"/>
            <defs>
              <clipPath id="card-top-clip-${idx}">
                <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="16" rx="16" ry="16"/>
              </clipPath>
            </defs>
            <!-- Avatar -->
            ${avatarSvg}
            <!-- Name -->
            <text x="${x + 66}" y="${y + 34}" font-family="'SF Pro Display',system-ui,-apple-system,'Segoe UI',sans-serif" font-size="13" font-weight="700" fill="#0f172a" letter-spacing="-0.3">${name}</text>
            <!-- Job title -->
            <text x="${x + 66}" y="${y + 51}" font-family="'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif" font-size="10" fill="#6b7280" letter-spacing="0.1">${title}</text>
            <!-- Department badge -->
            ${deptBadge}
            <!-- Admin badge -->
            ${adminBadge}
          </g>
        `;
      })
      .join('\n');

    // Build department legend at the bottom of the SVG — horizontal row with colored pills
    const legendY = maxY + pad + 20;
    const legendItems = Array.from(usedDepts.values());
    const legendSvg = legendItems.length > 0
      ? `<g>
          <line x1="${minX}" y1="${legendY - 14}" x2="${minX + vbW - pad * 2}" y2="${legendY - 14}" stroke="#f1f5f9" stroke-width="1"/>
          <text x="${minX}" y="${legendY + 2}" font-family="'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif" font-size="9" font-weight="700" fill="#9ca3af" letter-spacing="1.5">DEPARTMENTS</text>
          ${legendItems.map((d, i) => {
            const pillWidth = d.name.length * 5.8 + 22;
            const lx = minX + i * (pillWidth + 12);
            const ly = legendY + 16;
            return `<rect x="${lx}" y="${ly}" width="${pillWidth}" height="20" rx="10" ry="10" fill="${d.color}" opacity="0.1" stroke="${d.color}" stroke-width="0.5" stroke-opacity="0.3"/>
                    <circle cx="${lx + 10}" cy="${ly + 10}" r="3.5" fill="${d.color}" opacity="0.8"/>
                    <text x="${lx + 18}" y="${ly + 13.5}" font-family="'SF Pro Text',system-ui,-apple-system,'Segoe UI',sans-serif" font-size="9" font-weight="500" fill="#374151">${escapeXml(d.name)}</text>`;
          }).join('\n')}
        </g>`
      : '';

    // Expand viewBox to include legend
    const finalVbH = legendItems.length > 0 ? vbH + 80 : vbH;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vbX} ${vbY} ${vbW} ${finalVbH}" width="100%" style="max-width:100%;height:auto;">
        <defs>
          <marker id="org-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#c9cdd5" />
          </marker>
          <!-- Soft ambient shadow -->
          <filter id="card-shadow-soft" x="-15%" y="-10%" width="140%" height="150%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
            <feOffset in="blur" dx="0" dy="4" result="offsetBlur"/>
            <feComponentTransfer in="offsetBlur" result="shadow">
              <feFuncA type="linear" slope="0.06"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="shadow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <!-- Close contact shadow -->
          <filter id="card-shadow-close" x="-5%" y="-5%" width="115%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/>
            <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
            <feComponentTransfer in="offsetBlur" result="shadow">
              <feFuncA type="linear" slope="0.04"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="shadow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- Background — warm white -->
        <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${finalVbH}" fill="#fafafa"/>
        <!-- Subtle warm gradient overlay -->
        <defs>
          <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fefcfb" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#faf8f6" stop-opacity="0.4"/>
          </linearGradient>
        </defs>
        <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${finalVbH}" fill="url(#bg-gradient)"/>
        ${edgeSvg}
        ${cardSvg}
        ${legendSvg}
      </svg>
    `;

    const stamp = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const totalPeople = visible.length;
    const totalDepts = usedDepts.size;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Organization Chart — ${stamp}</title>
  <style>
    @page { size: landscape; margin: 0.5in; }
    html, body { margin: 0; padding: 0; background: #ffffff; font-family: 'SF Pro Display', system-ui, -apple-system, 'Segoe UI', sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 36px 44px; min-height: 100vh; display: flex; flex-direction: column; }
    /* Header */
    .header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 28px; padding-bottom: 18px; border-bottom: 1.5px solid #f3f4f6; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .header-logo { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #0f172a 0%, #334155 100%); display: flex; align-items: center; justify-content: center; }
    .header-logo span { color: white; font-size: 14px; font-weight: 800; letter-spacing: -0.5px; }
    .header-text h1 { font-size: 21px; font-weight: 700; margin: 0 0 1px; letter-spacing: -0.6px; color: #111827; }
    .header-text .subtitle { font-size: 11.5px; color: #9ca3af; margin: 0; font-weight: 400; letter-spacing: 0.15px; }
    .header-right { text-align: right; }
    .header-right .date { font-size: 10.5px; color: #9ca3af; margin: 0; font-weight: 500; }
    .header-right .stats { font-size: 9.5px; color: #d1d5db; margin: 3px 0 0; letter-spacing: 0.2px; }
    /* Chart area */
    .chart { flex: 1; }
    .chart svg { display: block; }
    /* Footer */
    .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
    .footer-left { font-size: 8.5px; color: #d1d5db; letter-spacing: 0.8px; text-transform: uppercase; }
    .footer-center { font-size: 8px; color: #e5e7eb; letter-spacing: 0.3px; }
    .footer-right { font-size: 8.5px; color: #d1d5db; letter-spacing: 0.3px; }
    @media print {
      .page { padding: 0; min-height: auto; }
      .header { margin-bottom: 18px; padding-bottom: 14px; }
      .header-text h1 { font-size: 18px; }
      .footer { margin-top: 14px; padding-top: 10px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="header-logo"><span>ORG</span></div>
        <div class="header-text">
          <h1>Organization Chart</h1>
          <p class="subtitle">Team Structure &amp; Reporting Lines</p>
        </div>
      </div>
      <div class="header-right">
        <p class="date">Generated ${stamp}</p>
        <p class="stats">${totalPeople} people &middot; ${totalDepts} department${totalDepts !== 1 ? 's' : ''}</p>
      </div>
    </div>
    <div class="chart">
      ${svg}
    </div>
    <div class="footer">
      <div class="footer-left">Confidential &mdash; Internal Use Only</div>
      <div class="footer-center">Organization Chart &middot; ${stamp}</div>
      <div class="footer-right">Page 1 of 1</div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 150);
    });
  </script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      showToast('Pop-ups blocked — allow pop-ups to export PDF');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportPdf}
            className="px-4 py-2 bg-warm-bg text-foreground rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-warm-card transition-colors inline-flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-body)' }}
            title="Open a print-ready view, then choose 'Save as PDF'"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          {isAdmin && (
            <>
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowHidden((v) => !v)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                    showHidden ? 'bg-foreground text-white' : 'bg-warm-bg text-foreground hover:bg-warm-card'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {showHidden ? `Hide hidden (${hiddenCount})` : `Show hidden (${hiddenCount})`}
                </button>
              )}
              <button
                onClick={() =>
                  setConnectMode((m) => (m.kind === 'off' ? { kind: 'pickingFrom' } : { kind: 'off' }))
                }
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                  connectMode.kind === 'off'
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-foreground text-white hover:bg-primary-dark'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {connectMode.kind === 'off' ? 'Connect' : 'Done connecting'}
              </button>
              <button
                onClick={autoLayout}
                className="px-4 py-2 bg-warm-bg text-foreground rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-warm-card transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Reset layout
              </button>
            </>
          )}
        </div>
      </div>

      {connectMode.kind !== 'off' && (
        <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-xs font-medium text-primary" style={{ fontFamily: 'var(--font-body)' }}>
            {connectMode.kind === 'pickingFrom'
              ? 'Click the card you want to connect FROM (e.g. the manager).'
              : 'Now click the card you want to connect TO (e.g. the direct report). Click "Done connecting" when finished.'}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            className="relative select-none"
            style={{
              width: canvasSize.width + 'px',
              height: canvasSize.height + 'px',
              backgroundImage:
                'radial-gradient(circle, rgba(160, 82, 45, 0.07) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              cursor: isAdmin && connectMode.kind === 'off' ? 'crosshair' : undefined,
            }}
          >
            {/* Edges layer (behind cards) */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasSize.width}
              height={canvasSize.height}
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker
                  id="org-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a0522d" />
                </marker>
                <marker
                  id="org-arrow-hover"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const from = usersById(edge.from_user_id);
                const to = usersById(edge.to_user_id);
                if (!from || !to) return null;
                // Skip edges whose endpoints are hidden
                if (!displayedUserIds.has(from.id) || !displayedUserIds.has(to.id)) return null;
                const d = elbowPath(from, to);
                const isHovered = hoveredEdgeId === edge.id;
                const isSelected = selectedEdgeIds.has(edge.id);
                // Midpoint for delete handle — use approximate center of path.
                const sx = (from.org_x ?? 0) + CARD_WIDTH / 2;
                const sy = (from.org_y ?? 0) + CARD_HEIGHT;
                const tx = (to.org_x ?? 0) + CARD_WIDTH / 2;
                const ty = to.org_y ?? 0;
                const midX = (sx + tx) / 2;
                const midY = ty < sy ? sy + 20 : (sy + ty) / 2;
                return (
                  <g key={edge.id} className="pointer-events-auto">
                    {/* Wide transparent hit area */}
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      className={isAdmin ? 'cursor-pointer' : ''}
                    />
                    {/* Visible line */}
                    <path
                      d={d}
                      fill="none"
                      stroke={isHovered ? '#ef4444' : isSelected ? '#2563eb' : '#a0522d'}
                      strokeWidth={isHovered || isSelected ? 2.5 : 2}
                      markerEnd={isHovered ? 'url(#org-arrow-hover)' : 'url(#org-arrow)'}
                      style={{ transition: 'stroke 120ms, stroke-width 120ms' }}
                    />
                    {/* Delete handle (admin only, visible on hover) */}
                    {isAdmin && isHovered && (
                      <g
                        transform={`translate(${midX - 10}, ${midY - 10})`}
                        onMouseEnter={() => setHoveredEdgeId(edge.id)}
                        onMouseLeave={() => setHoveredEdgeId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEdge(edge.id);
                        }}
                        className="cursor-pointer"
                      >
                        <circle cx={10} cy={10} r={10} fill="#ef4444" />
                        <path d="M 6 6 L 14 14 M 14 6 L 6 14" stroke="white" strokeWidth={2} strokeLinecap="round" />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {displayedUsers.map((u) => {
              const dept = u.department_id ? deptById.get(u.department_id) : null;
              const isDragging = draggingId === u.id;
              const isSelected = selectedUserIds.has(u.id);
              const isPickingFrom = connectMode.kind === 'pickingFrom';
              const isPickedSource = connectMode.kind === 'pickingTo' && connectMode.fromId === u.id;
              const isPickingTo = connectMode.kind === 'pickingTo' && connectMode.fromId !== u.id;
              const isHiddenShown = !!u.org_hidden; // only true when showHidden is on
              const connectHighlight = isPickedSource
                ? 'border-primary ring-2 ring-primary/30 shadow-lg z-20'
                : isPickingFrom || isPickingTo
                ? 'border-primary/40 ring-1 ring-primary/10 cursor-pointer hover:ring-primary/40 hover:border-primary'
                : '';
              const selectionHighlight = isSelected
                ? 'border-blue-500 ring-2 ring-blue-400/40 shadow-lg z-20'
                : '';
              return (
                <div
                  key={u.id}
                  onMouseDown={(e) => handleMouseDown(e, u.id)}
                  onClick={() => handleCardClick(u.id)}
                  className={`absolute bg-white rounded-2xl border transition-shadow ${
                    isDragging
                      ? 'border-primary shadow-2xl z-20 scale-[1.02]'
                      : `${selectionHighlight || connectHighlight || 'border-gray-200 shadow-sm hover:shadow-md'} z-10`
                  } ${
                    isAdmin
                      ? connectMode.kind !== 'off'
                        ? 'cursor-pointer'
                        : 'cursor-grab active:cursor-grabbing'
                      : 'cursor-default'
                  } ${isHiddenShown ? 'opacity-50 border-dashed' : ''}`}
                  style={{
                    left: (u.org_x ?? 0) + 'px',
                    top: (u.org_y ?? 0) + 'px',
                    width: CARD_WIDTH + 'px',
                    height: CARD_HEIGHT + 'px',
                    transitionProperty: 'box-shadow, transform, border-color, opacity',
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
                  {isAdmin && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHidden(u.id, !u.org_hidden);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur border border-gray-200 flex items-center justify-center text-foreground/40 hover:text-foreground hover:border-primary transition-colors"
                      aria-label={u.org_hidden ? 'Show card' : 'Hide card'}
                      title={u.org_hidden ? 'Show card' : 'Hide card'}
                    >
                      {u.org_hidden ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
            {boxSelect && (
              <div
                className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 z-30"
                style={{
                  left: Math.min(boxSelect.startX, boxSelect.curX) + 'px',
                  top: Math.min(boxSelect.startY, boxSelect.curY) + 'px',
                  width: Math.abs(boxSelect.curX - boxSelect.startX) + 'px',
                  height: Math.abs(boxSelect.curY - boxSelect.startY) + 'px',
                }}
              />
            )}
            {displayedUsers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                  {users.length === 0 ? 'No team members yet.' : 'All cards are hidden.'}
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
