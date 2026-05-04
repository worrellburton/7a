'use client';

import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { useAuth } from '@/lib/AuthProvider';
import { logActivity } from '@/lib/activity';
import {
  SCHEDULE_KINDS,
  approvalStyle,
  type BdStaff,
  type PresentationSignup,
  type ScheduleItem,
  type ScheduleKind,
  type Tour,
  type TourGuest,
  type TourPresentation,
  type TourRoom,
} from './content';

// Detail panel rendered below the list/table when a tour is expanded. Owns
// fetches + CRUD for all five child tables so the parent page stays lean.

interface TeamUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

type SubTab = 'guests' | 'presentations' | 'bd' | 'schedule' | 'rooms';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'guests', label: 'Guests' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'bd', label: 'BD Staff' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'rooms', label: 'Rooms' },
];

export function TourDetailPanel({
  tour,
  teamUsers,
  onDelete,
}: {
  tour: Tour;
  teamUsers: TeamUser[];
  onDelete: () => void;
}) {
  const { user } = useAuth();
  const { confirm } = useModal();
  const [tab, setTab] = useState<SubTab>('guests');

  const [guests, setGuests] = useState<TourGuest[]>([]);
  const [presentations, setPresentations] = useState<TourPresentation[]>([]);
  const [signups, setSignups] = useState<Record<string, PresentationSignup[]>>({});
  const [bdStaff, setBdStaff] = useState<BdStaff[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [rooms, setRooms] = useState<TourRoom[]>([]);

  // Load all child rows for this tour on mount / when tour changes.
  useEffect(() => {
    if (!tour.id) return;
    const t = tour.id;
    (async () => {
      const [g, p, bd, s, r] = await Promise.all([
        db({ action: 'select', table: 'tour_guests', match: { tour_id: t }, order: { column: 'sort_order', ascending: true } }),
        db({ action: 'select', table: 'tour_presentations', match: { tour_id: t }, order: { column: 'scheduled_at', ascending: true } }),
        db({ action: 'select', table: 'tour_bd_staff', match: { tour_id: t }, order: { column: 'created_at', ascending: true } }),
        db({ action: 'select', table: 'tour_schedule_items', match: { tour_id: t }, order: { column: 'sort_order', ascending: true } }),
        db({ action: 'select', table: 'tour_rooms', match: { tour_id: t }, order: { column: 'created_at', ascending: true } }),
      ]);
      if (Array.isArray(g)) setGuests(g as TourGuest[]);
      if (Array.isArray(p)) {
        setPresentations(p as TourPresentation[]);
        // Load sign-ups for each presentation in parallel.
        const ids = (p as TourPresentation[]).map((row) => row.id);
        if (ids.length) {
          const signupRows = await db({ action: 'select', table: 'tour_presentation_signups' });
          if (Array.isArray(signupRows)) {
            const byPres: Record<string, PresentationSignup[]> = {};
            for (const s of signupRows as PresentationSignup[]) {
              if (!ids.includes(s.presentation_id)) continue;
              (byPres[s.presentation_id] ||= []).push(s);
            }
            setSignups(byPres);
          }
        }
      }
      if (Array.isArray(bd)) setBdStaff(bd as BdStaff[]);
      if (Array.isArray(s)) setSchedule(s as ScheduleItem[]);
      if (Array.isArray(r)) setRooms(r as TourRoom[]);
    })();
  }, [tour.id]);

  // ── Guests ──────────────────────────────────────────────────────────────
  const [newGuest, setNewGuest] = useState({ name: '', company: '', title: '', linkedin_url: '' });
  const addGuest = useCallback(async () => {
    if (!newGuest.name.trim()) return;
    const inserted = await db({
      action: 'insert',
      table: 'tour_guests',
      data: {
        tour_id: tour.id,
        name: newGuest.name.trim(),
        company: newGuest.company.trim() || null,
        title: newGuest.title.trim() || null,
        linkedin_url: newGuest.linkedin_url.trim() || null,
        sort_order: guests.length,
      },
    });
    if (inserted && inserted.id) {
      setGuests((prev) => [...prev, inserted as TourGuest]);
      setNewGuest({ name: '', company: '', title: '', linkedin_url: '' });
      if (user) logActivity({ userId: user.id, type: 'tour.guest_added', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name} · ${newGuest.name.trim()}`, targetPath: `/app/tours` });
    }
  }, [newGuest, guests.length, tour.id, tour.tour_name, user]);

  const updateGuest = useCallback(async (id: string, patch: Partial<TourGuest>) => {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
    await db({ action: 'update', table: 'tour_guests', data: patch, match: { id } });
    if (user) logActivity({ userId: user.id, type: 'tour.guest_updated', targetKind: 'tour', targetId: tour.id, targetLabel: tour.tour_name, targetPath: `/app/tours` });
  }, [tour.id, tour.tour_name, user]);

  const deleteGuest = useCallback(async (id: string) => {
    const ok = await confirm('Remove this guest?', { confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    const removed = guests.find((g) => g.id === id);
    setGuests((prev) => prev.filter((g) => g.id !== id));
    await db({ action: 'delete', table: 'tour_guests', match: { id } });
    if (user) logActivity({ userId: user.id, type: 'tour.guest_removed', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name}${removed?.name ? ' · ' + removed.name : ''}`, targetPath: `/app/tours` });
  }, [confirm, guests, tour.id, tour.tour_name, user]);

  // ── Presentations ─────────────────────────────────────────────────────
  const [newPres, setNewPres] = useState({ title: '', presenter_name: '', scheduled_at: '' });
  const addPresentation = useCallback(async () => {
    if (!newPres.title.trim()) return;
    const iso = newPres.scheduled_at ? new Date(newPres.scheduled_at).toISOString() : null;
    const inserted = await db({
      action: 'insert',
      table: 'tour_presentations',
      data: {
        tour_id: tour.id,
        title: newPres.title.trim(),
        presenter_name: newPres.presenter_name.trim() || null,
        scheduled_at: iso,
      },
    });
    if (inserted && inserted.id) {
      setPresentations((prev) => [...prev, inserted as TourPresentation]);
      setNewPres({ title: '', presenter_name: '', scheduled_at: '' });
      if (user) logActivity({ userId: user.id, type: 'tour.presentation_added', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name} · ${newPres.title.trim()}`, targetPath: `/app/tours` });
    }
  }, [newPres, tour.id, tour.tour_name, user]);

  const deletePresentation = useCallback(async (id: string) => {
    const ok = await confirm('Remove this presentation?', { confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    const removed = presentations.find((p) => p.id === id);
    setPresentations((prev) => prev.filter((p) => p.id !== id));
    setSignups((prev) => { const n = { ...prev }; delete n[id]; return n; });
    await db({ action: 'delete', table: 'tour_presentations', match: { id } });
    if (user) logActivity({ userId: user.id, type: 'tour.presentation_removed', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name}${removed?.title ? ' · ' + removed.title : ''}`, targetPath: `/app/tours` });
  }, [confirm, presentations, tour.id, tour.tour_name, user]);

  const togglePresentationSignup = useCallback(async (presentationId: string) => {
    if (!user) return;
    const pres = presentations.find((p) => p.id === presentationId);
    const current = signups[presentationId] || [];
    const mine = current.find((s) => s.user_id === user.id);
    if (mine) {
      setSignups((prev) => ({ ...prev, [presentationId]: current.filter((s) => s.id !== mine.id) }));
      await db({ action: 'delete', table: 'tour_presentation_signups', match: { id: mine.id } });
      logActivity({ userId: user.id, type: 'tour.presentation_signup_removed', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name}${pres?.title ? ' · ' + pres.title : ''}`, targetPath: `/app/tours` });
    } else {
      const name = (user.user_metadata?.full_name as string | undefined) || user.email || 'Me';
      const inserted = await db({
        action: 'insert',
        table: 'tour_presentation_signups',
        data: { presentation_id: presentationId, user_id: user.id, user_name: name },
      });
      if (inserted && inserted.id) {
        setSignups((prev) => ({
          ...prev,
          [presentationId]: [...(prev[presentationId] || []), inserted as PresentationSignup],
        }));
        logActivity({ userId: user.id, type: 'tour.presentation_signup_added', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name}${pres?.title ? ' · ' + pres.title : ''}`, targetPath: `/app/tours` });
      }
    }
  }, [user, signups, presentations, tour.id, tour.tour_name]);

  // ── BD Staff ──────────────────────────────────────────────────────────
  const [newBdUserId, setNewBdUserId] = useState<string>('');
  const [newBdRole, setNewBdRole] = useState<string>('');
  const addBdStaff = useCallback(async () => {
    if (!newBdUserId) return;
    const u = teamUsers.find((x) => x.id === newBdUserId);
    if (!u) return;
    const inserted = await db({
      action: 'insert',
      table: 'tour_bd_staff',
      data: {
        tour_id: tour.id,
        user_id: u.id,
        staff_name: u.full_name || 'Staff',
        role: newBdRole.trim() || null,
      },
    });
    if (inserted && inserted.id) {
      setBdStaff((prev) => [...prev, inserted as BdStaff]);
      setNewBdUserId('');
      setNewBdRole('');
      if (user) logActivity({ userId: user.id, type: 'tour.staff_added', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name} · ${u.full_name || 'Staff'}`, targetPath: `/app/tours` });
    }
  }, [newBdUserId, newBdRole, teamUsers, tour.id, tour.tour_name, user]);

  const removeBdStaff = useCallback(async (id: string) => {
    const removed = bdStaff.find((b) => b.id === id);
    setBdStaff((prev) => prev.filter((b) => b.id !== id));
    await db({ action: 'delete', table: 'tour_bd_staff', match: { id } });
    if (user) logActivity({ userId: user.id, type: 'tour.staff_removed', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name}${removed?.staff_name ? ' · ' + removed.staff_name : ''}`, targetPath: `/app/tours` });
  }, [bdStaff, tour.id, tour.tour_name, user]);

  // ── Schedule items ─────────────────────────────────────────────────────
  const scheduleByKind = new Map(schedule.map((s) => [s.kind, s] as const));

  const ensureScheduleItem = useCallback(async (kind: ScheduleKind): Promise<ScheduleItem | null> => {
    const existing = scheduleByKind.get(kind);
    if (existing) return existing;
    const inserted = await db({
      action: 'insert',
      table: 'tour_schedule_items',
      data: { tour_id: tour.id, kind, approval_status: 'pending', sort_order: SCHEDULE_KINDS.findIndex((x) => x.kind === kind) },
    });
    if (inserted && inserted.id) {
      const row = inserted as ScheduleItem;
      setSchedule((prev) => [...prev, row]);
      return row;
    }
    return null;
  }, [scheduleByKind, tour.id]);

  const assignSchedule = useCallback(async (kind: ScheduleKind, userId: string) => {
    const item = await ensureScheduleItem(kind);
    if (!item) return;
    const u = teamUsers.find((x) => x.id === userId);
    const patch = { assigned_user_id: userId || null, assigned_name: u?.full_name || null };
    setSchedule((prev) => prev.map((s) => (s.id === item.id ? { ...s, ...patch } : s)));
    await db({ action: 'update', table: 'tour_schedule_items', data: patch, match: { id: item.id } });
    if (user) {
      const kindLabel = SCHEDULE_KINDS.find((k) => k.kind === kind)?.label || kind;
      logActivity({ userId: user.id, type: 'tour.schedule_assigned', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name} · ${kindLabel} → ${u?.full_name || 'Unassigned'}`, targetPath: `/app/tours` });
    }
  }, [ensureScheduleItem, teamUsers, tour.id, tour.tour_name, user]);

  const setScheduleStatus = useCallback(async (kind: ScheduleKind, status: ScheduleItem['approval_status']) => {
    const item = await ensureScheduleItem(kind);
    if (!item) return;
    setSchedule((prev) => prev.map((s) => (s.id === item.id ? { ...s, approval_status: status } : s)));
    await db({ action: 'update', table: 'tour_schedule_items', data: { approval_status: status }, match: { id: item.id } });
    if (user) {
      const kindLabel = SCHEDULE_KINDS.find((k) => k.kind === kind)?.label || kind;
      logActivity({ userId: user.id, type: 'tour.schedule_status_changed', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name} · ${kindLabel} → ${status}`, targetPath: `/app/tours`, metadata: { status } });
    }
  }, [ensureScheduleItem, tour.id, tour.tour_name, user]);

  // ── Rooms ──────────────────────────────────────────────────────────────
  const [newRoomName, setNewRoomName] = useState('');
  const addRoom = useCallback(async () => {
    if (!newRoomName.trim()) return;
    const inserted = await db({
      action: 'insert',
      table: 'tour_rooms',
      data: { tour_id: tour.id, room_name: newRoomName.trim() },
    });
    if (inserted && inserted.id) {
      setRooms((prev) => [...prev, inserted as TourRoom]);
      setNewRoomName('');
      if (user) logActivity({ userId: user.id, type: 'tour.room_added', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name} · ${(inserted as TourRoom).room_name}`, targetPath: `/app/tours` });
    }
  }, [newRoomName, tour.id, tour.tour_name, user]);

  const updateRoom = useCallback(async (id: string, patch: Partial<TourRoom>) => {
    const prev = rooms.find((r) => r.id === id);
    setRooms((prevRooms) => prevRooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await db({ action: 'update', table: 'tour_rooms', data: patch, match: { id } });
    if (user && prev) {
      // Highlight toggle-style changes (selectable / ready / approved_by_pam).
      const changed: string[] = [];
      if (patch.selectable !== undefined && patch.selectable !== prev.selectable) changed.push(patch.selectable ? 'selectable' : 'not selectable');
      if (patch.ready !== undefined && patch.ready !== prev.ready) changed.push(patch.ready ? 'ready' : 'not ready');
      if (patch.approved_by_pam !== undefined && patch.approved_by_pam !== prev.approved_by_pam) changed.push(patch.approved_by_pam ? 'approved by Pam' : 'approval cleared');
      const summary = changed.length ? ` → ${changed.join(', ')}` : '';
      logActivity({ userId: user.id, type: 'tour.room_updated', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name} · ${prev.room_name}${summary}`, targetPath: `/app/tours` });
    }
  }, [rooms, tour.id, tour.tour_name, user]);

  const deleteRoom = useCallback(async (id: string) => {
    const ok = await confirm('Remove this room?', { confirmLabel: 'Remove', tone: 'danger' });
    if (!ok) return;
    const removed = rooms.find((r) => r.id === id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
    await db({ action: 'delete', table: 'tour_rooms', match: { id } });
    if (user) logActivity({ userId: user.id, type: 'tour.room_removed', targetKind: 'tour', targetId: tour.id, targetLabel: `${tour.tour_name}${removed?.room_name ? ' · ' + removed.room_name : ''}`, targetPath: `/app/tours` });
  }, [confirm, rooms, tour.id, tour.tour_name, user]);

  // ── Delete tour ────────────────────────────────────────────────────────
  const handleDeleteTour = useCallback(async () => {
    const ok = await confirm(`Delete tour "${tour.tour_name}"?`, {
      message: 'This removes the tour, its guests, presentations, schedule, rooms, and the calendar event.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    // Cascades drop child rows; we manually drop the calendar event row too.
    if (tour.calendar_event_id) {
      await db({ action: 'delete', table: 'calendar_events', match: { id: tour.calendar_event_id } });
    }
    await db({ action: 'delete', table: 'tours', match: { id: tour.id } });
    if (user) logActivity({ userId: user.id, type: 'tour.deleted', targetKind: 'tour', targetId: tour.id, targetLabel: tour.tour_name, targetPath: `/app/tours` });
    onDelete();
  }, [tour, confirm, onDelete]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex gap-1 overflow-x-auto">
          {SUB_TABS.map((s) => (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === s.id ? 'bg-foreground text-white' : 'text-foreground/50 hover:bg-warm-bg'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleDeleteTour}
          className="text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Delete tour
        </button>
      </div>

      <div className="p-5 space-y-4">
        {tab === 'guests' && (
          <GuestsSection
            guests={guests}
            newGuest={newGuest}
            setNewGuest={setNewGuest}
            onAdd={addGuest}
            onUpdate={updateGuest}
            onDelete={deleteGuest}
          />
        )}

        {tab === 'presentations' && (
          <PresentationsSection
            userId={user?.id || ''}
            presentations={presentations}
            signups={signups}
            newPres={newPres}
            setNewPres={setNewPres}
            onAdd={addPresentation}
            onDelete={deletePresentation}
            onToggleSignup={togglePresentationSignup}
          />
        )}

        {tab === 'bd' && (
          <BdStaffSection
            teamUsers={teamUsers}
            bdStaff={bdStaff}
            newBdUserId={newBdUserId}
            setNewBdUserId={setNewBdUserId}
            newBdRole={newBdRole}
            setNewBdRole={setNewBdRole}
            onAdd={addBdStaff}
            onRemove={removeBdStaff}
          />
        )}

        {tab === 'schedule' && (
          <ScheduleSection
            schedule={schedule}
            scheduleByKind={scheduleByKind}
            teamUsers={teamUsers}
            onAssign={assignSchedule}
            onSetStatus={setScheduleStatus}
          />
        )}

        {tab === 'rooms' && (
          <RoomsSection
            rooms={rooms}
            newRoomName={newRoomName}
            setNewRoomName={setNewRoomName}
            onAdd={addRoom}
            onUpdate={updateRoom}
            onDelete={deleteRoom}
          />
        )}
      </div>
    </div>
  );
}

// ── Guests section ─────────────────────────────────────────────────────────
function GuestsSection({
  guests, newGuest, setNewGuest, onAdd, onUpdate, onDelete,
}: {
  guests: TourGuest[];
  newGuest: { name: string; company: string; title: string; linkedin_url: string };
  setNewGuest: (v: { name: string; company: string; title: string; linkedin_url: string }) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<TourGuest>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div
        className="grid grid-cols-1 sm:grid-cols-4 gap-2"
        onKeyDown={(e) => { if (e.key === 'Enter' && newGuest.name.trim()) onAdd(); }}
      >
        <input
          placeholder="Name"
          value={newGuest.name}
          onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <input
          placeholder="Company"
          value={newGuest.company}
          onChange={(e) => setNewGuest({ ...newGuest, company: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <input
          placeholder="Title"
          value={newGuest.title}
          onChange={(e) => setNewGuest({ ...newGuest, title: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <div className="flex gap-2">
          <input
            placeholder="LinkedIn URL"
            value={newGuest.linkedin_url}
            onChange={(e) => setNewGuest({ ...newGuest, linkedin_url: e.target.value })}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <button
            onClick={onAdd}
            disabled={!newGuest.name.trim()}
            className="px-3 py-2 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Add
          </button>
        </div>
      </div>

      {guests.length === 0 ? (
        <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No guests yet.</p>
      ) : (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-warm-bg/40 text-xs text-foreground/40 uppercase tracking-wider">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">LinkedIn</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-t border-gray-50 group">
                  <td className="px-3 py-2">
                    <EditableField value={g.name} onSave={(v) => onUpdate(g.id, { name: v })} />
                  </td>
                  <td className="px-3 py-2 text-foreground/70">
                    <EditableField value={g.company || ''} onSave={(v) => onUpdate(g.id, { company: v || null })} />
                  </td>
                  <td className="px-3 py-2 text-foreground/70">
                    <EditableField value={g.title || ''} onSave={(v) => onUpdate(g.id, { title: v || null })} />
                  </td>
                  <td className="px-3 py-2">
                    {g.linkedin_url ? (
                      <a href={g.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                        View profile
                      </a>
                    ) : (
                      <EditableField value="" placeholder="LinkedIn URL" onSave={(v) => onUpdate(g.id, { linkedin_url: v || null })} />
                    )}
                  </td>
                  <td className="px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onDelete(g.id)}
                      className="text-foreground/30 hover:text-red-600 transition-colors"
                      aria-label="Remove guest"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Presentations section ──────────────────────────────────────────────────
function PresentationsSection({
  userId, presentations, signups, newPres, setNewPres, onAdd, onDelete, onToggleSignup,
}: {
  userId: string;
  presentations: TourPresentation[];
  signups: Record<string, PresentationSignup[]>;
  newPres: { title: string; presenter_name: string; scheduled_at: string };
  setNewPres: (v: { title: string; presenter_name: string; scheduled_at: string }) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggleSignup: (id: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          placeholder="Presentation title"
          value={newPres.title}
          onChange={(e) => setNewPres({ ...newPres, title: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <input
          placeholder="Presenter"
          value={newPres.presenter_name}
          onChange={(e) => setNewPres({ ...newPres, presenter_name: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <input
          type="datetime-local"
          value={newPres.scheduled_at}
          onChange={(e) => setNewPres({ ...newPres, scheduled_at: e.target.value })}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <button
          onClick={onAdd}
          disabled={!newPres.title.trim()}
          className="px-3 py-2 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Add presentation
        </button>
      </div>

      {presentations.length === 0 ? (
        <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No presentations yet.</p>
      ) : (
        <div className="space-y-2">
          {presentations.map((p) => {
            const presSignups = signups[p.id] || [];
            const iSignedUp = !!presSignups.find((s) => s.user_id === userId);
            return (
              <div key={p.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{p.title}</p>
                    <p className="text-xs text-foreground/60 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                      {p.presenter_name ? `${p.presenter_name}` : 'Presenter TBD'}
                      {p.scheduled_at ? ` · ${new Date(p.scheduled_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onToggleSignup(p.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        iSignedUp ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-warm-bg text-foreground/60 hover:bg-warm-bg/80'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {iSignedUp ? 'Attending' : 'Sign up'}
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-foreground/30 hover:text-red-600 transition-colors"
                      aria-label="Remove presentation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                {presSignups.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {presSignups.map((s) => (
                      <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
                        {s.user_name || 'Staff'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── BD Staff section ───────────────────────────────────────────────────────
function BdStaffSection({
  teamUsers, bdStaff, newBdUserId, setNewBdUserId, newBdRole, setNewBdRole, onAdd, onRemove,
}: {
  teamUsers: TeamUser[];
  bdStaff: BdStaff[];
  newBdUserId: string;
  setNewBdUserId: (v: string) => void;
  newBdRole: string;
  setNewBdRole: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const available = teamUsers.filter((u) => !bdStaff.some((b) => b.user_id === u.id));
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={newBdUserId}
          onChange={(e) => setNewBdUserId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <option value="">Pick a staff member…</option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>{u.full_name || 'Unnamed'}</option>
          ))}
        </select>
        <input
          placeholder="Role (e.g. Point of contact)"
          value={newBdRole}
          onChange={(e) => setNewBdRole(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <button
          onClick={onAdd}
          disabled={!newBdUserId}
          className="px-3 py-2 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Add staff
        </button>
      </div>

      {bdStaff.length === 0 ? (
        <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No BD staff assigned yet.</p>
      ) : (
        <ul className="space-y-2">
          {bdStaff.map((b) => {
            const u = teamUsers.find((x) => x.id === b.user_id);
            return (
              <li key={b.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  {u?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                      {(b.staff_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{b.staff_name}</p>
                    {b.role && <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{b.role}</p>}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(b.id)}
                  className="text-foreground/30 hover:text-red-600 transition-colors"
                  aria-label="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

// ── Schedule section ───────────────────────────────────────────────────────
function ScheduleSection({
  schedule, scheduleByKind, teamUsers, onAssign, onSetStatus,
}: {
  schedule: ScheduleItem[];
  scheduleByKind: Map<ScheduleKind, ScheduleItem>;
  teamUsers: TeamUser[];
  onAssign: (kind: ScheduleKind, userId: string) => void;
  onSetStatus: (kind: ScheduleKind, status: ScheduleItem['approval_status']) => void;
}) {
  // Keep schedule accessible even if no items exist yet — iterate over the
  // fixed set of kinds and lazily create a row on first interaction.
  void schedule;
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-warm-bg/40 text-xs text-foreground/40 uppercase tracking-wider">
            <th className="px-3 py-2">Activity</th>
            <th className="px-3 py-2">Assigned to</th>
            <th className="px-3 py-2">Approval</th>
          </tr>
        </thead>
        <tbody>
          {SCHEDULE_KINDS.map(({ kind, label }) => {
            const item = scheduleByKind.get(kind);
            return (
              <tr key={kind} className="border-t border-gray-50">
                <td className="px-3 py-2 text-foreground font-medium">{label}</td>
                <td className="px-3 py-2">
                  <select
                    value={item?.assigned_user_id || ''}
                    onChange={(e) => onAssign(kind, e.target.value)}
                    className="px-2 py-1 rounded-md border border-gray-200 text-xs bg-white focus:outline-none focus:border-primary"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <option value="">Unassigned</option>
                    {teamUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || 'Unnamed'}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item?.approval_status || 'pending'}
                    onChange={(e) => onSetStatus(kind, e.target.value as ScheduleItem['approval_status'])}
                    className={`appearance-none px-2 py-1 pr-6 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none ${approvalStyle[item?.approval_status || 'pending']}`}
                    style={{
                      fontFamily: 'var(--font-body)',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 4px center',
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="declined">Declined</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Rooms section ──────────────────────────────────────────────────────────
function RoomsSection({
  rooms, newRoomName, setNewRoomName, onAdd, onUpdate, onDelete,
}: {
  rooms: TourRoom[];
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<TourRoom>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="flex gap-2">
        <input
          placeholder="Room name (e.g. Lodge)"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <button
          onClick={onAdd}
          disabled={!newRoomName.trim()}
          className="px-3 py-2 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Add room
        </button>
      </div>

      {rooms.length === 0 ? (
        <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No rooms added yet.</p>
      ) : (
        <div className="space-y-2">
          {rooms.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-[140px] flex-1">
                <EditableField value={r.room_name} onSave={(v) => onUpdate(r.id, { room_name: v })} />
              </div>
              <CheckboxPill checked={r.selectable} onChange={(v) => onUpdate(r.id, { selectable: v })} label="Selectable" />
              <CheckboxPill checked={r.ready} onChange={(v) => onUpdate(r.id, { ready: v })} label="Ready" />
              <CheckboxPill checked={r.approved_by_pam} onChange={(v) => onUpdate(r.id, { approved_by_pam: v })} label="Approved by Pam" />
              <input
                placeholder="Notes on setup / readiness"
                defaultValue={r.notes || ''}
                onBlur={(e) => onUpdate(r.id, { notes: e.target.value || null })}
                className="flex-1 min-w-[180px] px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-warm-bg/50 focus:outline-none focus:border-primary"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <button
                onClick={() => onDelete(r.id)}
                className="text-foreground/30 hover:text-red-600 transition-colors"
                aria-label="Remove room"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Small shared helpers ───────────────────────────────────────────────────
function EditableField({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== value) onSave(draft); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { setEditing(false); if (draft !== value) onSave(draft); }
          if (e.key === 'Escape') { setEditing(false); setDraft(value); }
        }}
        className="w-full px-2 py-1 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:border-primary"
        style={{ fontFamily: 'var(--font-body)' }}
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-text hover:text-foreground transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {value || <span className="text-foreground/20">{placeholder || '—'}</span>}
    </span>
  );
}

function CheckboxPill({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        checked ? 'bg-emerald-50 text-emerald-700' : 'bg-warm-bg text-foreground/50 hover:bg-warm-bg/80'
      }`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${checked ? 'border-emerald-600 bg-emerald-500' : 'border-foreground/30 bg-white'}`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        )}
      </span>
      {label}
    </button>
  );
}
