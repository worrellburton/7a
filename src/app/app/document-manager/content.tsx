'use client';

import { useMemo, useState } from 'react';

type DocCategory = 'policies' | 'intake_forms' | 'new_hire_forms' | 'job_descriptions' | 'consent_forms' | 'financial';
type DocStatus = 'draft' | 'ready' | 'out_for_signature' | 'signed' | 'archived';

interface SignatureRequest {
  id: string;
  signer_name: string;
  signer_email: string;
  sent_at: string;
  signed_at: string | null;
}

interface ManagedDoc {
  id: string;
  title: string;
  category: DocCategory;
  version: number;
  size_kb: number;
  updated_at: string;
  updated_by: string;
  status: DocStatus;
  signature_requests: SignatureRequest[];
}

const CATEGORIES: { key: DocCategory; label: string }[] = [
  { key: 'policies', label: 'Policies' },
  { key: 'intake_forms', label: 'Intake Forms' },
  { key: 'new_hire_forms', label: 'New Hire Forms' },
  { key: 'job_descriptions', label: 'Job Descriptions' },
  { key: 'consent_forms', label: 'Consent Forms' },
  { key: 'financial', label: 'Financial' },
];

const statusStyle: Record<DocStatus, string> = {
  draft: 'bg-gray-50 text-gray-600',
  ready: 'bg-blue-50 text-blue-700',
  out_for_signature: 'bg-amber-50 text-amber-700',
  signed: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const statusLabel: Record<DocStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  out_for_signature: 'Out for Signature',
  signed: 'Signed',
  archived: 'Archived',
};

function sampleDocs(): ManagedDoc[] {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
  return [
    {
      id: 'd1',
      title: 'Admission Agreement',
      category: 'policies',
      version: 4,
      size_kb: 184,
      updated_at: daysAgo(7),
      updated_by: 'Bobby Burton',
      status: 'ready',
      signature_requests: [
        { id: 's1', signer_name: 'M. Garcia', signer_email: 'mgarcia@example.com', sent_at: daysAgo(2), signed_at: daysAgo(2) },
      ],
    },
    {
      id: 'd2',
      title: 'HIPAA Privacy Notice',
      category: 'consent_forms',
      version: 2,
      size_kb: 96,
      updated_at: daysAgo(14),
      updated_by: 'Pamela Calvo',
      status: 'ready',
      signature_requests: [],
    },
    {
      id: 'd3',
      title: 'Consent for Treatment',
      category: 'consent_forms',
      version: 3,
      size_kb: 128,
      updated_at: daysAgo(21),
      updated_by: 'Pamela Calvo',
      status: 'signed',
      signature_requests: [
        { id: 's2', signer_name: 'D. Williams', signer_email: 'dwilliams@example.com', sent_at: daysAgo(5), signed_at: daysAgo(5) },
      ],
    },
    {
      id: 'd4',
      title: 'Financial Responsibility Agreement',
      category: 'financial',
      version: 5,
      size_kb: 212,
      updated_at: daysAgo(3),
      updated_by: 'Bobby Burton',
      status: 'out_for_signature',
      signature_requests: [
        { id: 's3', signer_name: 'S. Patel', signer_email: 'spatel@example.com', sent_at: daysAgo(1), signed_at: null },
      ],
    },
    {
      id: 'd5',
      title: 'Medical History Questionnaire',
      category: 'intake_forms',
      version: 2,
      size_kb: 156,
      updated_at: daysAgo(30),
      updated_by: 'Pamela Calvo',
      status: 'draft',
      signature_requests: [],
    },
    {
      id: 'd6',
      title: 'Emergency Contacts Form',
      category: 'intake_forms',
      version: 1,
      size_kb: 72,
      updated_at: daysAgo(45),
      updated_by: 'Bobby Burton',
      status: 'ready',
      signature_requests: [],
    },
    {
      id: 'd7',
      title: 'Employee Handbook Acknowledgment',
      category: 'new_hire_forms',
      version: 3,
      size_kb: 104,
      updated_at: daysAgo(60),
      updated_by: 'Bobby Burton',
      status: 'ready',
      signature_requests: [],
    },
    {
      id: 'd8',
      title: 'W-4 Tax Withholding',
      category: 'new_hire_forms',
      version: 1,
      size_kb: 88,
      updated_at: daysAgo(90),
      updated_by: 'Pamela Calvo',
      status: 'ready',
      signature_requests: [],
    },
    {
      id: 'd9',
      title: 'Clinician Job Description',
      category: 'job_descriptions',
      version: 2,
      size_kb: 64,
      updated_at: daysAgo(45),
      updated_by: 'Bobby Burton',
      status: 'ready',
      signature_requests: [],
    },
    {
      id: 'd10',
      title: 'Grievance Policy',
      category: 'policies',
      version: 1,
      size_kb: 48,
      updated_at: daysAgo(120),
      updated_by: 'Pamela Calvo',
      status: 'archived',
      signature_requests: [],
    },
  ];
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSentAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
};

