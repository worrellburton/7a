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

export default function DocumentManagerContent() {
  const [docs, setDocs] = useState<ManagedDoc[]>(sampleDocs);
  const [activeCategory, setActiveCategory] = useState<DocCategory>('policies');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Record<DocCategory, number> = {
      policies: 0, intake_forms: 0, new_hire_forms: 0, job_descriptions: 0, consent_forms: 0, financial: 0,
    };
    for (const d of docs) map[d.category]++;
    return map;
  }, [docs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter(d =>
      d.category === activeCategory
      && (statusFilter === 'all' || d.status === statusFilter)
      && (q === '' || d.title.toLowerCase().includes(q))
    );
  }, [docs, activeCategory, statusFilter, search]);

  const selected = docs.find(d => d.id === selectedId) || null;

  const updateStatus = (id: string, status: DocStatus) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const sendForSignature = (id: string) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'out_for_signature' } : d));
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

      {/* Search + status filter */}
      <div className="px-4 sm:px-6 lg:px-10 pb-4 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[220px] relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-foreground focus:outline-none focus:border-primary/40"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
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
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(isActive ? null : d.id)}
                    className={`w-full text-left px-5 py-4 transition-colors ${isActive ? 'bg-warm-bg/60' : 'hover:bg-warm-bg/30'}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
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
                  </button>
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
