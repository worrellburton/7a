import { NextRequest, NextResponse } from 'next/server';
import { requireCodeAccess } from '@/lib/api-gates';
import { isEditablePath, buildEditablePages, HOME_ROUTE } from '@/lib/editable-pages';
import {
  loadGithubConfig,
  GithubNotConfiguredError,
  getFile,
  getTreePaths,
  getBranchHeadSha,
  createBranch,
  putFile,
  fileExists,
  createPullRequest,
  listRecentPullStates,
  searchCode,
  applyEdits,
  type FileChange,
} from '@/lib/github-edit';

// POST /api/landing/code — propose a public-website change.
// GET  /api/landing/code — recent PRs opened through the tab (+ status).
//
// POST flow: admin describes a change (optionally with screenshots) →
// Claude finds the right file across the whole public site and proposes
// surgical old_string/new_string edits → we validate every path with
// isEditablePath (public site only, never Feather), apply the edits,
// commit them to a fresh branch, open a PR into `main`, and record the
// PR (+ requester + the edits, for revert) in landing_code_requests. The
// change is NOT deployed here — the admin ships it with the "Push live"
// button (POST /api/landing/code/push), which merges main → master.
//
// Required env: ANTHROPIC_API_KEY, GITHUB_TOKEN. Optional: GITHUB_REPO,
// GITHUB_BASE_BRANCH (default main), ANTHROPIC_MODEL.

export const runtime = 'nodejs';
// Generous ceiling — creating a whole new page is a big single generation
// on top of the search/read loop, which was timing out at 60s (504).
export const maxDuration = 300;

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';
// Pin the coding agent to the BEST available Claude model (most capable,
// not a cheaper/faster tier) so edits are as reliable as possible. Bump
// this one constant when a more capable model ships. An env override is
// allowed for ops, but the default is always the top model.
const DEFAULT_MODEL = 'claude-opus-4-8';
function activeModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}
// Friendly display names surfaced in the UI ("what model this is").
const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-opus-4-7': 'Claude Opus 4.7',
  'claude-opus-4-6': 'Claude Opus 4.6',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-fable-5': 'Claude Fable 5',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
};
function modelLabel(id: string): string {
  return MODEL_LABELS[id] || id;
}
const BASE_BRANCH = process.env.GITHUB_BASE_BRANCH || 'main';
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

interface ProposedEdit {
  summary: string;
  pr_title: string;
  pr_body: string;
  changes: FileChange[];
}

interface PageCreation {
  summary: string;
  pr_title: string;
  pr_body: string;
  route: string;    // public URL path, no leading slash, e.g. "treatment/lp"
  content: string;  // full source of the new page.tsx
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

const CREATE_TOOL = {
  name: 'create_page',
  description:
    'Create a BRAND-NEW public website page at a new URL that does not exist yet. Provide the full source of ONE self-contained Next.js page file (it becomes src/app/(site)/<route>/page.tsx). Reuse EXISTING components only (e.g. PageHero, AdmissionsForm, StickyMobileCTA) — never import a component that does not exist. Use this only for a NEW route; to change an existing page, use propose_landing_edit instead.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One short sentence describing the new page for a non-technical reviewer.' },
      pr_title: { type: 'string', description: 'A concise pull-request title.' },
      pr_body: { type: 'string', description: 'Markdown PR body explaining the new page.' },
      route: {
        type: 'string',
        description: 'The public URL path for the new page, WITHOUT a leading slash — e.g. "treatment/lp" for /treatment/lp. Lowercase, words separated by hyphens. Becomes src/app/(site)/<route>/page.tsx.',
      },
      content: {
        type: 'string',
        description: 'The COMPLETE source of the new page.tsx file. A valid Next.js App Router page: a default-exported React component, optional `export const metadata`, and `export const revalidate = 3600`. Server component by default; it may import existing client components. Do not reference files that do not exist.',
      },
    },
    required: ['summary', 'pr_title', 'pr_body', 'route', 'content'],
    additionalProperties: false,
  },
} as const;

