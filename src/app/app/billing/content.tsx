'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import React, { useEffect, useState } from 'react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  member_id: string;
  policy_number: string;
  payer_name: string;
  payer_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface Claim {
  id: string;
  patient_id: string;
  status: string;
  claim_type: string;
  admission_date: string;
  discharge_date: string;
  diagnosis_codes: string[];
  procedure_code: string;
  procedure_modifier: string;
  revenue_code: string;
  charge_amount: number;
  units: number;
  place_of_service: string;
  authorization_number: string;
  stedi_claim_id: string;
  stedi_response: Record<string, unknown> | null;
  submitted_at: string;
  submitted_by: string;
  created_at: string;
}

type Tab = 'patients' | 'claims';
type ClaimStatus = 'Draft' | 'Submitted' | 'Accepted' | 'Rejected';

const samplePatients: Omit<Patient, 'id'>[] = [
  { first_name: 'John', last_name: 'Martinez', date_of_birth: '1985-03-15', gender: 'M', member_id: 'AZ-88401', policy_number: 'BCB-442901', payer_name: 'Blue Cross Blue Shield AZ', payer_id: '00210', address: '123 Desert View Dr', city: 'Tucson', state: 'AZ', zip: '85701' },
  { first_name: 'Sarah', last_name: 'Thompson', date_of_birth: '1992-07-22', gender: 'F', member_id: 'AZ-77302', policy_number: 'UHC-331822', payer_name: 'UnitedHealthcare', payer_id: '87726', address: '456 Saguaro Ln', city: 'Phoenix', state: 'AZ', zip: '85004' },
  { first_name: 'Michael', last_name: 'Rivera', date_of_birth: '1978-11-08', gender: 'M', member_id: 'AZ-99503', policy_number: 'AET-559033', payer_name: 'Aetna', payer_id: '60054', address: '789 Mesa Rd', city: 'Scottsdale', state: 'AZ', zip: '85251' },
  { first_name: 'Emily', last_name: 'Chen', date_of_birth: '1995-01-30', gender: 'F', member_id: 'AZ-66204', policy_number: 'CIG-220144', payer_name: 'Cigna', payer_id: '62308', address: '321 Copper Trail', city: 'Mesa', state: 'AZ', zip: '85201' },
  { first_name: 'David', last_name: 'Okafor', date_of_birth: '1988-06-12', gender: 'M', member_id: 'AZ-55105', policy_number: 'AHCCCS-881255', payer_name: 'AHCCCS (Medicaid)', payer_id: 'AZAHC', address: '654 Ironwood St', city: 'Sierra Vista', state: 'AZ', zip: '85635' },
];

const commonDiagnoses = [
  { code: 'F10.20', desc: 'Alcohol dependence, uncomplicated' },
  { code: 'F10.21', desc: 'Alcohol dependence, in remission' },
  { code: 'F11.20', desc: 'Opioid dependence, uncomplicated' },
  { code: 'F11.21', desc: 'Opioid dependence, in remission' },
  { code: 'F14.20', desc: 'Cocaine dependence, uncomplicated' },
  { code: 'F15.20', desc: 'Other stimulant dependence, uncomplicated' },
  { code: 'F19.20', desc: 'Other psychoactive substance dependence' },
  { code: 'F32.9', desc: 'Major depressive disorder, unspecified' },
  { code: 'F33.1', desc: 'Major depressive disorder, recurrent, moderate' },
  { code: 'F41.1', desc: 'Generalized anxiety disorder' },
  { code: 'F43.10', desc: 'Post-traumatic stress disorder, unspecified' },
  { code: 'F43.12', desc: 'PTSD, chronic' },
];

const commonProcedures = [
  { code: 'H0018', desc: 'Behavioral health; short-term residential', modifier: 'HB', revenue: '1001' },
  { code: 'H0019', desc: 'Behavioral health; long-term residential', modifier: 'HB', revenue: '1001' },
  { code: 'H2036', desc: 'Alcohol/drug treatment program, per diem', modifier: 'HF', revenue: '0901' },
  { code: 'H0004', desc: 'Behavioral health counseling, per 15 min', modifier: '', revenue: '0901' },
  { code: 'H0015', desc: 'Alcohol/drug services, intensive outpatient', modifier: 'HF', revenue: '0906' },
  { code: '90837', desc: 'Psychotherapy, 60 minutes', modifier: '', revenue: '0901' },
  { code: '90847', desc: 'Family psychotherapy with patient', modifier: '', revenue: '0901' },
];

const statusStyle: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Submitted: 'bg-blue-50 text-blue-700',
  Accepted: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-600',
};

