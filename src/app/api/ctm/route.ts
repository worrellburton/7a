import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbirikzsrwmgqxlazglm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiaXJpa3pzcndtZ3F4bGF6Z2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTQzNDQsImV4cCI6MjA5MTEzMDM0NH0.FGNU8Myke7Pwqkv-8vr37zvRNhzELB95bmOYaxAFR14';

const CTM_BASE = 'https://api.calltrackingmetrics.com/api/v1';
const CTM_TOKEN = 'YTU4NDUwMWRkYzMwYTY5YjJhZjJiZWVmNjU3ZWE1N2U3ZmE0ZDQzZToyZGRkZGUzNjYxNmY0YWFjYTZlYzJkZmYyMmNhNGUzMDYyYjY=';

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await client.auth.getUser(token);
  return user;
}

// POST /api/ctm — proxy CTM API requests
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { endpoint, params } = body;

  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

  try {
    const url = new URL(`${CTM_BASE}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${CTM_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `CTM API error (${res.status}): ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
