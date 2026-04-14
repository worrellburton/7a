'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db, getAuthToken } from '@/lib/db';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// A textarea that grows with its content. Used for responsibilities and
// requirements so long sentences wrap cleanly instead of overflowing a
// single-line input.
function AutoTextarea({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  className,
  disabled,
  dataAttr,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  dataAttr?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  const extra: Record<string, string> = {};
  if (dataAttr) extra[`data-${dataAttr}`] = '';
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      style={{ fontFamily: 'var(--font-body)', overflow: 'hidden', resize: 'none' }}
      {...extra}
    />
  );
}

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface ActivityEntry {
  at: string;
  by_name: string | null;
  summary: string;
}

interface JobDescription {
  id: string;
  title: string;
  department_id: string | null;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  date_revised: string | null;
  date_revised_by_name?: string | null;
  created_at: string;
  last_edited_at: string | null;
  last_edited_by_name: string | null;
  activity: ActivityEntry[];
  archived_at: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

interface AppUserLite {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  email?: string | null;
}

interface SignatureRow {
  id: string;
  job_description_id: string;
  signer_user_id: string | null;
  signer_name: string | null;
  signer_email: string | null;
  sent_by_name: string | null;
  sent_at: string;
  signed_at: string | null;
  pdf_storage_path: string | null;
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

  // Claude rating panel
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [rating, setRating] = useState<{
    score: number;
    headline: string;
    strengths: string[];
    recommendations: string[];
  } | null>(null);

  // Assign user picker
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignFilter, setAssignFilter] = useState('');

