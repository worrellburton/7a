'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useModal } from '@/lib/ModalProvider';
import { logActivity } from '@/lib/activity';
import { TourDetailPanel } from './TourDetailPanel';

// Tours — the Marketing & Admissions team schedules VIP / stakeholder tours
// on this page. Each tour has top-level info (name, date, window), a guest
// list with LinkedIn handles, any guest presentations with sign-ups from our
// own staff, BD staff participation, a set of schedule items drawn from a
// fixed list (trail ride, equine experience, property tour, etc.) with
// assignment + approval, and a facility room readiness checklist. A matching
// calendar_events row is created alongside each tour so it shows up on the
// shared Calendar page.

// ── Types ──────────────────────────────────────────────────────────────────

export interface Tour {
  id: string;
  tour_name: string;
  tour_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  notes: string | null;
  calendar_event_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TourGuest {
  id: string;
  tour_id: string;
  name: string;
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
  sort_order: number;
}

export interface TourPresentation {
  id: string;
  tour_id: string;
  title: string;
  presenter_name: string | null;
  scheduled_at: string | null; // ISO
  notes: string | null;
}

export interface PresentationSignup {
  id: string;
  presentation_id: string;
  user_id: string | null;
  user_name: string | null;
}

export interface BdStaff {
  id: string;
  tour_id: string;
  user_id: string | null;
  staff_name: string;
  role: string | null;
}

export type ScheduleKind =
  | 'trail_ride'
  | 'equine_experience'
  | 'equine_presentation'
  | 'property_tour'
  | 'clinical_presentation'
  | 'lunch'
  | 'sweat_lodge';

export interface ScheduleItem {
  id: string;
  tour_id: string;
  kind: ScheduleKind;
  scheduled_at: string | null;
  assigned_user_id: string | null;
  assigned_name: string | null;
  approval_status: 'pending' | 'approved' | 'declined';
  notes: string | null;
  sort_order: number;
}

export interface TourRoom {
  id: string;
  tour_id: string;
  room_name: string;
  selectable: boolean;
  ready: boolean;
  approved_by_pam: boolean;
  notes: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const SCHEDULE_KINDS: { kind: ScheduleKind; label: string }[] = [
  { kind: 'trail_ride', label: 'Trail Ride' },
  { kind: 'equine_experience', label: 'Equine Experience' },
  { kind: 'equine_presentation', label: 'Equine Presentation' },
  { kind: 'property_tour', label: 'Property Tour' },
  { kind: 'clinical_presentation', label: 'Clinical Presentation' },
  { kind: 'lunch', label: 'Lunch' },
  { kind: 'sweat_lodge', label: 'Sweat Lodge' },
];

export const approvalStyle: Record<ScheduleItem['approval_status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
};

type ViewMode = 'table' | 'list';

function azDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}

function formatDate(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });
  } catch { return d; }
}

