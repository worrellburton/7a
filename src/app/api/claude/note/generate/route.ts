import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-server';

// POST /api/claude/note/generate — draft a comprehensive, insurance-ready
// clinical note. Accepts the note type (group | individual | biopsychosocial)
// plus client context + any partial fields the clinician has already filled.
// Returns a JSON object keyed by the template field names.
//
// Required env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (defaults to claude-opus-4-6)

const DEFAULT_MODEL = 'claude-opus-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

type NoteType = 'group' | 'individual' | 'biopsychosocial';

type GenerateBody = {
  noteType?: NoteType;
  client?: {
    name?: string;
    pronouns?: string | null;
    age?: number | null;
    primary_substance?: string | null;
    admission_date?: string | null;
    notes?: string | null;
  };
  existing?: Record<string, string | number | null | undefined>;
};

const GROUP_FIELDS = [
  'session_title', 'session_date', 'session_duration_min', 'facilitator',
  'topic', 'attendance_count', 'asam_dimension_focus',
  'group_process', 'client_participation', 'interventions', 'plan',
];

const INDIVIDUAL_FIELDS = [
  'session_date', 'session_duration_min', 'clinician',
  'presenting_concern', 'mental_status', 'mood_affect', 'interventions',
  'dim1', 'dim2', 'dim3', 'dim4', 'dim5', 'dim6',
  'progress', 'plan', 'next_session',
];

const BPS_FIELDS = [
  'assessment_date', 'clinician', 'presenting_problem',
  'medical_history', 'current_medications', 'pain_concerns',
  'psychiatric_history', 'current_symptoms', 'trauma_history', 'cognitive_functioning',
  'family_history', 'social_support', 'housing_employment', 'legal_involvement', 'cultural_spiritual',
  'substance_use_history', 'current_use_pattern', 'withdrawal_risk', 'previous_treatment',
  'dim1', 'dim2', 'dim3', 'dim4', 'dim5', 'dim6',
  'strengths_resources', 'barriers', 'diagnostic_impression',
  'recommended_level_of_care', 'initial_treatment_goals',
];

function fieldsFor(type: NoteType): string[] {
  if (type === 'group') return GROUP_FIELDS;
  if (type === 'individual') return INDIVIDUAL_FIELDS;
  return BPS_FIELDS;
}

