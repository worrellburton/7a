'use client';

import { useMemo, useState } from 'react';

// Intake Paperwork — tracks the set of documents each incoming client must
// complete before admission. For every client admitting soon we show the
// required forms, their completion status, and who still owes what. The
// paperwork list itself is a fixed library (consent, HIPAA, financial
// agreement, medical history, etc.); individual clients track per-form
// completion status.

type FormStatus = 'not_sent' | 'sent' | 'in_progress' | 'signed' | 'verified';

interface IntakeForm {
  key: string;
  label: string;
  category: 'consent' | 'financial' | 'clinical' | 'policy' | 'identity';
  required: boolean;
  description: string;
}

interface ClientFormRow {
  form_key: string;
  status: FormStatus;
  signed_at: string | null;
}

interface IntakeClient {
  id: string;
  name: string;
  admit_date: string; // YYYY-MM-DD
  coordinator: string | null;
  insurance: string | null;
  forms: ClientFormRow[];
}

const FORM_LIBRARY: IntakeForm[] = [
  { key: 'admission_agreement', label: 'Admission Agreement', category: 'policy', required: true, description: 'Client rights, program rules, and facility expectations.' },
  { key: 'consent_treatment', label: 'Consent for Treatment', category: 'consent', required: true, description: 'Authorization for medical and clinical services.' },
  { key: 'hipaa_notice', label: 'HIPAA Privacy Notice', category: 'consent', required: true, description: 'Acknowledgment of privacy practices.' },
  { key: 'roi_general', label: 'Release of Information', category: 'consent', required: true, description: 'Permission to communicate with outside providers / family.' },
  { key: 'financial_agreement', label: 'Financial Responsibility Agreement', category: 'financial', required: true, description: 'Payment terms and responsibility for services.' },
  { key: 'insurance_card_copy', label: 'Insurance Card (copy)', category: 'financial', required: true, description: 'Front and back of primary insurance card.' },
  { key: 'photo_id', label: 'Government Photo ID', category: 'identity', required: true, description: 'Driver license or passport copy.' },
  { key: 'medical_history', label: 'Medical History Questionnaire', category: 'clinical', required: true, description: 'Past conditions, surgeries, allergies, current meds.' },
  { key: 'medication_list', label: 'Current Medications List', category: 'clinical', required: true, description: 'All prescribed and OTC medications being taken.' },
  { key: 'emergency_contacts', label: 'Emergency Contacts', category: 'policy', required: true, description: 'Next of kin and emergency numbers.' },
  { key: 'grievance_policy', label: 'Grievance Policy Acknowledgment', category: 'policy', required: true, description: 'Process for filing concerns during treatment.' },
  { key: 'photo_consent', label: 'Photo / Media Consent', category: 'consent', required: false, description: 'Optional permission for non-identifying media use.' },
];

const categoryStyle: Record<IntakeForm['category'], string> = {
  consent: 'bg-blue-50 text-blue-700',
  financial: 'bg-emerald-50 text-emerald-700',
  clinical: 'bg-purple-50 text-purple-700',
  policy: 'bg-amber-50 text-amber-700',
  identity: 'bg-gray-100 text-gray-700',
};

const statusStyle: Record<FormStatus, string> = {
  not_sent: 'bg-gray-50 text-gray-500',
  sent: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  signed: 'bg-emerald-50 text-emerald-700',
  verified: 'bg-emerald-100 text-emerald-800',
};

const statusLabels: Record<FormStatus, string> = {
  not_sent: 'Not Sent',
  sent: 'Sent',
  in_progress: 'In Progress',
  signed: 'Signed',
  verified: 'Verified',
};

function sampleClients(): IntakeClient[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const plus = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

  const mkForms = (overrides: Partial<Record<string, FormStatus>> = {}): ClientFormRow[] =>
    FORM_LIBRARY.map(f => ({ form_key: f.key, status: overrides[f.key] || 'not_sent', signed_at: null }));

  return [
    {
      id: 'c1',
      name: 'M. Garcia',
      admit_date: plus(0),
      coordinator: 'Bobby Burton',
      insurance: 'BCBS PPO',
      forms: mkForms({
        admission_agreement: 'signed',
        consent_treatment: 'signed',
        hipaa_notice: 'signed',
        roi_general: 'signed',
        financial_agreement: 'verified',
        insurance_card_copy: 'verified',
        photo_id: 'verified',
        medical_history: 'in_progress',
        medication_list: 'sent',
        emergency_contacts: 'signed',
        grievance_policy: 'signed',
      }),
    },
    {
      id: 'c2',
      name: 'R. Chen',
      admit_date: plus(0),
      coordinator: 'Pamela Calvo',
      insurance: 'Aetna',
      forms: mkForms({
        admission_agreement: 'sent',
        consent_treatment: 'sent',
        hipaa_notice: 'sent',
        roi_general: 'not_sent',
        financial_agreement: 'sent',
        insurance_card_copy: 'not_sent',
        photo_id: 'not_sent',
        medical_history: 'not_sent',
        medication_list: 'not_sent',
        emergency_contacts: 'not_sent',
        grievance_policy: 'sent',
      }),
    },
    {
      id: 'c3',
      name: 'D. Williams',
      admit_date: plus(1),
      coordinator: 'Bobby Burton',
      insurance: 'Cigna',
      forms: mkForms({
        admission_agreement: 'signed',
        consent_treatment: 'signed',
        hipaa_notice: 'signed',
        roi_general: 'signed',
        financial_agreement: 'signed',
        insurance_card_copy: 'verified',
        photo_id: 'verified',
        medical_history: 'signed',
        medication_list: 'signed',
        emergency_contacts: 'signed',
        grievance_policy: 'signed',
        photo_consent: 'signed',
      }),
    },
    {
      id: 'c4',
      name: 'S. Patel',
      admit_date: plus(2),
      coordinator: 'Pamela Calvo',
      insurance: 'Private Pay',
      forms: mkForms({
        admission_agreement: 'not_sent',
        consent_treatment: 'not_sent',
        hipaa_notice: 'not_sent',
        financial_agreement: 'not_sent',
      }),
    },
  ];
}

