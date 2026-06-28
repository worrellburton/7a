import { NextRequest, NextResponse } from 'next/server';
import { requireCodeAccess } from '@/lib/api-gates';
import { loadGithubConfig, GithubNotConfiguredError, getTreePaths } from '@/lib/github-edit';
import { buildEditablePages } from '@/lib/editable-pages';

// GET /api/landing/code/sitemap — the list of public pages the Code tab
// can edit, grouped, built live from the repo tree (so it auto-syncs and
// never includes Feather). Files are omitted from the response; the
// server resolves keys → files on POST.

export const runtime = 'nodejs';
export const maxDuration = 30;
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || 'main';

export async function GET(req: NextRequest) {
  const gate = await requireCodeAccess(req);
  if (gate instanceof NextResponse) return gate;

  let cfg;
  try {
    cfg = loadGithubConfig();
  } catch (e) {
    if (e instanceof GithubNotConfiguredError) return NextResponse.json({ pages: [] });
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  try {
    const paths = await getTreePaths(cfg, BASE_BRANCH);
    const pages = buildEditablePages(paths).map(({ key, route, label, group }) => ({ key, route, label, group }));
    return NextResponse.json({ pages });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
