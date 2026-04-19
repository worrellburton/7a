'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type DocStatus = 'draft' | 'ready' | 'out_for_signature' | 'signed' | 'archived';
type DocCategory = 'policies' | 'intake_forms' | 'new_hire_forms' | 'job_descriptions' | 'consent_forms' | 'financial' | 'clinical' | 'other';

interface SignatureRequest {
  recipient: string;
  email: string;
  sent_at: string;
  signed_at: string | null;
  resent_count?: number;
  last_resent_at?: string | null;
}

interface DocumentRow {
  id: string;
  title: string;
  category: DocCategory;
  version: string;
  updated_at: string;
  updated_by: string;
  size_kb: number;
  status: DocStatus;
  body?: string;
  signatures: SignatureRequest[];
}

const DOCS_STORAGE_KEY = 'document_manager_docs_v1';

const CATEGORY_LABEL: Record<DocCategory, string> = {
  policies: 'Policies',
  intake_forms: 'Intake Forms',
  new_hire_forms: 'New Hire Forms',
  job_descriptions: 'Job Descriptions',
  consent_forms: 'Consent Forms',
  financial: 'Financial',
  clinical: 'Clinical',
  other: 'Other',
};

const CATEGORY_ORDER: DocCategory[] = ['policies', 'intake_forms', 'new_hire_forms', 'job_descriptions', 'consent_forms', 'financial', 'clinical', 'other'];

const STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  out_for_signature: 'Out for Signature',
  signed: 'Signed',
  archived: 'Archived',
};

const STATUS_STYLE: Record<DocStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ready: 'bg-blue-50 text-blue-700',
  out_for_signature: 'bg-amber-50 text-amber-700',
  signed: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-50 text-gray-400',
};

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function DocumentDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';

  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Local edit state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocCategory>('policies');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<DocStatus>('draft');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCS_STORAGE_KEY);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as DocumentRow[];
      const found = Array.isArray(parsed) ? parsed.find(d => d.id === id) ?? null : null;
      setDoc(found);
      if (found) {
        setTitle(found.title);
        setCategory(found.category);
        setBody(found.body ?? '');
        setStatus(found.status);
      }
    } catch {}
    setLoaded(true);
  }, [id]);

  const dirty = doc != null && (
    title !== doc.title ||
    category !== doc.category ||
    body !== (doc.body ?? '') ||
    status !== doc.status
  );

  const save = () => {
    if (!doc) return;
    try {
      const raw = localStorage.getItem(DOCS_STORAGE_KEY);
      const list: DocumentRow[] = raw ? (JSON.parse(raw) as DocumentRow[]) : [];
      const sizeKb = Math.max(1, Math.round(new Blob([body]).size / 1024));
      const updated: DocumentRow = {
        ...doc,
        title: title.trim() || doc.title,
        category,
        body,
        status,
        size_kb: sizeKb,
        updated_at: new Date().toISOString().slice(0, 10),
        updated_by: 'You',
      };
      const next = list.map(d => d.id === doc.id ? updated : d);
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(next));
      setDoc(updated);
      setSavedToast('Saved');
      setTimeout(() => setSavedToast(null), 1800);
    } catch {}
  };

  if (!loaded) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10 text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10">
        <Link href="/app/document-manager" className="text-xs text-primary hover:underline" style={{ fontFamily: 'var(--font-body)' }}>
          ← Back to Document Manager
        </Link>
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Document not found</p>
          <p className="text-xs text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            This document may have been deleted, or it lives in a different browser&rsquo;s storage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link
            href={`/app/document-manager${doc.category === 'policies' ? '' : `?tab=${doc.category}`}`}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            ← Back to {CATEGORY_LABEL[doc.category]}
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-2 truncate">{doc.title}</h1>
          <p className="text-xs text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            {doc.version} · {doc.size_kb} KB · Updated {fmtDate(doc.updated_at)} by {doc.updated_by}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedToast && (
            <span className="text-xs font-medium text-emerald-600" style={{ fontFamily: 'var(--font-body)' }}>
              {savedToast}
            </span>
          )}
          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="px-4 py-2 rounded-lg bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-10 pb-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px_180px] gap-3 mb-4">
            <label className="block">
              <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Title</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary"
                style={{ fontFamily: 'var(--font-body)' }}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Category</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DocCategory)}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {CATEGORY_ORDER.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Status</span>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as DocStatus)}
                className="mt-1 w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary cursor-pointer"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {(Object.keys(STATUS_LABEL) as DocStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Document body</span>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Paste or type the full text of the document here…"
              className="mt-1 w-full min-h-[480px] px-4 py-3 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary resize-y leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <span className="text-[10px] text-foreground/40 mt-1 block" style={{ fontFamily: 'var(--font-body)' }}>
              {body.length.toLocaleString()} characters
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
