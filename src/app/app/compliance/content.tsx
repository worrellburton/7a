'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useState } from 'react';

interface ChecklistItem {
  id: string;
  standard: string;
  description: string;
  category: string;
  requirements: string[];
}

const jcahoCategories = [
  'Environment of Care',
  'Human Resources',
  'Infection Prevention',
  'Information Management',
  'Leadership',
  'Medication Management',
  'National Patient Safety Goals',
  'Provision of Care',
  'Performance Improvement',
  'Record of Care',
  'Rights & Responsibilities',
  'Waived Testing',
] as const;

const jcahoChecklist: ChecklistItem[] = [
  // Environment of Care
  { id: 'ec-1', category: 'Environment of Care', standard: 'EC.02.01.01', description: 'Manage safety and security risks in the environment of care', requirements: [
    'Safety management plan reviewed annually',
    'Security plan with controlled access points',
    'Staff identification badges visible at all times',
    'Panic buttons / emergency call system operational',
    'Hazard surveillance rounds documented monthly',
    'Contraband search policy and procedure in place',
  ]},
  { id: 'ec-2', category: 'Environment of Care', standard: 'EC.02.02.01', description: 'Manage fire safety risks', requirements: [
    'Fire drills conducted quarterly (each shift)',
    'Fire extinguishers inspected monthly',
    'Evacuation routes posted in all buildings',
    'Fire alarm system tested per NFPA standards',
    'Staff trained in RACE and PASS procedures',
    'Fire safety management plan current',
  ]},
  { id: 'ec-3', category: 'Environment of Care', standard: 'EC.02.03.01', description: 'Emergency management and disaster preparedness', requirements: [
    'Emergency operations plan (EOP) reviewed annually',
    'Two emergency exercises per year (one community-based)',
    'Backup power tested per generator testing requirements',
    'Water supply contingency plan',
    '96-hour sustainability plan for food, water, meds, communications',
    'Heatstroke/extreme heat protocol (Arizona-specific)',
  ]},
  { id: 'ec-4', category: 'Environment of Care', standard: 'EC.02.06.01', description: 'Maintain safe, functional environment', requirements: [
    'Maintenance work order system operational',
    'Grounds, buildings, and equipment in good repair',
    'ADA accessibility compliance verified',
    'Pest control program active',
    'HVAC system maintained and documented',
    'Pool/water feature safety (if applicable)',
  ]},

  // Human Resources
  { id: 'hr-1', category: 'Human Resources', standard: 'HR.01.01.01', description: 'Qualifications and competency of staff', requirements: [
    'Current licensure verification for all clinical staff',
    'Background checks (Level 1 Fingerprint for AZ) completed',
    'Drug testing per policy',
    'Competency evaluations for direct care staff annually',
    'CPR/First Aid certification current for all staff',
    'TB screening per CDC/AZ DHS guidelines',
  ]},
  { id: 'hr-2', category: 'Human Resources', standard: 'HR.01.02.01', description: 'Orientation and ongoing education', requirements: [
    'New employee orientation program documented',
    'Annual training: suicide prevention, trauma-informed care, cultural sensitivity',
    'Annual training: HIPAA, infection control, fire safety, emergency management',
    'Clinical supervision documentation for licensed staff',
    'Equine therapy staff: equine specialist certification verified',
    'Continuing education tracking system',
  ]},
  { id: 'hr-3', category: 'Human Resources', standard: 'HR.01.04.01', description: 'Staffing effectiveness and ratios', requirements: [
    'Staffing plan addresses patient acuity levels',
    'Minimum staff-to-client ratios met per AZ ADHS requirements',
    'On-call coverage plan for nights and weekends',
    'Float/PRN staff oriented and competency-verified',
    'Staffing data collected and reviewed quarterly',
  ]},

  // Infection Prevention
  { id: 'ic-1', category: 'Infection Prevention', standard: 'IC.01.01.01', description: 'Infection prevention and control program', requirements: [
    'Infection control plan reviewed annually',
    'Designated infection preventionist (IP) identified',
    'Hand hygiene compliance monitored and documented',
    'Standard precautions policy and PPE available',
    'Bloodborne pathogen exposure plan',
    'Communicable disease reporting per AZ DHS requirements',
  ]},
  { id: 'ic-2', category: 'Infection Prevention', standard: 'IC.02.02.01', description: 'Reduce risk of healthcare-associated infections', requirements: [
    'Environmental cleaning schedules and checklists',
    'Kitchen/food service sanitation per AZ health code',
    'Laundry handling procedures',
    'Shared bathroom/living space cleaning protocols',
    'Animal/equine contact hand hygiene requirements',
    'Valley Fever (Coccidioidomycosis) awareness for AZ',
  ]},

  // Information Management
  { id: 'im-1', category: 'Information Management', standard: 'IM.02.01.01', description: 'Protect health information privacy and security', requirements: [
    'HIPAA Privacy Officer designated',
    'HIPAA Security Officer designated',
    '42 CFR Part 2 compliance for substance use records',
    'Business Associate Agreements (BAAs) current',
    'Breach notification policy and procedure',
    'Electronic health records access controls and audit trails',
    'Patient consent for release of information forms',
  ]},

  // Leadership
  { id: 'ld-1', category: 'Leadership', standard: 'LD.01.03.01', description: 'Governance structure and organizational planning', requirements: [
    'Governing body bylaws/operating agreement current',
    'Organizational chart current',
    'Medical Director oversight documented',
    'AZ ADHS behavioral health license current (AZBHF)',
    'DEA registration (if applicable for MAT)',
    'Liability insurance certificates current',
    'CARF or Joint Commission accreditation timeline',
  ]},
  { id: 'ld-2', category: 'Leadership', standard: 'LD.03.02.01', description: 'Ethical framework and patient rights', requirements: [
    'Code of ethics/conduct policy',
    'Conflict of interest disclosure for leadership',
    'Patient grievance process accessible and documented',
    'No-retaliation policy for reporting concerns',
    'Cultural and linguistic competency plan',
    'Marketing and advertising ethics policy',
  ]},

  // Medication Management
  { id: 'mm-1', category: 'Medication Management', standard: 'MM.01.01.01', description: 'Medication management system', requirements: [
    'Medication management plan reviewed annually',
    'Prescribing authority verified (NP, MD, DO)',
    'Controlled substance policy per DEA and AZ Pharmacy Board',
    'Medication storage: locked, temperature-monitored',
    'Medication administration records (MARs) complete',
    'High-risk medication protocols (e.g., Suboxone, naltrexone)',
    'PRN medication guidelines with frequency limits',
  ]},
  { id: 'mm-2', category: 'Medication Management', standard: 'MM.03.01.01', description: 'Medication dispensing and self-administration', requirements: [
    'Self-administration of medication assessment and policy',
    'Medication reconciliation at admission and discharge',
    'Patient education on medications documented',
    'Naloxone (Narcan) available and staff trained',
    'Disposal of unused medications per DEA guidelines',
  ]},

  // National Patient Safety Goals
  { id: 'npsg-1', category: 'National Patient Safety Goals', standard: 'NPSG.01.01.01', description: 'Identify patients correctly', requirements: [
    'Two patient identifiers used before care delivery',
    'Photo identification in medical record',
    'Wristband/identification policy (if applicable)',
  ]},
  { id: 'npsg-2', category: 'National Patient Safety Goals', standard: 'NPSG.03.06.01', description: 'Maintain and communicate medication information', requirements: [
    'Medication reconciliation at transitions of care',
    'Medication list provided at discharge',
    'Allergies documented and accessible',
  ]},
  { id: 'npsg-3', category: 'National Patient Safety Goals', standard: 'NPSG.15.01.01', description: 'Reduce risk of suicide', requirements: [
    'Suicide risk screening at admission (Columbia or PHQ-9)',
    'Environmental safety checklist for ligature risks',
    'Sharps and contraband management',
    'Continuous observation policy for high-risk patients',
    'Safety planning / crisis plan for each patient',
    '1:1 monitoring protocols',
    'Elopement prevention measures',
  ]},

  // Provision of Care
  { id: 'pc-1', category: 'Provision of Care', standard: 'PC.01.02.01', description: 'Assessment and reassessment', requirements: [
    'Comprehensive biopsychosocial assessment within 72 hours',
    'ASAM criteria-based level of care assessment',
    'Medical history and physical within 24 hours of admission',
    'Nursing assessment at admission',
    'Trauma screening (ACE, PCL-5)',
    'Mental health screening (PHQ-9, GAD-7)',
    'Nutritional screening',
    'Reassessment at defined intervals (weekly minimum)',
  ]},
  { id: 'pc-2', category: 'Provision of Care', standard: 'PC.01.03.01', description: 'Individualized treatment planning', requirements: [
    'Individualized treatment plan within 72 hours of admission',
    'Measurable goals with target dates',
    'Patient participation in treatment planning documented',
    'Treatment plan reviews: minimum every 7 days',
    'Discharge planning begins at admission',
    'Continuing care / aftercare plan at discharge',
    'TraumAddiction model integration (Seven Arrows specific)',
  ]},
  { id: 'pc-3', category: 'Provision of Care', standard: 'PC.02.01.01', description: 'Continuum of care and services', requirements: [
    'Individual therapy: minimum 1x per week',
    'Group therapy: minimum 3x per week',
    'Family therapy offered',
    'Equine-assisted psychotherapy (EAP) program documented',
    'Therapeutic recreation activities scheduled',
    'Psychoeducation programming',
    'Peer support / 12-step facilitation',
    'Discharge and transition planning documented',
  ]},

  // Performance Improvement
  { id: 'pi-1', category: 'Performance Improvement', standard: 'PI.01.01.01', description: 'Performance improvement program', requirements: [
    'PI plan with measurable indicators',
    'Data collected: patient outcomes, satisfaction, safety events',
    'Quality committee meets minimum quarterly',
    'Root cause analysis for sentinel events',
    'Incident reporting system in place',
    'Patient satisfaction surveys collected and reviewed',
    'AMA (against medical advice) discharge tracking',
  ]},

  // Record of Care
  { id: 'rc-1', category: 'Record of Care', standard: 'RC.01.01.01', description: 'Complete and accurate medical records', requirements: [
    'Medical record content checklist per AZ ADHS standards',
    'Timely documentation (progress notes within 24 hours)',
    'Signatures and credentials on all entries',
    'Electronic health record system compliant and backed up',
    'Record retention per AZ law (minimum 6 years, minors until age 21 + 6)',
    'Verbal/telephone order authentication within 48 hours',
  ]},

  // Rights & Responsibilities
  { id: 'ri-1', category: 'Rights & Responsibilities', standard: 'RI.01.01.01', description: 'Patient rights', requirements: [
    'Patient rights posted and provided at admission',
    'Informed consent documentation',
    'Grievance policy accessible to all patients',
    'ADA accommodations available',
    'Interpreter/translation services (Spanish language support)',
    'Right to refuse treatment documented',
    'Confidentiality rights explained (42 CFR Part 2)',
    'Personal property management policy',
  ]},

  // Waived Testing
  { id: 'wt-1', category: 'Waived Testing', standard: 'WT.01.01.01', description: 'Waived testing (point-of-care testing)', requirements: [
    'CLIA Certificate of Waiver current',
    'Urine drug screen (UDS) procedures documented',
    'Quality control logs maintained for each test kit',
    'Staff competency for performing waived tests',
    'Test kit lot numbers and expiration dates tracked',
    'Pregnancy testing procedures (if applicable)',
    'Breathalyzer calibration and maintenance log',
  ]},
];