function completion(client: IntakeClient): { done: number; total: number; pct: number } {
  const requiredKeys = new Set(FORM_LIBRARY.filter(f => f.required).map(f => f.key));
  const total = requiredKeys.size;
  const done = client.forms.filter(f => requiredKeys.has(f.form_key) && (f.status === 'signed' || f.status === 'verified')).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function formatAdmitDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Admits today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Admits tomorrow';
  return `Admits ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
}

export default function IntakePaperworkContent() {
  const [clients, setClients] = useState<IntakeClient[]>(sampleClients);
  const [selectedId, setSelectedId] = useState<string | null>(clients[0]?.id || null);

  const selected = clients.find(c => c.id === selectedId) || null;

  const summary = useMemo(() => {
    let complete = 0;
    let pending = 0;
    let blocked = 0;
    for (const c of clients) {
      const { done, total } = completion(c);
      if (done === total) complete++;
      else if (done === 0) blocked++;
      else pending++;
    }
    return { complete, pending, blocked, total: clients.length };
  }, [clients]);

  const updateStatus = (clientId: string, formKey: string, status: FormStatus) => {
    setClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c,
      forms: c.forms.map(f => f.form_key !== formKey ? f : {
        ...f,
        status,
        signed_at: (status === 'signed' || status === 'verified') ? new Date().toISOString() : null,
      }),
    }));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Intake Paperwork</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Required forms and documents for incoming clients.
        </p>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Incoming Clients" value={summary.total} />
        <StatCard label="All Forms Complete" value={summary.complete} accent="text-emerald-600" />
        <StatCard label="Partial" value={summary.pending} accent="text-amber-600" />
        <StatCard label="Not Started" value={summary.blocked} accent="text-red-500" />
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 lg:px-10 pb-10 grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
        {/* Client list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
            <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Clients</p>
          </div>
          <div className="divide-y divide-gray-50">
            {clients.map(c => {
              const { done, total, pct } = completion(c);
              const isActive = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${isActive ? 'bg-warm-bg/60' : 'hover:bg-warm-bg/30'}`}
                >
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-[11px] text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{formatAdmitDate(c.admit_date)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-medium text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{done}/{total}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form detail */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto">
          {!selected ? (
            <div className="p-10 text-center text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
              Select a client to view their intake packet.
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-wrap sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.name}</h2>
                  <p className="text-xs text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {formatAdmitDate(selected.admit_date)}
                    {selected.coordinator && ` · Coordinator ${selected.coordinator}`}
                    {selected.insurance && ` · ${selected.insurance}`}
                  </p>
                </div>
                {(() => {
                  const { done, total, pct } = completion(selected);
                  return (
                    <div className="text-right">
                      <p className="text-xs text-foreground/40 uppercase tracking-wider font-medium" style={{ fontFamily: 'var(--font-body)' }}>Complete</p>
                      <p className={`text-2xl font-bold ${pct === 100 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</p>
                      <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{done} of {total} required</p>
                    </div>
                  );
                })()}
              </div>
              <div className="divide-y divide-gray-50">
                {FORM_LIBRARY.map(form => {
                  const row = selected.forms.find(f => f.form_key === form.key);
                  const status: FormStatus = row?.status || 'not_sent';
                  return (
                    <div key={form.key} className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap hover:bg-warm-bg/20 transition-colors">
                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{form.label}</p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${categoryStyle[form.category]}`}>
                            {form.category}
                          </span>
                          {!form.required && <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-500">Optional</span>}
                        </div>
                        <p className="text-[11px] text-foreground/50 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{form.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-medium ${statusStyle[status]}`}>
                          {statusLabels[status]}
                        </span>
                        <select
                          value={status}
                          onChange={(e) => updateStatus(selected.id, form.key, e.target.value as FormStatus)}
                          className="text-xs px-2 py-1 rounded-md border border-gray-200 bg-white text-foreground/60 hover:border-primary/30 focus:outline-none focus:border-primary/40 cursor-pointer"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {(Object.keys(statusLabels) as FormStatus[]).map(s => (
                            <option key={s} value={s}>{statusLabels[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
      <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-foreground'}`}>{value}</p>
    </div>
  );
}
