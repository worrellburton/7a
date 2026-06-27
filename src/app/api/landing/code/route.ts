import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-gates';
import { LANDING_EDITABLE_FILES, isLandingEditableFile } from '@/lib/landing-files';
import {
  loadGithubConfig,
  GithubNotConfiguredError,
  getFile,
  getBranchHeadSha,
  createBranch,
  putFile,
  createPullRequest,
  listRecentPullStates,
  applyEdits,
  type FileChange,
} from '@/lib/github-edit';

// POST /api/landing/code — propose a landing-page change.
// GET  /api/landing/code — recent PRs opened through the tab (+ status).
//
// POST flow: admin describes a change (optionally with screenshots) →
// Claude proposes surgical old_string/new_string edits to the public
// landing source → we validate every path against LANDING_EDITABLE_FILES,
// apply the edits, commit them to a fresh branch, open a PR into `main`,
// and record the PR (+ requester + the edits, for revert) in
// landing_code_requests. Nothing ships until the admin merges the PR.
//
// Required env: ANTHROPIC_API_KEY, GITHUB_TOKEN. Optional: GITHUB_REPO,
// GITHUB_BASE_BRANCH (default main), ANTHROPIC_MODEL.

export const runtime = 'nodejs';
export const maxDuration = 60;

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-opus-4-8';
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || 'main';
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

interface ProposedEdit {
  summary: string;
  pr_title: string;
  pr_body: string;
  changes: FileChange[];
}

const EDIT_TOOL = {
  name: 'propose_landing_edit',
  description:
    'Propose precise code edits to the landing-page source files to satisfy the request. Use one or more old_string/new_string edits per file.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One short sentence describing the change for a non-technical reviewer.' },
      pr_title: { type: 'string', description: 'A concise pull-request title.' },
      pr_body: { type: 'string', description: 'Markdown PR body explaining what changed and why.' },
      changes: {
        type: 'array',
        description: 'Files to change. Omit files you are not changing.',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Exact repo path of the file to edit.' },
            edits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  old_string: {
                    type: 'string',
                    description: 'Exact existing text to replace — must match the file byte-for-byte (including indentation) and be UNIQUE in the file. Include enough surrounding context to be unique.',
                  },
                  new_string: { type: 'string', description: 'The replacement text.' },
                },
                required: ['old_string', 'new_string'],
                additionalProperties: false,
              },
            },
          },
          required: ['path', 'edits'],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'pr_title', 'pr_body', 'changes'],
    additionalProperties: false,
  },
} as const;

