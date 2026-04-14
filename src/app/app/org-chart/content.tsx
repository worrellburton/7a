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
  const overlapTop = Math.max(from.y, to.y);
  const overlapBottom = Math.min(from.y + CARD_HEIGHT, to.y + CARD_HEIGHT);
  const vOverlap = overlapBottom - overlapTop;
  const horizGap = Math.abs(
    from.x + CARD_WIDTH / 2 - (to.x + CARD_WIDTH / 2)
  );
  if (vOverlap > CARD_HEIGHT * 0.5 && horizGap > CARD_WIDTH * 0.8) {
    // Side-by-side — midpoint between inner edges at their shared axis.
    const fromLeft = from.x < to.x;
    const startX = fromLeft ? from.x + CARD_WIDTH : from.x;
    const endX = fromLeft ? to.x : to.x + CARD_WIDTH;
    return { x: (startX + endX) / 2, y: (from.y + to.y) / 2 + CARD_HEIGHT / 2 };
  }
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
  // Active endpoint-drag for rerouting a connector. When set, one end of
  // the edge follows the cursor until dropped on another card.
  const [edgeDrag, setEdgeDrag] = useState<
    | {
        edgeId: string;
        endpoint: 'from' | 'to';
        cursorX: number;
        cursorY: number;
        hoverUserId: string | null;
      }
    | null
  >(null);
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

  // Escape clears any active selection; Delete/Backspace removes any
  // currently selected connectors.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedUserIds(new Set());
        setSelectedEdgeIds(new Set());
        setBoxSelect(null);
        setEdgeDrag(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && isAdmin) {
        // Don't hijack deletes while the user is typing into an input.
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        if (selectedEdgeIds.size === 0) return;
        e.preventDefault();
        const ids = Array.from(selectedEdgeIds);
        setSelectedEdgeIds(new Set());
        // Fire the deletes in parallel — each updates local state on success.
        for (const id of ids) void deleteEdge(id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedEdgeIds]);

  async function deleteEdge(edgeId: string) {
    if (!isAdmin) return;
    const result = await db({ action: 'delete', table: 'org_chart_edges', match: { id: edgeId } });
    if (result?.error) {
      showToast(`Failed to delete: ${result.error}`);
      return;
    }
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  }

  // Click on an edge selects just it (shift-click toggles within the
  // existing selection so multi-delete still works).
  const handleEdgeClick = useCallback(
    (edgeId: string, shift: boolean) => {
      if (shift) {
        setSelectedEdgeIds((prev) => {
          const next = new Set(prev);
          if (next.has(edgeId)) next.delete(edgeId);
          else next.add(edgeId);
          return next;
        });
      } else {
        setSelectedUserIds(new Set());
        setSelectedEdgeIds(new Set([edgeId]));
      }
    },
    []
  );

  // Rerouting an edge endpoint: on mousedown on a handle, start tracking
  // the cursor. On mouseup over a card, rewrite the edge's from/to;
  // otherwise cancel.
  useEffect(() => {
    if (!edgeDrag) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pickUserUnderPointer = (clientX: number, clientY: number): string | null => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      for (const u of users) {
        if (u.org_hidden && !showHidden) continue;
        const ux = u.org_x ?? 0;
        const uy = u.org_y ?? 0;
        if (x >= ux && x <= ux + CARD_WIDTH && y >= uy && y <= uy + CARD_HEIGHT) {
          return u.id;
        }
      }
      return null;
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const hoverUserId = pickUserUnderPointer(e.clientX, e.clientY);
      setEdgeDrag((prev) =>
        prev ? { ...prev, cursorX, cursorY, hoverUserId } : prev
      );
    };

    const onUp = async (e: MouseEvent) => {
      const dropOn = pickUserUnderPointer(e.clientX, e.clientY);
      const current = edgeDrag;
      setEdgeDrag(null);
      if (!current || !dropOn) return;
      const edge = edges.find((x) => x.id === current.edgeId);
      if (!edge) return;
      const otherEndpoint =
        current.endpoint === 'from' ? edge.to_user_id : edge.from_user_id;
      if (dropOn === otherEndpoint) {
        showToast('Pick a different card for the other end');
        return;
      }
      const patch =
        current.endpoint === 'from'
          ? { from_user_id: dropOn }
          : { to_user_id: dropOn };
      // Prevent duplicates — if the rerouted edge would collide with an
      // existing one, drop the old edge instead of inserting a dup.
      const nextFrom = current.endpoint === 'from' ? dropOn : edge.from_user_id;
      const nextTo = current.endpoint === 'to' ? dropOn : edge.to_user_id;
      const dup = edges.find(
        (x) => x.id !== edge.id && x.from_user_id === nextFrom && x.to_user_id === nextTo
      );
      if (dup) {
        showToast('Connection already exists');
        return;
      }
      const result = await db({
        action: 'update',
        table: 'org_chart_edges',
        data: patch,
        match: { id: edge.id },
      });
      if (result?.error) {
        showToast(`Failed to reroute: ${result.error}`);
        return;
      }
      setEdges((prev) =>
        prev.map((x) => (x.id === edge.id ? { ...x, ...patch } : x))
      );
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [edgeDrag, users, edges, showHidden]);

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

  // Build elbow-connector path. When two cards sit roughly on the same
  // horizontal axis (vertical overlap > half a card height and clearly
  // separated horizontally), the edge routes from side-to-side instead
  // of bottom→top so siblings read as peers.
  function elbowPath(from: OrgUser, to: OrgUser): string {
    const fx = from.org_x ?? 0;
    const fy = from.org_y ?? 0;
    const tx_ = to.org_x ?? 0;
    const ty_ = to.org_y ?? 0;

    const overlapTop = Math.max(fy, ty_);
    const overlapBottom = Math.min(fy + CARD_HEIGHT, ty_ + CARD_HEIGHT);
    const vOverlap = overlapBottom - overlapTop;
    const horizGap = Math.abs((fx + CARD_WIDTH / 2) - (tx_ + CARD_WIDTH / 2));
    const sideBySide = vOverlap > CARD_HEIGHT * 0.5 && horizGap > CARD_WIDTH * 0.8;

    if (sideBySide) {
      const fromLeft = fx < tx_;
      const startX = fromLeft ? fx + CARD_WIDTH : fx;
      const endX = fromLeft ? tx_ : tx_ + CARD_WIDTH;
      const startY = fy + CARD_HEIGHT / 2;
      const endY = ty_ + CARD_HEIGHT / 2;
      const midX = (startX + endX) / 2;
      return `M ${startX},${startY} L ${midX},${startY} L ${midX},${endY} L ${endX},${endY}`;
    }

    const sx = fx + CARD_WIDTH / 2;
    const sy = fy + CARD_HEIGHT;
    const tx = tx_ + CARD_WIDTH / 2;
    const ty = ty_;
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
    const pad = 40;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = maxX - minX + pad * 2;
    const vbH = maxY - minY + pad * 2;

    const escapeXml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Build SVG edge paths
    const edgeSvg = visibleEdges
      .map((e) => {
        const from = visible.find((u) => u.id === e.from_user_id);
        const to = visible.find((u) => u.id === e.to_user_id);
        if (!from || !to) return '';
        return `<path d="${elbowPath(from, to)}" fill="none" stroke="#a0522d" stroke-width="2" marker-end="url(#org-arrow)" />`;
      })
      .join('\n');

    // Build SVG cards (rect + text; avatars are skipped for print clarity)
    const cardSvg = visible
      .map((u) => {
        const x = u.org_x ?? 0;
        const y = u.org_y ?? 0;
        const name = escapeXml(u.full_name || u.email || 'Unknown');
        const title = escapeXml(u.job_title || '');
        const dept = u.department_id ? deptById.get(u.department_id) : null;
        const deptColor = dept?.color || '#a0522d';
        const deptName = dept ? escapeXml(dept.name) : '';
        const initial = escapeXml((u.full_name || u.email || '?').charAt(0).toUpperCase());
        return `
          <g>
            <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" ry="16" fill="white" stroke="#e5e7eb" stroke-width="1"/>
            <circle cx="${x + 32}" cy="${y + 32}" r="20" fill="${deptColor}"/>
            <text x="${x + 32}" y="${y + 38}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="14" font-weight="700" fill="white">${initial}</text>
            <text x="${x + 62}" y="${y + 30}" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="600" fill="#1f2937">${name}</text>
            <text x="${x + 62}" y="${y + 48}" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#6b7280">${title}</text>
            ${deptName ? `<rect x="${x + 62}" y="${y + 62}" width="${Math.min(deptName.length * 6 + 12, CARD_WIDTH - 78)}" height="18" rx="9" ry="9" fill="${deptColor}"/><text x="${x + 68}" y="${y + 75}" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="600" fill="white">${deptName}</text>` : ''}
          </g>
        `;
      })
      .join('\n');

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="100%" style="max-width:100%;height:auto;">
        <defs>
          <marker id="org-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a0522d" />
          </marker>
        </defs>
        <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#fafaf7"/>
        ${edgeSvg}
        ${cardSvg}
      </svg>
    `;

    const stamp = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Org Chart — ${stamp}</title>
  <style>
    @page { size: landscape; margin: 0.4in; }
    html, body { margin: 0; padding: 0; background: white; font-family: system-ui, -apple-system, sans-serif; color: #1f2937; }
    .wrap { padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { font-size: 12px; color: #6b7280; margin: 0 0 16px; }
    svg { display: block; }
    @media print { .wrap { padding: 0; } h1 { font-size: 16px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Org Chart</h1>
    <p class="sub">Generated ${stamp}</p>
    ${svg}
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
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Org Chart</h1>
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
                const isHovered = hoveredEdgeId === edge.id;
                const isSelected = selectedEdgeIds.has(edge.id);
                const beingDragged = edgeDrag?.edgeId === edge.id;
                // Endpoint coordinates at the card centers/edges. We use
                // simple center-top/center-bottom handles for every edge
                // so the user always has a visible grab point when the
                // connector is selected.
                const fromCx = (from.org_x ?? 0) + CARD_WIDTH / 2;
                const fromCy = (from.org_y ?? 0) + CARD_HEIGHT;
                const toCx = (to.org_x ?? 0) + CARD_WIDTH / 2;
                const toCy = to.org_y ?? 0;
                // Midpoint for delete handle — use approximate center of path.
                const midX = (fromCx + toCx) / 2;
                const midY = toCy < fromCy ? fromCy + 20 : (fromCy + toCy) / 2;
                // When the user is dragging an endpoint, replace that
                // endpoint's coordinates with the cursor so the line
                // follows the mouse in real time.
                const ghostPath = (() => {
                  if (!beingDragged || !edgeDrag) return null;
                  const startX = edgeDrag.endpoint === 'from' ? edgeDrag.cursorX : fromCx;
                  const startY = edgeDrag.endpoint === 'from' ? edgeDrag.cursorY : fromCy;
                  const endX = edgeDrag.endpoint === 'to' ? edgeDrag.cursorX : toCx;
                  const endY = edgeDrag.endpoint === 'to' ? edgeDrag.cursorY : toCy;
                  const midY2 = (startY + endY) / 2;
                  return `M ${startX},${startY} L ${startX},${midY2} L ${endX},${midY2} L ${endX},${endY}`;
                })();
                const d = ghostPath ?? elbowPath(from, to);
                return (
                  <g key={edge.id} className="pointer-events-auto">
                    {/* Wide transparent hit area — click to select, drag disabled here */}
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      onClick={(e) => {
                        if (!isAdmin) return;
                        e.stopPropagation();
                        handleEdgeClick(edge.id, e.shiftKey);
                      }}
                      className={isAdmin ? 'cursor-pointer' : ''}
                    />
                    {/* Visible line */}
                    <path
                      d={d}
                      fill="none"
                      stroke={beingDragged ? '#2563eb' : isHovered ? '#ef4444' : isSelected ? '#2563eb' : '#a0522d'}
                      strokeWidth={isHovered || isSelected || beingDragged ? 2.5 : 2}
                      strokeDasharray={beingDragged ? '6 4' : undefined}
                      markerEnd={isHovered ? 'url(#org-arrow-hover)' : 'url(#org-arrow)'}
                      style={{ transition: beingDragged ? 'none' : 'stroke 120ms, stroke-width 120ms' }}
                    />
                    {/* Endpoint drag handles — shown when the edge is selected or hovered. */}
                    {isAdmin && (isSelected || isHovered || beingDragged) && (
                      <>
                        <circle
                          cx={fromCx}
                          cy={fromCy}
                          r={6}
                          fill="white"
                          stroke="#2563eb"
                          strokeWidth={2}
                          className="cursor-grab"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const rect = canvasRef.current?.getBoundingClientRect();
                            if (!rect) return;
                            setSelectedUserIds(new Set());
                            setSelectedEdgeIds(new Set([edge.id]));
                            setEdgeDrag({
                              edgeId: edge.id,
                              endpoint: 'from',
                              cursorX: e.clientX - rect.left,
                              cursorY: e.clientY - rect.top,
                              hoverUserId: null,
                            });
                          }}
                        />
                        <circle
                          cx={toCx}
                          cy={toCy}
                          r={6}
                          fill="white"
                          stroke="#2563eb"
                          strokeWidth={2}
                          className="cursor-grab"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const rect = canvasRef.current?.getBoundingClientRect();
                            if (!rect) return;
                            setSelectedUserIds(new Set());
                            setSelectedEdgeIds(new Set([edge.id]));
                            setEdgeDrag({
                              edgeId: edge.id,
                              endpoint: 'to',
                              cursorX: e.clientX - rect.left,
                              cursorY: e.clientY - rect.top,
                              hoverUserId: null,
                            });
                          }}
                        />
                      </>
                    )}
                    {/* Delete handle — visible on hover or when selected. */}
                    {isAdmin && (isHovered || isSelected) && !beingDragged && (
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
                          className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white whitespace-nowrap truncate max-w-full align-bottom"
                          style={{ backgroundColor: dept.color || '#a0522d' }}
                          title={dept.name}
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
