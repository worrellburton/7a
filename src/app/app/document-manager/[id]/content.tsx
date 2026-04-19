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

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const KAIZEN_SUGGESTIONS: Record<DocCategory, string[]> = {
  policies: [
    'Add an effective date and revision history section at the top.',
    'Cite the regulation or standard each clause is intended to satisfy.',
    'Replace vague verbs ("should", "may") with explicit ownership and timing.',
  ],
  intake_forms: [
    'Group questions by topic and mark which fields are required vs. optional.',
    'Include plain-language explanations for any clinical or legal terms.',
    'Add a signature + date block at the end with space for a witness.',
  ],
  new_hire_forms: [
    'List the documents each new hire must return on day one.',
    'Add a tax-withholding reminder linking to the latest IRS W-4.',
    'Include an acknowledgment of the employee handbook version number.',
  ],
  job_descriptions: [
    'Open with a one-sentence purpose statement for the role.',
    'Separate required vs. preferred qualifications.',
    'Add physical / environmental demands for ADA compliance.',
  ],
  consent_forms: [
    'Spell out the specific uses and disclosures being authorized.',
    'Include an expiration date and the client\u2019s right to revoke.',
    'Add a signature line for a legal guardian where applicable.',
  ],
  financial: [
    'Break down fees, billing cadence, and accepted payment methods.',
    'Describe refund and cancellation terms explicitly.',
    'Include the late-payment policy with specific dollar amounts or percentages.',
  ],
  clinical: [
    'Document the clinical rationale and reference the supporting guideline.',
    'Separate assessment, plan, and follow-up sections clearly.',
    'Note any contraindications or monitoring requirements.',
  ],
  other: [
    'Start with a one-sentence summary of what this document is for.',
    'Define any acronyms or program-specific terms on first use.',
    'Close with ownership: who maintains this and how often it\u2019s reviewed.',
  ],
};

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
  const [sendOpen, setSendOpen] = useState(false);
  const [kaizenOpen, setKaizenOpen] = useState(false);

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

  const persistDoc = (updater: (d: DocumentRow) => DocumentRow) => {
    if (!doc) return;
    try {
      const raw = localStorage.getItem(DOCS_STORAGE_KEY);
      const list: DocumentRow[] = raw ? (JSON.parse(raw) as DocumentRow[]) : [];
      const updated = updater(doc);
      const next = list.map(d => d.id === doc.id ? updated : d);
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(next));
      setDoc(updated);
    } catch {}
  };

  const sendForSignature = (recipient: string, email: string) => {
    persistDoc(d => ({
      ...d,
      status: 'out_for_signature',
      signatures: [
        ...d.signatures,
        { recipient, email, sent_at: new Date().toISOString(), signed_at: null, resent_count: 0, last_resent_at: null },
      ],
    }));
    setStatus('out_for_signature');
    setSendOpen(false);
  };

  const resendSignature = (sigIndex: number) => {
    const now = new Date().toISOString();
    persistDoc(d => ({
      ...d,
      signatures: d.signatures.map((s, i) => i !== sigIndex ? s : {
        ...s,
        last_resent_at: now,
        resent_count: (s.resent_count ?? 0) + 1,
      }),
    }));
  };

  const generatePdf = () => {
    const label = CATEGORY_LABEL[category];
    const win = window.open('', '_blank');
    if (!win) return;
    const bodyText = (body || 'This document has no body content yet.').replace(/</g, '&lt;');
    const titleText = (title || 'Untitled').replace(/</g, '&lt;');
    win.document.write(`<!doctype html><html><head><title>${titleText}</title><style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:720px;margin:48px auto;padding:0 24px;color:#1a1a1a;line-height:1.55}
      h1{font-size:22px;margin:0 0 4px}
      .meta{color:#6b7280;font-size:12px;margin-bottom:24px}
      .cat{display:inline-block;background:#f3f4f6;color:#374151;border-radius:999px;padding:2px 10px;font-size:11px;margin-right:8px}
      .body{white-space:pre-wrap;font-size:14px}
      @media print{body{margin:24px}}
    </style></head><body>
      <h1>${titleText}</h1>
      <div class="meta"><span class="cat">${label}</span>Seven Arrows Recovery</div>
      <div class="body">${bodyText}</div>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script>
    </body></html>`);
    win.document.close();
  };

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
            onClick={() => setKaizenOpen(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            Kaizen
          </button>
          <button
            type="button"
            onClick={generatePdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-foreground/70 text-xs font-semibold hover:border-primary/30 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Generate PDF
          </button>
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

        {kaizenOpen && (
          <div className="bg-white rounded-2xl border border-primary/20 shadow-sm p-5 max-w-4xl mt-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Kaizen Suggestions</p>
                <p className="text-[11px] text-foreground/60 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>Small improvements for this document.</p>
              </div>
              <button
                type="button"
                onClick={() => setKaizenOpen(false)}
                className="text-foreground/40 hover:text-foreground/70 text-xs"
              >
                Close
              </button>
            </div>
            <ul className="space-y-1.5">
              {KAIZEN_SUGGESTIONS[category].map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80" style={{ fontFamily: 'var(--font-body)' }}>
                  <span className="mt-0.5 text-primary">&bull;</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-4xl mt-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              Signatures
            </p>
            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-white hover:bg-foreground/80 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Send for Signature
            </button>
          </div>
          {doc.signatures.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center">
              <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                No signature requests yet. Send this document to a recipient to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-warm-bg/40">
                  <tr>
                    <th className="text-left font-medium text-[10px] uppercase tracking-wider text-foreground/40 px-3 py-2" style={{ fontFamily: 'var(--font-body)' }}>Recipient</th>
                    <th className="text-left font-medium text-[10px] uppercase tracking-wider text-foreground/40 px-3 py-2" style={{ fontFamily: 'var(--font-body)' }}>Sent</th>
                    <th className="text-left font-medium text-[10px] uppercase tracking-wider text-foreground/40 px-3 py-2" style={{ fontFamily: 'var(--font-body)' }}>Status</th>
                    <th className="text-right font-medium text-[10px] uppercase tracking-wider text-foreground/40 px-3 py-2" style={{ fontFamily: 'var(--font-body)' }}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {doc.signatures.map((s, i) => {
                    const resentCount = s.resent_count ?? 0;
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2.5 align-top">
                          <p className="font-semibold text-foreground">{s.recipient}</p>
                          <p className="text-[10px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{s.email}</p>
                        </td>
                        <td className="px-3 py-2.5 align-top text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
                          <p>{fmtDateTime(s.sent_at)}</p>
                          {s.last_resent_at && (
                            <p className="text-[10px] text-foreground/40 mt-0.5">Resent {fmtDateTime(s.last_resent_at)}{resentCount > 1 ? ` · ${resentCount}×` : ''}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          {s.signed_at ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                              Signed {fmtDateTime(s.signed_at)}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">
                              Waiting for signature
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top text-right">
                          {!s.signed_at && (
                            <button
                              onClick={() => resendSignature(i)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-white border border-gray-200 text-foreground/70 hover:border-primary/30 hover:text-primary transition-colors"
                              style={{ fontFamily: 'var(--font-body)' }}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                              </svg>
                              {resentCount > 0 ? 'Resend again' : 'Resend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {sendOpen && (
        <SendModal
          docTitle={doc.title}
          onClose={() => setSendOpen(false)}
          onSend={sendForSignature}
        />
      )}
    </div>
  );
}

function SendModal({
  docTitle,
  onClose,
  onSend,
}: {
  docTitle: string;
  onClose: () => void;
  onSend: (recipient: string, email: string) => void;
}) {
  const [recipient, setRecipient] = useState('');
  const [email, setEmail] = useState('');
  const submit = () => {
    if (!recipient.trim() || !email.trim()) return;
    onSend(recipient.trim(), email.trim());
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Send for Signature</p>
        <h3 className="text-lg font-bold text-foreground mt-0.5">{docTitle}</h3>
        <div className="space-y-3 mt-4">
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Recipient</span>
            <input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="Full name"
              autoFocus
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-foreground/70 hover:border-primary/30 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!recipient.trim() || !email.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