  // Send-for-signature modal
  const [sigOpen, setSigOpen] = useState(false);
  const [sigFilter, setSigFilter] = useState('');
  const [sigBusy, setSigBusy] = useState(false);
  const [sigStatus, setSigStatus] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);

  useEffect(() => {
    if (!session?.access_token || !id) return;
    let cancelled = false;
    async function load() {
      const [jobRows, deptData, userData, sigData] = await Promise.all([
        db({ action: 'select', table: 'job_descriptions', match: { id } }),
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
        db({
          action: 'select',
          table: 'users',
          select: 'id, full_name, avatar_url, job_title, email',
          order: { column: 'full_name', ascending: true },
        }),
        db({
          action: 'select',
          table: 'jd_signatures',
          match: { job_description_id: id },
          order: { column: 'sent_at', ascending: false },
        }).catch(() => []),
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
          date_revised: (raw.date_revised as string | null) || null,
          date_revised_by_name: (raw.date_revised_by_name as string | null) || null,
          created_at: (raw.created_at as string) || '',
          last_edited_at: (raw.last_edited_at as string | null) || null,
          last_edited_by_name: (raw.last_edited_by_name as string | null) || null,
          activity: Array.isArray(raw.activity) ? (raw.activity as ActivityEntry[]) : [],
          archived_at: (raw.archived_at as string | null) || null,
        });
      } else {
        setNotFound(true);
      }
      if (Array.isArray(deptData)) setDepartments(deptData as Department[]);
      if (Array.isArray(userData)) setUsers(userData as AppUserLite[]);
      if (Array.isArray(sigData)) setSignatures(sigData as SignatureRow[]);
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

  async function patchJob(patch: Partial<JobDescription>, activitySummary?: string) {
    if (!job) return;
    const nowIso = new Date().toISOString();
    const editorName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || 'Someone';
    const nextActivity = activitySummary
      ? [...(job.activity || []), { at: nowIso, by_name: editorName, summary: activitySummary }].slice(-50)
      : job.activity;
    const next: JobDescription = {
      ...job,
      ...patch,
      last_edited_at: nowIso,
      last_edited_by_name: editorName,
      activity: nextActivity,
    };
    setJob(next);
    const dbPatch: Record<string, unknown> = {
      ...patch,
      last_edited_at: nowIso,
      last_edited_by: user?.id || null,
      last_edited_by_name: editorName,
    };
    if (activitySummary) dbPatch.activity = nextActivity;
    await db({ action: 'update', table: 'job_descriptions', data: dbPatch, match: { id: job.id } });
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
    patchJob({ responsibilities: [...job.responsibilities, ''] }, 'Added a responsibility');
    // Focus the newly added row after the DOM updates
    setTimeout(() => {
      const items = document.querySelectorAll<HTMLTextAreaElement>('[data-resp-item]');
      items[items.length - 1]?.focus();
    }, 30);
  }

  function removeResponsibility(i: number) {
    if (!job) return;
    patchJob({ responsibilities: job.responsibilities.filter((_, idx) => idx !== i) }, 'Removed a responsibility');
  }

  function updateResponsibility(i: number, value: string) {
    if (!job) return;
    const prior = job.responsibilities[i];
    if (prior === value) return;
    patchJob({ responsibilities: job.responsibilities.map((r, idx) => (idx === i ? value : r)) }, 'Edited a responsibility');
  }

  function moveResponsibility(i: number, dir: -1 | 1) {
    if (!job) return;
    const j = i + dir;
    if (j < 0 || j >= job.responsibilities.length) return;
    const next = [...job.responsibilities];
    [next[i], next[j]] = [next[j], next[i]];
    patchJob({ responsibilities: next }, 'Reordered responsibilities');
  }

  function addRequirement() {
    if (!job) return;
    patchJob({ requirements: [...job.requirements, ''] }, 'Added a requirement');
    setTimeout(() => {
      const items = document.querySelectorAll<HTMLTextAreaElement>('[data-req-item]');
      items[items.length - 1]?.focus();
    }, 30);
  }

  function removeRequirement(i: number) {
    if (!job) return;
    patchJob({ requirements: job.requirements.filter((_, idx) => idx !== i) }, 'Removed a requirement');
  }

  function updateRequirement(i: number, value: string) {
    if (!job) return;
    const prior = job.requirements[i];
    if (prior === value) return;
    patchJob({ requirements: job.requirements.map((r, idx) => (idx === i ? value : r)) }, 'Edited a requirement');
  }

  function moveRequirement(i: number, dir: -1 | 1) {
    if (!job) return;
    const j = i + dir;
    if (j < 0 || j >= job.requirements.length) return;
    const next = [...job.requirements];
    [next[i], next[j]] = [next[j], next[i]];
    patchJob({ requirements: next }, 'Reordered requirements');
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

  async function archiveRole() {
    if (!job) return;
    if (job.archived_at) {
      await patchJob({ archived_at: null }, 'Unarchived role');
      return;
    }
    if (!window.confirm(`Archive "${job.title}"? It will be hidden from the default list but not deleted.`)) return;
    await patchJob({ archived_at: new Date().toISOString() }, 'Archived role');
    router.push('/app/job-descriptions');
  }

  async function deletePermanently() {
    if (!job) return;
    if (!job.archived_at) return;
    if (!window.confirm(`Permanently delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await db({ action: 'delete', table: 'jd_signatures', match: { job_description_id: job.id } }).catch(() => {});
      await db({ action: 'delete', table: 'job_descriptions', match: { id: job.id } });
      router.push('/app/job-descriptions');
    } catch (err) {
      window.alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function markReviewed() {
    if (!job) return;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for Postgres date column
    const reviewer = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || null;
    await patchJob({ date_revised: today, date_revised_by_name: reviewer } as Partial<JobDescription>, 'Marked as reviewed');
  }

  function downloadPdf() {
    // Browsers' built-in "Save as PDF" off window.print() is the simplest way
    // to get a clean one-page PDF without adding a dependency. The print
    // stylesheet below hides the app chrome and shows only the role content.
    window.print();
  }

  async function sendForSignature(target: AppUserLite) {
    if (!job) return;
    setSigBusy(true);
    try {
      const editorName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || 'Someone';
      const created = await db({
        action: 'insert',
        table: 'jd_signatures',
        data: {
          job_description_id: job.id,
          signer_user_id: target.id,
          signer_name: target.full_name,
          signer_email: target.email || null,
          sent_by: user?.id || null,
          sent_by_name: editorName,
        },
      });
      const row = Array.isArray(created) ? (created[0] as SignatureRow) : (created as SignatureRow);
      if (row && row.id) {
        setSignatures((prev) => [row, ...prev]);
        const link = `${window.location.origin}/app/sign/${row.id}`;
        try {
          await navigator.clipboard.writeText(link);
          setSigStatus(`Signature link copied for ${target.full_name || 'team member'}`);
        } catch {
          setSigStatus(`Signature link: ${link}`);
        }
        await patchJob({}, `Sent for signature to ${target.full_name || 'team member'}`);
      }
    } catch (err) {
      setSigStatus(err instanceof Error ? `Failed: ${err.message}` : 'Failed to send');
    } finally {
      setSigBusy(false);
    }
  }

  async function removeSignature(sigId: string) {
    await db({ action: 'delete', table: 'jd_signatures', match: { id: sigId } });
    setSignatures((prev) => prev.filter((s) => s.id !== sigId));
  }

  async function runClaudeRating() {
    if (!job) return;
    setRatingBusy(true);
    setRatingError(null);
    setRating(null);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/claude/job-description/rate', {
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
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Rating failed (${res.status})`);
      }
      const result = (await res.json()) as {
        score: number;
        headline: string;
        strengths: string[];
        recommendations: string[];
      };
      setRating(result);
      await patchJob({}, `Claude rated this ${result.score}/10`);
    } catch (err) {
      setRatingError(err instanceof Error ? err.message : String(err));
    } finally {
      setRatingBusy(false);
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
      {/* Print stylesheet — hides everything except the dedicated print
          view, which is laid out for a clean PDF export. */}
      <style jsx global>{`
        @media screen {
          .jd-print-view { display: none; }
        }
        @media print {
          @page { margin: 0.6in; size: Letter; }
          html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
          /* Collapse all app chrome so it contributes no pages to the PDF. */
          body > *:not(.jd-print-portal) { display: none !important; }
          .jd-print-hide { display: none !important; }
          .jd-print-view {
            display: block !important;
            position: static !important;
            width: 100%;
            color: #111;
            font-family: var(--font-body), Georgia, 'Times New Roman', serif;
            font-size: 9.5pt;
            line-height: 1.35;
          }
          .jd-print-view, .jd-print-view * { visibility: visible !important; }
          .jd-print-view h1 {
            font-family: var(--font-display), Georgia, 'Times New Roman', serif;
            font-size: 18pt;
            font-weight: 700;
            margin: 0 0 4pt;
            letter-spacing: -0.01em;
          }
          .jd-print-view .jd-org {
            font-size: 8pt;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #a0522d;
            font-weight: 600;
            margin-bottom: 10pt;
          }
          .jd-print-view .jd-meta {
            font-size: 9pt;
            color: #555;
            margin-bottom: 16pt;
            border-bottom: 1px solid #e5dcce;
            padding-bottom: 8pt;
            display: flex;
            flex-wrap: wrap;
            gap: 16pt;
          }
          .jd-print-view .jd-meta div span { display: block; font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase; color: #888; margin-bottom: 2pt; }
          .jd-print-view h2 {
            font-family: var(--font-display), Georgia, 'Times New Roman', serif;
            font-size: 11pt;
            font-weight: 700;
            margin: 14pt 0 5pt;
            color: #2d1b0f;
            border-bottom: 1px solid #e5dcce;
            padding-bottom: 3pt;
          }
          .jd-print-view p { margin: 0 0 6pt; }
          .jd-print-view ol { margin: 0 0 6pt; padding-left: 22pt; list-style: decimal; }
          .jd-print-view ol li { margin: 0 0 3pt; page-break-inside: avoid; padding-left: 2pt; }
          .jd-print-view ol li::marker { color: #a0522d; font-weight: 700; }
          .jd-print-view .jd-assignees { font-size: 9pt; color: #333; }
          .jd-print-view .jd-assignees strong { font-weight: 600; }
          .jd-print-view .jd-footer {
            margin-top: 24pt;
            padding-top: 10pt;
            border-top: 1px solid #e5dcce;
            font-size: 8pt;
            color: #888;
            font-style: italic;
          }
        }
      `}</style>

      {/* Semantic print-only layout — portaled to body so @media print can
          isolate it as the ONLY body child, eliminating blank pages from
          hidden app chrome still contributing to document height. */}
      {typeof document !== 'undefined' && createPortal(
        <div className="jd-print-portal">
          <div className="jd-print-view" aria-hidden="true">
            <div className="jd-org">Seven Arrows Recovery</div>
            <h1>{job.title || 'Untitled Role'}</h1>
            <div className="jd-meta">
              {dept && (
                <div>
                  <span>Department</span>
                  {dept.name}
                </div>
              )}
              <div>
                <span>Last Reviewed</span>
                {job.date_revised ? formatDate(job.date_revised) : '—'}
              </div>
              <div>
                <span>Assigned To</span>
                {assignedUsers.length > 0 ? assignedUsers.map((u) => u.full_name || 'Unnamed').join(', ') : 'No one assigned'}
              </div>
            </div>

            {job.summary.trim() && (
              <>
                <h2>Position Summary</h2>
                {job.summary.split(/\n+/).filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </>
            )}

            {job.responsibilities.length > 0 && (
              <>
                <h2>Responsibilities</h2>
                <ol>
                  {job.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
              </>
            )}

            {job.requirements.length > 0 && (
              <>
                <h2>Requirements</h2>
                <ol>
                  {job.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ol>
              </>
            )}

            <div className="jd-footer">
              Seven Arrows Recovery &middot; Confidential &middot; Generated {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="p-6 lg:p-10 max-w-4xl jd-print-root">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap jd-print-hide">
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setRatingOpen(true);
                if (!rating && !ratingBusy) runClaudeRating();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs font-medium hover:bg-primary/10"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
              Kaizen
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
            <button
              onClick={() => { setSigOpen(true); setSigFilter(''); setSigStatus(null); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-foreground/80 text-xs font-medium hover:bg-warm-bg"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
                <path d="M3 21h18" />
              </svg>
              Send for Signature
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 jd-print-card">
          {/* Header: title + dept + actions */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/40 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                Seven Arrows Recovery
              </p>
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
                  onChange={(e) => {
                    const next = e.target.value || null;
                    const nextDept = next ? deptById.get(next)?.name : null;
                    patchJob({ department_id: next }, nextDept ? `Moved to ${nextDept}` : 'Cleared department');
                  }}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-primary jd-print-hide"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-foreground/50"
                  style={{ fontFamily: 'var(--font-body)' }}
                  title={job.date_revised ? `Last reviewed ${formatDate(job.date_revised)}` : 'Not yet reviewed'}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  {job.date_revised ? `Reviewed ${formatDate(job.date_revised)}` : 'Not reviewed yet'}
                </span>
                <button
                  onClick={markReviewed}
                  className="text-[11px] text-primary hover:text-primary/80 font-medium underline-offset-2 hover:underline jd-print-hide"
                  style={{ fontFamily: 'var(--font-body)' }}
                  title="Stamp today's date as the last reviewed date"
                >
                  Mark reviewed
                </button>
              </div>
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
            <AutoTextarea
              value={job.summary}
              onChange={(v) => setJob({ ...job, summary: v })}
              onBlur={(v) => {
                if (v !== job.summary) patchJob({ summary: v }, 'Edited summary');
              }}
              placeholder="A short overview of the role…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white min-h-[16rem] leading-6"
            />
          </div>

          {/* Responsibilities */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                Responsibilities ({job.responsibilities.length})
              </p>
              <button
                onClick={addResponsibility}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add
              </button>
            </div>
            {job.responsibilities.length > 0 && (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden mb-3">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-center gap-2.5 group hover:bg-warm-bg/40 transition-colors px-2.5 py-1.5">
                    <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums select-none self-start mt-0.5">{i + 1}</span>
                    <AutoTextarea
                      value={r}
                      onChange={(value) => {
                        setJob({ ...job, responsibilities: job.responsibilities.map((x, idx) => (idx === i ? value : x)) });
                      }}
                      onBlur={(value) => updateResponsibility(i, value)}
                      placeholder="Describe this responsibility…"
                      dataAttr="resp-item"
                      className="flex-1 min-w-0 w-full text-xs leading-5 text-foreground/80 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 block"
                    />
                    <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      <button
                        onClick={() => moveResponsibility(i, -1)}
                        disabled={i === 0}
                        className="text-foreground/30 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                        aria-label="Move up"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        onClick={() => moveResponsibility(i, 1)}
                        disabled={i === job.responsibilities.length - 1}
                        className="text-foreground/30 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                        aria-label="Move down"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button
                        onClick={() => removeResponsibility(i)}
                        className="text-foreground/30 hover:text-red-500 p-0.5"
                        aria-label="Remove"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {job.responsibilities.length === 0 && (
              <button
                onClick={addResponsibility}
                className="w-full px-3 py-3 rounded-xl border border-dashed border-gray-200 text-xs text-foreground/40 hover:border-primary hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                + Add your first responsibility
              </button>
            )}
          </div>

          {/* Requirements */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                Requirements ({job.requirements.length})
              </p>
              <button
                onClick={addRequirement}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add
              </button>
            </div>
            {job.requirements.length > 0 && (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-white overflow-hidden mb-3">
                {job.requirements.map((r, i) => (
                  <li key={i} className="flex items-center gap-2.5 group hover:bg-warm-bg/40 transition-colors px-2.5 py-1.5">
                    <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums select-none self-start mt-0.5">{i + 1}</span>
                    <AutoTextarea
                      value={r}
                      onChange={(value) => {
                        setJob({ ...job, requirements: job.requirements.map((x, idx) => (idx === i ? value : x)) });
                      }}
                      onBlur={(value) => updateRequirement(i, value)}
                      placeholder="Describe this requirement…"
                      dataAttr="req-item"
                      className="flex-1 min-w-0 w-full text-xs leading-5 text-foreground/80 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 block"
                    />
                    <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                      <button
                        onClick={() => moveRequirement(i, -1)}
                        disabled={i === 0}
                        className="text-foreground/30 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                        aria-label="Move up"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        onClick={() => moveRequirement(i, 1)}
                        disabled={i === job.requirements.length - 1}
                        className="text-foreground/30 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                        aria-label="Move down"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      <button
                        onClick={() => removeRequirement(i)}
                        className="text-foreground/30 hover:text-red-500 p-0.5"
                        aria-label="Remove"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {job.requirements.length === 0 && (
              <button
                onClick={addRequirement}
                className="w-full px-3 py-3 rounded-xl border border-dashed border-gray-200 text-xs text-foreground/40 hover:border-primary hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                + Add your first requirement
              </button>
            )}
          </div>

          {/* Activity log */}
          <div className="mb-6 jd-print-hide">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Activity ({job.activity.length})
            </p>
            {job.activity.length === 0 ? (
              <p className="text-xs text-foreground/40 italic" style={{ fontFamily: 'var(--font-body)' }}>
                No changes recorded yet.
              </p>
            ) : (
              <ul className="border border-gray-100 rounded-xl bg-white divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {[...job.activity].reverse().map((entry, i) => (
                  <li key={i} className="px-3 py-2 flex items-start gap-3 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                    <span className="text-foreground/30 mt-0.5 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/80">{entry.summary}</p>
                      <p className="text-[10px] text-foreground/40 mt-0.5">
                        {entry.by_name ? `${entry.by_name} · ` : ''}{new Date(entry.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Signatures */}
          <div className="mb-6 jd-print-hide">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Signatures ({signatures.length})
            </p>
            {signatures.length === 0 ? (
              <p className="text-xs text-foreground/40 italic" style={{ fontFamily: 'var(--font-body)' }}>
                No signatures requested yet. Use “Send for Signature” above.
              </p>
            ) : (
              <ul className="border border-gray-100 rounded-xl bg-white divide-y divide-gray-100">
                {signatures.map((s) => {
                  const signerUser = s.signer_user_id ? users.find((u) => u.id === s.signer_user_id) : null;
                  return (
                  <li key={s.id} className="px-3 py-2 flex items-center gap-3 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.signed_at ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    {signerUser?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={signerUser.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-[11px] font-semibold text-foreground/60 shrink-0">
                        {(s.signer_name || signerUser?.full_name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground/80 truncate">{s.signer_name || 'Unnamed'}</p>
                      <p className="text-[10px] text-foreground/40">
                        {s.signed_at
                          ? `Signed ${new Date(s.signed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                          : `Sent ${new Date(s.sent_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}${s.sent_by_name ? ` by ${s.sent_by_name}` : ''}`}
                      </p>
                    </div>
                    {s.pdf_storage_path && (
                      <a
                        href={s.pdf_storage_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline"
                      >
                        View PDF
                      </a>
                    )}
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/app/sign/${s.id}`;
                        navigator.clipboard.writeText(link).catch(() => {});
                        setSigStatus('Signature link copied');
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Copy link
                    </button>
                    <button
                      onClick={() => removeSignature(s.id)}
                      className="text-foreground/30 hover:text-red-500"
                      aria-label="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
            {sigStatus && (
              <p className="mt-2 text-[11px] text-emerald-700" style={{ fontFamily: 'var(--font-body)' }}>{sigStatus}</p>
            )}
          </div>

          {/* Archive */}
          <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100 jd-print-hide">
            {job.archived_at && (
              <button
                onClick={deletePermanently}
                className="text-xs font-medium text-red-500 hover:text-red-700"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Delete permanently
              </button>
            )}
            <button
              onClick={archiveRole}
              className={`text-xs font-medium ${job.archived_at ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-500 hover:text-red-700'}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {job.archived_at ? 'Unarchive job' : 'Archive job'}
            </button>
          </div>
        </div>

        {/* Send-for-signature modal */}
        {sigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 jd-print-hide" onClick={() => !sigBusy && setSigOpen(false)}>
            <div
              className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-sm font-semibold text-foreground mb-1">Send for Signature</h2>
              <p className="text-xs text-foreground/60 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                Choose a team member. They&apos;ll get a link to review and sign this job description.
              </p>
              <input
                autoFocus
                value={sigFilter}
                onChange={(e) => setSigFilter(e.target.value)}
                placeholder="Search team…"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white mb-2"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
                {assignedUsers.length === 0 && (
                  <p className="text-xs text-foreground/50 italic px-3 py-4" style={{ fontFamily: 'var(--font-body)' }}>
                    No one is assigned to this role yet. Assign a team member first, then send for signature.
                  </p>
                )}
                {assignedUsers
                  .filter((u) => !sigFilter.trim() || (u.full_name || '').toLowerCase().includes(sigFilter.trim().toLowerCase()))
                  .map((u) => {
                    const existing = signatures.find((s) => s.signer_user_id === u.id);
                    const signed = !!existing?.signed_at;
                    const pending = !!existing && !signed;
                    const disabled = sigBusy || signed || pending;
                    return (
                      <button
                        key={u.id}
                        disabled={disabled}
                        onClick={async () => {
                          await sendForSignature(u);
                          setSigOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-warm-bg/40 text-left border-b border-gray-100 last:border-b-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        style={{ fontFamily: 'var(--font-body)' }}
                        title={signed ? 'Already signed' : pending ? 'Waiting to be signed' : ''}
                      >
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-semibold text-foreground/60">
                            {(u.full_name || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="flex-1 truncate">{u.full_name || 'Unnamed'}</span>
                        {signed ? (
                          <span className="text-[10px] font-medium text-emerald-600 whitespace-nowrap">Signed</span>
                        ) : pending ? (
                          <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">Waiting to be signed</span>
                        ) : u.job_title ? (
                          <span className="text-[10px] text-foreground/40 truncate max-w-[120px]">{u.job_title}</span>
                        ) : null}
                      </button>
                    );
                  })}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {(() => {
                  const unsent = assignedUsers.filter((u) => !signatures.some((s) => s.signer_user_id === u.id));
                  if (unsent.length < 2) return <span />;
                  return (
                    <button
                      onClick={async () => {
                        for (const u of unsent) {
                          // eslint-disable-next-line no-await-in-loop
                          await sendForSignature(u);
                        }
                        setSigOpen(false);
                      }}
                      disabled={sigBusy}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Send to everybody
                    </button>
                  );
                })()}
                <button
                  onClick={() => setSigOpen(false)}
                  disabled={sigBusy}
                  className="px-3 py-1.5 rounded-lg text-xs text-foreground/60 hover:bg-warm-bg"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Claude-rating side panel */}
        {ratingOpen && (
          <div className="fixed inset-0 z-50 flex jd-print-hide">
            <div
              className="flex-1 bg-black/20"
              onClick={() => !ratingBusy && setRatingOpen(false)}
            />
            <div className="w-full max-w-md bg-white border-l border-gray-100 flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
                  <h3 className="text-sm font-semibold text-foreground">Kaizen</h3>
                </div>
                <button
                  onClick={() => !ratingBusy && setRatingOpen(false)}
                  disabled={ratingBusy}
                  className="text-foreground/40 hover:text-foreground disabled:opacity-40"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ fontFamily: 'var(--font-body)' }}>
                {ratingBusy && (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-foreground/50 text-xs">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Claude is reviewing the job description…
                  </div>
                )}

                {!ratingBusy && ratingError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                    {ratingError}
                    <button
                      onClick={runClaudeRating}
                      className="block mt-2 text-red-700 underline hover:text-red-800"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {!ratingBusy && !ratingError && rating && (
                  <>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-warm-bg/40 border border-gray-100">
                      <div className="shrink-0 w-20 h-20 rounded-full bg-white border-2 border-primary flex flex-col items-center justify-center">
                        <span className="text-3xl font-semibold text-primary leading-none">{rating.score}</span>
                        <span className="text-[10px] uppercase tracking-wider text-foreground/40 mt-1">out of 10</span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-5 flex-1">{rating.headline}</p>
                    </div>

                    {rating.strengths.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">Strengths</p>
                        <ul className="space-y-1.5">
                          {rating.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rating.recommendations.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">How to get to 10</p>
                        <ul className="space-y-1.5">
                          {rating.recommendations.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {!ratingBusy && !ratingError && !rating && (
                  <div className="text-center py-12">
                    <p className="text-xs text-foreground/60 mb-4">
                      Claude will review the title, summary, responsibilities, and requirements and give a score out of 10 with concrete recommendations.
                    </p>
                    <button
                      onClick={runClaudeRating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                      Rate this job description
                    </button>
                  </div>
                )}
              </div>

              {!ratingBusy && rating && (
                <div className="border-t border-gray-100 p-3 flex justify-end">
                  <button
                    onClick={runClaudeRating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-foreground/70 hover:bg-warm-bg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Re-rate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
