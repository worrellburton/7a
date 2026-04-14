'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db, getAuthToken } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface Department {
  id: string;
  name: string;
  color: string | null;
}

interface ActivityEntry {
  at: string; // ISO timestamp
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
  date_revised_by_name: string | null;
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

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface AppUserLite {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
}

interface SignatureLite {
  id: string;
  job_description_id: string;
  signer_user_id: string | null;
  signed_at: string | null;
  sent_at: string | null;
  pdf_storage_path: string | null;
}

export default function JobDescriptionsContent() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUserLite[]>([]);
  const [signatures, setSignatures] = useState<SignatureLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(true);

  // Add-new
  const [creating, setCreating] = useState(false);
  const [modalDragOver, setModalDragOver] = useState(false);
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

  // Per-row assign popover state: which job row is showing its picker, + filter.
  const [assignOpenFor, setAssignOpenFor] = useState<string | null>(null);
  const [assignFilter, setAssignFilter] = useState('');

  // Sort + archive filter state
  type SortKey = 'title' | 'department' | 'assigned' | 'last_edited' | 'date_revised';
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'title', dir: 'asc' });
  type ListFilter = 'active' | 'archived' | 'all' | 'signed' | 'waiting';
  const [archivedFilter, setArchivedFilter] = useState<ListFilter>('active');

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  useEffect(() => {
    if (!assignOpenFor) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAssignOpenFor(null);
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [assignOpenFor]);

  async function assignUserToTitle(title: string, u: AppUserLite) {
    await db({ action: 'update', table: 'users', data: { job_title: title }, match: { id: u.id } });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, job_title: title } : x)));
  }

  async function unassignUserFromTitle(u: AppUserLite) {
    await db({ action: 'update', table: 'users', data: { job_title: null }, match: { id: u.id } });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, job_title: null } : x)));
  }

  async function patchJob(jobId: string, updates: Partial<JobDescription>, activitySummary?: string) {
    const nowIso = new Date().toISOString();
    const editorName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name || user?.email || 'Someone';
    const current = jobs.find((j) => j.id === jobId);
    const nextActivity = activitySummary
      ? [...(current?.activity || []), { at: nowIso, by_name: editorName, summary: activitySummary }].slice(-50)
      : current?.activity;
    const fullUpdate: Record<string, unknown> = {
      ...updates,
      last_edited_at: nowIso,
      last_edited_by: user?.id || null,
      last_edited_by_name: editorName,
    };
    if (activitySummary) fullUpdate.activity = nextActivity;
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...updates, last_edited_at: nowIso, last_edited_by_name: editorName, activity: nextActivity || j.activity } as JobDescription : j)));
    const res = await db({ action: 'update', table: 'job_descriptions', data: fullUpdate, match: { id: jobId } });
    if (res && typeof res === 'object' && 'error' in res) {
      console.warn('patchJob failed', (res as { error?: string }).error);
    }
  }

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const [jobData, deptData, userData, sigData] = await Promise.all([
        db({ action: 'select', table: 'job_descriptions', order: { column: 'title', ascending: true } }),
        db({ action: 'select', table: 'departments', order: { column: 'name', ascending: true } }),
        db({
          action: 'select',
          table: 'users',
          select: 'id, full_name, avatar_url, job_title',
          order: { column: 'full_name', ascending: true },
        }),
        db({ action: 'select', table: 'jd_signatures', select: 'id, job_description_id, signer_user_id, signed_at, sent_at, pdf_storage_path' }).catch(() => []),
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
            date_revised: (j.date_revised as string | null) || null,
            date_revised_by_name: (j.date_revised_by_name as string | null) || null,
            created_at: (j.created_at as string) || '',
            last_edited_at: (j.last_edited_at as string | null) || null,
            last_edited_by_name: (j.last_edited_by_name as string | null) || null,
            activity: Array.isArray(j.activity) ? (j.activity as ActivityEntry[]) : [],
            archived_at: (j.archived_at as string | null) || null,
          }))
        );
      } else {
        setDbAvailable(false);
      }
      if (Array.isArray(deptData)) setDepartments(deptData as Department[]);
      if (Array.isArray(userData)) setUsers(userData as AppUserLite[]);
      if (Array.isArray(sigData)) setSignatures(sigData as SignatureLite[]);
      setLoading(false);
    }
    load();
  }, [session]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  // Filter + sort the list for the table render.
  const visibleJobs = useMemo(() => {
    const filtered = jobs.filter((j) => {
      if (archivedFilter === 'active') return !j.archived_at;
      if (archivedFilter === 'archived') return !!j.archived_at;
      return true;
    });
    const firstAssigned = (job: JobDescription): string => {
      const arr = users
        .filter((u) => (u.job_title || '').trim().toLowerCase() === job.title.trim().toLowerCase())
        .map((u) => u.full_name || '')
        .sort((a, b) => a.localeCompare(b));
      return arr[0] || '';
    };
    const cmp = (a: JobDescription, b: JobDescription): number => {
      switch (sort.key) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'department': {
          const da = a.department_id ? deptById.get(a.department_id)?.name || '' : '';
          const db_ = b.department_id ? deptById.get(b.department_id)?.name || '' : '';
          return da.localeCompare(db_);
        }
        case 'assigned':
          return firstAssigned(a).localeCompare(firstAssigned(b));
        case 'last_edited': {
          const ta = a.last_edited_at ? Date.parse(a.last_edited_at) : 0;
          const tb = b.last_edited_at ? Date.parse(b.last_edited_at) : 0;
          return ta - tb;
        }
        case 'date_revised': {
          const ta = a.date_revised ? Date.parse(a.date_revised) : 0;
          const tb = b.date_revised ? Date.parse(b.date_revised) : 0;
          return ta - tb;
        }
      }
    };
    const sorted = [...filtered].sort(cmp);
    if (sort.dir === 'desc') sorted.reverse();
    return sorted;
  }, [jobs, archivedFilter, sort, users, deptById]);

  // Rows for the Signed / Waiting list views. Each row carries the
  // pre-resolved job title and signer name so the renderer stays dumb.
  // For Signed view, each signer's *latest* signed_at is marked active —
  // everything else for that signer is "previous" (historical).
  const visibleSignatures = useMemo(() => {
    if (archivedFilter !== 'signed' && archivedFilter !== 'waiting') return [];
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const userById = new Map(users.map((u) => [u.id, u]));

    // Compute active-signature-id per signer using ALL signed signatures.
    const activeByUser = new Map<string, string>();
    if (archivedFilter === 'signed') {
      const latestByUser = new Map<string, { id: string; ts: string }>();
      for (const s of signatures) {
        if (!s.signed_at || !s.signer_user_id) continue;
        const prev = latestByUser.get(s.signer_user_id);
        if (!prev || (s.signed_at > prev.ts)) {
          latestByUser.set(s.signer_user_id, { id: s.id, ts: s.signed_at });
        }
      }
      for (const [uid, v] of latestByUser) activeByUser.set(uid, v.id);
    }

    const rows = signatures
      .filter((s) => (archivedFilter === 'signed' ? !!s.signed_at : !s.signed_at))
      .map((s) => {
        const j = jobById.get(s.job_description_id);
        const u = s.signer_user_id ? userById.get(s.signer_user_id) : null;
        const isActive = !!(s.signer_user_id && activeByUser.get(s.signer_user_id) === s.id);
        return {
          id: s.id,
          job_description_id: s.job_description_id,
          signer_user_id: s.signer_user_id,
          job_title: j?.title || '(deleted role)',
          signer_name: u?.full_name || '—',
          signer_avatar: u?.avatar_url || null,
          sent_at: s.sent_at,
          signed_at: s.signed_at,
          pdf_storage_path: s.pdf_storage_path,
          is_active: isActive,
        };
      });
    // Newest first by relevant timestamp.
    rows.sort((a, b) => {
      const ta = (archivedFilter === 'signed' ? a.signed_at : a.sent_at) || '';
      const tb = (archivedFilter === 'signed' ? b.signed_at : b.sent_at) || '';
      return tb.localeCompare(ta);
    });
    return rows;
  }, [signatures, jobs, users, archivedFilter]);

  async function deleteSignature(sigId: string) {
    if (!window.confirm('Delete this signed job description? This cannot be undone.')) return;
    setSignatures((prev) => prev.filter((s) => s.id !== sigId));
    await db({ action: 'delete', table: 'jd_signatures', match: { id: sigId } }).catch((err) => {
      console.warn('deleteSignature failed', err);
    });
  }

  // Insights for the top bar
  const insights = useMemo(() => {
    const assignedUserIds = new Set<string>();
    const titleToJobId = new Map<string, string>();
    for (const j of jobs) titleToJobId.set(j.title.trim().toLowerCase(), j.id);
    for (const u of users) {
      const t = (u.job_title || '').trim().toLowerCase();
      if (t && titleToJobId.has(t)) assignedUserIds.add(u.id);
    }

    // Signed = user has a signed_at for their assigned JD
    const signedPairs = new Set(
      signatures.filter((s) => s.signed_at && s.signer_user_id).map((s) => `${s.signer_user_id}:${s.job_description_id}`)
    );
    const peopleWithJd = users.filter((u) => assignedUserIds.has(u.id));
    const peopleNeedSignature: AppUserLite[] = [];
    for (const u of peopleWithJd) {
      const jid = titleToJobId.get((u.job_title || '').trim().toLowerCase())!;
      if (!signedPairs.has(`${u.id}:${jid}`)) peopleNeedSignature.push(u);
    }

    const unassignedJds = jobs.filter((j) => {
      const assigned = users.some((u) => (u.job_title || '').trim().toLowerCase() === j.title.trim().toLowerCase());
      return !assigned;
    });

    const notReviewed = jobs.filter((j) => !j.date_revised);

    const teamWithoutJd = users.filter((u) => !assignedUserIds.has(u.id) && (u.full_name || '').trim());

    return { peopleNeedSignature, unassignedJds, notReviewed, teamWithoutJd };
  }, [jobs, users, signatures]);

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

  // ---- Generate new role via Claude, insert, then navigate to detail ----
  async function createAndOpen() {
    const title = newTitle.trim();
    if (!title) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      const deptName = newDeptId ? departments.find((d) => d.id === newDeptId)?.name || '' : '';
      let summary = '';
      let responsibilities: string[] = [];
      let requirements: string[] = [];
      try {
        const token = getAuthToken();
        const res = await fetch('/api/claude/job-description/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ title, department: deptName }),
        });
        if (res.ok) {
          const parsed = (await res.json()) as {
            summary?: string;
            responsibilities?: string[];
            requirements?: string[];
          };
          summary = parsed.summary || '';
          responsibilities = Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [];
          requirements = Array.isArray(parsed.requirements) ? parsed.requirements : [];
        } else {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || `Generation failed (${res.status})`);
        }
      } catch (genErr) {
        // Surface the error but still create a blank role so the user isn't blocked.
        setCreateError(
          `Claude generation failed: ${genErr instanceof Error ? genErr.message : String(genErr)}. Saved as a blank role.`
        );
      }

      const payload = {
        title,
        department_id: newDeptId || null,
        summary,
        responsibilities,
        requirements,
      };
      if (!dbAvailable) {
        const local: JobDescription = {
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
          date_revised: null,
          date_revised_by_name: null,
          last_edited_at: null,
          last_edited_by_name: null,
          activity: [],
          archived_at: null,
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
        if (user) {
          logActivity({
            userId: user.id,
            type: 'jd.created',
            targetKind: 'job_description',
            targetId: created.id,
            targetLabel: created.title,
            targetPath: `/app/job-descriptions/${created.id}`,
          });
        }
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
          date_revised: null,
          date_revised_by_name: null,
          last_edited_at: null,
          last_edited_by_name: null,
          activity: [],
          archived_at: null,
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
      <div className="p-4 sm:p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDragging = dragDepth > 0;

  return (
    <div
      className="p-4 sm:p-6 lg:p-10 w-full relative"
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
            {visibleJobs.length} {visibleJobs.length === 1 ? 'role' : 'roles'} &middot; Click “Add New” or drop a PDF anywhere to import
          </p>
          {!dbAvailable && (
            <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Database table not found — changes are in-memory only. Create a <code>job_descriptions</code> table to persist.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setCreating(true); setNewTitle(''); setNewDeptId(''); setCreateError(null); }}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add New Job Description
          </button>
        </div>
      </div>

      {/* Insights */}
      {jobs.length > 0 && (
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <InsightCard
            label="Unsigned JDs"
            count={insights.peopleNeedSignature.length}
            tone="amber"
            detail={insights.peopleNeedSignature.slice(0, 6).map((u) => u.full_name || 'Unnamed')}
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            )}
            subtitle="Team members with no signed JD"
          />
          <InsightCard
            label="No Role"
            count={insights.teamWithoutJd.length}
            tone="rose"
            detail={insights.teamWithoutJd.slice(0, 6).map((u) => u.full_name || 'Unnamed')}
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            )}
            subtitle="Team members with no JD assigned"
          />
          <InsightCard
            label="Unassigned"
            count={insights.unassignedJds.length}
            tone="sky"
            detail={insights.unassignedJds.slice(0, 6).map((j) => j.title)}
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18" />
              </svg>
            )}
            subtitle="Job descriptions with no team"
          />
          <InsightCard
            label="Needs Review"
            count={insights.notReviewed.length}
            tone="emerald"
            detail={insights.notReviewed.slice(0, 6).map((j) => j.title)}
            icon={(
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            )}
            subtitle="Not reviewed yet"
          />
        </div>
      )}

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

      {/* New-role modal — includes drag-and-drop PDF import so a role can
          be created either by typing a title or by dropping a PDF that
          Claude will parse. */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => !createBusy && !uploading && setCreating(false)}>
          <div
            className={`bg-white rounded-2xl shadow-xl border p-5 w-full max-w-md transition-colors ${modalDragOver ? 'border-primary border-2' : 'border-gray-100'}`}
            onClick={(e) => e.stopPropagation()}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setModalDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setModalDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setModalDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalDragOver(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                importPdfs(files).then(() => setCreating(false));
              }
            }}
          >
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
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="jd-pdf-input-modal"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-foreground/60 hover:text-foreground hover:bg-warm-bg transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
                title="Drag a PDF onto this window, or click to choose one"
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                    <path d="M12 18v-6" />
                    <path d="m9 15 3-3 3 3" />
                  </svg>
                )}
                {uploading ? (uploadStatus || 'Parsing PDF…') : 'Upload PDF'}
                <input
                  id="jd-pdf-input-modal"
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      importPdfs(e.target.files).then(() => setCreating(false));
                      e.target.value = '';
                    }
                  }}
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreating(false)}
                  disabled={createBusy || uploading}
                  className="px-3 py-1.5 rounded-lg text-xs text-foreground/50 hover:bg-warm-bg disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >Cancel</button>
                <button
                  onClick={createAndOpen}
                  disabled={!newTitle.trim() || createBusy || uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {createBusy && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                  {createBusy ? 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            No job descriptions yet. Drop a PDF anywhere or add one manually to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-100 bg-warm-bg/10">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="tablist" aria-label="Archive filter">
                {([
                  { k: 'active' as const, label: 'Active' },
                  { k: 'archived' as const, label: 'Archived' },
                  { k: 'all' as const, label: 'All' },
                ]).map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setArchivedFilter(o.k)}
                    aria-pressed={archivedFilter === o.k}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      archivedFilter === o.k ? 'bg-warm-bg text-foreground' : 'text-foreground/50 hover:text-foreground'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="tablist" aria-label="Signature filter">
                {([
                  { k: 'signed' as const, label: 'All signed' },
                  { k: 'waiting' as const, label: 'Waiting for signature' },
                ]).map((o) => (
                  <button
                    key={o.k}
                    onClick={() => setArchivedFilter(o.k)}
                    aria-pressed={archivedFilter === o.k}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      archivedFilter === o.k ? 'bg-warm-bg text-foreground' : 'text-foreground/50 hover:text-foreground'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {archivedFilter === 'signed' || archivedFilter === 'waiting' ? (
            <>
              <div
                className="grid items-center text-[10px] uppercase tracking-wider text-foreground/40 px-5 py-2.5 border-b border-gray-100 bg-warm-bg/20"
                style={{ fontFamily: 'var(--font-body)', gridTemplateColumns: archivedFilter === 'signed' ? 'minmax(0,2.2fr) minmax(0,1.8fr) 100px 130px 100px 40px' : 'minmax(0,2.4fr) minmax(0,2fr) 150px 120px' }}
              >
                <span>Job Description</span>
                <span>Signer</span>
                {archivedFilter === 'signed' && <span>Status</span>}
                <span>{archivedFilter === 'signed' ? 'Signed' : 'Sent'}</span>
                <span>{archivedFilter === 'signed' ? 'PDF' : 'Status'}</span>
                {archivedFilter === 'signed' && <span />}
              </div>
              {visibleSignatures.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                  {archivedFilter === 'signed'
                    ? 'No signed job descriptions yet.'
                    : 'Nobody is waiting to sign a job description.'}
                </div>
              ) : (
                visibleSignatures.map((s, idx) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (archivedFilter === 'waiting') {
                        router.push(`/app/sign/${s.id}`);
                      } else if (s.pdf_storage_path) {
                        window.open(s.pdf_storage_path, '_blank', 'noopener,noreferrer');
                      } else {
                        router.push(`/app/job-descriptions/${s.job_description_id}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (archivedFilter === 'waiting') {
                          router.push(`/app/sign/${s.id}`);
                        } else if (s.pdf_storage_path) {
                          window.open(s.pdf_storage_path, '_blank', 'noopener,noreferrer');
                        } else {
                          router.push(`/app/job-descriptions/${s.job_description_id}`);
                        }
                      }
                    }}
                    className={`grid items-center px-5 py-3 hover:bg-warm-bg/30 cursor-pointer transition-colors ${idx > 0 ? 'border-t border-gray-100' : ''} ${archivedFilter === 'signed' && !s.is_active ? 'opacity-60' : ''}`}
                    style={{ gridTemplateColumns: archivedFilter === 'signed' ? 'minmax(0,2.2fr) minmax(0,1.8fr) 100px 130px 100px 40px' : 'minmax(0,2.4fr) minmax(0,2fr) 150px 120px', fontFamily: 'var(--font-body)' }}
                  >
                    <div className="min-w-0 pr-3">
                      <span className={`text-sm font-semibold text-foreground truncate block ${archivedFilter === 'signed' && !s.is_active ? 'italic' : ''}`}>{s.job_title}</span>
                    </div>
                    <div className="min-w-0 pr-3 flex items-center gap-2">
                      {s.signer_avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.signer_avatar} alt={s.signer_name} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-semibold text-foreground/60 border border-gray-100">
                          {(s.signer_name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-sm text-foreground truncate">{s.signer_name}</span>
                    </div>
                    {archivedFilter === 'signed' && (
                      <div className="text-xs min-w-0">
                        {s.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/50 text-[11px] font-medium">
                            Previous
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-foreground/60 min-w-0 truncate">
                      {archivedFilter === 'signed'
                        ? (s.signed_at ? formatDate(s.signed_at) : '—')
                        : (s.sent_at ? formatDate(s.sent_at) : '—')}
                    </div>
                    <div className="text-xs min-w-0" onClick={(e) => e.stopPropagation()}>
                      {archivedFilter === 'signed' ? (
                        s.pdf_storage_path ? (
                          <a
                            href={s.pdf_storage_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/10 transition-colors"
                          >
                            View PDF
                          </a>
                        ) : (
                          <span className="text-foreground/30">—</span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
                          Waiting
                        </span>
                      )}
                    </div>
                    {archivedFilter === 'signed' && (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => deleteSignature(s.id)}
                          className="p-1 rounded text-foreground/30 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete signed job description"
                          aria-label="Delete signed job description"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          ) : (
          <>
          <div
            className="hidden md:grid items-center text-[10px] uppercase tracking-wider text-foreground/40 px-5 py-2.5 border-b border-gray-100 bg-warm-bg/20"
            style={{ fontFamily: 'var(--font-body)', gridTemplateColumns: 'minmax(0,3fr) minmax(120px,0.9fr) minmax(0,1.6fr) 120px 120px' }}
          >
            {([
              { k: 'title' as const, label: 'Title' },
              { k: 'department' as const, label: 'Department' },
              { k: 'assigned' as const, label: 'Assigned To' },
              { k: 'last_edited' as const, label: 'Last Changed' },
              { k: 'date_revised' as const, label: 'Last Reviewed' },
            ]).map((col) => (
              <button
                key={col.k}
                onClick={() => toggleSort(col.k)}
                className="inline-flex items-center gap-1 text-left hover:text-foreground/80 transition-colors"
              >
                {col.label}
                {sort.key === col.k && (
                  <span className="text-foreground/60">{sort.dir === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
            ))}
          </div>
          {/* Mobile sort bar — condenses the sortable headers into a dropdown
              so the row list can use its full width for the title. */}
          <div className="md:hidden px-4 py-2 border-b border-gray-100 bg-warm-bg/20 flex items-center gap-2 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="text-foreground/40 uppercase tracking-wider text-[10px]">Sort</span>
            <select
              value={sort.key}
              onChange={(e) => toggleSort(e.target.value as typeof sort.key)}
              className="flex-1 px-2 py-1 rounded-md border border-gray-200 bg-white text-xs"
            >
              <option value="title">Title</option>
              <option value="department">Department</option>
              <option value="assigned">Assigned To</option>
              <option value="last_edited">Last Changed</option>
              <option value="date_revised">Last Reviewed</option>
            </select>
            <button
              onClick={() => toggleSort(sort.key)}
              className="px-2 py-1 rounded-md border border-gray-200 bg-white text-xs"
              aria-label="Toggle direction"
            >
              {sort.dir === 'asc' ? '▲' : '▼'}
            </button>
          </div>
          {visibleJobs.map((job, idx) => {
            const dept = job.department_id ? deptById.get(job.department_id) : null;
            const assigned = usersByTitle.get(job.title.trim().toLowerCase()) || [];
            const pickerOpen = assignOpenFor === job.id;
            const pickerFilter = pickerOpen ? assignFilter.trim().toLowerCase() : '';
            const pickerCandidates = users
              .filter((u) => !assigned.some((a) => a.id === u.id))
              .filter((u) => !pickerFilter || (u.full_name || '').toLowerCase().includes(pickerFilter));
            return (
              <div
                key={job.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/app/job-descriptions/${job.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/app/job-descriptions/${job.id}`); } }}
                className={`grid items-center px-5 py-3 hover:bg-warm-bg/30 cursor-pointer transition-colors ${idx > 0 ? 'border-t border-gray-100' : ''} ${job.archived_at ? 'opacity-60' : ''}`}
                style={{ gridTemplateColumns: 'minmax(0,3fr) minmax(120px,0.9fr) minmax(0,1.6fr) 120px 120px' }}
              >
                <div className="min-w-0 flex items-center gap-2 pr-3">
                  <span className={`text-sm font-semibold text-foreground truncate ${job.archived_at ? 'italic' : ''}`}>{job.title}</span>
                  {job.archived_at && (
                    <span className="text-[9px] uppercase tracking-wider text-foreground/40 shrink-0" style={{ fontFamily: 'var(--font-body)' }}>Archived</span>
                  )}
                </div>
                <div className="min-w-0 pr-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={job.department_id || ''}
                    onChange={(e) => {
                      const next = e.target.value || null;
                      const nextDept = next ? deptById.get(next)?.name : null;
                      patchJob(job.id, { department_id: next }, nextDept ? `Moved to ${nextDept}` : 'Cleared department');
                    }}
                    className={`text-[11px] px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-primary/40 w-full max-w-[180px] ${dept ? 'font-medium' : 'text-foreground/40'}`}
                    style={{
                      fontFamily: 'var(--font-body)',
                      backgroundColor: dept ? (dept.color || '#a0522d') + '1f' : 'transparent',
                      color: dept ? (dept.color || '#a0522d') : undefined,
                    }}
                  >
                    <option value="">— None —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 flex items-center gap-1.5 flex-wrap pr-3 relative" onClick={(e) => e.stopPropagation()}>
                  {assigned.map((u) => (
                    <span
                      key={u.id}
                      className="relative inline-flex items-center group"
                      style={{ fontFamily: 'var(--font-body)' }}
                      title={u.full_name || ''}
                    >
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt={u.full_name || ''} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-semibold text-foreground/60 border border-gray-100">
                          {(u.full_name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded bg-foreground text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        {u.full_name || 'Unnamed'}
                      </span>
                      <button
                        onClick={() => unassignUserFromTitle(u)}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white border border-gray-200 text-foreground/40 hover:text-red-500 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        aria-label={`Unassign ${u.full_name}`}
                      >
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => {
                      setAssignOpenFor(pickerOpen ? null : job.id);
                      setAssignFilter('');
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed text-[11px] transition-colors ${
                      assigned.length === 0
                        ? 'border-gray-300 text-foreground/50 hover:border-primary hover:text-primary'
                        : 'border-gray-300 text-foreground/40 hover:border-primary hover:text-primary'
                    }`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" aria-label={assigned.length === 0 ? 'Assign' : 'Add'}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </button>
                  {pickerOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAssignOpenFor(null)} />
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
                          {pickerCandidates.length === 0 && (
                            <p className="px-3 py-4 text-xs text-foreground/40 text-center" style={{ fontFamily: 'var(--font-body)' }}>
                              No matching team members
                            </p>
                          )}
                          {pickerCandidates.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                assignUserToTitle(job.title, u);
                                setAssignOpenFor(null);
                                setAssignFilter('');
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
                    </>
                  )}
                </div>
                <div className="text-xs text-foreground/60 min-w-0 pr-3" style={{ fontFamily: 'var(--font-body)' }}>
                  {job.last_edited_at ? (
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{formatRelative(job.last_edited_at)}</span>
                      {job.last_edited_by_name && (
                        <span className="text-[10px] text-foreground/40 truncate">by {job.last_edited_by_name}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </div>
                <div className="text-xs text-foreground/60 min-w-0" style={{ fontFamily: 'var(--font-body)' }}>
                  {job.date_revised ? (
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{formatDate(job.date_revised)}</span>
                      {job.date_revised_by_name && (
                        <span className="text-[10px] text-foreground/40 truncate">by {job.date_revised_by_name}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-foreground/30">—</span>
                  )}
                </div>
              </div>
            );
          })}
          </>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  label,
  count,
  subtitle,
  detail,
  icon,
}: {
  label: string;
  count: number;
  subtitle: string;
  detail: string[];
  icon: React.ReactNode;
  // `tone` is kept in callers for back-compat but ignored — colour
  // is now a pure function of `count`: red when outstanding, green
  // when the metric has cleared to zero ("good and complete").
  tone?: 'amber' | 'rose' | 'sky' | 'emerald';
}) {
  const complete = count === 0;
  const t = complete
    ? { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' }
    : { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' };
  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} px-4 py-3 flex flex-col gap-1 min-w-0`} style={{ fontFamily: 'var(--font-body)' }}>
      <div className="flex items-center gap-2">
        <span className={`${t.text}`}>{icon}</span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.text}`}>{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${t.text}`}>{count}</span>
        <span className="text-[11px] text-foreground/60 truncate">{subtitle}</span>
      </div>
      {detail.length > 0 && (
        <p className="text-[11px] text-foreground/50 truncate">
          {detail.join(', ')}{count > detail.length ? `, +${count - detail.length} more` : ''}
        </p>
      )}
    </div>
  );
}
