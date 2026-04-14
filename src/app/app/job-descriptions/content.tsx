'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db, getAuthToken } from '@/lib/db';
import { useEffect, useState } from 'react';

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface JobDescription {
  id: string;
  title: string;
  department_id: string | null;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  created_at: string;
}

interface AppUserLite {
  id: string;
  full_name: string | null;
  job_title: string | null;
}

const emptyDraft: Omit<JobDescription, 'id' | 'created_at'> = {
  title: '',
  department_id: null,
  summary: '',
  responsibilities: [],
  requirements: [],
};

export default function JobDescriptionsContent() {
  const { user, session } = useAuth();
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  // Drag-and-drop PDF import state
  const [dragDepth, setDragDepth] = useState(0); // counts dragenter/leave for nested children
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // For add-item inputs inside expanded cards.
  const [newRespText, setNewRespText] = useState<Record<string, string>>({});
  const [newReqText, setNewReqText] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const [jobData, deptData, userData] = await Promise.all([
        db({ action: 'select', table: 'job_descriptions', order: { column: 'title', ascending: true } }),
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
        db({ action: 'select', table: 'users', select: 'id, full_name, job_title', order: { column: 'full_name', ascending: true } }),
      ]);
      if (Array.isArray(jobData)) {
        setJobs(
          jobData.map((j: Record<string, unknown>) => ({
            ...(j as unknown as JobDescription),
            responsibilities: Array.isArray(j.responsibilities) ? (j.responsibilities as string[]) : [],
            requirements: Array.isArray(j.requirements) ? (j.requirements as string[]) : [],
          }))
        );
      } else {
        setDbAvailable(false);
      }
      if (Array.isArray(deptData)) setDepartments(deptData as Department[]);
      if (Array.isArray(userData)) setUsers(userData as AppUserLite[]);
      setLoading(false);
    }
    load();
  }, [session]);

  const deptById = new Map(departments.map((d) => [d.id, d]));

  async function createJob() {
    if (!draft.title.trim()) return;
    const payload = { ...draft, title: draft.title.trim() };
    if (!dbAvailable) {
      const local: JobDescription = { id: `local-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      setJobs((prev) => [...prev, local].sort((a, b) => a.title.localeCompare(b.title)));
    } else {
      const result = await db({ action: 'insert', table: 'job_descriptions', data: payload });
      if (result && (result as JobDescription).id) {
        setJobs((prev) => [...prev, result as JobDescription].sort((a, b) => a.title.localeCompare(b.title)));
      }
    }
    setDraft(emptyDraft);
    setCreating(false);
  }

  async function updateJob(id: string, patch: Partial<JobDescription>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    if (!dbAvailable || id.startsWith('local-')) return;
    await db({ action: 'update', table: 'job_descriptions', data: patch, match: { id } });
  }

  async function deleteJob(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    if (!dbAvailable || id.startsWith('local-')) return;
    await db({ action: 'delete', table: 'job_descriptions', match: { id } });
  }

  function addResponsibility(job: JobDescription) {
    const text = (newRespText[job.id] || '').trim();
    if (!text) return;
    updateJob(job.id, { responsibilities: [...job.responsibilities, text] });
    setNewRespText((prev) => ({ ...prev, [job.id]: '' }));
  }

  function removeResponsibility(job: JobDescription, idx: number) {
    updateJob(job.id, { responsibilities: job.responsibilities.filter((_, i) => i !== idx) });
  }

  function addRequirement(job: JobDescription) {
    const text = (newReqText[job.id] || '').trim();
    if (!text) return;
    updateJob(job.id, { requirements: [...job.requirements, text] });
    setNewReqText((prev) => ({ ...prev, [job.id]: '' }));
  }

  function removeRequirement(job: JobDescription, idx: number) {
    updateJob(job.id, { requirements: job.requirements.filter((_, i) => i !== idx) });
  }

  // AI generation state — keyed by a target id ('draft' for the new-role form,
  // or the job id for an existing role). null = idle.
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  async function generateFor(target: 'draft' | JobDescription) {
    const title = target === 'draft' ? draft.title.trim() : target.title.trim();
    if (!title) {
      setGenError('Enter a title first so the AI has something to work with.');
      return;
    }
    const deptId = target === 'draft' ? draft.department_id : target.department_id;
    const deptName = deptId ? deptById.get(deptId)?.name || '' : '';
    const existingSummary = target === 'draft' ? draft.summary : target.summary;
    const id = target === 'draft' ? 'draft' : target.id;

    setGenError(null);
    setGeneratingFor(id);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/claude/job-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title, department: deptName, existingSummary }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Generation failed (${res.status})`);
      }
      const gen = (await res.json()) as {
        summary: string;
        responsibilities: string[];
        requirements: string[];
      };
      if (target === 'draft') {
        setDraft((prev) => ({
          ...prev,
          summary: gen.summary || prev.summary,
          responsibilities: gen.responsibilities?.length ? gen.responsibilities : prev.responsibilities,
          requirements: gen.requirements?.length ? gen.requirements : prev.requirements,
        }));
      } else {
        await updateJob(target.id, {
          summary: gen.summary || target.summary,
          responsibilities: gen.responsibilities?.length ? gen.responsibilities : target.responsibilities,
          requirements: gen.requirements?.length ? gen.requirements : target.requirements,
        });
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingFor(null);
    }
  }

  // ---- PDF drag-and-drop import ---------------------------------------

  function matchDepartmentId(name: string): string | null {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    // Exact (case-insensitive) match first, then looser "startsWith" fallback.
    const exact = departments.find((d) => d.name.toLowerCase() === n);
    if (exact) return exact.id;
    const loose = departments.find((d) => n.startsWith(d.name.toLowerCase()) || d.name.toLowerCase().startsWith(n));
    return loose?.id ?? null;
  }

  function matchUserByName(name: string): AppUserLite | null {
    const target = name.trim().toLowerCase();
    if (!target) return null;
    const exact = users.find((u) => (u.full_name || '').trim().toLowerCase() === target);
    if (exact) return exact;
    // Loose: every token of the target appears in the user's full name.
    const tokens = target.split(/\s+/).filter(Boolean);
    return (
      users.find((u) => {
        const name = (u.full_name || '').toLowerCase();
        return tokens.length > 0 && tokens.every((t) => name.includes(t));
      }) || null
    );
  }

  async function importPdf(file: File) {
    setUploadError(null);
    setUploadStatus(`Reading ${file.name}…`);
    setUploading(true);
    try {
      const token = getAuthToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/claude/job-description/from-pdf', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Import failed (${res.status})`);
      }
      const parsed = (await res.json()) as {
        title: string;
        department: string;
        summary: string;
        responsibilities: string[];
        requirements: string[];
        assignees: string[];
      };

      const deptId = parsed.department ? matchDepartmentId(parsed.department) : null;
      const payload: Omit<JobDescription, 'id' | 'created_at'> = {
        title: parsed.title,
        department_id: deptId,
        summary: parsed.summary,
        responsibilities: parsed.responsibilities,
        requirements: parsed.requirements,
      };

      let created: JobDescription;
      if (!dbAvailable) {
        created = { id: `local-${Date.now()}`, created_at: new Date().toISOString(), ...payload };
      } else {
        const result = await db({ action: 'insert', table: 'job_descriptions', data: payload });
        if (!result || !(result as JobDescription).id) {
          throw new Error((result as { error?: string } | null)?.error || 'Could not save the imported role.');
        }
        created = result as JobDescription;
      }

      setJobs((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
      setExpandedId(created.id);

      // Assign the role to any named team members we can match.
      const matched: { user: AppUserLite }[] = [];
      const unmatched: string[] = [];
      for (const name of parsed.assignees) {
        const u = matchUserByName(name);
        if (u) matched.push({ user: u });
        else unmatched.push(name);
      }

      if (matched.length > 0 && dbAvailable) {
        await Promise.all(
          matched.map(({ user: u }) =>
            db({ action: 'update', table: 'users', data: { job_title: created.title }, match: { id: u.id } })
          )
        );
        setUsers((prev) =>
          prev.map((u) => (matched.some((m) => m.user.id === u.id) ? { ...u, job_title: created.title } : u))
        );
      }

      const parts: string[] = [`Added "${created.title}"`];
      if (matched.length > 0) {
        parts.push(`· assigned ${matched.length} team member${matched.length === 1 ? '' : 's'}`);
      }
      if (unmatched.length > 0) {
        parts.push(`· ${unmatched.length} name${unmatched.length === 1 ? '' : 's'} not matched (${unmatched.join(', ')})`);
      }
      setUploadStatus(parts.join(' '));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
      setUploadStatus(null);
    } finally {
      setUploading(false);
    }
  }

  async function importPdfs(files: FileList | File[]) {
    const list = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (list.length === 0) {
      setUploadError('Only PDF files are supported.');
      return;
    }
    for (const f of list) {
      // eslint-disable-next-line no-await-in-loop
      await importPdf(f);
    }
  }

  function onDragEnter(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    setDragDepth((d) => d + 1);
  }
  function onDragLeave(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    setDragDepth((d) => Math.max(0, d - 1));
  }
  function onDragOver(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
  function onDrop(e: React.DragEvent) {
    if (!Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    setDragDepth(0);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      importPdfs(e.dataTransfer.files);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDragging = dragDepth > 0;

  return (
    <div
      className="p-6 lg:p-10 max-w-5xl relative"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-40 bg-primary/10 backdrop-blur-sm pointer-events-none flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-dashed border-primary px-8 py-6 text-center">
            <svg className="w-10 h-10 mx-auto mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M12 18v-6" />
              <path d="m9 15 3-3 3 3" />
            </svg>
            <p className="text-sm font-semibold text-foreground">Drop PDF to import as a job description</p>
            <p className="text-xs text-foreground/60 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Claude will parse the role and assign named team members.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Job Descriptions</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {jobs.length} {jobs.length === 1 ? 'role' : 'roles'} &middot; Click to expand &middot; Drop a PDF anywhere to import
          </p>
          {!dbAvailable && (
            <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Database table not found — changes are in-memory only. Create a <code>job_descriptions</code> table to persist.
            </p>
          )}
        </div>
        <button
          onClick={() => setCreating(true)}
          disabled={creating}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add New Job Description
        </button>
      </div>

      <label
        htmlFor="jd-pdf-input"
        className={`mb-6 block rounded-2xl border-2 border-dashed px-5 py-4 cursor-pointer transition-colors ${
          uploading
            ? 'border-primary/40 bg-primary/5'
            : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-primary/5'
        }`}
      >
        <div className="flex items-center gap-3">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3v4a1 1 0 0 0 1 1h4" />
              <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M12 18v-6" />
              <path d="m9 15 3-3 3 3" />
            </svg>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {uploading ? 'Parsing PDF with Claude…' : 'Drag & drop a job description PDF'}
            </p>
            <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              {uploading
                ? uploadStatus || 'This can take a few seconds for long documents.'
                : 'Or click to choose a file. Named team members in the PDF will be assigned automatically.'}
            </p>
          </div>
        </div>
        <input
          id="jd-pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              importPdfs(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </label>

      {!uploading && uploadStatus && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 flex items-start gap-2" style={{ fontFamily: 'var(--font-body)' }}>
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          <span className="flex-1">{uploadStatus}</span>
          <button onClick={() => setUploadStatus(null)} className="text-emerald-700/60 hover:text-emerald-800" aria-label="Dismiss">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {uploadError && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 flex items-start gap-2" style={{ fontFamily: 'var(--font-body)' }}>
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-700/60 hover:text-red-800" aria-label="Dismiss">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {creating && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-body)' }}>New Role</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Title</label>
              <input
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Equine Specialist"
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>
            <div>
              <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Department</label>
              <select
                value={draft.department_id || ''}
                onChange={(e) => setDraft({ ...draft, department_id: e.target.value || null })}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Summary</label>
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={3}
              placeholder="Short description of the role…"
              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white resize-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={createJob}
              disabled={!draft.title.trim()}
              className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40"
              style={{ fontFamily: 'var(--font-body)' }}
            >Create</button>
            <button
              onClick={() => { setCreating(false); setDraft(emptyDraft); setGenError(null); }}
              className="px-3 py-1.5 rounded-lg text-xs text-foreground/50 hover:bg-warm-bg"
              style={{ fontFamily: 'var(--font-body)' }}
            >Cancel</button>
            <button
              onClick={() => generateFor('draft')}
              disabled={!draft.title.trim() || generatingFor === 'draft'}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 disabled:opacity-40"
              style={{ fontFamily: 'var(--font-body)' }}
              title="Generate summary, responsibilities, and requirements with Claude"
            >
              {generatingFor === 'draft' ? (
                <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
              )}
              {generatingFor === 'draft' ? 'Generating…' : 'Generate with Claude'}
            </button>
          </div>
          {genError && generatingFor !== 'draft' && (
            <p className="text-xs text-red-500 mt-2" style={{ fontFamily: 'var(--font-body)' }}>{genError}</p>
          )}
        </div>
      )}

      {jobs.length === 0 && !creating ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            No job descriptions yet. Create the first one to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {jobs.map((job, idx) => {
            const dept = job.department_id ? deptById.get(job.department_id) : null;
            const expanded = expandedId === job.id;
            return (
              <div key={job.id} className={idx > 0 ? 'border-t border-gray-100' : ''}>
                <button
                  onClick={() => setExpandedId(expanded ? null : job.id)}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-warm-bg/20 transition-colors text-left ${expanded ? 'bg-warm-bg/10' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground truncate">{job.title}</span>
                    {dept && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          fontFamily: 'var(--font-body)',
                          backgroundColor: (dept.color || '#a0522d') + '1f',
                          color: dept.color || '#a0522d',
                        }}
                      >
                        {dept.name}
                      </span>
                    )}
                    {!dept && (
                      <span className="text-[10px] text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                        Unassigned
                      </span>
                    )}
                  </div>
                  <svg className={`w-4 h-4 text-foreground/30 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expanded && (
                  <div className="px-5 py-4 bg-warm-bg/10 border-t border-gray-100 space-y-4">
                    {/* Title + Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Title</label>
                        <input
                          value={job.title}
                          onChange={(e) => updateJob(job.id, { title: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                          style={{ fontFamily: 'var(--font-body)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Department</label>
                        <select
                          value={job.department_id || ''}
                          onChange={(e) => updateJob(job.id, { department_id: e.target.value || null })}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <option value="">— None —</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Summary</label>
                      <textarea
                        value={job.summary}
                        onChange={(e) => updateJob(job.id, { summary: e.target.value })}
                        rows={3}
                        placeholder="Short description of the role…"
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white resize-none"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    </div>

                    {/* Responsibilities */}
                    <div>
                      <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                        Responsibilities ({job.responsibilities.length})
                      </p>
                      {job.responsibilities.length > 0 && (
                        <ul className="space-y-1 mb-2">
                          {job.responsibilities.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 group">
                              <span className="text-foreground/30 mt-0.5">•</span>
                              <span className="text-sm text-foreground/70 flex-1" style={{ fontFamily: 'var(--font-body)' }}>{r}</span>
                              <button
                                onClick={() => removeResponsibility(job, i)}
                                className="text-foreground/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={newRespText[job.id] || ''}
                          onChange={(e) => setNewRespText((prev) => ({ ...prev, [job.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addResponsibility(job); }}
                          placeholder="Add a responsibility…"
                          className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                          style={{ fontFamily: 'var(--font-body)' }}
                        />
                        <button
                          onClick={() => addResponsibility(job)}
                          disabled={!(newRespText[job.id] || '').trim()}
                          className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >Add</button>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div>
                      <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                        Requirements ({job.requirements.length})
                      </p>
                      {job.requirements.length > 0 && (
                        <ul className="space-y-1 mb-2">
                          {job.requirements.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 group">
                              <span className="text-foreground/30 mt-0.5">•</span>
                              <span className="text-sm text-foreground/70 flex-1" style={{ fontFamily: 'var(--font-body)' }}>{r}</span>
                              <button
                                onClick={() => removeRequirement(job, i)}
                                className="text-foreground/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Remove"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2">
                        <input
                          value={newReqText[job.id] || ''}
                          onChange={(e) => setNewReqText((prev) => ({ ...prev, [job.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') addRequirement(job); }}
                          placeholder="Add a requirement…"
                          className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                          style={{ fontFamily: 'var(--font-body)' }}
                        />
                        <button
                          onClick={() => addRequirement(job)}
                          disabled={!(newReqText[job.id] || '').trim()}
                          className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >Add</button>
                      </div>
                    </div>

                    {/* Generate + Delete */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        onClick={() => generateFor(job)}
                        disabled={!job.title.trim() || generatingFor === job.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10 disabled:opacity-40"
                        style={{ fontFamily: 'var(--font-body)' }}
                        title="Replace summary, responsibilities, and requirements with an AI-generated draft"
                      >
                        {generatingFor === job.id ? (
                          <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                        )}
                        {generatingFor === job.id ? 'Generating…' : 'Generate with Claude'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${job.title}"?`)) deleteJob(job.id);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        Delete role
                      </button>
                    </div>
                    {genError && generatingFor !== job.id && expandedId === job.id && (
                      <p className="text-xs text-red-500" style={{ fontFamily: 'var(--font-body)' }}>{genError}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