// Sample claims mapped to patients by index — seeded after patients load
const sampleClaimsTemplate = [
  {
    patientIndex: 0, // John Martinez — BCBS
    status: 'Draft',
    claim_type: 'Institutional',
    admission_date: '2026-03-01',
    discharge_date: '2026-03-31',
    diagnosis_codes: ['F10.20', 'F43.10', 'F32.9'],
    procedure_code: 'H0018',
    procedure_modifier: 'HB',
    revenue_code: '1001',
    charge_amount: 18600,
    units: 31,
    place_of_service: '55',
    authorization_number: 'BCBS-AUTH-90441',
    attending_npi: '1234567890',
    group_notes: 'Patient participated in 12 group therapy sessions (CBT, DBT, relapse prevention). Active engagement, shared personal experiences, demonstrated improved coping skills.',
    individual_notes: 'Weekly individual therapy x4 sessions. Focus: trauma processing (combat-related PTSD), alcohol triggers identification, development of sober support network. Patient shows significant progress with PTSD symptom reduction (PCL-5 score 62→38).',
    medical_notes: 'H&P completed 3/1. Vitals stable. Liver panel mildly elevated at admit, normalized by 3/15. Gabapentin 300mg TID for anxiety. No acute medical issues. Cleared for equine therapy.',
  },
  {
    patientIndex: 1, // Sarah Thompson — UHC
    status: 'Draft',
    claim_type: 'Institutional',
    admission_date: '2026-03-10',
    discharge_date: '2026-04-08',
    diagnosis_codes: ['F11.20', 'F41.1', 'F43.12'],
    procedure_code: 'H0018',
    procedure_modifier: 'HB',
    revenue_code: '1001',
    charge_amount: 17400,
    units: 30,
    place_of_service: '55',
    authorization_number: 'UHC-PA-22781',
    attending_npi: '1234567890',
    group_notes: 'Attended 11 group sessions including trauma-focused CBT, mindfulness-based relapse prevention, and womens recovery group. Initially guarded but became a peer leader by week 3.',
    individual_notes: 'Individual therapy x4. Primary focus: opioid dependence with chronic pain management alternatives, PTSD from domestic violence. Completed trauma narrative therapy. PHQ-9 score improved 22→9.',
    medical_notes: 'Admitted on Suboxone 16mg/day, tapered to 8mg by discharge. Vivitrol injection administered 3/31. Chronic pain managed with PT referral and non-opioid protocol. BMI normalized.',
  },
  {
    patientIndex: 2, // Michael Rivera — Aetna
    status: 'Draft',
    claim_type: 'Institutional',
    admission_date: '2026-02-15',
    discharge_date: '2026-03-16',
    diagnosis_codes: ['F14.20', 'F15.20', 'F33.1', 'F41.1'],
    procedure_code: 'H0018',
    procedure_modifier: 'HB',
    revenue_code: '1001',
    charge_amount: 18000,
    units: 30,
    place_of_service: '55',
    authorization_number: 'AET-REF-55903',
    attending_npi: '1234567890',
    group_notes: 'Participated in 13 group sessions. Cocaine/stimulant-specific relapse prevention group, anger management, family systems therapy group. Demonstrated insight into triggers and high-risk situations.',
    individual_notes: 'Individual therapy x5. Dual diagnosis focus: stimulant use disorder with recurrent depression. Motivational interviewing, contingency management plan developed. GAD-7 improved 18→7. BDI-II improved 31→12.',
    medical_notes: 'Cardiac clearance obtained (stimulant history). EKG normal sinus rhythm. Started Wellbutrin XL 300mg for depression/craving reduction. Sleep study referral for reported insomnia. Nutritional counseling for 15lb weight loss during active use.',
  },
  {
    patientIndex: 3, // Emily Chen — Cigna
    status: 'Draft',
    claim_type: 'Institutional',
    admission_date: '2026-03-15',
    discharge_date: '2026-04-04',
    diagnosis_codes: ['F10.20', 'F19.20', 'F43.10'],
    procedure_code: 'H0018',
    procedure_modifier: 'HB',
    revenue_code: '1001',
    charge_amount: 12600,
    units: 21,
    place_of_service: '55',
    authorization_number: 'CIG-PRIOR-22014',
    attending_npi: '1234567890',
    group_notes: 'Attended 9 group sessions: process group, psychoeducation (disease model), equine-assisted psychotherapy x3 sessions. Strong therapeutic alliance with equine program — showed emotional regulation improvement.',
    individual_notes: 'Individual therapy x3. Focus: polysubstance use (alcohol + cannabis), trauma history (childhood neglect). EMDR initiated session 2, completed 3 processing sessions. AUDIT score decreased 28→8.',
    medical_notes: 'Medical clearance at admission. Thiamine/folate supplementation. Mild withdrawal managed with CIWA protocol days 1-3. Peak CIWA score 12, resolved by day 4. No medications at discharge per patient preference.',
  },
  {
    patientIndex: 4, // David Okafor — AHCCCS
    status: 'Draft',
    claim_type: 'Institutional',
    admission_date: '2026-03-05',
    discharge_date: '2026-04-03',
    diagnosis_codes: ['F11.20', 'F10.20', 'F32.9', 'F43.10'],
    procedure_code: 'H0018',
    procedure_modifier: 'HB',
    revenue_code: '1001',
    charge_amount: 17400,
    units: 30,
    place_of_service: '55',
    authorization_number: 'AHCCCS-BH-88125',
    attending_npi: '1234567890',
    group_notes: 'Attended 12 group sessions: CBT, DBT skills, relapse prevention, mens recovery, equine therapy x2. Actively participated, developed peer mentor role for newer residents.',
    individual_notes: 'Individual therapy x4. Dual opioid/alcohol dependence with comorbid depression and PTSD. Trauma-focused CBT for childhood adverse experiences (ACE score 7). Developed comprehensive safety and relapse prevention plan. PHQ-9 improved 24→10.',
    medical_notes: 'Started Vivitrol 380mg IM at admission (post-detox). Maintained monthly injection schedule. Trazodone 100mg for insomnia. Hepatitis C screening positive — GI referral placed. TB screening negative. Dental referral for neglected oral health.',
  },
];

