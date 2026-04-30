import type { SupabaseClient } from '@supabase/supabase-js';
import { MARKETING_ADMISSIONS_DEPT_ID } from '@/lib/website-requests-auth';

// Returns true when `userId` should receive contact-submission
// toast notifications. Audience is super admins + members of the
// Marketing & Admissions department (single combined dept on this
// org). Other admins don't get the toast — keeps the notification
// targeted at the people who actually triage the inbox.

export interface AudienceCheck {
  isAudience: boolean;
  isSuperAdmin: boolean;
  departmentId: string | null;
}

export async function checkContactSubmissionAudience(
  supabase: SupabaseClient,
  userId: string,
): Promise<AudienceCheck> {
  const { data } = await supabase
    .from('users')
    .select('is_super_admin, department_id')
    .eq('id', userId)
    .maybeSingle();
  const isSuperAdmin = data?.is_super_admin === true;
  const departmentId = (data?.department_id as string | null | undefined) ?? null;
  const isAudience =
    isSuperAdmin || departmentId === MARKETING_ADMISSIONS_DEPT_ID;
  return { isAudience, isSuperAdmin, departmentId };
}