function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (s: string | null) => {
    if (!s) return '';
    const [h, m] = s.split(':').map(Number);
    if (!Number.isFinite(h)) return '';
    const period = h >= 12 ? 'PM' : 'AM';
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hh}:${String(m || 0).padStart(2, '0')} ${period}`;
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}

interface TeamUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ToursContent() {
  const { user, session } = useAuth();
  const { confirm } = useModal();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  const [newTour, setNewTour] = useState({
    tour_name: '',
    tour_date: azDate(),
    start_time: '10:00',
    end_time: '14:00',
    notes: '',
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchTours = useCallback(async () => {
    const data = await db({ action: 'select', table: 'tours', order: { column: 'tour_date', ascending: false } });
    if (Array.isArray(data)) setTours(data as Tour[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    fetchTours();
    db({ action: 'select', table: 'users', select: 'id, full_name, avatar_url' }).then((d) => {
      if (Array.isArray(d)) setTeamUsers(d as TeamUser[]);
    });
  }, [session, fetchTours]);

  // Realtime: reflect tour inserts/updates/deletes for all viewers.
  useEffect(() => {
    if (!session?.access_token) return;
    const ch = supabase
      .channel('tours-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tours' }, (p) => {
        const row = p.new as Tour;
        setTours((prev) => (prev.some((t) => t.id === row.id) ? prev : [row, ...prev]));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tours' }, (p) => {
        const row = p.new as Tour;
        setTours((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tours' }, (p) => {
        const row = p.old as { id: string };
        setTours((prev) => prev.filter((t) => t.id !== row.id));
        setExpandedId((cur) => (cur === row.id ? null : cur));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session]);

  const sortedTours = useMemo(
    () => [...tours].sort((a, b) => b.tour_date.localeCompare(a.tour_date)),
    [tours]
  );

  const addTour = useCallback(async () => {
    if (!user || !newTour.tour_name.trim() || !newTour.tour_date) return;
    setSubmitting(true);

    const tourRow = {
      tour_name: newTour.tour_name.trim(),
      tour_date: newTour.tour_date,
      start_time: newTour.start_time ? `${newTour.start_time}:00` : null,
      end_time: newTour.end_time ? `${newTour.end_time}:00` : null,
      notes: newTour.notes.trim() || null,
      created_by: user.id,
    };

    // Paired calendar_events row so the tour shows up on the shared calendar.
    let calendarEventId: string | null = null;
    const calRow = await db({
      action: 'insert',
      table: 'calendar_events',
      data: {
        title: `Tour: ${tourRow.tour_name}`,
        event_date: tourRow.tour_date,
        start_time: tourRow.start_time,
        end_time: tourRow.end_time,
        subject_kind: 'event',
        subject_id: null,
        color: '#6366f1',
        created_by: user.id,
      },
    });
    if (calRow && calRow.id) calendarEventId = calRow.id as string;

    const inserted = await db({
      action: 'insert',
      table: 'tours',
      data: { ...tourRow, calendar_event_id: calendarEventId },
    });

    if (inserted && inserted.id) {
      setTours((prev) => [inserted as Tour, ...prev]);
      showToast('Tour scheduled');
      logActivity({
        userId: user.id,
        type: 'tour.created',
        targetKind: 'tour',
        targetId: inserted.id,
        targetLabel: tourRow.tour_name,
        targetPath: '/app/tours',
        metadata: { date: tourRow.tour_date },
      });
      setExpandedId(inserted.id);
    } else {
      showToast(`Failed to save: ${inserted?.error || 'Unknown error'}`);
    }

    setNewTour({
      tour_name: '',
      tour_date: azDate(),
      start_time: '10:00',
      end_time: '14:00',
      notes: '',
    });
    setShowAddForm(false);
    setSubmitting(false);
  }, [user, newTour, showToast]);

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Tours</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Plan VIP tours — guests, presentations, schedule, staff, and rooms.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="w-10 h-10 rounded-xl bg-foreground text-white flex items-center justify-center hover:bg-foreground/80 transition-colors shadow-sm"
          aria-label="Add new tour"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
          </svg>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-sm font-bold text-foreground mb-4">New Tour</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              placeholder="Tour name (e.g. Smith Family Visit)"
              value={newTour.tour_name}
              onChange={(e) => setNewTour({ ...newTour, tour_name: e.target.value })}
              className="sm:col-span-2 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <input
              type="date"
              value={newTour.tour_date}
              onChange={(e) => setNewTour({ ...newTour, tour_date: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={newTour.start_time}
                onChange={(e) => setNewTour({ ...newTour, start_time: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <input
                type="time"
                value={newTour.end_time}
                onChange={(e) => setNewTour({ ...newTour, end_time: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={newTour.notes}
            onChange={(e) => setNewTour({ ...newTour, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base bg-warm-bg/50 focus:outline-none focus:border-primary mb-4 resize-none"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={addTour}
              disabled={submitting || !newTour.tour_name.trim() || !newTour.tour_date}
              className="px-4 py-2 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {submitting ? 'Saving…' : 'Schedule Tour'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:bg-warm-bg transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {tours.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-1 bg-warm-bg rounded-lg p-1">
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
              aria-label="Table view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
              aria-label="List view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tours.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20">
          <p className="text-sm font-medium text-foreground/50 mb-1">No tours scheduled yet</p>
          <p className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
            Click the + button to schedule a tour.
          </p>
        </div>
      ) : view === 'table' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/40">
                  <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Tour Name</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Date</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Time</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Notes</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {sortedTours.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    className={`border-b border-gray-50 hover:bg-warm-bg/40 transition-colors cursor-pointer ${expandedId === t.id ? 'bg-warm-bg/30' : ''}`}
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{t.tour_name}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{formatDate(t.tour_date)}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{formatTimeRange(t.start_time, t.end_time) || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground/50 max-w-[320px] truncate" style={{ fontFamily: 'var(--font-body)' }}>{t.notes || ''}</td>
                    <td className="px-3 py-3.5">
                      <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expandedId === t.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTours.map((t) => (
            <div
              key={t.id}
              onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all ${expandedId === t.id ? 'ring-2 ring-primary/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t.tour_name}</p>
                  <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {formatDate(t.tour_date)}
                    {formatTimeRange(t.start_time, t.end_time) ? ` · ${formatTimeRange(t.start_time, t.end_time)}` : ''}
                  </p>
                  {t.notes && <p className="text-xs text-foreground/50 mt-2" style={{ fontFamily: 'var(--font-body)' }}>{t.notes}</p>}
                </div>
                <svg className={`w-4 h-4 text-foreground/30 transition-transform shrink-0 ${expandedId === t.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {expandedId && (() => {
        const expanded = tours.find((t) => t.id === expandedId);
        if (!expanded) return null;
        return (
          <TourDetailPanel
            key={expanded.id}
            tour={expanded}
            teamUsers={teamUsers}
            onDelete={() => {
              setTours((prev) => prev.filter((t) => t.id !== expanded.id));
              setExpandedId(null);
              showToast('Tour deleted');
            }}
          />
        );
      })()}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl ${toast.startsWith('Failed') ? 'bg-red-600 text-white' : 'bg-foreground text-white'}`}>
            {toast}
          </div>
        </div>
      )}

    </div>
  );
}