export default function DocumentManagerContent() {
  const [docs, setDocs] = useState<ManagedDoc[]>(sampleDocs);
  const [activeCategory, setActiveCategory] = useState<DocCategory>('policies');
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kaizenOpenFor, setKaizenOpenFor] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Record<DocCategory, number> = {
      policies: 0, intake_forms: 0, new_hire_forms: 0, job_descriptions: 0, consent_forms: 0, financial: 0,
    };
    for (const d of docs) map[d.category]++;
    return map;
  }, [docs]);

  const filtered = useMemo(() => {
    return docs.filter(d =>
      d.category === activeCategory
      && (statusFilter === 'all' || d.status === statusFilter)
    );
  }, [docs, activeCategory, statusFilter]);

  const selected = docs.find(d => d.id === selectedId) || null;

  const updateStatus = (id: string, status: DocStatus) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const sendForSignature = (id: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'out_for_signature' } : d));
  };

  const generatePdf = (doc: ManagedDoc) => {
    const label = CATEGORIES.find(c => c.key === doc.category)?.label || doc.category;
    const win = window.open('', '_blank');
    if (!win) return;
    const meta = `v${doc.version} \u00B7 ${doc.size_kb} KB \u00B7 Updated ${formatRelative(doc.updated_at)} by ${doc.updated_by}`;
    win.document.write(`<!doctype html><html><head><title>${doc.title}</title><style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:720px;margin:48px auto;padding:0 24px;color:#1a1a1a;line-height:1.55}
      h1{font-size:22px;margin:0 0 4px}
      .meta{color:#6b7280;font-size:12px;margin-bottom:24px}
      .cat{display:inline-block;background:#f3f4f6;color:#374151;border-radius:999px;padding:2px 10px;font-size:11px;margin-right:8px}
      .body{white-space:pre-wrap;font-size:14px}
      @media print{body{margin:24px}}
    </style></head><body>
      <h1>${doc.title}</h1>
      <div class="meta"><span class="cat">${label}</span>${meta}</div>
      <div class="body">${(doc.title + '\n\nThis document has not been edited yet. Use the Edit action to add body content before generating the final PDF.').replace(/</g, '&lt;')}</div>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Document Manager</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Library of agreements, policies, and forms. Send for signature, edit, or archive.
        </p>
      </div>

      {/* Category tabs */}
      <div className="px-4 sm:px-6 lg:px-10 pb-4 flex items-center gap-2 flex-wrap">
        {CATEGORIES.map(c => {
          const isActive = c.key === activeCategory;
          return (
            <button
              key={c.key}
              onClick={() => { setActiveCategory(c.key); setSelectedId(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? 'bg-foreground text-white' : 'bg-white border border-gray-100 text-foreground/70 hover:border-primary/30'}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span>{c.label}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-foreground/50'}`}>
                {counts[c.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="px-4 sm:px-6 lg:px-10 pb-4 flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as DocStatus | 'all')}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-foreground/70 focus:outline-none focus:border-primary/40 cursor-pointer"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <option value="all">All Statuses</option>
          {(Object.keys(statusLabel) as DocStatus[]).map(s => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      </div>

      {/* List + detail */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 lg:px-10 pb-10 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4 lg:gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
              No documents match this filter.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(d => {
                const isActive = d.id === selectedId;
                return (
                  <div
                    key={d.id}
                    className={`group relative px-5 py-4 transition-colors ${isActive ? 'bg-warm-bg/60' : 'hover:bg-warm-bg/30'}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap pr-24">
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{d.title}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[d.status]}`}>
                            {statusLabel[d.status]}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
                          v{d.version} · {d.size_kb} KB · Updated {formatRelative(d.updated_at)} by {d.updated_by}
                        </p>
                      </div>
                      {d.signature_requests.length > 0 && (
                        <div className="text-[11px] text-foreground/50 shrink-0" style={{ fontFamily: 'var(--font-body)' }}>
                          {d.signature_requests.filter(r => r.signed_at).length}/{d.signature_requests.length} signed
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(isActive ? null : d.id)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-semibold shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {isActive ? 'Close' : 'Open'}
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto">
          {!selected ? (
            <div className="p-10 text-center text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
              Select a document to view details.
            </div>
          ) : (
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                <h2 className="text-lg font-bold text-foreground">{selected.title}</h2>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle[selected.status]}`}>
                  {statusLabel[selected.status]}
                </span>
              </div>
              <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                v{selected.version} · {selected.size_kb} KB · Updated {formatRelative(selected.updated_at)} by {selected.updated_by}
              </p>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => sendForSignature(selected.id)}
                  className="px-3.5 py-2 rounded-lg bg-foreground text-white text-xs font-semibold hover:bg-foreground/90 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Send for Signature
                </button>
                <button
                  type="button"
                  onClick={() => setKaizenOpenFor(kaizenOpenFor === selected.id ? null : selected.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                  Kaizen
                </button>
                <button
                  type="button"
                  onClick={() => generatePdf(selected)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-foreground/70 text-xs font-semibold hover:border-primary/30 transition-colors"
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
                  className="px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-foreground/70 text-xs font-semibold hover:border-primary/30 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Edit
                </button>
                <select
                  value={selected.status}
                  onChange={e => updateStatus(selected.id, e.target.value as DocStatus)}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-foreground/70 focus:outline-none focus:border-primary/40 cursor-pointer"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {(Object.keys(statusLabel) as DocStatus[]).map(s => (
                    <option key={s} value={s}>Set: {statusLabel[s]}</option>
                  ))}
                </select>
              </div>

              {kaizenOpenFor === selected.id && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Kaizen Suggestions</p>
                      <p className="text-[11px] text-foreground/60 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>Small improvements for this document.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKaizenOpenFor(null)}
                      className="text-foreground/40 hover:text-foreground/70 text-xs"
                    >
                      Close
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {KAIZEN_SUGGESTIONS[selected.category].map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/80" style={{ fontFamily: 'var(--font-body)' }}>
                        <span className="mt-0.5 text-primary">&bull;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6">
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                  Signature Requests
                </p>
                {selected.signature_requests.length === 0 ? (
                  <p className="text-xs text-foreground/40 italic" style={{ fontFamily: 'var(--font-body)' }}>
                    No signature requests yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selected.signature_requests.map(r => (
                      <div key={r.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{r.signer_name}</p>
                            <p className="text-[11px] text-foreground/50 truncate" style={{ fontFamily: 'var(--font-body)' }}>{r.signer_email}</p>
                          </div>
                          <div className="text-right text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
                            <p className="text-foreground/50">Sent {formatSentAt(r.sent_at)}</p>
                            {r.signed_at ? (
                              <p className="text-emerald-600 font-medium">Signed {formatSentAt(r.signed_at)}</p>
                            ) : (
                              <p className="text-amber-600 font-medium">Pending</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
