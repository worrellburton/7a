'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db, getAuthToken } from '@/lib/db';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

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

export default function JobDescriptionDetailContent() {
  const { user, session } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';

  const [job, setJob] = useState<JobDescription | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Inline add inputs
  const [newRespText, setNewRespText] = useState('');
  const [newReqText, setNewReqText] = useState('');

  // Claude-edit panel
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLog, setAiLog] = useState<{ instruction: string; summary: string }[]>([]);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  // Assign user picker
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFilter, setAssignFilter] = useState('');

  useEffect(() => {
    if (!session?.access_token || !id) return;
    let cancelled = false;
    async function load() {
      const [jobRows, deptData, userData] = await Promise.all([
        db({ action: 'select', table: 'job_descriptions', match: { id } }),
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
        db({
          action: 'select',
          table: 'users',
          select: 'id, full_name, avatar_url, job_title',
          order: { column: 'full_name', ascending: true },
        }),
      ]);
      if (cancelled) return;
      if (Array.isArray(jobRows) && jobRows.length > 0) {
        const raw = jobRows[0] as Record<string, unknown>;
        setJob({
          id: String(raw.id),
          title: (raw.title as string) || '',
          department_id: (raw.department_id as string | null) || null,
          summary: (raw.summary as string) || '',
          responsibilities: Array.isArray(raw.responsibilities) ? (raw.responsibilities as string[]) : [],
          requirements: Array.isArray(raw.requirements) ? (raw.requirements as string[]) : [],
          created_at: (raw.created_at as string) || '',
        });
      } else {
        setNotFound(true);
      }
      if (Array.isArray(deptData)) setDepartments(deptData as Department[]);
      if (Array.isArray(userData)) setUsers(userData as AppUserLite[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session, id]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const dept = job?.department_id ? deptById.get(job.department_id) || null : null;

  const assignedUsers = useMemo(() => {
    if (!job) return [];
    const t = job.title.trim().toLowerCase();
    if (!t) return [];
    return users.filter((u) => (u.job_title || '').trim().toLowerCase() === t);
  }, [users, job]);

  async function patchJob(patch: Partial<JobDescription>) {
    if (!job) return;
    const next = { ...job, ...patch };
    setJob(next);
    await db({ action: 'update', table: 'job_descriptions', data: patch, match: { id: job.id } });
  }

  // Retitling should move any currently-assigned users to the new title so
  // they stay linked.
  async function renameTitle(newTitle: string) {
    if (!job) return;
    const oldTitle = job.title;
    const trimmed = newTitle;
    setJob({ ...job, title: trimmed });
    await db({ action: 'update', table: 'job_descriptions', data: { title: trimmed }, match: { id: job.id } });
    const affected = users.filter((u) => (u.job_title || '').trim().toLowerCase() === oldTitle.trim().toLowerCase());
    if (affected.length > 0 && trimmed.trim() !== oldTitle.trim()) {
      await Promise.all(
        affected.map((u) =>
          db({ action: 'update', table: 'users', data: { job_title: trimmed }, match: { id: u.id } })
        )
      );
      setUsers((prev) =>
        prev.map((u) => (affected.some((a) => a.id === u.id) ? { ...u, job_title: trimmed } : u))
      );
    }
  }

  function addResponsibility() {
    if (!job) return;
    const text = newRespText.trim();
    if (!text) return;
    patchJob({ responsibilities: [...job.responsibilities, text] });
    setNewRespText('');
  }

  function removeResponsibility(i: number) {
    if (!job) return;
    patchJob({ responsibilities: job.responsibilities.filter((_, idx) => idx !== i) });
  }

  function updateResponsibility(i: number, value: string) {
    if (!job) return;
    patchJob({ responsibilities: job.responsibilities.map((r, idx) => (idx === i ? value : r)) });
  }

  function addRequirement() {
    if (!job) return;
    const text = newReqText.trim();
    if (!text) return;
    patchJob({ requirements: [...job.requirements, text] });
    setNewReqText('');
  }

  function removeRequirement(i: number) {
    if (!job) return;
    patchJob({ requirements: job.requirements.filter((_, idx) => idx !== i) });
  }

  function updateRequirement(i: number, value: string) {
    if (!job) return;
    patchJob({ requirements: job.requirements.map((r, idx) => (idx === i ? value : r)) });
  }

  async function assignUser(u: AppUserLite) {
    if (!job) return;
    await db({ action: 'update', table: 'users', data: { job_title: job.title }, match: { id: u.id } });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, job_title: job.title } : x)));
  }

  async function unassignUser(u: AppUserLite) {
    await db({ action: 'update', table: 'users', data: { job_title: null }, match: { id: u.id } });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, job_title: null } : x)));
  }

  async function deleteRole() {
    if (!job) return;
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    // Clear assignments first so we don't leave dangling job_title references.
    if (assignedUsers.length > 0) {
      await Promise.all(
        assignedUsers.map((u) =>
          db({ action: 'update', table: 'users', data: { job_title: null }, match: { id: u.id } })
        )
      );
    }
    await db({ action: 'delete', table: 'job_descriptions', match: { id: job.id } });
    router.push('/app/job-descriptions');
  }

  function downloadPdf() {
    // Browsers' built-in "Save as PDF" off window.print() is the simplest way
    // to get a clean one-page PDF without adding a dependency. The print
    // stylesheet below hides the app chrome and shows only the role content.
    window.print();
  }

  async function runClaudeEdit() {
    if (!job) return;
    const instruction = aiInstruction.trim();
    if (!instruction) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/claude/job-description/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: job.title,
          department: dept?.name || '',
          summary: job.summary,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          instruction,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Edit failed (${res.status})`);
      }
      const edited = (await res.json()) as {
        title: string;
        summary: string;
        responsibilities: string[];
        requirements: string[];
      };

      const titleChanged = edited.title.trim() && edited.title.trim() !== job.title.trim();
      if (titleChanged) {
        await renameTitle(edited.title.trim());
      }
      await patchJob({
        summary: edited.summary,
        responsibilities: edited.responsibilities,
        requirements: edited.requirements,
      });

      const summary = summarizeChanges(job, edited);
      setAiLog((prev) => [...prev, { instruction, summary }]);
      setAiInstruction('');
      // Refocus the textarea so the user can keep iterating.
      setTimeout(() => aiInputRef.current?.focus(), 0);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(false);
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

  if (notFound || !job) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl">
        <Link href="/app/job-descriptions" className="text-xs text-foreground/50 hover:text-foreground inline-flex items-center gap-1 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Job Descriptions
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
            This job description could not be found.
          </p>
        </div>
      </div>
    );
  }

  const unassigned = users.filter((u) => !assignedUsers.some((a) => a.id === u.id));
  const filteredUnassigned = assignFilter.trim()
    ? unassigned.filter((u) => (u.full_name || '').toLowerCase().includes(assignFilter.trim().toLowerCase()))
    : unassigned;

  return (
    <>
      {/* Print stylesheet — hides app chrome and trims the page for a clean PDF. */}
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          aside, nav, header, [data-platform-shell-chrome] { display: none !important; }
          .jd-print-hide { display: none !important; }
          .jd-print-root {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
          }
          .jd-print-card {
            box-shadow: none !important;
            border: none !important;
          }
          input, textarea, select {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            color: #111 !important;
          }
          textarea { resize: none !important; }
          .jd-print-bullet::before { content: '• '; }
        }
      `}</style>

      <div className="p-6 lg:p-10 max-w-4xl jd-print-root">
        {/* Top bar */}
        <div className="mb-6 jd-print-hide">
          <Link
            href="/app/job-descriptions"
            className="text-xs text-foreground/50 hover:text-foreground inline-flex items-center gap-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Job Descriptions
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 jd-print-card">
          {/* Header: title + dept + actions */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <input
                value={job.title}
                onChange={(e) => setJob({ ...job, title: e.target.value })}
                onBlur={(e) => {
                  if (e.target.value.trim() !== job.title.trim()) {
                    renameTitle(e.target.value.trim());
                  }
                }}
                className="w-full text-xl lg:text-2xl font-semibold text-foreground tracking-tight bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
              />
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <select
                  value={job.department_id || ''}
                  onChange={(e) => patchJob({ department_id: e.target.value || null })}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-primary jd-print-hide"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {dept && (
                  <span
                    className="hidden print:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
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
            </div>

            <div className="flex items-center gap-2 flex-wrap jd-print-hide">
              <button
                onClick={() => setAiOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                Edit with Claude
              </button>
              <button
                onClick={downloadPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-foreground/80 text-xs font-medium hover:bg-warm-bg"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>

          {/* Assigned team members */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Assigned To
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {assignedUsers.length === 0 && (
                <span className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                  No one assigned
                </span>
              )}
              {assignedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-warm-bg/50 border border-gray-100 text-xs"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[9px] font-semibold text-foreground/60">
                      {(u.full_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{u.full_name || 'Unnamed'}</span>
                  <button
                    onClick={() => unassignUser(u)}
                    className="text-foreground/30 hover:text-red-500 ml-0.5 jd-print-hide"
                    aria-label={`Remove ${u.full_name}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
              <div className="relative jd-print-hide">
                <button
                  onClick={() => setAssignOpen((v) => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-gray-300 text-[11px] text-foreground/60 hover:border-primary hover:text-primary"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Assign
                </button>
                {assignOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-20 w-64 max-h-72 overflow-hidden flex flex-col">
                    <input
                      autoFocus
                      value={assignFilter}
                      onChange={(e) => setAssignFilter(e.target.value)}
                      placeholder="Search team…"
                      className="px-3 py-2 text-xs border-b border-gray-100 focus:outline-none"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                    <div className="overflow-y-auto flex-1">
                      {filteredUnassigned.length === 0 && (
                        <p className="px-3 py-4 text-xs text-foreground/40 text-center" style={{ fontFamily: 'var(--font-body)' }}>
                          No matching team members
                        </p>
                      )}
                      {filteredUnassigned.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            assignUser(u);
                            setAssignFilter('');
                            setAssignOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-warm-bg/40 text-left"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[9px] font-semibold text-foreground/60">
                              {(u.full_name || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="flex-1 truncate">{u.full_name || 'Unnamed'}</span>
                          {u.job_title && (
                            <span className="text-[10px] text-foreground/40 truncate max-w-[90px]">{u.job_title}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Position Summary
            </p>
            <textarea
              value={job.summary}
              onChange={(e) => setJob({ ...job, summary: e.target.value })}
              onBlur={(e) => {
                if (e.target.value !== job.summary) patchJob({ summary: e.target.value });
              }}
              rows={4}
              placeholder="A short overview of the role…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white resize-y"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>

          {/* Responsibilities */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Responsibilities ({job.responsibilities.length})
            </p>
            {job.responsibilities.length > 0 && (
              <ul className="space-y-1 mb-2">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 group jd-print-bullet">
                    <span className="text-foreground/30 mt-1.5 jd-print-hide">•</span>
                    <input
                      value={r}
                      onChange={(e) => {
                        setJob({ ...job, responsibilities: job.responsibilities.map((x, idx) => (idx === i ? e.target.value : x)) });
                      }}
                      onBlur={(e) => updateResponsibility(i, e.target.value)}
                      className="flex-1 text-sm text-foreground/80 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                    <button
                      onClick={() => removeResponsibility(i)}
                      className="text-foreground/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity jd-print-hide"
                      aria-label="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 jd-print-hide">
              <input
                value={newRespText}
                onChange={(e) => setNewRespText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addResponsibility(); }}
                placeholder="Add a responsibility…"
                className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <button
                onClick={addResponsibility}
                disabled={!newRespText.trim()}
                className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40"
                style={{ fontFamily: 'var(--font-body)' }}
              >Add</button>
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Requirements ({job.requirements.length})
            </p>
            {job.requirements.length > 0 && (
              <ul className="space-y-1 mb-2">
                {job.requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 group jd-print-bullet">
                    <span className="text-foreground/30 mt-1.5 jd-print-hide">•</span>
                    <input
                      value={r}
                      onChange={(e) => {
                        setJob({ ...job, requirements: job.requirements.map((x, idx) => (idx === i ? e.target.value : x)) });
                      }}
                      onBlur={(e) => updateRequirement(i, e.target.value)}
                      className="flex-1 text-sm text-foreground/80 bg-transparent border-0 focus:outline-none focus:ring-0 p-0"
                      style={{ fontFamily: 'var(--font-body)' }}
                    />
                    <button
                      onClick={() => removeRequirement(i)}
                      className="text-foreground/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity jd-print-hide"
                      aria-label="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 jd-print-hide">
              <input
                value={newReqText}
                onChange={(e) => setNewReqText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addRequirement(); }}
                placeholder="Add a requirement…"
                className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <button
                onClick={addRequirement}
                disabled={!newReqText.trim()}
                className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40"
                style={{ fontFamily: 'var(--font-body)' }}
              >Add</button>
            </div>
          </div>

          {/* Delete */}
          <div className="flex justify-end pt-4 border-t border-gray-100 jd-print-hide">
            <button
              onClick={deleteRole}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Delete role
            </button>
          </div>
        </div>

        {/* Claude-edit side panel */}
        {aiOpen && (
          <div className="fixed inset-0 z-50 flex jd-print-hide">
            <div
              className="flex-1 bg-black/20"
              onClick={() => !aiBusy && setAiOpen(false)}
            />
            <div className="w-full max-w-md bg-white border-l border-gray-100 flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                  <h3 className="text-sm font-semibold text-foreground">Edit with Claude</h3>
                </div>
                <button
                  onClick={() => !aiBusy && setAiOpen(false)}
                  disabled={aiBusy}
                  className="text-foreground/40 hover:text-foreground disabled:opacity-40"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <p className="text-xs text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
                  Tell Claude how to change this role. Claude will rewrite the summary, responsibilities, and requirements to match.
                </p>
                {aiLog.map((entry, i) => (
                  <div key={i} className="space-y-1">
                    <div className="inline-block max-w-full px-3 py-2 rounded-2xl bg-primary/10 text-primary text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                      {entry.instruction}
                    </div>
                    <div className="text-[11px] text-emerald-700 flex items-start gap-1" style={{ fontFamily: 'var(--font-body)' }}>
                      <svg className="w-3 h-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      <span>{entry.summary}</span>
                    </div>
                  </div>
                ))}
                {aiError && (
                  <p className="text-xs text-red-500" style={{ fontFamily: 'var(--font-body)' }}>{aiError}</p>
                )}
              </div>

              <div className="border-t border-gray-100 p-3">
                <textarea
                  ref={aiInputRef}
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      runClaudeEdit();
                    }
                  }}
                  disabled={aiBusy}
                  placeholder="e.g. Add CPR certification as a requirement and clarify the role reports to the Clinical Director."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white resize-none disabled:opacity-60"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                    ⌘/Ctrl + Enter to send
                  </span>
                  <button
                    onClick={runClaudeEdit}
                    disabled={aiBusy || !aiInstruction.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {aiBusy && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                    {aiBusy ? 'Applying…' : 'Apply change'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function summarizeChanges(
  before: { title: string; summary: string; responsibilities: string[]; requirements: string[] },
  after: { title: string; summary: string; responsibilities: string[]; requirements: string[] }
): string {
  const parts: string[] = [];
  if (after.title.trim() !== before.title.trim()) parts.push(`renamed to "${after.title}"`);
  if (after.summary.trim() !== before.summary.trim()) parts.push('summary updated');
  const rd = after.responsibilities.length - before.responsibilities.length;
  if (rd !== 0) parts.push(`${rd > 0 ? '+' : ''}${rd} responsibilit${Math.abs(rd) === 1 ? 'y' : 'ies'}`);
  else if (JSON.stringify(after.responsibilities) !== JSON.stringify(before.responsibilities))
    parts.push('responsibilities revised');
  const qd = after.requirements.length - before.requirements.length;
  if (qd !== 0) parts.push(`${qd > 0 ? '+' : ''}${qd} requirement${Math.abs(qd) === 1 ? '' : 's'}`);
  else if (JSON.stringify(after.requirements) !== JSON.stringify(before.requirements))
    parts.push('requirements revised');
  return parts.length > 0 ? parts.join(' · ') : 'No changes';
}