function buildStediPayload(claim: Claim & { group_notes?: string; individual_notes?: string; medical_notes?: string }, patient: Patient) {
  const days = Math.ceil((new Date(claim.discharge_date).getTime() - new Date(claim.admission_date).getTime()) / 86400000) || 1;
  return {
    tradingPartnerServiceId: patient.payer_id,
    submitter: {
      organizationName: 'Seven Arrows Recovery LLC',
      contactInformation: { name: 'Bobby Burton', phoneNumber: '8669964308' },
    },
    receiver: { organizationName: patient.payer_name },
    subscriber: {
      memberId: patient.member_id,
      paymentResponsibilityLevelCode: 'P',
      firstName: patient.first_name.toUpperCase(),
      lastName: patient.last_name.toUpperCase(),
      gender: patient.gender,
      dateOfBirth: patient.date_of_birth.replace(/-/g, ''),
      policyNumber: patient.policy_number,
      address: { address1: patient.address, city: patient.city, state: patient.state, postalCode: patient.zip },
    },
    claimInformation: {
      claimFilingCode: 'CI',
      patientControlNumber: claim.id.slice(0, 20),
      claimChargeAmount: String(claim.charge_amount),
      placeOfServiceCode: claim.place_of_service,
      claimFrequencyCode: '1',
      signatureIndicator: 'Y',
      releaseInformationCode: 'Y',
      benefitsAssignmentCertificationIndicator: 'Y',
      claimDateInformation: {
        statementBeginDate: claim.admission_date.replace(/-/g, ''),
        statementEndDate: claim.discharge_date.replace(/-/g, ''),
      },
      healthCareCodeInformation: claim.diagnosis_codes.map((code, i) => ({
        diagnosisTypeCode: i === 0 ? 'ABK' : 'ABF',
        diagnosisCode: code.replace('.', ''),
      })),
      serviceLines: [{
        serviceDate: claim.admission_date.replace(/-/g, ''),
        serviceDateEnd: claim.discharge_date.replace(/-/g, ''),
        professionalService: {
          procedureIdentifier: 'HC',
          procedureCode: claim.procedure_code,
          procedureModifiers: claim.procedure_modifier ? [claim.procedure_modifier] : [],
          lineItemChargeAmount: String(claim.charge_amount),
          measurementUnit: 'DA',
          serviceUnitCount: String(claim.units || days),
          compositeDiagnosisCodePointers: { diagnosisCodePointers: claim.diagnosis_codes.map((_, i) => String(i + 1)) },
          placeOfServiceCode: claim.place_of_service,
        },
      }],
    },
    billingProvider: {
      providerType: 'billingProvider',
      npi: '1234567890',
      employerId: '860541237',
      organizationName: 'SEVEN ARROWS RECOVERY LLC',
      address: { address1: '1234 Recovery Ranch Rd', city: 'Cochise County', state: 'AZ', postalCode: '85603' },
      taxonomyCode: '261QR0405X',
    },
    renderingProvider: {
      providerType: 'renderingProvider',
      npi: '9876543210',
      firstName: 'JAMES',
      lastName: 'WILSON',
      taxonomyCode: '101YM0800X',
    },
  };
}