function promptFor(type: NoteType, client: GenerateBody['client'], existing: Record<string, unknown>): string {
  const c = client || {};
  const clientLine = [
    c.name && `Name: ${c.name}`,
    c.pronouns && `Pronouns: ${c.pronouns}`,
    c.age && `Age: ${c.age}`,
    c.primary_substance && `Primary substance: ${c.primary_substance}`,
    c.admission_date && `Admission: ${c.admission_date}`,
  ].filter(Boolean).join(' · ');

  const existingLines = Object.entries(existing)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `  ${k}: ${String(v).replace(/\n/g, ' ').slice(0, 300)}`)
    .join('\n');

  const preface = `You are a senior clinical documentation specialist at Seven Arrows Recovery — a residential behavioral-health and substance-use treatment facility using trauma-informed, equine-assisted care. Produce a comprehensive, insurance-ready ${type.toUpperCase()} note for the client below.

CLIENT CONTEXT:
${clientLine || '  (fictional / de-identified client)'}

${existingLines ? `FIELDS ALREADY FILLED BY CLINICIAN (preserve exactly, build around them):\n${existingLines}\n` : ''}
INSURANCE / AUDIT STANDARD — every field should:
- Use professional clinical language (no filler, no fluff).
- Be specific, observable, and measurable where possible.
- Demonstrate medical necessity and link interventions to ASAM dimensions.
- Be free of PHI beyond what is supplied.
- Use complete sentences. No bullet characters. No markdown.
`;

  if (type === 'group') {
    return `${preface}
Return ONLY this JSON shape — no prose, no markdown fences:
{
  "session_title": "<concise evidence-based topic>",
  "session_date": "<YYYY-MM-DD, use today if not supplied>",
  "session_duration_min": <number, typical 50-90>,
  "facilitator": "<licensed clinician name or leave blank if unknown>",
  "topic": "<2-3 sentences describing the session focus, objectives, and therapeutic rationale>",
  "attendance_count": "<integer as string>",
  "asam_dimension_focus": "<one of: dim1, dim2, dim3, dim4, dim5, dim6>",
  "group_process": "<3-5 sentences describing group dynamics, themes explored, therapeutic alliance, notable peer interactions>",
  "client_participation": "<3-5 sentences describing THIS client's engagement: verbal participation, affect, insight, risk behaviors, progress toward goals>",
  "interventions": "<2-3 sentences naming specific evidence-based modalities used (CBT, DBT, MI, psychoeducation, Seeking Safety, mindfulness, equine-assisted processing) and how each was applied>",
  "plan": "<2-3 sentences with concrete next steps, coordination needs, homework, and follow-up indicators>"
}`;
  }

  if (type === 'individual') {
    return `${preface}
Return ONLY this JSON shape — no prose, no markdown fences:
{
  "session_date": "<YYYY-MM-DD, today if not supplied>",
  "session_duration_min": <number, typical 45-60>,
  "clinician": "<licensed clinician name or leave blank>",
  "presenting_concern": "<2-3 sentences stating the chief concern and focus of today's session>",
  "mental_status": "<Full MSE in one paragraph: appearance, behavior, orientation, speech, thought process/content, perception, cognition, insight, judgment>",
  "mood_affect": "<mood (client report) and affect (observed) in one sentence>",
  "interventions": "<3-4 sentences naming specific evidence-based modalities (CBT, DBT skills, MI, EMDR, trauma processing, equine-assisted) and how each was applied this session>",
  "dim1": "<Intoxication/Withdrawal/Addiction Meds — 2-3 sentences: current sobriety, cravings, MAT status, withdrawal risk>",
  "dim2": "<Biomedical — 2-3 sentences: chronic conditions, pain, medication adherence, recent labs if relevant>",
  "dim3": "<Psychiatric/Cognitive — 2-3 sentences: mood/anxiety/trauma symptoms, suicide/homicide risk, cognitive functioning>",
  "dim4": "<SUD-Related Risks — 2-3 sentences: relapse triggers, motivation stage, readiness to change>",
  "dim5": "<Recovery Environment — 2-3 sentences: housing, family, peer support, sober network, stressors>",
  "dim6": "<Person-Centered — 2-3 sentences: cultural/spiritual considerations, goals, strengths, treatment preferences>",
  "progress": "<3-4 sentences: measurable progress toward treatment plan goals with specific indicators>",
  "plan": "<3-4 sentences: concrete next steps, coordination with team, assigned homework, medication review, level-of-care considerations>",
  "next_session": "<scheduled date or cadence>"
}`;
  }

  return `${preface}
Return ONLY this JSON shape — no prose, no markdown fences:
{
  "assessment_date": "<YYYY-MM-DD, today if not supplied>",
  "clinician": "<licensed assessing clinician>",
  "presenting_problem": "<4-6 sentences in client's voice and clinical interpretation: chief complaint, precipitating events, prior help-seeking>",
  "medical_history": "<3-5 sentences: chronic conditions, surgeries, hospitalizations, chronic pain, current PCP>",
  "current_medications": "<list every medication with dose, frequency, prescriber>",
  "pain_concerns": "<2-4 sentences: pain history, current management strategies, impact on functioning>",
  "psychiatric_history": "<3-5 sentences: prior diagnoses, hospitalizations, SI/HI history, past medications and response>",
  "current_symptoms": "<3-5 sentences covering depression, anxiety, trauma, psychosis, mania with frequency and severity>",
  "trauma_history": "<3-5 sentences: ACE exposure, abuse, neglect, losses, current trauma response patterns>",
  "cognitive_functioning": "<2-3 sentences: orientation, attention, memory, executive function, any cognitive concerns>",
  "family_history": "<3-4 sentences: family of origin, substance use in family, mental health history, current family involvement>",
  "social_support": "<3-4 sentences: relationships, sponsor, recovery community, friends, support network quality>",
  "housing_employment": "<2-4 sentences: current living situation, employment status, financial stressors>",
  "legal_involvement": "<1-3 sentences: current charges, probation/parole, pending cases, DUIs, custody issues>",
  "cultural_spiritual": "<2-3 sentences: cultural identity, spiritual practices, community belonging, values>",
  "substance_use_history": "<5-7 sentences: EVERY substance with age of onset, route, frequency, duration, periods of abstinence>",
  "current_use_pattern": "<3-4 sentences: last use, current pattern, triggers, quantity, method>",
  "withdrawal_risk": "<2-4 sentences: prior withdrawal severity, seizure/DT history, most recent CIWA/COWS if available, medical risk>",
  "previous_treatment": "<3-5 sentences: every prior episode with setting, duration, outcome, what worked, barriers to sustained recovery>",
  "dim1": "<ASAM D1 — 3-4 sentences fully staffed with withdrawal risk, MAT status, cravings>",
  "dim2": "<ASAM D2 — 3-4 sentences with biomedical considerations impacting treatment>",
  "dim3": "<ASAM D3 — 3-4 sentences with psychiatric acuity, risk, cognitive status>",
  "dim4": "<ASAM D4 — 3-4 sentences with readiness to change, stage of change>",
  "dim5": "<ASAM D5 — 3-4 sentences on recovery environment supports and stressors>",
  "dim6": "<ASAM D6 — 3-4 sentences on person-centered factors and preferences>",
  "strengths_resources": "<3-4 sentences: client strengths, protective factors, motivation, resources>",
  "barriers": "<2-4 sentences: treatment barriers, ambivalence, external constraints>",
  "diagnostic_impression": "<DSM-5-TR working diagnoses with full codes for SUD + co-occurring conditions, including severity specifiers>",
  "recommended_level_of_care": "<ASAM level with full label, e.g. '3.5 — Clinically Managed High-Intensity Residential Services', and 1-2 sentences justifying medical necessity>",
  "initial_treatment_goals": "<4-6 SMART goals prioritized, each 1-2 sentences, each tied to an ASAM dimension>"
}`;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as GenerateBody;
  const noteType = body.noteType;
  if (noteType !== 'group' && noteType !== 'individual' && noteType !== 'biopsychosocial') {
    return NextResponse.json({ error: 'noteType must be group | individual | biopsychosocial' }, { status: 400 });
  }

  const prompt = promptFor(noteType, body.client || {}, body.existing || {});
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Anthropic API error (${res.status}): ${text}` }, { status: res.status });
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('')
      .trim();

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Could not parse Claude output as JSON.', raw: text }, { status: 502 });
    }

    // Keep only expected fields; coerce to string/number.
    const allowed = new Set(fieldsFor(noteType));
    const result: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!allowed.has(k)) continue;
      if (typeof v === 'number') result[k] = v;
      else if (typeof v === 'string') result[k] = v;
      else if (v !== null && v !== undefined) result[k] = String(v);
    }

    return NextResponse.json({ fields: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
