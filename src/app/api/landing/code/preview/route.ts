import { NextRequest, NextResponse } from 'next/server';
import { requireCodeAccess } from '@/lib/api-gates';
import { loadGithubConfig, GithubNotConfiguredError, getPreviewUrl } from '@/lib/github-edit';

// GET /api/landing/code/preview?branch=<branch> — return the Vercel
// preview deployment URL for a staged change's branch, read back from
// the GitHub deployment statuses Vercel posts. Lets the admin VIEW a
// change on its own preview deploy before pushing it live. Returns
// { url: null } while the preview is still building.

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const gate = await requireCodeAccess(req);
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

  const branch = (req.nextUrl.searchParams.get('branch') || '').trim();
  if (!branch) return NextResponse.json({ error: 'Missing the branch to preview.' }, { status: 400 });

  try {
    const url = await getPreviewUrl(cfg, branch);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
