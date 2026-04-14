'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db, getAuthToken } from '@/lib/db';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
  avatar_url: string | null;
  job_title: string | null;
}

export default function JobDescriptionsContent() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(true);

  // Add-new
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeptId, setNewDeptId] = useState<string>('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Drag-and-drop PDF import state
  const [dragDepth, setDragDepth] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [schemaHint, setSchemaHint] = useState<{ columns: string[]; sql: string } | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const [jobData, deptData, userData] = await Promise.all([
        db({ action: 'select', table: 'job_descriptions', order: { column: 'title', ascending: true } }),
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
        db({
          action: 'select',
          table: 'users',
          select: 'id, full_name, avatar_url, job_title',
          order: { column: 'full_name', ascending: true },
        }),
      ]);
      if (Array.isArray(jobData)) {
        setJobs(
          jobData.map((j: Record<string, unknown>) => ({
            id: String(j.id),
            title: (j.title as string) || '',
            department_id: (j.department_id as string | null) || null,
            summary: (j.summary as string) || '',
            responsibilities: Array.isArray(j.responsibilities) ? (j.responsibilities as string[]) : [],
            requirements: Array.isArray(j.requirements) ? (j.requirements as string[]) : [],
            created_at: (j.created_at as string) || '',
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

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  // Group users by lowercased job_title for fast lookup on each row.
  const usersByTitle = useMemo(() => {
    const map = new Map<string, AppUserLite[]>();
    for (const u of users) {
      const t = (u.job_title || '').trim().toLowerCase();
      if (!t) continue;
      const arr = map.get(t) || [];
      arr.push(u);
      map.set(t, arr);
    }
    return map;
  }, [users]);

  // ---- Create new role, then navigate to its detail page ----
  async function createAndOpen() {
    const title = newTitle.trim();
    if (!title) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const payload = {
        title,
        department_id: newDeptId || null,
        summary: '',
        responsibilities: [],
        requirements: [],
      };
      if (!dbAvailable) {
        const local: JobDescription = {
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          ...payload,
        };
        setJobs((prev) => [...prev, local].sort((a, b) => a.title.localeCompare(b.title)));
        router.push(`/app/job-descriptions/${local.id}`);
        return;
      }
      const result = await db({ action: 'insert', table: 'job_descriptions', data: payload });
      if (result && (result as JobDescription).id) {
        const created = result as JobDescription;
        setJobs((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
        router.push(`/app/job-descriptions/${created.id}`);
      } else {
        throw new Error((result as { error?: string })?.error || 'Could not create role.');
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreateBusy(false);
    }
  }

  // ---- PDF drag-and-drop import ---------------------------------------

  function matchDepartmentId(name: string): string | null {
    const n = name.trim().toLowerCase();
    if (!n) return null;
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
    const tokens = target.split(/\s+/).filter(Boolean);
    return (
      users.find((u) => {
        const fn = (u.full_name || '').toLowerCase();
        return tokens.length > 0 && tokens.every((t) => fn.includes(t));
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
      const fullPayload: Record<string, unknown> = {
        title: parsed.title,
        department_id: deptId,
        summary: parsed.summary,
        responsibilities: parsed.responsibilities,
        requirements: parsed.requirements,
      };

      let created: JobDescription;
      const droppedColumns: string[] = [];
      if (!dbAvailable) {
        created = {
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          title: parsed.title,
          department_id: deptId,
          summary: parsed.summary,
          responsibilities: parsed.responsibilities,
          requirements: parsed.requirements,
        };
      } else {
        let attempt: Record<string, unknown> = { ...fullPayload };
        let result = await db({ action: 'insert', table: 'job_descriptions', data: attempt });
        const rx = /Could not find the '(\w+)' column/i;
        while (result && typeof (result as { error?: string }).error === 'string') {
          const err = (result as { error: string }).error;
          const m = err.match(rx);
          if (!m) throw new Error(err || 'Could not save the imported role.');
          const col = m[1];
          droppedColumns.push(col);
          delete attempt[col];
          if (col === 'responsibilities' && parsed.responsibilities.length > 0) {
            attempt.summary = [
              String(attempt.summary || '').trim(),
              '',
              'Responsibilities:',
              ...parsed.responsibilities.map((r) => `• ${r}`),
            ].filter(Boolean).join('\n');
          } else if (col === 'requirements' && parsed.requirements.length > 0) {
            attempt.summary = [
              String(attempt.summary || '').trim(),
              '',
              'Requirements:',
              ...parsed.requirements.map((r) => `• ${r}`),
            ].filter(Boolean).join('\n');
          }
          result = await db({ action: 'insert', table: 'job_descriptions', data: attempt });
        }
        if (!result || !(result as JobDescription).id) {
          throw new Error((result as { error?: string } | null)?.error || 'Could not save the imported role.');
        }
        created = result as JobDescription;
        if (!Array.isArray(created.responsibilities)) created.responsibilities = parsed.responsibilities;
        if (!Array.isArray(created.requirements)) created.requirements = parsed.requirements;
      }

      setJobs((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));

      // Assign any named team members we can match.
      const matched: AppUserLite[] = [];
      const unmatched: string[] = [];
      for (const name of parsed.assignees) {
        const u = matchUserByName(name);
        if (u) matched.push(u);
        else unmatched.push(name);
      }

      if (matched.length > 0 && dbAvailable) {
        await Promise.all(
          matched.map((u) =>
            db({ action: 'update', table: 'users', data: { job_title: created.title }, match: { id: u.id } })
          )
        );
        setUsers((prev) =>
          prev.map((u) => (matched.some((m) => m.id === u.id) ? { ...u, job_title: created.title } : u))
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
      if (droppedColumns.length > 0) {
        const sql = droppedColumns
          .map((c) => `ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS ${c} text[] NOT NULL DEFAULT '{}';`)
          .join('\n');
        setSchemaHint({ columns: droppedColumns, sql });
      }
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
      className="p-6 lg:p-10 max-w-6xl relative"
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

      {/* Title + Add button */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Job Descriptions</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {jobs.length} {jobs.length === 1 ? 'role' : 'roles'} &middot; Drop a PDF anywhere to import
          </p>
          {!dbAvailable && (
            <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Database table not found — changes are in-memory only. Create a <code>job_descriptions</code> table to persist.
            </p>
          )}
        </div>
        <button
          onClick={() => { setCreating(true); setNewTitle(''); setNewDeptId(''); setCreateError(null); }}
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

      {/* PDF upload zone */}
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
      {schemaHint && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900" style={{ fontFamily: 'var(--font-body)' }}>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                Your <code>job_descriptions</code> table is missing{' '}
                {schemaHint.columns.map((c, i) => (
                  <span key={c}>
                    {i > 0 && (i === schemaHint.columns.length - 1 ? ' and ' : ', ')}
                    <code>{c}</code>
                  </span>
                ))}
                . Those bullets were saved inside <code>summary</code> for now.
              </p>
              <p className="mt-1 text-amber-900/80">Run this in the Supabase SQL editor to store them properly:</p>
              <pre className="mt-2 p-2 rounded bg-amber-100/60 text-[11px] overflow-x-auto whitespace-pre">{schemaHint.sql}</pre>
            </div>
            <button onClick={() => setSchemaHint(null)} className="text-amber-900/60 hover:text-amber-900 shrink-0" aria-label="Dismiss">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
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

      {/* New-role modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => !createBusy && setCreating(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-foreground mb-3">New Role</h2>
            <div className="mb-3">
              <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Title</label>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newTitle.trim()) createAndOpen(); }}
                placeholder="e.g. Equine Specialist"
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </div>
            <div className="mb-4">
              <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Department</label>
              <select
                value={newDeptId}
                onChange={(e) => setNewDeptId(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            {createError && (
              <p className="text-xs text-red-500 mb-3" style={{ fontFamily: 'var(--font-body)' }}>{createError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCreating(false)}
                disabled={createBusy}
                className="px-3 py-1.5 rounded-lg text-xs text-foreground/50 hover:bg-warm-bg disabled:opacity-40"
                style={{ fontFamily: 'var(--font-body)' }}
              >Cancel</button>
              <button
                onClick={createAndOpen}
                disabled={!newTitle.trim() || createBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {createBusy && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                Create & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            No job descriptions yet. Drop a PDF above or add one manually to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            className="grid items-center text-[10px] uppercase tracking-wider text-foreground/40 px-5 py-2.5 border-b border-gray-100 bg-warm-bg/20"
            style={{ fontFamily: 'var(--font-body)', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1.4fr) auto' }}
          >
            <div>Title</div>
            <div>Assigned To</div>
            <div className="text-right pr-1">View</div>
          </div>
          {jobs.map((job, idx) => {
            const dept = job.department_id ? deptById.get(job.department_id) : null;
            const assigned = usersByTitle.get(job.title.trim().toLowerCase()) || [];
            return (
              <div
                key={job.id}
                className={`grid items-center px-5 py-3 hover:bg-warm-bg/20 transition-colors ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1.4fr) auto' }}
              >
                <div className="min-w-0 flex items-center gap-2 pr-3">
                  <span className="text-sm font-semibold text-foreground truncate">{job.title}</span>
                  {dept && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                      style={{
                        fontFamily: 'var(--font-body)',
                        backgroundColor: (dept.color || '#a0522d') + '1f',
                        color: dept.color || '#a0522d',
                      }}
                    >
                      {dept.name}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex items-center gap-1.5 flex-wrap pr-3">
                  {assigned.length === 0 ? (
                    <span className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>Unassigned</span>
                  ) : (
                    assigned.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full bg-warm-bg/60 border border-gray-100 text-[11px]"
                        style={{ fontFamily: 'var(--font-body)' }}
                        title={u.full_name || ''}
                      >
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center text-[8px] font-semibold text-foreground/60">
                            {(u.full_name || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="truncate max-w-[120px]">{u.full_name || 'Unnamed'}</span>
                      </span>
                    ))
                  )}
                </div>
                <div className="flex justify-end">
                  <Link
                    href={`/app/job-descriptions/${job.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-foreground/80 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    View Job Description
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
