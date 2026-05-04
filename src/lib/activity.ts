import { db } from './db';

// Fire-and-forget activity logger. Writes to public.activity_log.
// Silently ignores failures so callers never block on telemetry.

export interface LogActivityInput {
  userId: string;
  type: string; // e.g. 'jd.signed', 'jd.updated', 'doc.uploaded', 'user.role_changed'
  targetKind?: string; // e.g. 'job_description', 'calendar_event', 'user'
  targetId?: string;
  targetLabel?: string; // Human-readable label, e.g. JD title
  targetPath?: string; // e.g. '/app/job-descriptions/<id>'
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await db({
      action: 'insert',
      table: 'activity_log',
      data: [
        {
          user_id: input.userId,
          type: input.type,
          target_kind: input.targetKind || null,
          target_id: input.targetId || null,
          target_label: input.targetLabel || null,
          target_path: input.targetPath || null,
          metadata: input.metadata || {},
        },
      ],
    });
  } catch {
    // best-effort
  }
}