const SYSTEM_PROMPT = `You are a coding agent editing the SOURCE CODE of Seven Arrows Recovery's public marketing website (Next.js + React + TypeScript + Tailwind). You work conversationally with a non-technical admin, like Claude Code.

The admin focuses on a page; its current source is provided to you, sometimes with screenshots. To handle a request:
- If the thing to change IS in the provided source, edit it directly with the propose_landing_edit tool.
- If it is NOT there — the text, stat, or section lives on a different page or a shared component — use search_site to locate the file (search for distinctive on-page text or the component name), then read_page to read it, then propose_landing_edit.
- If the admin asks for a BRAND-NEW page at a URL that does not exist yet, use create_page (see below) instead of trying to edit.
- If you genuinely can't find the target or the request is ambiguous, reply with a short plain-English question or explanation (no tool call) instead of guessing.

Creating a NEW page (create_page):
- Use it ONLY for a new route. First confirm the route doesn't already exist (read_page on src/app/(site)/<route>/page.tsx — if it exists, edit it instead). To reuse a good structure, read an existing page like src/app/(site)/treatment/lp/page.tsx or src/app/(site)/treatment/residential-inpatient/page.tsx first.
- Provide the COMPLETE page.tsx in one shot: a default-exported component, and normally 'export const metadata' + 'export const revalidate = 3600'. It becomes src/app/(site)/<route>/page.tsx.
- Build it SELF-CONTAINED in that one file: write the sections inline with Tailwind and reuse ONLY components you have confirmed exist (e.g. PageHero from '@/components/PageHero', AdmissionsForm from '@/components/AdmissionsForm', StickyMobileCTA from '@/components/StickyMobileCTA'). NEVER import a component that doesn't exist — that breaks the build. When unsure a component exists, search_site for it first, or write the section inline.
- Keep the JSX/TSX valid and typed. The site's global header/footer are added automatically by the (site) layout — don't add them.

CRITICAL — edit only what the target page actually renders:
- When the admin names a specific page or URL (e.g. /our-program/trauma-treatment), START from that route's file: read src/app/(site)/<route>/page.tsx (and its content.tsx if present) and trace which components it actually imports and renders. Only edit a file that is in THAT page's render tree — the route file itself, or a component it imports.
- Do NOT assume a component whose NAME resembles the page is the one in use. Many pages render a SHARED component (e.g. PageHero) with the real copy passed as inline props/strings, while a similarly-named component (e.g. TraumaHero) belongs to a DIFFERENT route. Editing the wrong one compiles fine but changes nothing on the page the admin is looking at. Always confirm the file is reachable from the named page's imports/JSX before editing it — match the live text you can see, not just the filename.
- Verify by the distinctive on-page text the admin quoted/screenshotted: grep for that exact text with search_site and edit the file that contains it. If the text lives as an inline prop on the page's route file, edit the route file.

Editing rules:
- You may edit ANY public-website source file: the routes under src/app/(site)/** and ANY component under src/components/** (e.g. src/components/Hero.tsx, Footer, Header, and the marketing section folders). You may NOT edit the Feather admin app (src/app/feather/**), the backend API routes (src/app/api/**), the auth callbacks (src/app/auth/**), or the shared libraries (src/lib/**).
- Each edit is an exact-match replacement: old_string MUST appear in the file byte-for-byte (including indentation) and MUST be unique — include enough surrounding context.
- Preserve the existing code style, imports, and TypeScript types; keep the JSX/TSX valid. Don't remove "use client", props, or types still in use.
- Make the smallest change that satisfies the request. Write pr_title and summary in plain language an admin understands.`;

const SEARCH_TOOL = {
  name: 'search_site',
  description: 'Search the public website source for distinctive on-page text (e.g. a phrase the admin quoted or showed in a screenshot) or a component name, to find which file to edit. Returns matching file paths.',
  input_schema: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Distinctive text or a component name to search for.' } },
    required: ['query'],
    additionalProperties: false,
  },
} as const;

const READ_TOOL = {
  name: 'read_page',
  description: 'Read the full current source of a public-website file.',
  input_schema: {
    type: 'object',
    properties: { path: { type: 'string', description: 'Repo path, e.g. src/components/landing/LandingHero.tsx' } },
    required: ['path'],
    additionalProperties: false,
  },
} as const;

