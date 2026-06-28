import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';
import {
  loadGithubConfig,
  GithubNotConfiguredError,
  mergePullRequest,
  mergeIntoBranch,
} from '@/lib/github-edit';

// POST /api/landing/code/push — ship a staged Landing → Code change live.
//
// Propose + revert only OPEN a PR into `main`; nothing deploys until an
// admin presses "Push live". This squash-merges that PR into `main` and
// then merge-commits `main` → `master`, which is what triggers the Vercel
// production build (production deploys from master, per the deploy
// workflow). 204 from the master merge (nothing to merge) is fine.

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

  const body = (await req.json().catch(() => ({}))) as { prNumber?: number };
  const prNumber = Number(body.prNumber);
  if (!prNumber || !Number.isInteger(prNumber)) {
    return NextResponse.json({ error: 'Missing the PR number to push live.' }, { status: 400 });
  }

  try {
    // 1. Merge the change into main.
    await mergePullRequest(cfg, prNumber, 'squash');
    // 2. Sync main → master to trigger the production deploy.
    await mergeIntoBranch(cfg, 'master', BASE_BRANCH, `Deploy: push live PR #${prNumber}`);
    return NextResponse.json({ ok: true, deployed: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't push live: ${e instanceof Error ? e.message : String(e)}. You can still merge the PR on GitHub.` },
      { status: 502 },
    );
  }
}
