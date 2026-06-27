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
