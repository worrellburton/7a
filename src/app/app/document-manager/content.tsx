'use client';

import { useMemo, useState } from 'react';

// Document Manager — central library of reusable documents (agreements,
// policies, releases, etc.). Each document tracks its latest version,
// who it was sent to for signature, and an overall status. From here the
// user can send a document out for signature, open the editor, or
// download/archive.

type DocStatus = 'draft' | 'ready' | 'out_for_signature' | 'signed' | 'archived';
type DocCategory = 'policies' | 'intake_forms' | 'new_hire_forms' | 'job_descriptions' | 'consent_forms' | 'financial' | 'clinical' | 'other';

interface SignatureRequest {
  recipient: string;
  email: string;
  sent_at: string;
  signed_at: string | null;
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

const CATEGORY_STYLE: Record<DocCategory, string> = {
  policies: 'bg-orange-50 text-orange-600',
  intake_forms: 'bg-sky-50 text-sky-600',
  new_hire_forms: 'bg-rose-50 text-rose-600',
  job_descriptions: 'bg-violet-50 text-violet-600',
  consent_forms: 'bg-blue-50 text-blue-600',
  financial: 'bg-emerald-50 text-emerald-600',
  clinical: 'bg-purple-50 text-purple-600',
  other: 'bg-gray-50 text-gray-500',
};

const SEED_DOCS: DocumentRow[] = [
  { id: 'd1', title: 'Admission Agreement', category: 'policies', version: 'v4', updated_at: '2026-04-12', updated_by: 'Bobby Burton', size_kb: 184, status: 'ready', signatures: [
    { recipient: 'M. Garcia', email: 'mgarcia@example.com', sent_at: '2026-04-17T14:02:00Z', signed_at: '2026-04-17T14:45:00Z' },
  ] },
  { id: 'd2', title: 'Consent for Treatment', category: 'consent_forms', version: 'v2', updated_at: '2026-03-30', updated_by: 'Dr. Patel', size_kb: 96, status: 'signed', signatures: [
    { recipient: 'R. Chen', email: 'rchen@example.com', sent_at: '2026-04-15T09:10:00Z', signed_at: '2026-04-15T09:22:00Z' },
    { recipient: 'D. Williams', email: 'dwilliams@example.com', sent_at: '2026-04-16T17:01:00Z', signed_at: '2026-04-16T19:33:00Z' },
  ] },
  { id: 'd3', title: 'HIPAA Privacy Notice', category: 'consent_forms', version: 'v1', updated_at: '2025-11-12', updated_by: 'Bobby Burton', size_kb: 72, status: 'ready', signatures: [] },
  { id: 'd4', title: 'Release of Information', category: 'consent_forms', version: 'v3', updated_at: '2026-02-04', updated_by: 'Compliance', size_kb: 58, status: 'out_for_signature', signatures: [
    { recipient: 'S. Patel', email: 'spatel@example.com', sent_at: '2026-04-18T08:20:00Z', signed_at: null },
  ] },
  { id: 'd5', title: 'Financial Responsibility Agreement', category: 'financial', version: 'v5', updated_at: '2026-04-01', updated_by: 'Billing', size_kb: 142, status: 'ready', signatures: [] },
  { id: 'd6', title: 'Grievance Policy Acknowledgment', category: 'policies', version: 'v2', updated_at: '2026-01-18', updated_by: 'Compliance', size_kb: 44, status: 'ready', signatures: [] },
  { id: 'd7', title: 'Photo / Media Consent', category: 'consent_forms', version: 'v1', updated_at: '2025-09-22', updated_by: 'Marketing', size_kb: 38, status: 'draft', signatures: [] },
  { id: 'd8', title: 'Employee Confidentiality Agreement', category: 'new_hire_forms', version: 'v2', updated_at: '2025-12-08', updated_by: 'HR', size_kb: 88, status: 'archived', signatures: [] },
  { id: 'd9', title: 'Medical History Questionnaire', category: 'intake_forms', version: 'v1', updated_at: '2026-02-11', updated_by: 'Clinical', size_kb: 120, status: 'ready', signatures: [] },
  { id: 'd10', title: 'Clinician Job Description', category: 'job_descriptions', version: 'v3', updated_at: '2026-03-05', updated_by: 'HR', size_kb: 64, status: 'ready', signatures: [] },
];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function DocumentManagerContent() {
  const [docs, setDocs] = useState<DocumentRow[]>(SEED_DOCS);
  const [selectedId, setSelectedId] = useState<string | null>(SEED_DOCS[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<DocCategory>('policies');
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all');
  const [sendOpen, setSendOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(d => {
      if (d.category !== activeCategory) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (q && !d.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [docs, search, activeCategory, statusFilter]);


  const selected = docs.find(d => d.id === selectedId) ?? null;

  const setDocStatus = (id: string, status: DocStatus) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const addDocument = (title: string, category: DocCategory, body: string) => {
    const id = `d${Date.now()}`;
    const sizeKb = Math.max(1, Math.round(new Blob([body]).size / 1024));
    const fresh: DocumentRow = {
      id,
      title,
      category,
      version: 'v1',
      updated_at: new Date().toISOString().slice(0, 10),
      updated_by: 'You',
      size_kb: sizeKb,
      status: 'draft',
      body,
      signatures: [],
    };
    setDocs(prev => [fresh, ...prev]);
    setActiveCategory(category);
    setSelectedId(id);
    setAddOpen(false);
  };

  const sendForSignature = (id: string, recipient: string, email: string) => {
    const req: SignatureRequest = {
      recipient,
      email,
      sent_at: new Date().toISOString(),
      signed_at: null,
    };
    setDocs(prev => prev.map(d => d.id !== id ? d : {
      ...d,
      status: 'out_for_signature',
      signatures: [...d.signatures, req],
    }));
  };

  const saveEdit = (id: string, title: string, category: DocCategory) => {
    const bumpVersion = (v: string) => {
      const match = v.match(/^v(\d+)$/);
      return match ? `v${Number(match[1]) + 1}` : v;
    };
    setDocs(prev => prev.map(d => d.id !== id ? d : {
      ...d,
      title,
      category,
      version: bumpVersion(d.version),
      updated_at: new Date().toISOString().slice(0, 10),
      updated_by: 'You',
    }));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Manager</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Library of agreements, policies, and forms. Send for signature, edit, or archive.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-white text-sm font-semibold hover:bg-foreground/90 transition-colors shrink-0"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Document
        </button>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pb-4">
        <div className="inline-flex items-center gap-1 bg-warm-bg/80 rounded-full p-1 max-w-full overflow-x-auto">
          {CATEGORY_ORDER.map(c => {
            const isActive = c === activeCategory;
            return (
              <button
                key={c}
                type="button"
                onClick={() => { setActiveCategory(c); setSelectedId(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-white text-foreground shadow-sm' : 'text-foreground/50 hover:text-foreground/80'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 lg:px-10 pb-10 grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 lg:gap-6">
        {/* Document list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="px-3 py-2 rounded-lg text-sm border border-gray-100 bg-white focus:outline-none focus:border-primary flex-1 min-w-[160px]"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as DocStatus | 'all')}
              className="px-2.5 py-2 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="all">All Statuses</option>
              {(Object.keys(STATUS_LABEL) as DocStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          <div className="overflow-auto flex-1">
            <table className="min-w-full text-sm">
              <thead className="bg-warm-bg/40 sticky top-0 z-10">
                <tr>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-foreground/40 px-4 py-2.5" style={{ fontFamily: 'var(--font-body)' }}>Title</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-foreground/40 px-4 py-2.5" style={{ fontFamily: 'var(--font-body)' }}>Version</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-foreground/40 px-4 py-2.5" style={{ fontFamily: 'var(--font-body)' }}>Updated</th>
                  <th className="text-left font-medium text-[11px] uppercase tracking-wider text-foreground/40 px-4 py-2.5" style={{ fontFamily: 'var(--font-body)' }}>Status</th>
                  <th className="text-right font-medium text-[11px] uppercase tracking-wider text-foreground/40 px-4 py-2.5" style={{ fontFamily: 'var(--font-body)' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocs.map(d => {
                  const isActive = d.id === selectedId;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={`cursor-pointer transition-colors ${isActive ? 'bg-warm-bg/60' : 'hover:bg-warm-bg/30'}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">{d.title}</p>
                        <p className="text-[11px] text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{d.size_kb} KB · by {d.updated_by}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground/70 text-xs font-medium" style={{ fontFamily: 'var(--font-body)' }}>{d.version}</td>
                      <td className="px-4 py-3 text-foreground/70 text-xs" style={{ fontFamily: 'var(--font-body)' }}>{fmtDate(d.updated_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[d.status]}`}>
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setSelectedId(d.id); setSendOpen(true); }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            Send
                          </button>
                          <button
                            onClick={() => { setSelectedId(d.id); setEditOpen(true); }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-gray-200 text-foreground/70 hover:border-primary/30 transition-colors"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                      No documents match those filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto">
          {!selected ? (
            <div className="p-10 text-center text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
              Select a document to view details.
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selected.title}</h2>
                    <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                      {selected.version} · {selected.size_kb} KB · Updated {fmtDate(selected.updated_at)} by {selected.updated_by}
                    </p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_STYLE[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <button
                    onClick={() => setSendOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Send for Signature
                  </button>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-foreground/70 hover:border-primary/30 transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Edit
                  </button>
                  <select
                    value={selected.status}
                    onChange={e => setDocStatus(selected.id, e.target.value as DocStatus)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {(Object.keys(STATUS_LABEL) as DocStatus[]).map(s => (
                      <option key={s} value={s}>Set: {STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  Signature Requests
                </p>
                {selected.signatures.length === 0 ? (
                  <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No signature requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.signatures.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-warm-bg/40">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{s.recipient}</p>
                          <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{s.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Sent {fmtDateTime(s.sent_at)}</p>
                          <p className={`text-[11px] font-medium mt-0.5 ${s.signed_at ? 'text-emerald-600' : 'text-amber-600'}`} style={{ fontFamily: 'var(--font-body)' }}>
                            {s.signed_at ? `Signed ${fmtDateTime(s.signed_at)}` : 'Awaiting signature'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {sendOpen && selected && (
        <SendSignatureModal
          doc={selected}
          onClose={() => setSendOpen(false)}
          onSend={(recipient, email) => {
            sendForSignature(selected.id, recipient, email);
            setSendOpen(false);
          }}
        />
      )}

      {editOpen && selected && (
        <EditDocumentModal
          doc={selected}
          onClose={() => setEditOpen(false)}
          onSave={(title, category) => {
            saveEdit(selected.id, title, category);
            setEditOpen(false);
          }}
        />
      )}

      {addOpen && (
        <AddDocumentModal
          defaultCategory={activeCategory}
          onClose={() => setAddOpen(false)}
          onSave={addDocument}
        />
      )}
    </div>
  );
}

function SendSignatureModal({
  doc,
  onClose,
  onSend,
}: {
  doc: DocumentRow;
  onClose: () => void;
  onSend: (recipient: string, email: string) => void;
}) {
  const [recipient, setRecipient] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!recipient.trim()) return setError('Recipient name is required.');
    if (!email.trim() || !email.includes('@')) return setError('Valid recipient email is required.');
    onSend(recipient.trim(), email.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Send for Signature</p>
          <h3 className="text-lg font-bold text-foreground mt-0.5">{doc.title}</h3>
          <p className="text-[11px] text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{doc.version} · {doc.size_kb} KB</p>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Recipient Name</span>
            <input
              value={recipient}
              onChange={e => { setRecipient(e.target.value); setError(null); }}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
              placeholder="Jane Doe"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary"
              style={{ fontFamily: 'var(--font-body)' }}
              placeholder="jane@example.com"
            />
          </label>
          {error && <p className="text-xs text-red-500" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>}
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDocumentModal({
  doc,
  onClose,
  onSave,
}: {
  doc: DocumentRow;
  onClose: () => void;
  onSave: (title: string, category: DocCategory) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState<DocCategory>(doc.category);

  const submit = () => {
    if (!title.trim()) return;
    onSave(title.trim(), category);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Edit Document</p>
          <h3 className="text-lg font-bold text-foreground mt-0.5">{doc.title}</h3>
          <p className="text-[11px] text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>Saving bumps the version from {doc.version}.</p>
        </div>
        <div className="space-y-3">
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AddDocumentModal({
  defaultCategory,
  onClose,
  onSave,
}: {
  defaultCategory: DocCategory;
  onClose: () => void;
  onSave: (title: string, category: DocCategory, body: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocCategory>(defaultCategory);
  const [body, setBody] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onSave(title.trim(), category, body);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>New Document</p>
          <h3 className="text-lg font-bold text-foreground mt-0.5">Add Document</h3>
          <p className="text-[11px] text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>Paste the document body below. Saves as a Draft so you can review before sending.</p>
        </div>
        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
            <label className="block">
              <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Title</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Confidentiality Agreement"
                autoFocus
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
          </div>
          <label className="flex flex-col flex-1 min-h-0">
            <span className="text-[11px] font-medium text-foreground/60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Document body</span>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Paste the full text of the document here…"
              className="mt-1 w-full flex-1 min-h-[240px] px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white focus:outline-none focus:border-primary resize-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <span className="text-[10px] text-foreground/40 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{body.length.toLocaleString()} characters</span>
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
            disabled={!title.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}