export async function POST(req: NextRequest) {
  const gate = await requireCodeAccess(req);
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
    pages?: string[];
    images?: Array<{ media_type?: string; data?: string }>;
    history?: Array<{ role?: string; text?: string }>;
  };
  const instruction = (body.instruction || '').trim();
  if (!instruction) return NextResponse.json({ error: 'Describe the change you want to make.' }, { status: 400 });

  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((im) => im && typeof im.data === 'string' && im.media_type && ALLOWED_IMAGE_TYPES.has(im.media_type))
    .slice(0, 6) as Array<{ media_type: string; data: string }>;

  const selectedKeys = Array.isArray(body.pages) ? body.pages : [];
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((h): h is { role: 'user' | 'assistant'; text: string } =>
      !!h && (h.role === 'user' || h.role === 'assistant') && typeof h.text === 'string' && !!h.text.trim())
    .slice(-12);

  try {
    // Resolve the focused page(s) → inline their source as a starting hint.
    // The agent can still SEARCH the rest of the site if the target lives
    // elsewhere. Defaults to Home. Boundary: public-site files only.
    const registry = await getTreePaths(cfg, BASE_BRANCH).then(buildEditablePages);
    const chosen = selectedKeys.length > 0
      ? registry.filter((p) => selectedKeys.includes(p.key))
      : registry.filter((p) => p.key === HOME_ROUTE);
    const hintPaths = Array.from(new Set(chosen.flatMap((p) => p.files))).filter(isEditablePath).slice(0, 14);
    const hintFiles = await Promise.all(hintPaths.map(async (path) => ({ path, ...(await getFile(cfg, path, BASE_BRANCH)) })));
    const focusLabel = chosen.map((p) => p.label).join(', ') || 'Home';

    // Build the conversation: prior text turns + the current request, with
    // the focused page's source inline and any screenshots attached.
    type Block = Record<string, unknown>;
    const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> =
      history.map((h) => ({ role: h.role, content: [{ type: 'text', text: h.text }] }));
    const currentText =
      `Page in focus: ${focusLabel}\n\n` +
      `Request: ${instruction}\n\n` +
      (images.length > 0 ? `(${images.length} screenshot(s) attached for reference.)\n\n` : '') +
      `Current source of the focused page (if the thing to change isn't here, search the rest of the site):\n\n` +
      hintFiles.map((f) => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``).join('\n\n');
    const userBlocks: Block[] = [
      ...images.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })),
      { type: 'text', text: currentText },
    ];
    messages.push({ role: 'user', content: userBlocks });

    // Agentic loop: search_site → read_page → propose_landing_edit / create_page.
    let proposal: ProposedEdit | null = null;
    let creation: PageCreation | null = null;
    let assistantText = '';
    for (let iter = 0; iter < 5; iter++) {
      const claudeRes = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': CLAUDE_VERSION, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: activeModel(),
          max_tokens: 16000,
          system: SYSTEM_PROMPT,
          tools: [SEARCH_TOOL, READ_TOOL, EDIT_TOOL, CREATE_TOOL],
          messages,
        }),
      });
      const cj = (await claudeRes.json()) as {
        content?: Array<{ type: string; name?: string; id?: string; text?: string; input?: unknown }>;
        error?: { message?: string };
      };
      if (!claudeRes.ok) return NextResponse.json({ error: cj.error?.message ?? `Claude HTTP ${claudeRes.status}` }, { status: 502 });
      const content = cj.content ?? [];
      messages.push({ role: 'assistant', content });
      const toolUses = content.filter((b) => b.type === 'tool_use');
      const edit = toolUses.find((b) => b.name === 'propose_landing_edit');
      if (edit?.input) { proposal = edit.input as ProposedEdit; break; }
      const create = toolUses.find((b) => b.name === 'create_page');
      if (create?.input) { creation = create.input as PageCreation; break; }
      if (toolUses.length === 0) {
        assistantText = content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n').trim();
        break;
      }
      const toolResults: Block[] = [];
      for (const tu of toolUses) {
        let resultText = '';
        try {
          const input = (tu.input ?? {}) as { query?: string; path?: string };
          if (tu.name === 'search_site') {
            const found = (await searchCode(cfg, String(input.query ?? ''))).filter(isEditablePath).slice(0, 15);
            resultText = found.length ? `Matching files:\n${found.join('\n')}` : 'No matches found in the public website.';
          } else if (tu.name === 'read_page') {
            const path = String(input.path ?? '');
            if (!isEditablePath(path)) resultText = 'That path is outside the editable public website.';
            else { const f = await getFile(cfg, path, BASE_BRANCH); resultText = f.content.slice(0, 80000); }
          } else {
            resultText = 'Unknown tool.';
          }
        } catch (e) {
          resultText = `Tool error: ${e instanceof Error ? e.message : String(e)}`;
        }
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id ?? '', content: resultText });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    // ── New-page creation path ──────────────────────────────────────
    // create_page writes a brand-new src/app/(site)/<route>/page.tsx. Like
    // an edit it's staged as a PR (not deployed) — the admin previews +
    // pushes it live. Guarded so it can't clobber an existing route.
    if (creation) {
      const rawRoute = (creation.route || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase();
      const route = rawRoute.replace(/[^a-z0-9/-]/g, '').replace(/\/{2,}/g, '/');
      const content = creation.content || '';
      if (!route) return NextResponse.json({ error: 'The new page needs a URL path (e.g. "treatment/lp").' }, { status: 422 });
      if (!content.trim()) return NextResponse.json({ error: 'The new page came back empty.' }, { status: 422 });
      const path = `src/app/(site)/${route}/page.tsx`;
      if (!isEditablePath(path)) {
        return NextResponse.json({ error: `Refusing to create a page outside the public website: ${path}` }, { status: 422 });
      }
      if (await fileExists(cfg, path, BASE_BRANCH)) {
        return NextResponse.json({ kind: 'message', text: `A page already exists at /${route}. Tell me what to change and I'll edit it instead of creating a new one.` });
      }

      const branch = `claude/landing-${Date.now()}`;
      const baseSha = await getBranchHeadSha(cfg, BASE_BRANCH);
      await createBranch(cfg, branch, baseSha);
      // No sha → the Contents API CREATES the file.
      await putFile(cfg, path, content, creation.pr_title || `Add /${route} page`, branch);

      const cRequesterEmail = gate.user.email ?? null;
      let cRequesterName: string | null = null;
      try {
        const u = await gate.admin.from('users').select('full_name').eq('id', gate.userId).maybeSingle();
        cRequesterName = (u.data?.full_name as string | undefined) ?? null;
      } catch { /* best-effort */ }
      const cPrBody =
        `${creation.pr_body || creation.summary || ''}\n\n---\n` +
        `New page created via the Feather Landing → Code editor by ${cRequesterName || cRequesterEmail || gate.userId}.\n\n` +
        `**Request:** ${instruction}`;
      const cPr = await createPullRequest(cfg, {
        title: creation.pr_title || `Add /${route} page`,
        head: branch,
        base: BASE_BRANCH,
        body: cPrBody,
      });

      try {
        await gate.admin.from('landing_code_requests').insert({
          pr_number: cPr.number,
          pr_url: cPr.html_url,
          title: creation.pr_title || `Add /${route} page`,
          summary: creation.summary || `New page at /${route}`,
          instruction,
          changed_files: [path],
          changes: [],   // a create has no reversible edits — revert isn't offered
          branch,
          requested_by: gate.userId,
          requested_by_email: cRequesterEmail,
          requested_by_name: cRequesterName,
        });
      } catch { /* history is best-effort */ }

      return NextResponse.json({
        ok: true,
        kind: 'change',
        summary: creation.summary || `Created a new page at /${route}.`,
        prUrl: cPr.html_url,
        prNumber: cPr.number,
        branch,
        changedFiles: [path],
        deployed: false,
      });
    }

    if (!proposal) {
      return NextResponse.json({
        kind: 'message',
        text: assistantText || "I couldn't pin down what to change. Tell me which page it's on, or quote the exact text you want changed.",
      });
    }
    const changes = Array.isArray(proposal.changes) ? proposal.changes : [];
    if (changes.length === 0) {
      return NextResponse.json({ kind: 'message', text: proposal.summary || "I didn't find anything to change for that." });
    }

    // 3. Validate + apply against fresh content from `main`.
    const toCommit: Array<{ path: string; content: string; sha: string }> = [];
    const appliedChanges: FileChange[] = [];
    for (const change of changes) {
      if (!isEditablePath(change.path)) {
        return NextResponse.json({ error: `Refusing to edit a file outside the public website: ${change.path}` }, { status: 422 });
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
      return NextResponse.json({ kind: 'message', text: 'Those edits didn\'t actually change anything — it may already be the way you want it.' });
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

    // 4b. The change is staged as a PR but NOT deployed — the admin pushes
    // it live with the "Push live" button (POST /api/landing/code/push),
    // which is what merges it into main and master.

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
      kind: 'change',
      summary: proposal.summary || proposal.pr_title || 'Change made.',
      prUrl: pr.html_url,
      prNumber: pr.number,
      branch,
      changedFiles,
      deployed: false,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireCodeAccess(req);
  if (gate instanceof NextResponse) return gate;

  const { data, error } = await gate.admin
    .from('landing_code_requests')
    .select('id, pr_number, pr_url, title, summary, changed_files, branch, requested_by_name, requested_by_email, reverts_pr_number, created_at')
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
  const model = activeModel();
  return NextResponse.json({ items, model, modelLabel: modelLabel(model) });
}