export default function BillingContent() {
  const { user, session } = useAuth();
  const [tab, setTab] = useState<Tab>('patients');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbAvailable, setDbAvailable] = useState(true);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [stediKey, setStediKey] = useState('');
  const [showStediConfig, setShowStediConfig] = useState(false);
  const [diagSearch, setDiagSearch] = useState('');
  const [stediPreview, setStediPreview] = useState<{ payload: ReturnType<typeof buildStediPayload>; claim: Claim; patient: Patient } | null>(null);
  const [extendedNotes, setExtendedNotes] = useState<Record<string, { group_notes: string; individual_notes: string; medical_notes: string }>>({});
  const [claimForm, setClaimForm] = useState({
    patient_id: '',
    admission_date: '',
    discharge_date: '',
    diagnosis_codes: [] as string[],
    procedure_code: 'H0018',
    procedure_modifier: 'HB',
    revenue_code: '1001',
    charge_amount: '',
    units: '',
    authorization_number: '',
  });

  const userName = user?.user_metadata?.full_name || user?.email || 'Unknown';

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      // Load patients
      let loadedPatients: Patient[] = [];
      const pData = await db({ action: 'select', table: 'billing_patients', order: { column: 'last_name', ascending: true } });
      if (Array.isArray(pData) && pData.length > 0) {
        loadedPatients = pData;
      } else if (Array.isArray(pData) && pData.length === 0) {
        // Seed sample patients
        for (const p of samplePatients) {
          const result = await db({ action: 'insert', table: 'billing_patients', data: p });
          if (result?.id) loadedPatients.push(result);
        }
      } else {
        setDbAvailable(false);
        loadedPatients = samplePatients.map((p, i) => ({ ...p, id: `local-${i}` }));
      }
      setPatients(loadedPatients);

      // Load claims
      const cData = await db({ action: 'select', table: 'billing_claims', order: { column: 'created_at', ascending: false } });
      let loadedClaims: Claim[] = [];
      if (Array.isArray(cData)) loadedClaims = cData;

      // Seed sample claims if no claims exist yet
      const notesMap: Record<string, { group_notes: string; individual_notes: string; medical_notes: string }> = {};
      if (loadedClaims.length === 0 && loadedPatients.length > 0 && !loadedPatients[0].id.startsWith('local-')) {
        for (const tmpl of sampleClaimsTemplate) {
          const sampleP = samplePatients[tmpl.patientIndex];
          // Find the matching loaded patient by name
          const patient = loadedPatients.find(p => p.first_name === sampleP.first_name && p.last_name === sampleP.last_name);
          if (!patient?.id) continue;
          const claimData = {
            patient_id: patient.id,
            status: tmpl.status,
            claim_type: tmpl.claim_type,
            admission_date: tmpl.admission_date,
            discharge_date: tmpl.discharge_date,
            diagnosis_codes: tmpl.diagnosis_codes,
            procedure_code: tmpl.procedure_code,
            procedure_modifier: tmpl.procedure_modifier,
            revenue_code: tmpl.revenue_code,
            charge_amount: tmpl.charge_amount,
            units: tmpl.units,
            place_of_service: tmpl.place_of_service,
            authorization_number: tmpl.authorization_number,
            submitted_by: 'System',
          };
          const result = await db({ action: 'insert', table: 'billing_claims', data: claimData });
          if (result?.id) {
            loadedClaims.push(result);
            notesMap[result.id] = { group_notes: tmpl.group_notes, individual_notes: tmpl.individual_notes, medical_notes: tmpl.medical_notes };
          }
        }
      }

      // Build notes map for existing claims (match by patient name + template)
      if (Object.keys(notesMap).length === 0 && loadedClaims.length > 0) {
        for (const c of loadedClaims) {
          const patient = loadedPatients.find(p => p.id === c.patient_id);
          if (!patient) continue;
          const tmpl = sampleClaimsTemplate.find(t => {
            const sp = samplePatients[t.patientIndex];
            return sp.first_name === patient.first_name && sp.last_name === patient.last_name;
          });
          if (tmpl) {
            notesMap[c.id] = { group_notes: tmpl.group_notes, individual_notes: tmpl.individual_notes, medical_notes: tmpl.medical_notes };
          }
        }
      }
      setExtendedNotes(notesMap);
      setClaims(loadedClaims);

      // Load saved Stedi key
      const saved = localStorage.getItem('stedi_api_key');
      if (saved) setStediKey(saved);

      setLoading(false);
    }
    load();
  }, [session]);

  const getPatient = (id: string) => patients.find(p => p.id === id);

  const createClaim = async () => {
    if (!claimForm.patient_id || !claimForm.admission_date || !claimForm.discharge_date) return;
    setSubmittingClaim(true);

    const data = {
      patient_id: claimForm.patient_id,
      status: 'Draft',
      claim_type: 'Institutional',
      admission_date: claimForm.admission_date,
      discharge_date: claimForm.discharge_date,
      diagnosis_codes: claimForm.diagnosis_codes,
      procedure_code: claimForm.procedure_code,
      procedure_modifier: claimForm.procedure_modifier,
      revenue_code: claimForm.revenue_code,
      charge_amount: parseFloat(claimForm.charge_amount) || 0,
      units: parseInt(claimForm.units) || 1,
      place_of_service: '55',
      authorization_number: claimForm.authorization_number,
      submitted_by: userName,
    };

    if (dbAvailable) {
      const result = await db({ action: 'insert', table: 'billing_claims', data });
      if (result?.id) setClaims(prev => [result, ...prev]);
    } else {
      setClaims(prev => [{ ...data, id: `local-${Date.now()}`, stedi_claim_id: '', stedi_response: null, submitted_at: '', created_at: new Date().toISOString() }, ...prev]);
    }

    setClaimForm({ patient_id: '', admission_date: '', discharge_date: '', diagnosis_codes: [], procedure_code: 'H0018', procedure_modifier: 'HB', revenue_code: '1001', charge_amount: '', units: '', authorization_number: '' });
    setShowClaimForm(false);
    setSubmittingClaim(false);
    setTab('claims');
  };

  const openStediPreview = (claim: Claim) => {
    const patient = getPatient(claim.patient_id);
    if (!patient) return;
    const notes = extendedNotes[claim.id];
    const claimWithNotes = { ...claim, ...notes };
    const payload = buildStediPayload(claimWithNotes, patient);
    setStediPreview({ payload, claim, patient });
  };

  const confirmStediSubmit = async () => {
    if (!stediPreview) return;
    const { claim, payload } = stediPreview;
    if (!stediKey) { setShowStediConfig(true); setStediPreview(null); return; }

    try {
      const res = await fetch('/api/stedi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: stediKey, payload }),
      });
      const result = await res.json();

      const newStatus = result.error ? 'Rejected' : 'Submitted';
      const stediClaimId = result.claimId || result.meta?.traceId || '';

      if (dbAvailable && !claim.id.startsWith('local-')) {
        await db({ action: 'update', table: 'billing_claims', data: { status: newStatus, stedi_claim_id: stediClaimId, stedi_response: result, submitted_at: new Date().toISOString() }, match: { id: claim.id } });
      }
      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: newStatus, stedi_claim_id: stediClaimId, stedi_response: result, submitted_at: new Date().toISOString() } : c));
    } catch (err) {
      alert(`Stedi submission failed: ${err}`);
    }
    setStediPreview(null);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredDiagnoses = diagSearch
    ? commonDiagnoses.filter(d => d.code.toLowerCase().includes(diagSearch.toLowerCase()) || d.desc.toLowerCase().includes(diagSearch.toLowerCase()))
    : commonDiagnoses;

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Billing</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Residential treatment claims &middot; Stedi API integration
          </p>
          {!dbAvailable && <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>Database tables not found — showing sample data.</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStediConfig(!showStediConfig)} className="px-3 py-2 rounded-xl text-xs font-medium bg-warm-bg text-foreground/60 hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93s.844.083 1.18-.146l.742-.504a1.125 1.125 0 011.537.169l.773.773a1.125 1.125 0 01.17 1.537l-.505.742c-.229.336-.247.784-.147 1.18.1.396.44.71.864.78l.894.15c.542.09.94.56.94 1.109v1.094c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.764.384-.93.78s-.083.844.146 1.18l.504.742a1.125 1.125 0 01-.17 1.537l-.772.773a1.125 1.125 0 01-1.537.17l-.742-.505c-.336-.229-.784-.247-1.18-.147-.396.1-.71.44-.78.864l-.15.894c-.09.542-.56.94-1.109.94h-1.094c-.55 0-1.02-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93s-.844-.083-1.18.146l-.742.504a1.125 1.125 0 01-1.537-.17l-.773-.772a1.125 1.125 0 01-.17-1.537l.505-.742c.229-.336.247-.784.147-1.18a1.726 1.726 0 00-.78-.864l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.764-.383.93-.78.165-.396.083-.843-.146-1.18l-.504-.742a1.125 1.125 0 01.17-1.537l.772-.773a1.125 1.125 0 011.537-.17l.742.505c.336.229.784.247 1.18.147.396-.1.71-.44.78-.864l.15-.894z" /><circle cx="12" cy="12" r="3" /></svg>
            Stedi Config
          </button>
          <button onClick={() => { setClaimForm({ ...claimForm, patient_id: '' }); setShowClaimForm(true); setTab('claims'); }} className="px-4 py-2 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            Create Claim
          </button>
        </div>
      </div>

      {/* Stedi API Key Config */}
      {showStediConfig && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Stedi API Configuration</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>API Key</label>
              <input type="password" value={stediKey} onChange={e => setStediKey(e.target.value)} placeholder="Key ..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <button onClick={() => { localStorage.setItem('stedi_api_key', stediKey); setShowStediConfig(false); }} className="px-4 py-2 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Save</button>
          </div>
          <p className="text-xs text-foreground/30 mt-2" style={{ fontFamily: 'var(--font-body)' }}>Get your API key from <span className="text-primary">stedi.com/app/settings/api-keys</span></p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-warm-bg rounded-xl p-1 w-fit">
        {(['patients', 'claims'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`} style={{ fontFamily: 'var(--font-body)' }}>
            {t === 'patients' ? `Patients (${patients.length})` : `Claims (${claims.length})`}
          </button>
        ))}
      </div>

      {/* New Claim Form */}
      {showClaimForm && tab === 'claims' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-bold text-foreground mb-4">Create Claim</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>Patient</label>
              <select value={claimForm.patient_id} onChange={e => setClaimForm({ ...claimForm, patient_id: e.target.value })} className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary cursor-pointer" style={{ fontFamily: 'var(--font-body)' }}>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} — {p.payer_name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 bottom-3 w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div>
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>Authorization #</label>
              <input type="text" value={claimForm.authorization_number} onChange={e => setClaimForm({ ...claimForm, authorization_number: e.target.value })} placeholder="Prior auth number..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>Admission Date</label>
              <input type="date" value={claimForm.admission_date} onChange={e => setClaimForm({ ...claimForm, admission_date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>Discharge Date</label>
              <input type="date" value={claimForm.discharge_date} onChange={e => setClaimForm({ ...claimForm, discharge_date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
          </div>

          {/* Diagnosis Codes */}
          <div className="mb-4">
            <label className="text-xs text-foreground/50 mb-2 block" style={{ fontFamily: 'var(--font-body)' }}>Diagnosis Codes (ICD-10)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {claimForm.diagnosis_codes.map((code, i) => {
                const diag = commonDiagnoses.find(d => d.code === code);
                return (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    {code}{diag && <span className="text-primary/60 hidden sm:inline"> — {diag.desc}</span>}
                    <button onClick={() => setClaimForm({ ...claimForm, diagnosis_codes: claimForm.diagnosis_codes.filter((_, j) => j !== i) })} className="hover:text-red-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                );
              })}
            </div>
            <input type="text" value={diagSearch} onChange={e => setDiagSearch(e.target.value)} placeholder="Search ICD-10 codes..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary mb-2" style={{ fontFamily: 'var(--font-body)' }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-32 overflow-y-auto">
              {filteredDiagnoses.map(d => (
                <button key={d.code} onClick={() => { if (!claimForm.diagnosis_codes.includes(d.code)) setClaimForm({ ...claimForm, diagnosis_codes: [...claimForm.diagnosis_codes, d.code] }); setDiagSearch(''); }} className="text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                  <span className="font-bold text-foreground">{d.code}</span> <span className="text-foreground/50">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Procedure */}
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>Procedure Code</label>
              <select value={claimForm.procedure_code} onChange={e => { const proc = commonProcedures.find(p => p.code === e.target.value); setClaimForm({ ...claimForm, procedure_code: e.target.value, procedure_modifier: proc?.modifier || '', revenue_code: proc?.revenue || '1001' }); }} className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary cursor-pointer" style={{ fontFamily: 'var(--font-body)' }}>
                {commonProcedures.map(p => <option key={p.code} value={p.code}>{p.code} — {p.desc}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 bottom-3 w-4 h-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </div>
            <div>
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>Charge Amount ($)</label>
              <input type="number" value={claimForm.charge_amount} onChange={e => setClaimForm({ ...claimForm, charge_amount: e.target.value })} placeholder="0.00" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
            <div>
              <label className="text-xs text-foreground/50 mb-1 block" style={{ fontFamily: 'var(--font-body)' }}>Units (Days)</label>
              <input type="number" value={claimForm.units} onChange={e => setClaimForm({ ...claimForm, units: e.target.value })} placeholder="Auto from dates" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-warm-bg/50 focus:outline-none focus:border-primary" style={{ fontFamily: 'var(--font-body)' }} />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={createClaim} disabled={submittingClaim || !claimForm.patient_id || !claimForm.admission_date || !claimForm.discharge_date || claimForm.diagnosis_codes.length === 0} className="px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium hover:bg-foreground/80 transition-colors disabled:opacity-40" style={{ fontFamily: 'var(--font-body)' }}>{submittingClaim ? 'Creating...' : 'Create Claim'}</button>
            <button onClick={() => setShowClaimForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/60 hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {tab === 'patients' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>DOB</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Gender</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Location</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Payer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Member ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Claims</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {patients.map(p => {
                  const patientClaims = claims.filter(c => c.patient_id === p.id);
                  const expanded = expandedPatientId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr onClick={() => setExpandedPatientId(expanded ? null : p.id)} className="border-b border-gray-50 hover:bg-warm-bg/20 transition-colors cursor-pointer">
                        <td className="px-5 py-3.5 text-sm font-bold text-foreground whitespace-nowrap">{p.first_name} {p.last_name}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground/60 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{p.date_of_birth}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>{p.gender === 'M' ? 'Male' : 'Female'}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground/60 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{p.city}, {p.state}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground/60 whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{p.payer_name}</td>
                        <td className="px-5 py-3.5 text-xs text-foreground/40 font-mono">{p.member_id}</td>
                        <td className="px-5 py-3.5">
                          {patientClaims.length > 0
                            ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{patientClaims.length}</span>
                            : <span className="text-xs text-foreground/20" style={{ fontFamily: 'var(--font-body)' }}>None</span>
                          }
                        </td>
                        <td className="px-3 py-3.5">
                          <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={8} className="bg-warm-bg/20 px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                                Claims for {p.first_name} {p.last_name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClaimForm({ ...claimForm, patient_id: p.id });
                                  setShowClaimForm(true);
                                  setTab('claims');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 transition-colors"
                                style={{ fontFamily: 'var(--font-body)' }}
                              >
                                + Create Claim
                              </button>
                            </div>
                            {patientClaims.length === 0 ? (
                              <p className="text-xs text-foreground/30 py-2" style={{ fontFamily: 'var(--font-body)' }}>No claims yet for this patient.</p>
                            ) : (
                              <div className="space-y-2">
                                {patientClaims.map(c => {
                                  const notes = extendedNotes[c.id];
                                  return (
                                    <div key={c.id} className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                                        <div className="flex items-center gap-2">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[c.status] || statusStyle.Draft}`}>{c.status}</span>
                                          <span className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-body)' }}>{c.procedure_code} — ${c.charge_amount?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {c.stedi_claim_id && <span className="text-xs text-foreground/30 font-mono">{c.stedi_claim_id.slice(0, 12)}...</span>}
                                          {c.status === 'Draft' && (
                                            <button onClick={(e) => { e.stopPropagation(); openStediPreview(c); }} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                                              Send to Stedi
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-foreground/40 mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                                        <span>Admit: {c.admission_date}</span>
                                        <span>Discharge: {c.discharge_date}</span>
                                        <span>Auth: {c.authorization_number}</span>
                                        <span>Dx: {(c.diagnosis_codes || []).join(', ')}</span>
                                        <span>Units: {c.units}</span>
                                      </div>
                                      {notes && (
                                        <div className="grid gap-2 mt-2 pt-2 border-t border-gray-50">
                                          <details>
                                            <summary className="text-xs font-semibold text-foreground/50 cursor-pointer hover:text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>Group Therapy Notes</summary>
                                            <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed pl-3 border-l-2 border-primary/20" style={{ fontFamily: 'var(--font-body)' }}>{notes.group_notes}</p>
                                          </details>
                                          <details>
                                            <summary className="text-xs font-semibold text-foreground/50 cursor-pointer hover:text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>Individual Therapy Notes</summary>
                                            <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed pl-3 border-l-2 border-blue-200" style={{ fontFamily: 'var(--font-body)' }}>{notes.individual_notes}</p>
                                          </details>
                                          <details>
                                            <summary className="text-xs font-semibold text-foreground/50 cursor-pointer hover:text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>Medical Notes</summary>
                                            <p className="mt-1.5 text-xs text-foreground/60 leading-relaxed pl-3 border-l-2 border-emerald-200" style={{ fontFamily: 'var(--font-body)' }}>{notes.medical_notes}</p>
                                          </details>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claims Tab */}
      {tab === 'claims' && (
        <div className="space-y-2">
          {claims.length === 0 && !showClaimForm && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
              <svg className="w-10 h-10 mx-auto text-foreground/15 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No claims yet</p>
              <button onClick={() => setShowClaimForm(true)} className="mt-3 px-4 py-2 rounded-xl bg-foreground text-white text-xs font-medium hover:bg-foreground/80 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Create First Claim</button>
            </div>
          )}
          {claims.map(c => {
            const patient = getPatient(c.patient_id);
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[c.status] || statusStyle.Draft}`}>{c.status}</span>
                    <h3 className="text-sm font-bold text-foreground">{patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.stedi_claim_id && <span className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>Stedi: {c.stedi_claim_id.slice(0, 12)}...</span>}
                    {c.status === 'Draft' && (
                      <button onClick={() => openStediPreview(c)} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                        Send to Stedi
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                  <span>Admit: {c.admission_date}</span>
                  <span>Discharge: {c.discharge_date}</span>
                  <span>Procedure: {c.procedure_code}</span>
                  <span>Charge: ${c.charge_amount?.toLocaleString()}</span>
                  <span>Dx: {(c.diagnosis_codes || []).join(', ')}</span>
                </div>
                {c.stedi_response && (
                  <details className="mt-2">
                    <summary className="text-xs text-foreground/30 cursor-pointer hover:text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>API Response</summary>
                    <pre className="mt-1 text-xs bg-warm-bg rounded-lg p-3 overflow-auto max-h-40 text-foreground/60" style={{ fontFamily: 'monospace' }}>{JSON.stringify(c.stedi_response, null, 2)}</pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stedi Preview Modal */}
      {stediPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setStediPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-foreground">Stedi 837P Claim Preview</h2>
                <p className="text-xs text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {stediPreview.patient.first_name} {stediPreview.patient.last_name} &middot; {stediPreview.patient.payer_name} &middot; ${stediPreview.claim.charge_amount?.toLocaleString()}
                </p>
              </div>
              <button onClick={() => setStediPreview(null)} className="p-2 hover:bg-warm-bg rounded-xl transition-colors">
                <svg className="w-5 h-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-warm-bg/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/30 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Subscriber</p>
                  <p className="text-sm font-bold text-foreground mt-1">{stediPreview.payload.subscriber.firstName} {stediPreview.payload.subscriber.lastName}</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>ID: {stediPreview.payload.subscriber.memberId}</p>
                </div>
                <div className="bg-warm-bg/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/30 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Payer</p>
                  <p className="text-sm font-bold text-foreground mt-1">{stediPreview.payload.receiver.organizationName}</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>ID: {stediPreview.payload.tradingPartnerServiceId}</p>
                </div>
                <div className="bg-warm-bg/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/30 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Charge</p>
                  <p className="text-sm font-bold text-foreground mt-1">${stediPreview.claim.charge_amount?.toLocaleString()}</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{stediPreview.claim.units} days</p>
                </div>
                <div className="bg-warm-bg/50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-foreground/30 font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Auth</p>
                  <p className="text-sm font-bold text-foreground mt-1 break-all">{stediPreview.claim.authorization_number || 'N/A'}</p>
                  <p className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>POS: {stediPreview.claim.place_of_service}</p>
                </div>
              </div>

              {/* Diagnosis Codes */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Diagnosis Codes</h4>
                <div className="flex flex-wrap gap-1.5">
                  {stediPreview.payload.claimInformation.healthCareCodeInformation.map((dx: { diagnosisTypeCode: string; diagnosisCode: string }, i: number) => {
                    const code = dx.diagnosisCode.slice(0, 3) + '.' + dx.diagnosisCode.slice(3);
                    const diag = commonDiagnoses.find(d => d.code.replace('.', '') === dx.diagnosisCode);
                    return (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        <span className="font-mono">{code}</span>
                        {diag && <span className="text-primary/60">{diag.desc}</span>}
                        <span className="text-primary/30 text-[10px]">{dx.diagnosisTypeCode === 'ABK' ? 'Primary' : `Dx${i + 1}`}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Service Line */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Service Line</h4>
                <div className="bg-warm-bg/30 rounded-xl p-3 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><span className="text-foreground/30">Procedure:</span> <span className="font-bold text-foreground">{stediPreview.claim.procedure_code}</span></div>
                    <div><span className="text-foreground/30">Modifier:</span> <span className="font-bold text-foreground">{stediPreview.claim.procedure_modifier || 'None'}</span></div>
                    <div><span className="text-foreground/30">Revenue:</span> <span className="font-bold text-foreground">{stediPreview.claim.revenue_code}</span></div>
                    <div><span className="text-foreground/30">Units:</span> <span className="font-bold text-foreground">{stediPreview.claim.units} days</span></div>
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              {extendedNotes[stediPreview.claim.id] && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Clinical Documentation</h4>
                  <div className="space-y-2">
                    <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                      <p className="text-[10px] uppercase tracking-wider text-primary/60 font-semibold mb-1" style={{ fontFamily: 'var(--font-body)' }}>Group Therapy Notes</p>
                      <p className="text-xs text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{extendedNotes[stediPreview.claim.id].group_notes}</p>
                    </div>
                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                      <p className="text-[10px] uppercase tracking-wider text-blue-600/60 font-semibold mb-1" style={{ fontFamily: 'var(--font-body)' }}>Individual Therapy Notes</p>
                      <p className="text-xs text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{extendedNotes[stediPreview.claim.id].individual_notes}</p>
                    </div>
                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-600/60 font-semibold mb-1" style={{ fontFamily: 'var(--font-body)' }}>Medical Notes</p>
                      <p className="text-xs text-foreground/70 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{extendedNotes[stediPreview.claim.id].medical_notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw JSON Preview */}
              <details className="mb-2">
                <summary className="text-xs text-foreground/30 cursor-pointer hover:text-foreground/50 font-medium" style={{ fontFamily: 'var(--font-body)' }}>View Raw 837P JSON Payload</summary>
                <pre className="mt-2 text-[11px] bg-gray-900 text-green-400 rounded-xl p-4 overflow-auto max-h-60 leading-relaxed" style={{ fontFamily: 'monospace' }}>{JSON.stringify(stediPreview.payload, null, 2)}</pre>
              </details>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-warm-bg/30 rounded-b-2xl">
              <p className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                Endpoint: healthcare.us.stedi.com &middot; 837P Professional Claim v3
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setStediPreview(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:bg-white transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
                <button onClick={confirmStediSubmit} className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                  <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                  Submit to Stedi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
