'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { logActivity } from '@/lib/activity';
import { useEffect, useState } from 'react';

/* ── Types ─────────────────────────────────────────────────────── */

type NoteType = 'group' | 'individual' | 'biopsychosocial';
type NoteStatus = 'draft' | 'finalized';
type View = 'list' | 'picker' | 'clients' | 'editor';

interface FakeClient {
  id: string;
  name: string;
  pronouns: string | null;
  dob: string | null;
  age: number | null;
  primary_substance: string | null;
  admission_date: string | null;
  notes: string | null;
}

interface NoteRow {
  id: string;
  note_type: NoteType;
  client_id: string;
  content: Record<string, unknown>;
  status: NoteStatus;
  session_date: string;
  created_at: string;
  updated_at: string;
}

/* ── ASAM 4th Edition Six Dimensions ──────────────────────────── */

const ASAM_DIMENSIONS = [
  { key: 'dim1', label: 'Dimension 1: Intoxication, Withdrawal & Addiction Medications' },
  { key: 'dim2', label: 'Dimension 2: Biomedical Conditions' },
  { key: 'dim3', label: 'Dimension 3: Psychiatric & Cognitive Conditions' },
  { key: 'dim4', label: 'Dimension 4: Substance Use-Related Risks' },
  { key: 'dim5', label: 'Dimension 5: Recovery Environment Interactions' },
  { key: 'dim6', label: 'Dimension 6: Person-Centered Considerations' },
] as const;

/* ── Template Field Lists + Completeness ──────────────────────── */

const GROUP_FIELDS = ['session_title','session_date','session_duration_min','facilitator','topic','attendance_count','asam_dimension_focus','group_process','client_participation','interventions','plan'];
const INDIVIDUAL_FIELDS = ['session_date','session_duration_min','clinician','presenting_concern','mental_status','mood_affect','interventions','dim1','dim2','dim3','dim4','dim5','dim6','progress','plan','next_session'];
const BPS_FIELDS = ['assessment_date','clinician','presenting_problem','medical_history','current_medications','pain_concerns','psychiatric_history','current_symptoms','trauma_history','cognitive_functioning','family_history','social_support','housing_employment','legal_involvement','cultural_spiritual','substance_use_history','current_use_pattern','withdrawal_risk','previous_treatment','dim1','dim2','dim3','dim4','dim5','dim6','strengths_resources','barriers','diagnostic_impression','recommended_level_of_care','initial_treatment_goals'];

function fieldsFor(type: NoteType): string[] {
  if (type === 'group') return GROUP_FIELDS;
  if (type === 'individual') return INDIVIDUAL_FIELDS;
  return BPS_FIELDS;
}

// Word-weighted completeness: each field scores 0–1 based on word count
// (full credit at ~15 words). Total score is the average × 100.
function computeCompleteness(type: NoteType, content: Record<string, unknown>): number {
  const fields = fieldsFor(type);
  if (fields.length === 0) return 0;
  let total = 0;
  for (const f of fields) {
    const raw = content[f];
    if (raw === undefined || raw === null) continue;
    const str = typeof raw === 'number' ? String(raw) : String(raw).trim();
    if (!str) continue;
    const words = str.split(/\s+/).filter(Boolean).length;
    total += Math.min(1, words / 15);
  }
  return Math.round((total / fields.length) * 100);
}