export default function ComplianceContent() {
  const { user } = useAuth();
  const [expandedCat, setExpandedCat] = useState<string | null>('Environment of Care');
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jcaho_checklist');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  if (!user) return null;

  const toggleCheck = (key: string) => {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    localStorage.setItem('jcaho_checklist', JSON.stringify(next));
  };

  const getCategoryProgress = (category: string) => {
    const items = jcahoChecklist.filter(i => i.category === category);
    const totalReqs = items.reduce((sum, i) => sum + i.requirements.length, 0);
    const checkedReqs = items.reduce((sum, i) => sum + i.requirements.filter((_, ri) => checked[`${i.id}-${ri}`]).length, 0);
    return { total: totalReqs, done: checkedReqs, pct: totalReqs > 0 ? Math.round((checkedReqs / totalReqs) * 100) : 0 };
  };

  const totalProgress = (() => {
    const total = jcahoChecklist.reduce((sum, i) => sum + i.requirements.length, 0);
    const done = jcahoChecklist.reduce((sum, i) => sum + i.requirements.filter((_, ri) => checked[`${i.id}-${ri}`]).length, 0);
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  })();

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">JCAHO Accreditation</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Joint Commission standards for behavioral health &middot; Residential treatment center
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground">Overall Readiness</h2>
          <span className="text-sm font-bold text-primary">{totalProgress.pct}%</span>
        </div>
        <div className="w-full h-3 bg-warm-bg rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${totalProgress.pct}%` }} />
        </div>
        <p className="text-xs text-foreground/40 mt-2" style={{ fontFamily: 'var(--font-body)' }}>{totalProgress.done} of {totalProgress.total} requirements addressed</p>
      </div>

      {/* Category Accordion */}
      <div className="space-y-2">
        {jcahoCategories.map(cat => {
          const progress = getCategoryProgress(cat);
          const expanded = expandedCat === cat;
          const items = jcahoChecklist.filter(i => i.category === cat);

          return (
            <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedCat(expanded ? null : cat)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-warm-bg/30 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">{cat}</h3>
                  <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{items.length} standards &middot; {progress.done}/{progress.total} complete</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-2 bg-warm-bg rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progress.pct === 100 ? 'bg-emerald-500' : progress.pct > 50 ? 'bg-primary' : 'bg-foreground/20'}`} style={{ width: `${progress.pct}%` }} />
                  </div>
                  <span className={`text-xs font-bold ${progress.pct === 100 ? 'text-emerald-600' : 'text-foreground/40'}`}>{progress.pct}%</span>
                  <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              {expanded && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  {items.map(item => (
                    <div key={item.id} className="mt-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold flex-shrink-0">{item.standard}</span>
                        <p className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{item.description}</p>
                      </div>
                      <div className="ml-1 space-y-1.5">
                        {item.requirements.map((req, ri) => {
                          const key = `${item.id}-${ri}`;
                          return (
                            <label key={ri} className="flex items-start gap-2.5 cursor-pointer group" onClick={() => toggleCheck(key)}>
                              <div className={`w-4.5 h-4.5 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${checked[key] ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 group-hover:border-primary'}`} style={{ width: '18px', height: '18px' }}>
                                {checked[key] && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </div>
                              <span className={`text-sm transition-colors ${checked[key] ? 'text-foreground/40 line-through' : 'text-foreground/70'}`} style={{ fontFamily: 'var(--font-body)' }}>{req}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