const SYSTEM_PROMPT = `You are a senior frontend engineer editing the SOURCE CODE of Seven Arrows Recovery's public landing page (the residential-inpatient page), a Next.js + React + TypeScript + Tailwind app.

You will be given the current contents of the editable landing files, a plain-English change request from a non-technical admin, and optionally screenshots illustrating what they mean. Make the smallest change that satisfies the request.

Rules:
- Only edit the files you were given. Never invent new file paths.
- Return changes ONLY via the propose_landing_edit tool.
- Each edit is an exact-match string replacement: old_string MUST appear in the file byte-for-byte (including whitespace/indentation) and MUST be unique — include enough surrounding context to guarantee uniqueness.
- Preserve the existing code style, imports, and TypeScript types. Do not reformat unrelated code.
- Keep the JSX/TSX valid. Do not remove "use client", props, or types that are still used.
- If the request is ambiguous, make the most reasonable minimal interpretation and explain it in pr_body.
- Write pr_title and summary in plain language an admin will understand.`;

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }, { status: 503 });
  }

  let cfg;
  try {
    cfg = loadGithubConfig();
  } catch (e) {
    if (e instanceof GithubNotConfiguredError) {
      return NextResponse.json(
        { error: 'GitHub is not connected yet. Add a GITHUB_TOKEN (with Contents + Pull request write access to the repo) in the Vercel project settings to enable the Code editor.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    instruction?: string;
    paths?: string[];
    images?: Array<{ media_type?: string; data?: string }>;
  };
  const instruction = (body.instruction || '').trim();
  if (!instruction) return NextResponse.json({ error: 'Describe the change you want to make.' }, { status: 400 });

  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((im) => im && typeof im.data === 'string' && im.media_type && ALLOWED_IMAGE_TYPES.has(im.media_type))
    .slice(0, 6) as Array<{ media_type: string; data: string }>;

  const requested = Array.isArray(body.paths) ? body.paths.filter(isLandingEditableFile) : [];
  const targetPaths = requested.length > 0 ? requested : [...LANDING_EDITABLE_FILES];

  try {
    // 1. Read the current source of the candidate files from `main`.
    const files = await Promise.all(
      targetPaths.map(async (path) => ({ path, ...(await getFile(cfg, path, BASE_BRANCH)) })),
    );

    // 2. Ask Claude for surgical edits (with any screenshots attached).
    const promptText =
      `Change request:\n${instruction}\n\n` +
      (images.length > 0 ? `(${images.length} screenshot(s) attached above for reference.)\n\n` : '') +
      `Here are the current landing files you may edit:\n\n` +
      files.map((f) => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``).join('\n\n');
    const userBlocks = [
      ...images.map((im) => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: im.media_type, data: im.data },
      })),
      { type: 'text' as const, text: promptText },
    ];

    const claudeRes = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': CLAUDE_VERSION, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: [EDIT_TOOL],
        tool_choice: { type: 'tool', name: 'propose_landing_edit' },
        messages: [{ role: 'user', content: userBlocks }],
      }),
    });
    const claudeJson = (await claudeRes.json()) as {
      content?: Array<{ type: string; name?: string; input?: unknown }>;
      error?: { message?: string };
    };
    if (!claudeRes.ok) {
      return NextResponse.json({ error: claudeJson.error?.message ?? `Claude HTTP ${claudeRes.status}` }, { status: 502 });
    }
    const toolBlock = (claudeJson.content ?? []).find((b) => b.type === 'tool_use' && b.name === 'propose_landing_edit');
    if (!toolBlock?.input) {
      return NextResponse.json({ error: 'Claude did not return any edits. Try rephrasing.' }, { status: 422 });
    }
    const proposal = toolBlock.input as ProposedEdit;
    const changes = Array.isArray(proposal.changes) ? proposal.changes : [];
    if (changes.length === 0) {
      return NextResponse.json({ error: 'No file changes were proposed for that request.' }, { status: 422 });
    }

    // 3. Validate + apply against fresh content from `main`.
    const toCommit: Array<{ path: string; content: string; sha: string }> = [];
    const appliedChanges: FileChange[] = [];
    for (const change of changes) {
      if (!isLandingEditableFile(change.path)) {
        return NextResponse.json({ error: `Refusing to edit a non-landing file: ${change.path}` }, { status: 422 });
      }
      const current = await getFile(cfg, change.path, BASE_BRANCH);
      let next: string;
      try {
        next = applyEdits(current.content, change.edits || []);
      } catch (e) {
        return NextResponse.json({ error: `${change.path}: ${e instanceof Error ? e.message : String(e)}` }, { status: 422 });
      }
      if (next !== current.content) {
        toCommit.push({ path: change.path, content: next, sha: current.sha });
        appliedChanges.push(change);
      }
    }
    if (toCommit.length === 0) {
      return NextResponse.json({ error: 'The proposed edits did not change anything.' }, { status: 422 });
    }

    // 4. Branch, commit each file, open the PR into `main`.
    const branch = `claude/landing-${Date.now()}`;
    const baseSha = await getBranchHeadSha(cfg, BASE_BRANCH);
    await createBranch(cfg, branch, baseSha);
    for (const f of toCommit) {
      await putFile(cfg, f.path, f.content, proposal.pr_title || 'Landing edit', branch, f.sha);
    }
    const requesterEmail = gate.user.email ?? null;
    let requesterName: string | null = null;
    try {
      const u = await gate.admin.from('users').select('full_name').eq('id', gate.userId).maybeSingle();
      requesterName = (u.data?.full_name as string | undefined) ?? null;
    } catch { /* name is best-effort */ }
    const prBody =
      `${proposal.pr_body || proposal.summary || ''}\n\n---\n` +
      `Requested via the Feather Landing → Code editor by ${requesterName || requesterEmail || gate.userId}.\n\n` +
      `**Request:** ${instruction}`;
    const pr = await createPullRequest(cfg, {
      title: proposal.pr_title || 'Landing page edit',
      head: branch,
      base: BASE_BRANCH,
      body: prBody,
    });

    // 5. Record it for the history panel + future revert (best-effort).
    const changedFiles = toCommit.map((f) => f.path);
    try {
      await gate.admin.from('landing_code_requests').insert({
        pr_number: pr.number,
        pr_url: pr.html_url,
        title: proposal.pr_title || 'Landing page edit',
        summary: proposal.summary || null,
        instruction,
        changed_files: changedFiles,
        changes: appliedChanges,
        branch,
        requested_by: gate.userId,
        requested_by_email: requesterEmail,
        requested_by_name: requesterName,
      });
    } catch { /* history is best-effort; never fail the PR over it */ }

    return NextResponse.json({
      ok: true,
      summary: proposal.summary || proposal.pr_title || 'Landing edit proposed.',
      prUrl: pr.html_url,
      prNumber: pr.number,
      branch,
      changedFiles,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const { data, error } = await gate.admin
    .from('landing_code_requests')
    .select('id, pr_number, pr_url, title, summary, changed_files, requested_by_name, requested_by_email, reverts_pr_number, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort live status enrichment so the panel can badge each PR
  // open / merged / closed. Skipped silently if GitHub isn't connected.
  let states: Map<number, 'open' | 'closed' | 'merged'> | null = null;
  try {
    states = await listRecentPullStates(loadGithubConfig());
  } catch { /* no token / network — fall back to no status */ }

  const items = (data ?? []).map((r) => ({
    ...r,
    status: states?.get(r.pr_number) ?? null,
  }));
  return NextResponse.json({ items });
}
