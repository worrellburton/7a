'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import { useModal } from '@/lib/ModalProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface DiagCode { code: string; description: string }

interface Client {
  id: string;
  name: string;
  pronouns: string | null;
  date_of_birth: string | null;
  age: number | null;
  primary_substance: string | null;
  admission_date: string | null;
  expected_admission_date: string | null;
  expected_discharge_date: string | null;
  date_of_discharge: string | null;
  status: string;
  admission_type: string | null;
  asam_level: string | null;
  mrn: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  primary_clinician: string | null;
  case_manager: string | null;
  avatar_url: string | null;
  notes: string | null;
  insurance_payer: string | null;
  insurance_plan: string | null;
  insurance_member_id: string | null;
  insurance_group_number: string | null;
  subscriber_name: string | null;
  subscriber_relationship: string | null;
  subscriber_dob: string | null;
  policy_effective_date: string | null;
  policy_term_date: string | null;
  authorization_number: string | null;
  authorization_start_date: string | null;
  authorization_end_date: string | null;
  authorized_units: number | null;
  used_units: number | null;
  primary_diagnosis_code: string | null;
  primary_diagnosis_description: string | null;
  secondary_diagnoses: DiagCode[];
  level_of_care_code: string | null;
}

interface ClientDocument {
  id: string;
  client_id: string;
  doc_type: string;
  title: string;
  url: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  signed: boolean;
  signed_at: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

interface FinanceEntry {
  id: string;
  client_id: string;
  entry_type: string;
  entry_date: string;
  amount_cents: number;
  description: string | null;
  created_by_name: string | null;
  created_at: string;
}

type Tab = 'overview' | 'insurance' | 'documents' | 'finance' | 'notes';

const STATUS_COLORS: Record<string, string> = {
  admitted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  discharged: 'bg-slate-50 text-slate-700 border-slate-200',
  on_leave: 'bg-blue-50 text-blue-700 border-blue-200',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} text-foreground`}>{value ?? <span className="text-foreground/30">—</span>}</p>
    </div>
  );
}

export default function ClientChartContent({ id }: { id: string }) {
  const { user, session, isAdmin } = useAuth();
  const { confirm } = useModal();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [finance, setFinance] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const [c, docs, fin] = await Promise.all([
        db({ action: 'select', table: 'fake_clients', match: { id } }),
        db({ action: 'select', table: 'client_documents', match: { client_id: id }, order: { column: 'created_at', ascending: false } }),
        db({ action: 'select', table: 'client_finance_entries', match: { client_id: id }, order: { column: 'entry_date', ascending: false } }),
      ]);
      if (Array.isArray(c) && c[0]) {
        const row = c[0] as Client;
        if (!Array.isArray(row.secondary_diagnoses)) row.secondary_diagnoses = [];
        setClient(row);
      }
      if (Array.isArray(docs)) setDocuments(docs as ClientDocument[]);
      if (Array.isArray(fin)) setFinance(fin as FinanceEntry[]);
      setLoading(false);
    }
    load();
  }, [id, session]);

  async function handleUploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = '';
    setUploadingDoc(true);
    try {
      const { url, error } = await uploadFile(file);
      if (!url) { console.error(error); return; }
      const row = await db({
        action: 'insert',
        table: 'client_documents',
        data: {
          client_id: id,
          doc_type: 'upload',
          title: file.name,
          url,
          size_bytes: file.size,
          mime_type: file.type,
          signed: false,
          uploaded_by: user.id,
          uploaded_by_name: (user.user_metadata?.full_name as string) || user.email || null,
        },
      });
      if (row && (row as ClientDocument).id) {
        setDocuments((prev) => [row as ClientDocument, ...prev]);
      }
    } finally {
      setUploadingDoc(false);
    }
  }

  async function deleteDocument(d: ClientDocument) {
    const ok = await confirm(`Delete "${d.title}"?`, { message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    const res = await db({ action: 'delete', table: 'client_documents', match: { id: d.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setDocuments((prev) => prev.filter((x) => x.id !== d.id));
    }
  }

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-10">
        <p className="text-sm text-foreground/60">Client not found.</p>
        <Link href="/app/clients" className="mt-4 inline-flex items-center gap-2 text-primary text-sm font-semibold">← Back to clients</Link>
      </div>
    );
  }

  const balance = finance.reduce((acc, e) => {
    if (e.entry_type === 'charge') return acc + e.amount_cents;
    if (e.entry_type === 'payment') return acc - e.amount_cents;
    if (e.entry_type === 'adjustment') return acc + e.amount_cents;
    return acc;
  }, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Back + fake-data banner */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button onClick={() => router.push('/app/clients')} className="flex items-center gap-2 px-3 py-1.5 bg-warm-bg text-foreground/70 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Clients
        </button>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">Test data — not a real person</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-start gap-5">
          {client.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={client.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
              {client.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[client.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {client.status === 'admitted' ? 'In care' : client.status === 'pending' ? 'Admitting soon' : client.status}
              </span>
              {client.admission_type && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{client.admission_type}</span>
              )}
              {client.asam_level && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warm-bg text-foreground/70 border border-gray-200">ASAM {client.asam_level}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{client.name}</h1>
            <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              {client.pronouns ? `${client.pronouns} · ` : ''}{client.age ? `Age ${client.age}` : ''} · MRN {client.mrn || '—'}
            </p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-foreground/40 text-[10px] uppercase tracking-wider mb-0.5">Admitted</p>
                <p className="text-foreground font-medium">{client.status === 'pending' ? `${fmtDate(client.expected_admission_date)} (est.)` : fmtDate(client.admission_date)}</p>
              </div>
              <div>
                <p className="text-foreground/40 text-[10px] uppercase tracking-wider mb-0.5">Est. discharge</p>
                <p className="text-foreground font-medium">{fmtDate(client.expected_discharge_date)}</p>
              </div>
              <div>
                <p className="text-foreground/40 text-[10px] uppercase tracking-wider mb-0.5">Primary</p>
                <p className="text-foreground font-medium truncate">{client.primary_clinician || '—'}</p>
              </div>
              <div>
                <p className="text-foreground/40 text-[10px] uppercase tracking-wider mb-0.5">Case manager</p>
                <p className="text-foreground font-medium truncate">{client.case_manager || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'insurance', label: 'Insurance & Billing' },
            { id: 'documents', label: `Documents (${documents.length})` },
            ...(isAdmin ? [{ id: 'finance' as const, label: 'Finance' }] : []),
            { id: 'notes', label: 'Notes' },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-foreground/50 hover:text-foreground'}`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Demographics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Gender" value={client.gender} />
              <Field label="Date of birth" value={fmtDate(client.date_of_birth)} />
              <Field label="Primary substance" value={client.primary_substance} />
              <Field label="Phone" value={client.phone} />
              <Field label="Email" value={client.email} />
              <Field label="Address" value={
                client.address ? `${client.address}, ${client.city || ''} ${client.state || ''} ${client.zip || ''}`.trim() : null
              } />
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Emergency Contact</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Name" value={client.emergency_contact_name} />
              <Field label="Relationship" value={client.emergency_contact_relationship} />
              <Field label="Phone" value={client.emergency_contact_phone} />
            </div>
          </section>
          {client.notes && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-foreground mb-3">Clinical Notes</h2>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{client.notes}</p>
            </section>
          )}
        </div>
      )}

      {/* Insurance & Billing */}
      {tab === 'insurance' && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Insurance</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Payer" value={client.insurance_payer} />
              <Field label="Plan" value={client.insurance_plan} />
              <Field label="Member ID" value={client.insurance_member_id} mono />
              <Field label="Group #" value={client.insurance_group_number} mono />
              <Field label="Effective" value={fmtDate(client.policy_effective_date)} />
              <Field label="Term" value={fmtDate(client.policy_term_date)} />
              <Field label="Subscriber" value={client.subscriber_name} />
              <Field label="Relationship" value={client.subscriber_relationship} />
              <Field label="Subscriber DOB" value={fmtDate(client.subscriber_dob)} />
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Authorization</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <Field label="Auth #" value={client.authorization_number} mono />
              <Field label="LOC code" value={client.level_of_care_code} mono />
              <Field label="Start" value={fmtDate(client.authorization_start_date)} />
              <Field label="End" value={fmtDate(client.authorization_end_date)} />
              <Field label="Units authorized" value={client.authorized_units} />
              <Field label="Units used" value={client.used_units} />
              <div className="col-span-2">
                <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Units remaining</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((client.used_units || 0) / Math.max(1, client.authorized_units || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground/70 tabular-nums">
                    {(client.authorized_units || 0) - (client.used_units || 0)} / {client.authorized_units || 0}
                  </span>
                </div>
              </div>
            </div>
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Diagnoses (ICD-10)</h2>
            <div className="space-y-2">
              {client.primary_diagnosis_code ? (
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-wider">Primary</span>
                  <span className="font-mono text-sm font-semibold text-foreground">{client.primary_diagnosis_code}</span>
                  <span className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{client.primary_diagnosis_description}</span>
                </div>
              ) : (
                <p className="text-xs text-foreground/40">No primary diagnosis on file.</p>
              )}
              {client.secondary_diagnoses.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-warm-bg/40 border border-gray-100">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-foreground/60 uppercase tracking-wider">Secondary</span>
                  <span className="font-mono text-sm font-semibold text-foreground">{d.code}</span>
                  <span className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{d.description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Documents */}
      {tab === 'documents' && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-foreground">Intake paperwork &amp; documents</h2>
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={uploadingDoc}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {uploadingDoc ? (
                <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              )}
              Upload
            </button>
            <input ref={docInputRef} type="file" onChange={handleUploadDocument} className="hidden" />
          </div>
          <ul className="divide-y divide-gray-100">
            {documents.length === 0 && (
              <li className="px-5 py-8 text-center text-xs text-foreground/40">No documents yet.</li>
            )}
            {documents.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center gap-4 hover:bg-warm-bg/30 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-warm-bg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                  <p className="text-[11px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                    <span className="uppercase tracking-wider">{d.doc_type}</span>
                    {d.uploaded_by_name ? ` · ${d.uploaded_by_name}` : ''}
                    {' · '}{new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {d.signed ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Signed</span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">Unsigned</span>
                )}
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-foreground/40 hover:text-primary hover:bg-warm-bg transition-colors" aria-label="Open">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5 19.5 4.5M19.5 4.5H9m10.5 0V15" /></svg>
                  </a>
                )}
                <button onClick={() => deleteDocument(d)} className="p-1.5 rounded-lg text-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100" aria-label="Delete">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Finance — admin only */}
      {tab === 'finance' && isAdmin && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Billed</p>
              <p className="text-xl font-bold text-foreground">{fmtMoney(finance.filter((f) => f.entry_type === 'charge').reduce((a, f) => a + f.amount_cents, 0))}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Paid</p>
              <p className="text-xl font-bold text-emerald-700">{fmtMoney(finance.filter((f) => f.entry_type === 'payment').reduce((a, f) => a + f.amount_cents, 0))}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Balance</p>
              <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-foreground/50'}`}>{fmtMoney(balance)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/30">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Description</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {finance.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-foreground/40">No financial activity yet.</td></tr>
                )}
                {finance.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3 text-xs text-foreground/70">{fmtDate(f.entry_date)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${f.entry_type === 'charge' ? 'bg-red-50 text-red-700 border-red-200' : f.entry_type === 'payment' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {f.entry_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground/80">{f.description || '—'}</td>
                    <td className="px-5 py-3 text-sm font-mono text-right tabular-nums font-semibold">
                      <span className={f.entry_type === 'payment' ? 'text-emerald-700' : f.entry_type === 'charge' ? 'text-foreground' : 'text-foreground/50'}>
                        {f.entry_type === 'payment' ? '−' : ''}{fmtMoney(f.amount_cents)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-foreground/40 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Finance is visible to admins only.
          </p>
        </section>
      )}

      {/* Notes tab — link to existing Notes feature */}
      {tab === 'notes' && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-foreground/70 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Clinical notes for {client.name} live in the Notes section.
          </p>
          <Link href="/app/notes" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            Open Notes
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          </Link>
        </section>
      )}
    </div>
  );
}