function scoreBucket(pct: number): { label: string; cls: string } {
  if (pct >= 85) return { label: 'Strong', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (pct >= 60) return { label: 'Solid', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (pct >= 30) return { label: 'Partial', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Thin', cls: 'bg-red-50 text-red-700 border-red-200' };
}

/* ── Template defaults ────────────────────────────────────────── */

function defaultGroupContent() {
  return {
    session_title: '',
    session_date: new Date().toISOString().slice(0, 10),
    session_duration_min: 60,
    facilitator: '',
    topic: '',
    attendance_count: '',
    asam_dimension_focus: '',
    group_process: '',
    client_participation: '',
    interventions: '',
    plan: '',
  };
}

function defaultIndividualContent() {
  return {
    session_date: new Date().toISOString().slice(0, 10),
    session_duration_min: 50,
    clinician: '',
    presenting_concern: '',
    mental_status: '',
    mood_affect: '',
    interventions: '',
    dim1: '', dim2: '', dim3: '', dim4: '', dim5: '', dim6: '',
    progress: '',
    plan: '',
    next_session: '',
  };
}

function defaultBpsContent() {
  return {
    assessment_date: new Date().toISOString().slice(0, 10),
    clinician: '',
    presenting_problem: '',
    // Bio
    medical_history: '',
    current_medications: '',
    pain_concerns: '',
    // Psych
    psychiatric_history: '',
    current_symptoms: '',
    trauma_history: '',
    cognitive_functioning: '',
    // Social
    family_history: '',
    social_support: '',
    housing_employment: '',
    legal_involvement: '',
    cultural_spiritual: '',
    // Substance use
    substance_use_history: '',
    current_use_pattern: '',
    withdrawal_risk: '',
    previous_treatment: '',
    // ASAM six dims
    dim1: '', dim2: '', dim3: '', dim4: '', dim5: '', dim6: '',
    // Formulation
    strengths_resources: '',
    barriers: '',
    diagnostic_impression: '',
    recommended_level_of_care: '',
    initial_treatment_goals: '',
  };
}

/* ── Helpers ──────────────────────────────────────────────────── */

const TYPE_LABELS: Record<NoteType, string> = {
  group: 'Group Note',
  individual: 'Individual Note',
  biopsychosocial: 'Biopsychosocial Assessment',
};

const TYPE_COLORS: Record<NoteType, string> = {
  group: 'bg-blue-50 text-blue-700 border-blue-200',
  individual: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  biopsychosocial: 'bg-purple-50 text-purple-700 border-purple-200',
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Main Component ──────────────────────────────────────────── */

export default function NotesContent() {
  const { user, session } = useAuth();
  const { confirm } = useModal();

  const [view, setView] = useState<View>('list');
  const [noteType, setNoteType] = useState<NoteType>('group');
  const [selectedClient, setSelectedClient] = useState<FakeClient | null>(null);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [editingNote, setEditingNote] = useState<NoteRow | null>(null);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [clients, setClients] = useState<FakeClient[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('notes:viewMode') : null;
    if (saved === 'list' || saved === 'grid') setViewMode(saved);
  }, []);
  function changeViewMode(m: 'list' | 'grid') {
    setViewMode(m);
    try { window.localStorage.setItem('notes:viewMode', m); } catch { /* ignore */ }
  }

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const [n, c] = await Promise.all([
        db({ action: 'select', table: 'notes', order: { column: 'created_at', ascending: false } }),
        db({ action: 'select', table: 'fake_clients', order: { column: 'name', ascending: true } }),
      ]);
      if (Array.isArray(n)) setNotes(n as NoteRow[]);
      if (Array.isArray(c)) setClients(c as FakeClient[]);
      setLoading(false);
    }
    load();
  }, [session]);

  /* ── Actions ──────────────────────────────────────────────── */

  function startNew(type: NoteType) {
    setNoteType(type);
    setSelectedClient(null);
    setEditingNote(null);
    setClientSearch('');
    setView('clients');
  }

  function pickClient(client: FakeClient) {
    setSelectedClient(client);
    if (noteType === 'group') setContent(defaultGroupContent());
    else if (noteType === 'individual') setContent(defaultIndividualContent());
    else setContent(defaultBpsContent());
    setView('editor');
  }

  function openExisting(note: NoteRow) {
    setEditingNote(note);
    setNoteType(note.note_type);
    setSelectedClient(clients.find(c => c.id === note.client_id) || null);
    setContent(note.content as Record<string, unknown>);
    setView('editor');
  }

  function setField(key: string, val: string | number) {
    setContent(prev => ({ ...prev, [key]: val }));
  }

  async function generateNote() {
    if (!selectedClient || !session?.access_token) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/claude/note/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          noteType,
          client: {
            name: selectedClient.name,
            pronouns: selectedClient.pronouns,
            age: selectedClient.age,
            primary_substance: selectedClient.primary_substance,
            admission_date: selectedClient.admission_date,
          },
          existing: content,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGenerateError(typeof json?.error === 'string' ? json.error : 'Generation failed.');
      } else if (json?.fields && typeof json.fields === 'object') {
        // Merge generated fields into the editor, preserving any user-entered values that are already set.
        setContent(prev => {
          const next: Record<string, unknown> = { ...prev };
          for (const [k, v] of Object.entries(json.fields as Record<string, unknown>)) {
            const cur = next[k];
            const curStr = cur === undefined || cur === null ? '' : String(cur).trim();
            if (!curStr) next[k] = v;
          }
          return next;
        });
      }
    } catch (err) {
      setGenerateError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function saveNote(status: NoteStatus) {
    if (!user || !selectedClient) return;
    setSaving(true);
    const sessionDate = (content as Record<string, string>).session_date
      || (content as Record<string, string>).assessment_date
      || new Date().toISOString().slice(0, 10);

    if (editingNote) {
      const res = await db({
        action: 'update',
        table: 'notes',
        data: { content, status, session_date: sessionDate },
        match: { id: editingNote.id },
      });
      if (res && (res as { ok?: boolean }).ok) {
        setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, content: content as Record<string, unknown>, status, session_date: sessionDate, updated_at: new Date().toISOString() } : n));
        logActivity({ userId: user.id, type: 'note.updated', targetKind: 'note', targetId: editingNote.id, targetLabel: `${TYPE_LABELS[noteType]} · ${selectedClient.name}`, targetPath: '/app/notes' });
      }
    } else {
      const data = await db({
        action: 'insert',
        table: 'notes',
        data: { note_type: noteType, client_id: selectedClient.id, content, status, session_date: sessionDate },
      });
      if (data && (data as NoteRow).id) {
        setNotes(prev => [data as NoteRow, ...prev]);
        logActivity({ userId: user.id, type: 'note.created', targetKind: 'note', targetId: (data as NoteRow).id, targetLabel: `${TYPE_LABELS[noteType]} · ${selectedClient.name}`, targetPath: '/app/notes' });
      }
    }
    setSaving(false);
    setView('list');
  }

  async function deleteNote(note: NoteRow) {
    const client = clients.find(c => c.id === note.client_id);
    const ok = await confirm(`Delete this ${TYPE_LABELS[note.note_type]}?`, { message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    const res = await db({ action: 'delete', table: 'notes', match: { id: note.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setNotes(prev => prev.filter(n => n.id !== note.id));
      if (user) logActivity({ userId: user.id, type: 'note.deleted', targetKind: 'note', targetId: note.id, targetLabel: `${TYPE_LABELS[note.note_type]} · ${client?.name || 'Unknown'}`, targetPath: '/app/notes' });
    }
  }

  if (!user) return null;

  /* ── Field Renderer ────────────────────────────────────────── */

  function TextField({ label, field, rows, placeholder }: { label: string; field: string; rows?: number; placeholder?: string }) {
    const val = (content as Record<string, string>)[field] || '';
    if (rows && rows > 1) {
      return (
        <div>
          <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>{label}</label>
          <textarea value={val} onChange={e => setField(field, e.target.value)} rows={rows} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
        </div>
      );
    }
    return (
      <div>
        <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>{label}</label>
        <input value={val} onChange={e => setField(field, e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
      </div>
    );
  }

  function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-bold text-foreground/80 mt-6 mb-3 pb-1.5 border-b border-gray-100">{children}</h3>;
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Notes</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Clinical documentation — Group, Individual &amp; Biopsychosocial templates.
          </p>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('picker')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            New Note
          </button>
        )}
        {view !== 'list' && (
          <button onClick={() => setView('list')} className="flex items-center gap-2 px-4 py-2 bg-warm-bg text-foreground/70 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Back
          </button>
        )}
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Toolbar: view toggle */}
          {!loading && notes.length > 0 && (
            <div className="flex items-center justify-end mb-4">
              <div className="inline-flex items-center gap-1 bg-warm-bg rounded-lg p-1">
                <button
                  onClick={() => changeViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
                  aria-label="Spreadsheet view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                </button>
                <button
                  onClick={() => changeViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`}
                  aria-label="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-20 text-foreground/40">
              <svg className="w-12 h-12 mx-auto mb-3 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4a2 2 0 0 1 2-2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                <path d="M16 2v4h4" /><path d="M8 11h8M8 15h8M8 19h5" />
              </svg>
              <p className="text-sm font-medium">No notes yet</p>
              <p className="text-xs mt-1">Click "New Note" to get started.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-warm-bg/30">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Client</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Session Date</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Status</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>AI Completeness</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Updated</th>
                    <th className="w-16 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {notes.map(note => {
                    const client = clients.find(c => c.id === note.client_id);
                    const pct = computeCompleteness(note.note_type, note.content as Record<string, unknown>);
                    const bucket = scoreBucket(pct);
                    return (
                      <tr key={note.id} className="border-b border-gray-100 last:border-0 hover:bg-warm-bg/40 transition-colors cursor-pointer" onClick={() => openExisting(note)}>
                        <td className="px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[note.note_type]}`}>{TYPE_LABELS[note.note_type]}</span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-foreground">{client?.name || 'Unknown'}</td>
                        <td className="px-5 py-3 text-sm text-foreground/60">{fmtDate(note.session_date)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${note.status === 'finalized' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{note.status === 'finalized' ? 'Finalized' : 'Draft'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 w-40">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className={`h-full ${pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${bucket.cls} shrink-0`}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-foreground/50">{new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-3 py-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); deleteNote(note); }} className="p-1.5 rounded-lg text-foreground/50 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Delete">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map(note => {
                const client = clients.find(c => c.id === note.client_id);
                const pct = computeCompleteness(note.note_type, note.content as Record<string, unknown>);
                const bucket = scoreBucket(pct);
                return (
                  <div key={note.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[note.note_type]}`}>{TYPE_LABELS[note.note_type]}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteNote(note); }} className="p-1.5 -mr-1 -mt-1 rounded-lg text-foreground/40 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <div className="cursor-pointer" onClick={() => openExisting(note)}>
                      <p className="text-sm font-semibold text-foreground truncate">{client?.name || 'Unknown'}</p>
                      <p className="text-xs text-foreground/40 mb-3">{fmtDate(note.session_date)}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${note.status === 'finalized' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{note.status === 'finalized' ? 'Finalized' : 'Draft'}</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${bucket.cls}`}>{pct}% {bucket.label}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full ${pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TEMPLATE PICKER ────────────────────────────────────── */}
      {view === 'picker' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { type: 'group' as NoteType, title: 'Group Note', desc: 'Session-level documentation for group therapy. Captures topic, attendance, client participation, and ASAM dimension focus.', icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )},
            { type: 'individual' as NoteType, title: 'Individual Note', desc: 'One-on-one session note with mental status, interventions, ASAM six-dimension progress review, and treatment plan.', icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            )},
            { type: 'biopsychosocial' as NoteType, title: 'Biopsychosocial Assessment', desc: 'Comprehensive intake assessment covering biological, psychological, and social domains across all six ASAM dimensions with level-of-care recommendation.', icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14h.01M9 17h.01M12 14h3M12 17h3" />
              </svg>
            )},
          ]).map(t => (
            <button key={t.type} onClick={() => startNew(t.type)} className="text-left bg-white rounded-2xl border border-gray-100 p-6 hover:border-primary/30 hover:shadow-md transition-all group">
              <div className="mb-4 text-foreground/40 group-hover:text-primary transition-colors">{t.icon}</div>
              <h3 className="text-sm font-bold text-foreground mb-1">{t.title}</h3>
              <p className="text-xs text-foreground/50 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{t.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── CLIENT PICKER ──────────────────────────────────────── */}
      {view === 'clients' && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-1">Select Client</h2>
          <p className="text-xs text-foreground/40 mb-4" style={{ fontFamily: 'var(--font-body)' }}>Choose a client to populate the {TYPE_LABELS[noteType].toLowerCase()}.</p>
          <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search clients..." autoFocus className="w-full max-w-sm px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none mb-4" />
          <div className="space-y-2">
            {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(client => (
              <button key={client.id} onClick={() => pickClient(client)} className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{client.name}</p>
                  <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                    {client.pronouns && `${client.pronouns} · `}
                    {client.age && `Age ${client.age} · `}
                    {client.primary_substance && `Primary: ${client.primary_substance}`}
                  </p>
                </div>
                <svg className="w-4 h-4 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── EDITOR ─────────────────────────────────────────────── */}
      {view === 'editor' && selectedClient && (
        <div className="max-w-3xl">
          {/* Client banner */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {selectedClient.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{selectedClient.name}</p>
              <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                {selectedClient.pronouns && `${selectedClient.pronouns} · `}
                {selectedClient.age && `Age ${selectedClient.age} · `}
                {selectedClient.primary_substance && `Primary: ${selectedClient.primary_substance}`}
                {selectedClient.admission_date && ` · Admitted ${fmtDate(selectedClient.admission_date)}`}
              </p>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${TYPE_COLORS[noteType]}`}>{TYPE_LABELS[noteType]}</span>
          </div>

          {/* Generate toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={generateNote}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  Drafting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                  </svg>
                  Generate with AI
                </>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                AI drafts a comprehensive, insurance-ready note using client context. Fields you've already filled are preserved.
              </p>
              {generateError && <p className="text-[11px] text-red-600 mt-0.5">{generateError}</p>}
            </div>
            <span className="text-[11px] font-semibold text-foreground/50 px-2.5 py-1 rounded-full border border-gray-200 bg-warm-bg/60">
              {computeCompleteness(noteType, content)}% complete
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            {/* ── GROUP TEMPLATE ──────────────────────────────── */}
            {noteType === 'group' && (
              <>
                <SectionHeading>Session Information</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Session Date" field="session_date" placeholder="YYYY-MM-DD" />
                  <TextField label="Duration (min)" field="session_duration_min" />
                </div>
                <TextField label="Session Title" field="session_title" placeholder="e.g. Relapse Prevention" />
                <TextField label="Facilitator" field="facilitator" placeholder="Clinician name" />
                <TextField label="Topic" field="topic" rows={2} placeholder="Primary topic and objectives for today's session" />
                <TextField label="Attendance Count" field="attendance_count" placeholder="Number of participants" />

                <SectionHeading>ASAM Dimension Focus</SectionHeading>
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Primary Dimension Addressed</label>
                  <select value={(content as Record<string, string>).asam_dimension_focus || ''} onChange={e => setField('asam_dimension_focus', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
                    <option value="">Select dimension...</option>
                    {ASAM_DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>

                <SectionHeading>Documentation</SectionHeading>
                <TextField label="Group Process / Dynamics" field="group_process" rows={3} placeholder="Describe group dynamics, themes, and interactions observed" />
                <TextField label="Client Participation" field="client_participation" rows={3} placeholder="Level and quality of this client's engagement in group" />
                <TextField label="Interventions Used" field="interventions" rows={2} placeholder="CBT, DBT skills, MI, psychoeducation, etc." />
                <TextField label="Plan / Follow-up" field="plan" rows={2} placeholder="Recommendations and next steps" />
              </>
            )}

            {/* ── INDIVIDUAL TEMPLATE ────────────────────────── */}
            {noteType === 'individual' && (
              <>
                <SectionHeading>Session Information</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Session Date" field="session_date" placeholder="YYYY-MM-DD" />
                  <TextField label="Duration (min)" field="session_duration_min" />
                </div>
                <TextField label="Clinician" field="clinician" placeholder="Clinician name" />

                <SectionHeading>Presentation</SectionHeading>
                <TextField label="Presenting Concern" field="presenting_concern" rows={2} placeholder="Chief complaint or focus area for this session" />
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Mental Status" field="mental_status" placeholder="Alert, oriented, cooperative..." />
                  <TextField label="Mood / Affect" field="mood_affect" placeholder="Euthymic, congruent..." />
                </div>

                <SectionHeading>Interventions</SectionHeading>
                <TextField label="Interventions Used" field="interventions" rows={3} placeholder="CBT, motivational interviewing, trauma processing, etc." />

                <SectionHeading>ASAM Six-Dimension Review</SectionHeading>
                {ASAM_DIMENSIONS.map(d => (
                  <TextField key={d.key} label={d.label} field={d.key} rows={2} placeholder={`Status and progress for ${d.label.split(': ')[1]}`} />
                ))}

                <SectionHeading>Progress & Plan</SectionHeading>
                <TextField label="Progress Toward Goals" field="progress" rows={2} placeholder="Progress made toward treatment plan goals" />
                <TextField label="Plan / Recommendations" field="plan" rows={2} placeholder="Next steps, homework, coordination needs" />
                <TextField label="Next Session" field="next_session" placeholder="Scheduled date or timeframe" />
              </>
            )}

            {/* ── BIOPSYCHOSOCIAL TEMPLATE ────────────────────── */}
            {noteType === 'biopsychosocial' && (
              <>
                <SectionHeading>Assessment Information</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Assessment Date" field="assessment_date" placeholder="YYYY-MM-DD" />
                  <TextField label="Clinician" field="clinician" placeholder="Assessing clinician" />
                </div>
                <TextField label="Presenting Problem" field="presenting_problem" rows={3} placeholder="Client's stated reason for seeking treatment, in their own words where possible" />

                <SectionHeading>Biological Domain</SectionHeading>
                <TextField label="Medical History" field="medical_history" rows={2} placeholder="Chronic conditions, surgeries, hospitalizations" />
                <TextField label="Current Medications" field="current_medications" rows={2} placeholder="List all current medications, doses, prescribers" />
                <TextField label="Pain Concerns" field="pain_concerns" rows={2} placeholder="Chronic pain, acute injuries, pain management history" />

                <SectionHeading>Psychological Domain</SectionHeading>
                <TextField label="Psychiatric History" field="psychiatric_history" rows={2} placeholder="Prior diagnoses, hospitalizations, SI/HI history" />
                <TextField label="Current Symptoms" field="current_symptoms" rows={2} placeholder="Depression, anxiety, psychosis, mania, etc." />
                <TextField label="Trauma History" field="trauma_history" rows={2} placeholder="ACEs, abuse, neglect, significant losses" />
                <TextField label="Cognitive Functioning" field="cognitive_functioning" rows={2} placeholder="Orientation, memory, concentration, executive function" />

                <SectionHeading>Social Domain</SectionHeading>
                <TextField label="Family History" field="family_history" rows={2} placeholder="Family structure, substance use in family, mental health history" />
                <TextField label="Social Support" field="social_support" rows={2} placeholder="Relationships, sponsor, recovery community, support network" />
                <TextField label="Housing & Employment" field="housing_employment" rows={2} placeholder="Living situation, employment status, financial concerns" />
                <TextField label="Legal Involvement" field="legal_involvement" rows={2} placeholder="Current charges, probation/parole, pending cases" />
                <TextField label="Cultural & Spiritual" field="cultural_spiritual" rows={2} placeholder="Cultural identity, spiritual practices, values, community" />

                <SectionHeading>Substance Use History</SectionHeading>
                <TextField label="Substance Use History" field="substance_use_history" rows={3} placeholder="Substances used, age of onset, route, frequency, duration" />
                <TextField label="Current Use Pattern" field="current_use_pattern" rows={2} placeholder="Most recent use, current pattern, triggers" />
                <TextField label="Withdrawal Risk" field="withdrawal_risk" rows={2} placeholder="History of withdrawal, seizures, DTs, CIWA/COWS scores" />
                <TextField label="Previous Treatment" field="previous_treatment" rows={2} placeholder="Prior treatment episodes, what worked, barriers to sustained recovery" />

                <SectionHeading>ASAM Six-Dimension Assessment</SectionHeading>
                {ASAM_DIMENSIONS.map(d => (
                  <TextField key={d.key} label={d.label} field={d.key} rows={3} placeholder={`Assess ${d.label.split(': ')[1]}`} />
                ))}

                <SectionHeading>Clinical Formulation</SectionHeading>
                <TextField label="Strengths & Resources" field="strengths_resources" rows={2} placeholder="Client strengths, protective factors, motivation level" />
                <TextField label="Barriers to Recovery" field="barriers" rows={2} placeholder="Identified barriers and challenges" />
                <TextField label="Diagnostic Impression" field="diagnostic_impression" rows={2} placeholder="Working diagnoses (SUD, co-occurring MH)" />
                <TextField label="Recommended Level of Care" field="recommended_level_of_care" placeholder="e.g. 3.5 – Clinically Managed High-Intensity Residential" />
                <TextField label="Initial Treatment Goals" field="initial_treatment_goals" rows={3} placeholder="Prioritized goals for initial phase of treatment" />
              </>
            )}

            {/* Save buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 mt-6">
              <button onClick={() => saveNote('draft')} disabled={saving} className="px-5 py-2.5 bg-warm-bg text-foreground/70 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button onClick={() => saveNote('finalized')} disabled={saving} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                {saving ? 'Saving...' : 'Finalize'}
              </button>
              <button onClick={() => setView('list')} className="px-5 py-2.5 text-foreground/40 text-sm font-medium hover:text-foreground/70 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
