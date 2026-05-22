// "AI suggests ONE new contact, dedup against current roster,
// insert" — used by both the hourly cron (attributed to Bobby) and
// the 'Auto-add contact' lever (attributed to the puller). Wraps
// the same Claude/Gemini machinery /api/contacts/suggest uses so
// the three surfaces agree on what counts as a candidate.
//
// The cron alternates providers by hour parity (even = Claude,
// odd = Gemini). The lever can pass an explicit provider or 'auto'
// which uses the same parity rule.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildSuggestSystemPrompt,
  buildSuggestUserMessage,
  callClaudeForCandidates,
  callGeminiForCandidates,
  cleanSuggestedContacts,
  loadRoster,
  looksLikePersonName,
  type SuggestProvider,
  type SuggestedContact,
} from './contact-suggest';

export interface AutoAddResult {
  inserted: { id: string; name: string; company: string | null; email: string | null; phone: string | null } | null;
  provider: SuggestProvider;
  reason?: 'inserted' | 'no_candidate' | 'all_duplicates' | 'provider_error';
  error?: string;
  candidatesConsidered: number;
}

// Steer focused on what Seven Arrows admissions actually wants to
// reach: clinical referrers, interventionists, detoxes, IOP/PHP
// step-down programs across AZ + neighbouring states. Skips the
// existing roster (the prompt already includes that list).
const SEVEN_ARROWS_STEER =
  "Bias toward referral-pipeline contacts relevant to Seven Arrows Recovery in Arizona: licensed therapists (LCSW / LPC / LMFT) with addiction or trauma specialties, certified interventionists (CIP), residential detox centers, IOP / PHP step-down programs, and sober living operators. Mix Arizona with adjacent states (CA, NM, NV, UT, CO) where Seven Arrows pulls clients from. Skip orgs already in the roster.";

export function pickProviderFromHour(hour: number = new Date().getUTCHours()): SuggestProvider {
  return hour % 2 === 0 ? 'claude' : 'gemini';
}

