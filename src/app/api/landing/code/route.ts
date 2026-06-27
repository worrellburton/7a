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
} from '@/lib/github-edit';

// POST /api/landing/code — the Landing → Code editor.
//
// Flow: admin describes a change → Claude proposes surgical edits to
// the public landing-page source (old_string/new_string per file) →
// we validate every path against the LANDING_EDITABLE_FILES allowlist,
// apply the edits, commit them to a fresh branch, and open a PR into
// `main`. The admin reviews + merges the PR; the existing main→master
// deploy sync ships it. Nothing reaches production without that review.
//
// Required env: ANTHROPIC_API_KEY, GITHUB_TOKEN (fine-grained PAT with
// Contents + Pull requests write on the repo). Optional: GITHUB_REPO
// ("owner/name", default worrellburton/7a), ANTHROPIC_MODEL.

export const runtime = 'nodejs';
export const maxDuration = 60;

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-opus-4-8';
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || 'main';

interface EditOp { old_string: string; new_string: string }
interface FileChange { path: string; edits: EditOp[] }
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

You will be given the current contents of the editable landing files and a plain-English change request from a non-technical admin. Make the smallest change that satisfies the request.

Rules:
- Only edit the files you were given. Never invent new file paths.
- Return changes ONLY via the propose_landing_edit tool.
- Each edit is an exact-match string replacement: old_string MUST appear in the file byte-for-byte (including whitespace/indentation) and MUST be unique — include enough surrounding context to guarantee uniqueness.
- Preserve the existing code style, imports, and TypeScript types. Do not reformat unrelated code.
- Keep the JSX/TSX valid. Do not remove "use client", props, or types that are still used.
- If the request is ambiguous or unsafe, make the most reasonable minimal interpretation and explain it in pr_body.
- Write pr_title and summary in plain language an admin will understand.`;

function applyEdits(content: string, edits: EditOp[]): string {
  let out = content;
  for (const e of edits) {
    if (!e.old_string) throw new Error('an edit had an empty old_string');
    const first = out.indexOf(e.old_string);
    if (first === -1) throw new Error('could not find the text to change — try rephrasing the request');
    const second = out.indexOf(e.old_string, first + e.old_string.length);
    if (second !== -1) throw new Error('the text to change appears more than once — try a more specific request');
    out = out.slice(0, first) + e.new_string + out.slice(first + e.old_string.length);
  }
  return out;
}

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

  const body = (await req.json().catch(() => ({}))) as { instruction?: string; paths?: string[] };
  const instruction = (body.instruction || '').trim();
  if (!instruction) return NextResponse.json({ error: 'Describe the change you want to make.' }, { status: 400 });

  // Which files to put in front of the model. Default to all editable
  // files so the admin can just describe the change without knowing
  // which file it lives in; honour an explicit selection if given.
  const requested = Array.isArray(body.paths) ? body.paths.filter(isLandingEditableFile) : [];
  const targetPaths = requested.length > 0 ? requested : [...LANDING_EDITABLE_FILES];

  try {
    // 1. Read the current source of the candidate files from `main`.
    const files = await Promise.all(
      targetPaths.map(async (path) => ({ path, ...(await getFile(cfg, path, BASE_BRANCH)) })),
    );

    // 2. Ask Claude for surgical edits.
    const userContent =
      `Change request:\n${instruction}\n\n` +
      `Here are the current landing files you may edit:\n\n` +
      files.map((f) => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``).join('\n\n');

    const claudeRes = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': CLAUDE_VERSION, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        tools: [EDIT_TOOL],
        tool_choice: { type: 'tool', name: 'propose_landing_edit' },
        messages: [{ role: 'user', content: userContent }],
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

    // 3. Validate + apply. Every path must be on the allowlist; re-fetch
    //    each file fresh so we have its current blob sha for the commit.
    const toCommit: Array<{ path: string; content: string; sha: string }> = [];
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
      if (next !== current.content) toCommit.push({ path: change.path, content: next, sha: current.sha });
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
    const prBody =
      `${proposal.pr_body || proposal.summary || ''}\n\n---\n` +
      `Requested via the Feather Landing → Code editor by ${gate.user.email ?? gate.userId}.\n\n` +
      `**Request:** ${instruction}`;
    const pr = await createPullRequest(cfg, {
      title: proposal.pr_title || 'Landing page edit',
      head: branch,
      base: BASE_BRANCH,
      body: prBody,
    });

    return NextResponse.json({
      ok: true,
      summary: proposal.summary || proposal.pr_title || 'Landing edit proposed.',
      prUrl: pr.html_url,
      prNumber: pr.number,
      branch,
      changedFiles: toCommit.map((f) => f.path),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
