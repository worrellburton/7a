import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';
import { isEditablePath } from '@/lib/editable-pages';
import {
  loadGithubConfig,
  GithubNotConfiguredError,
  getFile,
  getBranchHeadSha,
  createBranch,
  putFile,
  createPullRequest,
  applyEdits,
  reverseChanges,
  type FileChange,
} from '@/lib/github-edit';

// POST /api/landing/code/revert — open a PR that undoes a previous
// Landing → Code change. We stored the applied edits per file, so a
// revert swaps new→old (in reverse order) and applies them to the
// current `main` content. If the file has moved on since, the reverse
// edit won't match and we say so rather than guess.
//
// Like the propose route, this only ever opens a PR — the admin still
// reviews + merges to actually roll the change back.

export const runtime = 'nodejs';
export const maxDuration = 60;

const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || 'main';

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  let cfg;
  try {
    cfg = loadGithubConfig();
  } catch (e) {
    if (e instanceof GithubNotConfiguredError) {
      return NextResponse.json({ error: 'GitHub is not connected yet (set GITHUB_TOKEN in Vercel).' }, { status: 503 });
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const id = (body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Missing the change id to revert.' }, { status: 400 });

  const { data: record, error } = await gate.admin
    .from('landing_code_requests')
    .select('id, pr_number, title, changes')
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!record) return NextResponse.json({ error: 'That change was not found.' }, { status: 404 });

  const original = (Array.isArray(record.changes) ? record.changes : []) as FileChange[];
  if (original.length === 0) {
    return NextResponse.json({ error: 'Nothing recorded to revert for that change.' }, { status: 422 });
  }
  const reversed = reverseChanges(original);

  try {
    const toCommit: Array<{ path: string; content: string; sha: string }> = [];
    for (const change of reversed) {
      if (!isEditablePath(change.path)) {
        return NextResponse.json({ error: `Refusing to edit a file outside the public website: ${change.path}` }, { status: 422 });
      }
      const current = await getFile(cfg, change.path, BASE_BRANCH);
      let next: string;
      try {
        next = applyEdits(current.content, change.edits);
      } catch (e) {
        return NextResponse.json(
          { error: `${change.path}: ${e instanceof Error ? e.message : String(e)}. This section may have changed since — revert manually on GitHub.` },
          { status: 422 },
        );
      }
      if (next !== current.content) toCommit.push({ path: change.path, content: next, sha: current.sha });
    }
    if (toCommit.length === 0) {
      return NextResponse.json({ error: 'Already reverted — no change needed.' }, { status: 422 });
    }

    const branch = `claude/landing-revert-${record.pr_number}-${Date.now()}`;
    const title = `Revert: ${record.title}`;
    const baseSha = await getBranchHeadSha(cfg, BASE_BRANCH);
    await createBranch(cfg, branch, baseSha);
    for (const f of toCommit) {
      await putFile(cfg, f.path, f.content, title, branch, f.sha);
    }
    const requesterEmail = gate.user.email ?? null;
    let requesterName: string | null = null;
    try {
      const u = await gate.admin.from('users').select('full_name').eq('id', gate.userId).maybeSingle();
      requesterName = (u.data?.full_name as string | undefined) ?? null;
    } catch { /* best-effort */ }
    const pr = await createPullRequest(cfg, {
      title,
      head: branch,
      base: BASE_BRANCH,
      body: `Reverts the change from PR #${record.pr_number} (${record.title}).\n\nRequested via the Feather Landing → Code editor by ${requesterName || requesterEmail || gate.userId}.`,
    });

    // The revert is staged as a PR — the admin ships it with "Push live".
    try {
      await gate.admin.from('landing_code_requests').insert({
        pr_number: pr.number,
        pr_url: pr.html_url,
        title,
        summary: `Reverts PR #${record.pr_number}`,
        instruction: `Revert PR #${record.pr_number}`,
        changed_files: toCommit.map((f) => f.path),
        changes: reversed,
        branch,
        requested_by: gate.userId,
        requested_by_email: requesterEmail,
        requested_by_name: requesterName,
        reverts_pr_number: record.pr_number,
      });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true, prUrl: pr.html_url, prNumber: pr.number, branch, deployed: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