// Try to add ONE new contact. Returns the inserted row (or a
// reason it didn't insert) and which provider produced it. We ask
// the model for a small batch (default 3) and pick the first
// candidate that's NOT a duplicate of the roster, so a single
// near-duplicate doesn't waste the run.
export async function autoAddOneContact(opts: {
  admin: SupabaseClient;
  createdByUserId: string;
  provider?: SuggestProvider | 'auto';
  batchSize?: number;
  extraSteer?: string;
  source?: string;
}): Promise<AutoAddResult> {
  const provider: SuggestProvider = !opts.provider || opts.provider === 'auto'
    ? pickProviderFromHour()
    : opts.provider;
  const batchSize = Math.max(1, Math.min(5, opts.batchSize ?? 3));
  const source = opts.source ?? 'cron-add-with-ai';

  const roster = await loadRoster(opts.admin);
  const systemPrompt = buildSuggestSystemPrompt();
  const steer = [SEVEN_ARROWS_STEER, opts.extraSteer].filter(Boolean).join(' ');
  const userMessage = buildSuggestUserMessage({
    roster,
    userPrompt: steer,
    requested: batchSize,
  });

  const call = provider === 'gemini' ? callGeminiForCandidates : callClaudeForCandidates;
  const raw = await call({ systemPrompt, userMessage, requested: batchSize });
  if (!raw.ok) {
    return {
      inserted: null,
      provider,
      reason: 'provider_error',
      error: raw.error,
      candidatesConsidered: 0,
    };
  }

  const cleaned: SuggestedContact[] = cleanSuggestedContacts(raw.contacts);
  if (cleaned.length === 0) {
    return { inserted: null, provider, reason: 'no_candidate', candidatesConsidered: 0 };
  }

  // Dedup against existing contacts. Server-side, not by prompt
  // alone — the model has been wrong before. We check by lowered
  // name, by email, and by company website host so a re-suggested
  // org doesn't slip through under a slightly different display
  // name.
  const dedupCandidates = await fetchDedupCandidates(opts.admin);

  // Two-pass pick: prefer named individuals; fall back nowhere —
  // the cron/lever paths should never silently insert a row whose
  // `name` is a job title or org. If the whole batch is orgs, the
  // run is a no-op and we'll pull a different batch next hour.
  const eligible = cleaned.filter((c) => !isDuplicate(c, dedupCandidates));
  const namedEligible = eligible.filter((c) => looksLikePersonName(c.name));
  const picked = namedEligible[0];
  if (!picked) {
    if (eligible.length === 0) {
      return {
        inserted: null,
        provider,
        reason: 'all_duplicates',
        candidatesConsidered: cleaned.length,
      };
    }
    // We had non-duplicate candidates but none were people — every
    // one was a team / center / "& Associates" type. Report that
    // distinctly so the lever can explain the no-op clearly.
    return {
      inserted: null,
      provider,
      reason: 'no_candidate',
      error: 'All candidates were org / team names, not individual people. Try again or change the steer.',
      candidatesConsidered: cleaned.length,
    };
  }

  // Require BOTH phone and email — the cron is unattended and we
  // don't want to silently insert junk rows that someone then has
  // to clean up. Partials are surfaced in the manual modal where
  // an admin can opt in; not here.
  if (picked.missing.length > 0) {
    return {
      inserted: null,
      provider,
      reason: 'no_candidate',
      error: `Top candidate was missing ${picked.missing.join(' + ')}; skipping rather than inserting a partial row unattended.`,
      candidatesConsidered: cleaned.length,
    };
  }

  const { data, error } = await opts.admin
    .from('contacts')
    .insert({
      name: picked.name,
      company: picked.company,
      company_website: picked.company_website,
      type: picked.type,
      specialty: picked.specialty,
      role: picked.role,
      phone: picked.phone,
      email: picked.email,
      location: picked.location,
      notes: picked.notes,
      source,
      created_by: opts.createdByUserId,
    })
    .select('id, name, company, email, phone')
    .maybeSingle();
  if (error || !data) {
    return {
      inserted: null,
      provider,
      reason: 'provider_error',
      error: error?.message ?? 'insert returned no row',
      candidatesConsidered: cleaned.length,
    };
  }

  // Mirror the 'New Contact' log + last_contact bump that
  // /api/contacts POST writes for manual adds so the auto-added
  // contact shows up in the activity feed + the home log-rain.
  const nowIso = new Date().toISOString();
  await opts.admin.from('contact_logs').insert({
    contact_id: data.id,
    method: 'New Contact',
    comments: `Contact added by ${provider === 'gemini' ? 'Gemini' : 'Claude'} via ${source}.`,
    contacted_by: opts.createdByUserId,
    contacted_at: nowIso,
    duration_seconds: 0,
  });
  await opts.admin
    .from('contacts')
    .update({
      last_contact_at: nowIso,
      last_contact_by: opts.createdByUserId,
      last_contact_method: 'New Contact',
      last_contact_comments: `Auto-added by ${provider === 'gemini' ? 'Gemini' : 'Claude'}.`,
    })
    .eq('id', data.id);

  return {
    inserted: data as AutoAddResult['inserted'],
    provider,
    reason: 'inserted',
    candidatesConsidered: cleaned.length,
  };
}

// ─── Dedup helpers ────────────────────────────────────────────────

interface DedupRow {
  nameLower: string;
  emailLower: string | null;
  websiteHost: string | null;
}

async function fetchDedupCandidates(admin: SupabaseClient): Promise<DedupRow[]> {
  const { data } = await admin
    .from('contacts')
    .select('name, email, company_website')
    .limit(5000);
  return ((data ?? []) as Array<{ name: string; email: string | null; company_website: string | null }>).map((r) => ({
    nameLower: (r.name || '').trim().toLowerCase(),
    emailLower: (r.email || '').trim().toLowerCase() || null,
    websiteHost: extractHost(r.company_website),
  }));
}

function extractHost(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = raw.startsWith('http') ? new URL(raw) : new URL(`https://${raw}`);
    return u.host.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function isDuplicate(candidate: SuggestedContact, existing: DedupRow[]): boolean {
  const nameLower = candidate.name.trim().toLowerCase();
  const emailLower = candidate.email?.trim().toLowerCase() || null;
  const websiteHost = extractHost(candidate.company_website);
  for (const e of existing) {
    if (nameLower && nameLower === e.nameLower) return true;
    if (emailLower && emailLower === e.emailLower) return true;
    if (websiteHost && websiteHost === e.websiteHost) return true;
  }
  return false;
}
