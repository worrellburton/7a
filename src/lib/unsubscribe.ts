import { createHmac, timingSafeEqual } from 'crypto';

// HMAC-signed unsubscribe tokens — encode the contact id + an HMAC
// signature so the public unsubscribe endpoint can verify a click
// came from a real email we sent (i.e. no one can unsubscribe an
// arbitrary contact by guessing UUIDs).
//
// Secret precedence:
//   UNSUBSCRIBE_SECRET → SUPABASE_SERVICE_ROLE_KEY → SUPABASE_JWT_SECRET
// The fallback chain means we don't need a new env var for this to
// work — the service-role key is already in every environment that
// has the campaign send pipeline configured.

function getSecret(): string {
  const s =
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_JWT_SECRET;
  if (!s) {
    throw new Error(
      'Unsubscribe secret is not configured. Set UNSUBSCRIBE_SECRET or SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return s;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signature(contactId: string): string {
  const mac = createHmac('sha256', getSecret()).update(`unsubscribe:${contactId}`).digest();
  // 16 bytes (128 bits) of HMAC truncated to base64url is plenty —
  // forging it requires the service-role key.
  return base64url(mac.subarray(0, 16));
}

export function signUnsubscribeToken(contactId: string): string {
  return `${contactId}.${signature(contactId)}`;
}

export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const contactId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  // UUIDs are 36 chars (with dashes); reject anything obviously
  // malformed before doing the HMAC compare.
  if (contactId.length !== 36 || !/^[0-9a-f-]{36}$/i.test(contactId)) return null;
  const expected = signature(contactId);
  // Constant-time compare so a length / byte difference doesn't leak
  // timing info to an attacker probing signatures.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return contactId;
}

// Absolute URL the email template renders for "Unsubscribe". Site
// origin overridable for staging via NEXT_PUBLIC_SITE_URL.
export function buildUnsubscribeUrl(contactId: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://sevenarrowsrecoveryarizona.com';
  return `${origin.replace(/\/$/, '')}/unsubscribe?token=${signUnsubscribeToken(contactId)}`;
}
