#!/usr/bin/env node
// CI gate-coverage check for src/app/api/**/route.ts.
//
// Policy: every route must import an auth helper from one of the
// known gate modules below. If it doesn't, it has to be either
//   (a) on the EXEMPT_PATTERNS allowlist (intentional public:
//       webhooks, public marketing endpoints, cron jobs that
//       self-authenticate via a header), or
//   (b) on the LEGACY allowlist in scripts/api-gates-allowlist.txt
//       (existing hand-rolled routes — grandfathered so we can
//       convert them incrementally instead of in one risky PR).
//
// Adding a NEW route requires either the centralised gate or an
// explicit allowlist entry with a comment in the same commit.
// That's the whole point: stop the drift from getting wider while
// we close it.
//
// Exit codes: 0 clean, 1 violations found. Prints what to fix.

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative } from 'node:path';

const REPO_ROOT = join(import.meta.dirname, '..');
const ROUTE_GLOB = 'src/app/api/**/route.ts';
const ALLOWLIST_PATH = join(REPO_ROOT, 'scripts/api-gates-allowlist.txt');

const GATE_MODULES = [
  '@/lib/api-gates',
  '@/lib/page-access',
  '@/lib/website-requests-auth',
  '@/lib/content-server',
  // Chat endpoints gate via requireChatAccess (alumni-only access).
  '@/lib/chat-server',
];

// Files intentionally public — webhooks (signed by the provider),
// the public-facing marketing endpoints, and cron handlers that
// self-authenticate via the `Authorization: Bearer ${CRON_SECRET}`
// header inside the handler. Patterns are matched as
// substrings against the path relative to repo root.
const EXEMPT_PATTERNS = [
  // Public marketing endpoints — open by design.
  'src/app/api/public/',
  // Webhook endpoints — signed by external provider, not auth'd.
  '/webhook/',
  // Vercel cron — gates inside via CRON_SECRET header.
  'src/app/api/cron/',
  // Auth-flow endpoints handle their own session bookkeeping.
  'src/app/api/auth/',
  // Resend transactional unsubscribe link — public by spec.
  'src/app/api/email/unsubscribe',
];

function listRoutes() {
  // Use `find` for portability; ignore node_modules / .next.
  const out = execSync(
    `find ${REPO_ROOT}/src/app/api -name 'route.ts' -type f`,
    { encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((p) => relative(REPO_ROOT, p));
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return new Set();
  const raw = readFileSync(ALLOWLIST_PATH, 'utf8');
  return new Set(
    raw
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean),
  );
}

function isExempt(path) {
  return EXEMPT_PATTERNS.some((p) => path.includes(p));
}

function hasGateImport(path) {
  const src = readFileSync(join(REPO_ROOT, path), 'utf8');
  return GATE_MODULES.some((mod) =>
    new RegExp(`from\\s+['"]${mod}['"]`).test(src),
  );
}

function main() {
  const routes = listRoutes();
  const allowlist = loadAllowlist();
  const violations = [];

  for (const path of routes) {
    if (isExempt(path)) continue;
    if (allowlist.has(path)) continue;
    if (hasGateImport(path)) continue;
    violations.push(path);
  }

  const total = routes.length;
  const exemptCount = routes.filter(isExempt).length;
  const allowlistedCount = routes.filter(
    (p) => !isExempt(p) && allowlist.has(p),
  ).length;
  const compliantCount = routes.filter(
    (p) => !isExempt(p) && !allowlist.has(p) && hasGateImport(p),
  ).length;

  console.log(`API route gate coverage:`);
  console.log(`  Total routes:            ${total}`);
  console.log(`  Exempt (public by spec): ${exemptCount}`);
  console.log(`  Grandfathered (legacy):  ${allowlistedCount}`);
  console.log(`  Compliant (uses gate):   ${compliantCount}`);
  console.log(`  Violations:              ${violations.length}`);

  if (violations.length === 0) {
    console.log(`\n✓ All non-exempt routes either use a gate or are grandfathered.`);
    process.exit(0);
  }

  console.error(`\n✗ ${violations.length} route(s) skip the centralised auth gate and aren't on the allowlist:\n`);
  for (const v of violations) console.error(`    ${v}`);
  console.error(`\nTo fix, ONE of:`);
  console.error(`  (a) Add a gate import — see ${GATE_MODULES.join(' / ')}.`);
  console.error(`  (b) Add the path to scripts/api-gates-allowlist.txt with a # comment explaining why.`);
  process.exit(1);
}

main();
