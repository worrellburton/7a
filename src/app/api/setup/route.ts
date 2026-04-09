import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbirikzsrwmgqxlazglm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiaXJpa3pzcndtZ3F4bGF6Z2xtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1NDM0NCwiZXhwIjoyMDkxMTMwMzQ0fQ.m-DLbJCRb6uNnxpL2gKD-CcPmez2NLeRzrXJuSqRij4';

const dbPassword = process.env.SUPABASE_DB_PASSWORD || '';

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({ secret: '' }));
  if (secret !== 'setup-7a-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If we have a DB password, use direct postgres connection
  if (dbPassword) {
    try {
      const postgres = (await import('postgres')).default;
      const sql = postgres(`postgresql://postgres.xbirikzsrwmgqxlazglm:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`);

      await sql`
        CREATE TABLE IF NOT EXISTS equine (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          name text NOT NULL,
          age integer,
          body_score numeric,
          weight text,
          works_in text,
          rideable text,
          shoe_schedule text,
          behavior text,
          needs_next_steps text,
          internal_info text,
          ownership_papers text,
          document_urls text[] DEFAULT ARRAY[]::text[],
          created_at timestamptz DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS billing_patients (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          first_name text NOT NULL,
          last_name text NOT NULL,
          date_of_birth text,
          gender text,
          member_id text,
          policy_number text,
          payer_name text,
          payer_id text,
          address text,
          city text,
          state text,
          zip text,
          created_at timestamptz DEFAULT now()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS billing_claims (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          patient_id uuid,
          status text DEFAULT 'Draft',
          claim_type text DEFAULT 'Institutional',
          admission_date text,
          discharge_date text,
          diagnosis_codes text[] DEFAULT ARRAY[]::text[],
          procedure_code text,
          procedure_modifier text,
          revenue_code text,
          charge_amount numeric,
          units integer DEFAULT 1,
          place_of_service text DEFAULT '55',
          authorization_number text,
          stedi_claim_id text,
          stedi_response jsonb,
          submitted_at timestamptz,
          submitted_by text,
          created_at timestamptz DEFAULT now()
        )
      `;

      await sql.end();
      return NextResponse.json({ ok: true, method: 'postgres' });
    } catch (err) {
      return NextResponse.json({ error: String(err), method: 'postgres' }, { status: 500 });
    }
  }

  // Fallback: try using Supabase admin client to test if tables exist
  const admin = createClient(supabaseUrl, supabaseServiceKey);
  const results: Record<string, string> = {};

  for (const table of ['equine', 'billing_patients', 'billing_claims']) {
    const { error } = await admin.from(table).select('id').limit(0);
    results[table] = error ? `missing: ${error.message}` : 'exists';
  }

  return NextResponse.json({
    ok: false,
    message: 'No SUPABASE_DB_PASSWORD set. Tables need to be created via Supabase Dashboard SQL Editor.',
    tables: results,
    sql: `
-- Run this in Supabase Dashboard > SQL Editor:

CREATE TABLE IF NOT EXISTS equine (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  age integer,
  body_score numeric,
  weight text,
  works_in text,
  rideable text,
  shoe_schedule text,
  behavior text,
  needs_next_steps text,
  internal_info text,
  ownership_papers text,
  document_urls text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_patients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth text,
  gender text,
  member_id text,
  policy_number text,
  payer_name text,
  payer_id text,
  address text,
  city text,
  state text,
  zip text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid,
  status text DEFAULT 'Draft',
  claim_type text DEFAULT 'Institutional',
  admission_date text,
  discharge_date text,
  diagnosis_codes text[] DEFAULT ARRAY[]::text[],
  procedure_code text,
  procedure_modifier text,
  revenue_code text,
  charge_amount numeric,
  units integer DEFAULT 1,
  place_of_service text DEFAULT '55',
  authorization_number text,
  stedi_claim_id text,
  stedi_response jsonb,
  submitted_at timestamptz,
  submitted_by text,
  created_at timestamptz DEFAULT now()
);
    `.trim()
  });
}
