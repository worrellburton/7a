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

/* ── Shared Text Field ────────────────────────────────────────
   Module-scope so the component identity is stable across renders. If this
   were defined inside NotesContent, every keystroke would recreate the
   function, React would unmount the underlying <input>, and focus would drop
   after every character typed. */

type TextFieldProps = {
  label: string;
  field: string;
  rows?: number;
  placeholder?: string;
  content: Record<string, unknown>;
  setField: (key: string, value: string | number) => void;
};

function NoteTextField({ label, field, rows, placeholder, content, setField }: TextFieldProps) {
  const val = (content[field] as string | number | undefined) ?? '';
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>{label}</label>
      {rows && rows > 1 ? (
        <textarea value={val as string} onChange={(e) => setField(field, e.target.value)} rows={rows} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
      ) : (
        <input value={val as string} onChange={(e) => setField(field, e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
      )}
    </div>
  );
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
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [newNoteType, setNewNoteType] = useState<NoteType>('group');
  const [newNoteClientId, setNewNoteClientId] = useState('');
  const [sortBy, setSortBy] = useState<'type' | 'client' | 'session_date' | 'status' | 'completeness' | 'updated'>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
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

  function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-bold text-foreground/80 mt-6 mb-3 pb-1.5 border-b border-gray-100">{children}</h3>;
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Notes</h1>
          <p className="text-xs sm:text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Clinical documentation — Group, Individual &amp; Biopsychosocial templates.
          </p>
        </div>
        {view === 'list' && (
          <button onClick={() => { setNewNoteType('group'); setNewNoteClientId(''); setNewNoteOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
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
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-warm-bg/30">
                    {([
                      { key: 'type', label: 'Type', alwaysShow: true },
                      { key: 'client', label: 'Client', alwaysShow: true },
                      { key: 'session_date', label: 'Date', alwaysShow: false },
                      { key: 'status', label: 'Status', alwaysShow: true },
                      { key: 'completeness', label: 'Score', alwaysShow: false },
                      { key: 'updated', label: 'Updated', alwaysShow: false },
                    ] as const).map(col => (
                      <th
                        key={col.key}
                        onClick={() => {
                          if (sortBy === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                          else { setSortBy(col.key); setSortDir(col.key === 'completeness' || col.key === 'session_date' || col.key === 'updated' ? 'desc' : 'asc'); }
                        }}
                        className={`text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider cursor-pointer select-none hover:text-foreground/80 transition-colors ${col.alwaysShow ? '' : 'hidden md:table-cell'}`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortBy === col.key && (
                            <svg className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" /></svg>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="w-16 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {[...notes].sort((a, b) => {
                    const clientA = clients.find(c => c.id === a.client_id);
                    const clientB = clients.find(c => c.id === b.client_id);
                    const pctA = computeCompleteness(a.note_type, a.content as Record<string, unknown>);
                    const pctB = computeCompleteness(b.note_type, b.content as Record<string, unknown>);
                    let cmp = 0;
                    switch (sortBy) {
                      case 'type': cmp = a.note_type.localeCompare(b.note_type); break;
                      case 'client': cmp = (clientA?.name || '').localeCompare(clientB?.name || ''); break;
                      case 'session_date': cmp = a.session_date.localeCompare(b.session_date); break;
                      case 'status': cmp = a.status.localeCompare(b.status); break;
                      case 'completeness': cmp = pctA - pctB; break;
                      case 'updated': cmp = a.updated_at.localeCompare(b.updated_at); break;
                    }
                    return sortDir === 'asc' ? cmp : -cmp;
                  }).map(note => {
                    const client = clients.find(c => c.id === note.client_id);
                    const pct = computeCompleteness(note.note_type, note.content as Record<string, unknown>);
                    const bucket = scoreBucket(pct);
                    return (
                      <tr key={note.id} className="border-b border-gray-100 last:border-0 hover:bg-warm-bg/40 transition-colors cursor-pointer" onClick={() => openExisting(note)}>
                        <td className="px-3 sm:px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[note.note_type]}`}>{TYPE_LABELS[note.note_type]}</span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-sm font-medium text-foreground">{client?.name || 'Unknown'}</td>
                        <td className="px-3 sm:px-5 py-3 text-sm text-foreground/60 hidden md:table-cell">{fmtDate(note.session_date)}</td>
                        <td className="px-3 sm:px-5 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${note.status === 'finalized' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{note.status === 'finalized' ? 'Finalized' : 'Draft'}</span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-2 w-40">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div className={`h-full ${pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${bucket.cls} shrink-0`}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-xs text-foreground/50 hidden md:table-cell">{new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
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

      {/* ── NEW NOTE MODAL (template + client dropdowns) ───────── */}
      {newNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setNewNoteOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-1">New note</h2>
              <p className="text-xs text-foreground/50 mb-5" style={{ fontFamily: 'var(--font-body)' }}>Pick a template and a client to start.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Template</label>
                  <select value={newNoteType} onChange={(e) => setNewNoteType(e.target.value as NoteType)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
                    <option value="group">Group Note — session-level group therapy doc</option>
                    <option value="individual">Individual Note — one-on-one session</option>
                    <option value="biopsychosocial">Biopsychosocial Assessment — full intake</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Client</label>
                  <select value={newNoteClientId} onChange={(e) => setNewNoteClientId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
                    <option value="">— Select a client —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.primary_substance ? ` · ${c.primary_substance}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => {
                    const client = clients.find(c => c.id === newNoteClientId);
                    if (!client) return;
                    setNoteType(newNoteType);
                    setEditingNote(null);
                    setNewNoteOpen(false);
                    pickClient(client);
                  }}
                  disabled={!newNoteClientId}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Start note
                </button>
                <button onClick={() => setNewNoteOpen(false)} className="px-5 py-2.5 text-foreground/50 text-sm font-medium hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
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
                  <NoteTextField content={content} setField={setField} label="Session Date" field="session_date" placeholder="YYYY-MM-DD" />
                  <NoteTextField content={content} setField={setField} label="Duration (min)" field="session_duration_min" />
                </div>
                <NoteTextField content={content} setField={setField} label="Session Title" field="session_title" placeholder="e.g. Relapse Prevention" />
                <NoteTextField content={content} setField={setField} label="Facilitator" field="facilitator" placeholder="Clinician name" />
                <NoteTextField content={content} setField={setField} label="Topic" field="topic" rows={2} placeholder="Primary topic and objectives for today's session" />
                <NoteTextField content={content} setField={setField} label="Attendance Count" field="attendance_count" placeholder="Number of participants" />

                <SectionHeading>ASAM Dimension Focus</SectionHeading>
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Primary Dimension Addressed</label>
                  <select value={(content as Record<string, string>).asam_dimension_focus || ''} onChange={e => setField('asam_dimension_focus', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
                    <option value="">Select dimension...</option>
                    {ASAM_DIMENSIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>

                <SectionHeading>Documentation</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Group Process / Dynamics" field="group_process" rows={3} placeholder="Describe group dynamics, themes, and interactions observed" />
                <NoteTextField content={content} setField={setField} label="Client Participation" field="client_participation" rows={3} placeholder="Level and quality of this client's engagement in group" />
                <NoteTextField content={content} setField={setField} label="Interventions Used" field="interventions" rows={2} placeholder="CBT, DBT skills, MI, psychoeducation, etc." />
                <NoteTextField content={content} setField={setField} label="Plan / Follow-up" field="plan" rows={2} placeholder="Recommendations and next steps" />
              </>
            )}

            {/* ── INDIVIDUAL TEMPLATE ────────────────────────── */}
            {noteType === 'individual' && (
              <>
                <SectionHeading>Session Information</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <NoteTextField content={content} setField={setField} label="Session Date" field="session_date" placeholder="YYYY-MM-DD" />
                  <NoteTextField content={content} setField={setField} label="Duration (min)" field="session_duration_min" />
                </div>
                <NoteTextField content={content} setField={setField} label="Clinician" field="clinician" placeholder="Clinician name" />

                <SectionHeading>Presentation</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Presenting Concern" field="presenting_concern" rows={2} placeholder="Chief complaint or focus area for this session" />
                <div className="grid grid-cols-2 gap-4">
                  <NoteTextField content={content} setField={setField} label="Mental Status" field="mental_status" placeholder="Alert, oriented, cooperative..." />
                  <NoteTextField content={content} setField={setField} label="Mood / Affect" field="mood_affect" placeholder="Euthymic, congruent..." />
                </div>

                <SectionHeading>Interventions</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Interventions Used" field="interventions" rows={3} placeholder="CBT, motivational interviewing, trauma processing, etc." />

                <SectionHeading>ASAM Six-Dimension Review</SectionHeading>
                {ASAM_DIMENSIONS.map(d => (
                  <NoteTextField content={content} setField={setField} key={d.key} label={d.label} field={d.key} rows={2} placeholder={`Status and progress for ${d.label.split(': ')[1]}`} />
                ))}

                <SectionHeading>Progress & Plan</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Progress Toward Goals" field="progress" rows={2} placeholder="Progress made toward treatment plan goals" />
                <NoteTextField content={content} setField={setField} label="Plan / Recommendations" field="plan" rows={2} placeholder="Next steps, homework, coordination needs" />
                <NoteTextField content={content} setField={setField} label="Next Session" field="next_session" placeholder="Scheduled date or timeframe" />
              </>
            )}

            {/* ── BIOPSYCHOSOCIAL TEMPLATE ────────────────────── */}
            {noteType === 'biopsychosocial' && (
              <>
                <SectionHeading>Assessment Information</SectionHeading>
                <div className="grid grid-cols-2 gap-4">
                  <NoteTextField content={content} setField={setField} label="Assessment Date" field="assessment_date" placeholder="YYYY-MM-DD" />
                  <NoteTextField content={content} setField={setField} label="Clinician" field="clinician" placeholder="Assessing clinician" />
                </div>
                <NoteTextField content={content} setField={setField} label="Presenting Problem" field="presenting_problem" rows={3} placeholder="Client's stated reason for seeking treatment, in their own words where possible" />

                <SectionHeading>Biological Domain</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Medical History" field="medical_history" rows={2} placeholder="Chronic conditions, surgeries, hospitalizations" />
                <NoteTextField content={content} setField={setField} label="Current Medications" field="current_medications" rows={2} placeholder="List all current medications, doses, prescribers" />
                <NoteTextField content={content} setField={setField} label="Pain Concerns" field="pain_concerns" rows={2} placeholder="Chronic pain, acute injuries, pain management history" />

                <SectionHeading>Psychological Domain</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Psychiatric History" field="psychiatric_history" rows={2} placeholder="Prior diagnoses, hospitalizations, SI/HI history" />
                <NoteTextField content={content} setField={setField} label="Current Symptoms" field="current_symptoms" rows={2} placeholder="Depression, anxiety, psychosis, mania, etc." />
                <NoteTextField content={content} setField={setField} label="Trauma History" field="trauma_history" rows={2} placeholder="ACEs, abuse, neglect, significant losses" />
                <NoteTextField content={content} setField={setField} label="Cognitive Functioning" field="cognitive_functioning" rows={2} placeholder="Orientation, memory, concentration, executive function" />

                <SectionHeading>Social Domain</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Family History" field="family_history" rows={2} placeholder="Family structure, substance use in family, mental health history" />
                <NoteTextField content={content} setField={setField} label="Social Support" field="social_support" rows={2} placeholder="Relationships, sponsor, recovery community, support network" />
                <NoteTextField content={content} setField={setField} label="Housing & Employment" field="housing_employment" rows={2} placeholder="Living situation, employment status, financial concerns" />
                <NoteTextField content={content} setField={setField} label="Legal Involvement" field="legal_involvement" rows={2} placeholder="Current charges, probation/parole, pending cases" />
                <NoteTextField content={content} setField={setField} label="Cultural & Spiritual" field="cultural_spiritual" rows={2} placeholder="Cultural identity, spiritual practices, values, community" />

                <SectionHeading>Substance Use History</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Substance Use History" field="substance_use_history" rows={3} placeholder="Substances used, age of onset, route, frequency, duration" />
                <NoteTextField content={content} setField={setField} label="Current Use Pattern" field="current_use_pattern" rows={2} placeholder="Most recent use, current pattern, triggers" />
                <NoteTextField content={content} setField={setField} label="Withdrawal Risk" field="withdrawal_risk" rows={2} placeholder="History of withdrawal, seizures, DTs, CIWA/COWS scores" />
                <NoteTextField content={content} setField={setField} label="Previous Treatment" field="previous_treatment" rows={2} placeholder="Prior treatment episodes, what worked, barriers to sustained recovery" />

                <SectionHeading>ASAM Six-Dimension Assessment</SectionHeading>
                {ASAM_DIMENSIONS.map(d => (
                  <NoteTextField content={content} setField={setField} key={d.key} label={d.label} field={d.key} rows={3} placeholder={`Assess ${d.label.split(': ')[1]}`} />
                ))}

                <SectionHeading>Clinical Formulation</SectionHeading>
                <NoteTextField content={content} setField={setField} label="Strengths & Resources" field="strengths_resources" rows={2} placeholder="Client strengths, protective factors, motivation level" />
                <NoteTextField content={content} setField={setField} label="Barriers to Recovery" field="barriers" rows={2} placeholder="Identified barriers and challenges" />
                <NoteTextField content={content} setField={setField} label="Diagnostic Impression" field="diagnostic_impression" rows={2} placeholder="Working diagnoses (SUD, co-occurring MH)" />
                <NoteTextField content={content} setField={setField} label="Recommended Level of Care" field="recommended_level_of_care" placeholder="e.g. 3.5 – Clinically Managed High-Intensity Residential" />
                <NoteTextField content={content} setField={setField} label="Initial Treatment Goals" field="initial_treatment_goals" rows={3} placeholder="Prioritized goals for initial phase of treatment" />
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
