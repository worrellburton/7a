// Standalone smoke test for scrubPii / beforeSendScrub.
// Run with: node --test src/lib/sentry/scrub.test.mjs
//
// Not wired into a test framework yet (the codebase has no
// vitest / jest setup today — Tier-1 #3 on the health roadmap).
// Node 20's built-in test runner is enough to prove the scrub
// behaves correctly on the inputs that actually matter: nested
// objects, arrays, the specific keys we redact, and the
// beforeSend hook's request/user/context handling.

import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubPii, beforeSendScrub } from './scrub.ts';

test('scrubPii redacts top-level PII keys', () => {
  const out = scrubPii({ email: 'a@b.com', id: 'x' });
  assert.equal(out.email, '[redacted]');
  assert.equal(out.id, 'x');
});

test('scrubPii redacts nested PII keys', () => {
  const out = scrubPii({ user: { id: 'x', phone: '+15205551234', notes: 'private' } });
  assert.equal(out.user.id, 'x');
  assert.equal(out.user.phone, '[redacted]');
  assert.equal(out.user.notes, '[redacted]');
});

test('scrubPii walks arrays', () => {
  const out = scrubPii({ rows: [{ name: 'Sam', age: 30 }, { name: 'Jo', age: 40 }] });
  assert.equal(out.rows[0].name, '[redacted]');
  assert.equal(out.rows[0].age, 30);
  assert.equal(out.rows[1].name, '[redacted]');
});

test('scrubPii caps recursion depth', () => {
  // Build a 12-deep nested object — should be redacted at depth 9
  let obj = { leaf: 'x' };
  for (let i = 0; i < 12; i++) obj = { nested: obj };
  const out = scrubPii(obj);
  let cur = out;
  let depth = 0;
  while (typeof cur === 'object' && cur !== null && 'nested' in cur) {
    cur = cur.nested;
    depth++;
  }
  // After depth 8 the value becomes '[redacted]' (string), not object.
  assert.ok(depth <= 9, `walked too deep: ${depth}`);
});

test('scrubPii catches common token / auth keys', () => {
  const out = scrubPii({
    access_token: 'jwt.value',
    api_key: 'sk-…',
    password: 'hunter2',
    cookie: 'session=…',
    authorization: 'Bearer …',
  });
  for (const k of Object.keys(out)) {
    assert.equal(out[k], '[redacted]', `${k} not scrubbed`);
  }
});

test('beforeSendScrub whitelists user.id only', () => {
  const event = {
    user: { id: 'u-123', email: 'a@b.com', ip_address: '1.2.3.4', username: 'jane' },
  };
  const out = beforeSendScrub(event);
  assert.equal(out.user.id, 'u-123');
  assert.equal(out.user.email, undefined);
  assert.equal(out.user.ip_address, undefined);
  assert.equal(out.user.username, undefined);
});

test('beforeSendScrub strips request query string', () => {
  const event = {
    request: { url: 'https://7a.dev/api/x?email=leak@test.com&phone=555', headers: {}, data: {} },
  };
  const out = beforeSendScrub(event);
  assert.equal(out.request.url, 'https://7a.dev/api/x');
});

test('beforeSendScrub drops cookie + authorization headers', () => {
  const event = {
    request: {
      url: 'https://7a.dev/api/x',
      headers: { 'content-type': 'application/json', cookie: 'sb-token=…', authorization: 'Bearer …' },
      data: {},
    },
  };
  const out = beforeSendScrub(event);
  assert.equal(out.request.headers.cookie, undefined);
  assert.equal(out.request.headers.authorization, undefined);
  assert.equal(out.request.headers['content-type'], 'application/json');
});

test('beforeSendScrub scrubs request body PII', () => {
  const event = {
    request: {
      url: 'https://7a.dev/api/x',
      headers: {},
      data: { name: 'Jane Doe', insurance: 'BCBS-123', message: 'private' },
    },
  };
  const out = beforeSendScrub(event);
  assert.equal(out.request.data.name, '[redacted]');
  assert.equal(out.request.data.insurance, '[redacted]');
  assert.equal(out.request.data.message, '[redacted]');
});
