import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-server';

// GET /api/public/horses — public-safe projection of the `equine` table for
// the marketing site. Only returns horses that have a photo, and only
// includes fields that are appropriate to expose publicly (no weight,
// body_score, ownership papers, or internal notes).

export const dynamic = 'force-dynamic';

interface PublicHorse {
  id: string;
  name: string;
  age: number | null;
  works_in: string | null;
  rideable: string | null;
  behavior: string | null;
  notes: string | null;
  image_url: string | null;
}

export async function GET() {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('equine')
    .select('id, name, age, works_in, rideable, behavior, notes, image_url')
    .not('image_url', 'is', null)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []).filter((h) => (h.image_url || '').trim() !== '') as PublicHorse[];
  return NextResponse.json({ horses: rows });
}
