import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbirikzsrwmgqxlazglm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiaXJpa3pzcndtZ3F4bGF6Z2xtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1NDM0NCwiZXhwIjoyMDkxMTMwMzQ0fQ.m-DLbJCRb6uNnxpL2gKD-CcPmez2NLeRzrXJuSqRij4';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiaXJpa3pzcndtZ3F4bGF6Z2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTQzNDQsImV4cCI6MjA5MTEzMDM0NH0.FGNU8Myke7Pwqkv-8vr37zvRNhzELB95bmOYaxAFR14';

const admin = createClient(supabaseUrl, supabaseServiceKey);

const ALLOWED_TABLES = ['facilities_issues', 'groups', 'users', 'page_permissions', 'equine', 'billing_patients', 'billing_claims'];

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await client.auth.getUser(token);
  return user;
}

// POST /api/db — generic DB operations
// Body: { action: 'select'|'insert'|'update'|'delete'|'upsert', table: string, data?: any, match?: any, select?: string, order?: { column: string, ascending: boolean } }
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, table, data, match, select, order } = body;

  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });
  }

  try {
    if (action === 'select') {
      let query = admin.from(table).select(select || '*');
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? true });
      }
      const { data: rows, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(rows);
    }

    if (action === 'insert') {
      const { data: row, error } = await admin.from(table).insert(data).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(row);
    }

    if (action === 'update') {
      let query = admin.from(table).update(data);
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      const { error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'upsert') {
      const { error } = await admin.from(table).upsert(data, { onConflict: body.onConflict || 'id' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete') {
      let query = admin.from(table).delete();
      if (match) {
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value);
        }
      }
      const { error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
