import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// Website Requests is the Marketing & Admissions department's inbox
// (VOBs, contact forms, careers). Access is granted to admins or to
// any user assigned to the Marketing & Admissions department — kept
// in sync with the page-level permission row at /app/website-requests.
export const MARKETING_ADMISSIONS_DEPT_ID = 'dfde0b96-c605-40dd-84e5-281af2f6d8e9';

type Allowed = { user: User; isAdmin: boolean; departmentId: string | null; response?: undefined };
type Denied = { response: NextResponse; user?: undefined; isAdmin?: undefined; departmentId?: undefined };

export async function requireWebsiteRequestsAccess(
  supabase: SupabaseClient,
): Promise<Allowed | Denied> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: row } = await supabase
    .from('users')
    .select('is_admin, department_id')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = row?.is_admin === true;
  const departmentId = (row?.department_id as string | null | undefined) ?? null;
  if (!isAdmin && departmentId !== MARKETING_ADMISSIONS_DEPT_ID) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, isAdmin, departmentId };
}
