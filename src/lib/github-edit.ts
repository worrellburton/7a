// Minimal GitHub REST client for the Landing → Code editor. Runs
// server-side only (never expose the token to the browser). Uses raw
// fetch — no SDK — matching the rest of this codebase's integration
// style. Everything goes over the Contents + Git Refs + Pulls APIs so
// it works from a serverless function with no local git/filesystem.
//
// Auth: a fine-grained Personal Access Token in GITHUB_TOKEN with
// Contents: read+write and Pull requests: read+write on the target
// repo. The repo defaults to worrellburton/7a; override with
// GITHUB_REPO ("owner/name").

const GITHUB_API = 'https://api.github.com';

export interface GithubConfig {
  token: string;
  owner: string;
  repo: string;
}

export class GithubNotConfiguredError extends Error {
  constructor() {
    super('GITHUB_TOKEN is not configured on the server.');
    this.name = 'GithubNotConfiguredError';
  }
}

export function loadGithubConfig(): GithubConfig {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  if (!token) throw new GithubNotConfiguredError();
  const repoSlug = process.env.GITHUB_REPO || 'worrellburton/7a';
  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPO "${repoSlug}" — expected "owner/name".`);
  return { token, owner, repo };
}

async function gh<T>(cfg: GithubConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'feather-landing-code',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = (json as { message?: string }).message || `GitHub HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

// Base64 decode/encode that handles UTF-8 (Buffer is available on the
// Node runtime these routes run under).
function decodeB64(b64: string): string {
  return Buffer.from(b64.replace(/\n/g, ''), 'base64').toString('utf8');
}
function encodeB64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

export async function getFile(cfg: GithubConfig, path: string, ref: string): Promise<{ content: string; sha: string }> {
  const data = await gh<{ content: string; sha: string }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`,
  );
  return { content: decodeB64(data.content), sha: data.sha };
}

// Full recursive file list for a branch — used to build the sitemap of
// editable public pages. Returns blob paths only.
export async function getTreePaths(cfg: GithubConfig, branch: string): Promise<string[]> {
  const data = await gh<{ tree: Array<{ path: string; type: string }> }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  return (data.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);
}

export async function getBranchHeadSha(cfg: GithubConfig, branch: string): Promise<string> {
  const data = await gh<{ object: { sha: string } }>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(branch)}`,
  );
  return data.object.sha;
}

export async function createBranch(cfg: GithubConfig, branch: string, fromSha: string): Promise<void> {
  await gh(cfg, `/repos/${cfg.owner}/${cfg.repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
  });
}

export async function putFile(
  cfg: GithubConfig,
  path: string,
  newContent: string,
  message: string,
  branch: string,
  sha: string,
): Promise<void> {
  await gh(cfg, `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: encodeB64(newContent), branch, sha }),
  });
}

export async function createPullRequest(
  cfg: GithubConfig,
  opts: { title: string; head: string; base: string; body: string },
): Promise<{ html_url: string; number: number }> {
  return gh<{ html_url: string; number: number }>(cfg, `/repos/${cfg.owner}/${cfg.repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

// Merge a PR into its base (squash) — used to auto-ship a change without a
// manual GitHub review step. Throws if GitHub refuses (conflict / not
// mergeable), so callers can report "opened but couldn't auto-merge".
export async function mergePullRequest(cfg: GithubConfig, number: number, method: 'squash' | 'merge' | 'rebase' = 'squash'): Promise<void> {
  await gh(cfg, `/repos/${cfg.owner}/${cfg.repo}/pulls/${number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: method }),
  });
}

// Create a merge commit bringing `head` into `base` (e.g. main → master).
// This is how production is deployed: master only ever receives a merge
// from main. 204 (nothing to merge) is fine; 409 (conflict) throws.
export async function mergeIntoBranch(cfg: GithubConfig, base: string, head: string, message: string): Promise<void> {
  await gh(cfg, `/repos/${cfg.owner}/${cfg.repo}/merges`, {
    method: 'POST',
    body: JSON.stringify({ base, head, commit_message: message }),
  });
}

// Most-recent PRs (state=all) so the history panel can show whether each
// tool-opened PR is still open, was merged, or was closed. One call,
// best-effort — callers tolerate failure (no token / network).
export async function listRecentPullStates(
  cfg: GithubConfig,
): Promise<Map<number, 'open' | 'closed' | 'merged'>> {
  const data = await gh<Array<{ number: number; state: string; merged_at: string | null }>>(
    cfg,
    `/repos/${cfg.owner}/${cfg.repo}/pulls?state=all&per_page=100`,
  );
  const map = new Map<number, 'open' | 'closed' | 'merged'>();
  for (const pr of data) {
    map.set(pr.number, pr.merged_at ? 'merged' : pr.state === 'closed' ? 'closed' : 'open');
  }
  return map;
}

// ── Edit application (shared by the propose + revert routes) ──────

export interface EditOp { old_string: string; new_string: string }
export interface FileChange { path: string; edits: EditOp[] }

// Apply a list of exact-match string replacements. Each old_string must
// occur exactly once, or we throw — never a silent partial/duplicate edit.
export function applyEdits(content: string, edits: EditOp[]): string {
  let out = content;
  for (const e of edits) {
    if (!e.old_string) throw new Error('an edit had an empty old_string');
    const first = out.indexOf(e.old_string);
    if (first === -1) throw new Error('could not find the text to change — it may have already changed');
    const second = out.indexOf(e.old_string, first + e.old_string.length);
    if (second !== -1) throw new Error('the text to change appears more than once');
    out = out.slice(0, first) + e.new_string + out.slice(first + e.old_string.length);
  }
  return out;
}

// Reverse a set of file changes (swap new→old, reverse order) so a merged
// change can be undone against the current file content.
export function reverseChanges(changes: FileChange[]): FileChange[] {
  return changes.map((c) => ({
    path: c.path,
    edits: c.edits.slice().reverse().map((e) => ({ old_string: e.new_string, new_string: e.old_string })),
  }));
}
