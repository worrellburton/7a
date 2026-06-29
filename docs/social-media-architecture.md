# Social Media — Architecture & Setup

How the **Social Media** feature (`/feather/social-media`) is built, end to
end, so it can be rebuilt on another platform. Written from the current
codebase.

---

## 1. TL;DR

- The whole feature is a thin app layer on top of **[Ayrshare](https://www.ayrshare.com)**,
  a multi-network social-posting API. We do **not** integrate with each
  social network directly — Ayrshare owns every platform's OAuth, posting,
  scheduling, and analytics.
- We add on top of Ayrshare: a **drafts + approval workflow**, an **AI
  caption writer** (Anthropic), a **per-platform media/spec system**, a
  **recurring-slot scheduler**, **analytics snapshots** (so we own a
  time-series), a **global kill switch**, and a **status webhook** receiver.
- Storage is **Supabase** (Postgres + RLS + Realtime). The app is **Next.js
  on Vercel**; scheduled work runs via **Vercel Cron**.
- Access is **super-admin only** — posts publish under the Seven Arrows
  brand on the shared Ayrshare account.

```
Admin UI (/feather/social-media)
   │  (super-admin gated)
   ▼
Next.js API routes (/api/social-media/*, /api/claude/social-caption/*)
   │            │                       │
   │            │                       └── Anthropic Messages API  (AI captions)
   │            └── Supabase Postgres   (drafts, slots, analytics snapshots, activity_log)
   ▼
Ayrshare API (api.ayrshare.com)  ──posts──►  FB / IG / LinkedIn / X / TikTok / YouTube / …
   ▲                                              │
   └──────────── status webhook ◄─────────────────┘
                 (/api/social-media/webhook) → activity_log
```

---

## 2. External services

| Service | Used for | Plan notes |
|---|---|---|
| **Ayrshare** | OAuth to every network, publishing, scheduling, cancel, analytics | Business plan if you use multi-profile (`Profile-Key`); a single account works without it. |
| **Anthropic (Claude)** | AI caption drafting + variants | Messages API, model `claude-opus-4-8`. |
| **Supabase** | Postgres data, RLS, Realtime sync | Same project as the rest of Feather. |
| **Vercel** | Hosting + Cron (daily analytics) | Cron entry in `vercel.json`. |

### Environment variables / secrets

| Var | Required | Purpose |
|---|---|---|
| `AYRSHARE_API_KEY` | ✅ | Bearer token for all Ayrshare calls (Account → API). |
| `AYRSHARE_PROFILE_KEY` | optional | A User-Profile RefId. When set, every call is scoped to that profile (`Profile-Key` header) — needed for the hosted connect link. Unset = act on the master account's connected networks. |
| `AYRSHARE_WEBHOOK_SECRET` | ✅ (for status) | Shared secret appended as `?secret=…` to the webhook URL registered in Ayrshare. Fail-closed if unset. |
| `ANTHROPIC_API_KEY` | ✅ (for AI) | Caption generation. |
| `ANTHROPIC_MODEL` | optional | Defaults to `claude-opus-4-8`. |
| `CRON_SECRET` | ✅ (for analytics cron) | `Authorization: Bearer ${CRON_SECRET}` on the daily cron. |

All secrets are added in Vercel project settings; nothing is exposed to the
browser (all Ayrshare/Anthropic calls are server-side only).

---

## 3. The Ayrshare client (`src/lib/ayrshare.ts`)

The single place that talks to Ayrshare. Everything funnels through it so
auth headers live in one spot.

- Base URL: `https://api.ayrshare.com/api`.
- `authHeaders()` adds `Authorization: Bearer <AYRSHARE_API_KEY>` and, if
  present, `Profile-Key: <AYRSHARE_PROFILE_KEY>`.
- Helpers: `ayrshareGet`, `ayrsharePost`, `ayrshareDelete` (Ayrshare's
  delete takes a JSON body — non-standard "DELETE with body").
- `extractAyrshareError()` normalizes Ayrshare's ~6 different error shapes
  into one human string and logs the raw body (`[ayrshare-error]` in Vercel
  logs).
- `AYRSHARE_PLATFORMS` — the supported networks:
  `facebook, instagram, linkedin, twitter, tiktok, youtube, pinterest,
  gmb` (Google Business Profile), `reddit, threads, bluesky`.

Endpoints we call on Ayrshare: `/user`, `/post`, `/delete`, `/history`,
`/analytics/social`, `/profiles/generateJWT`.

---

## 4. Data model (Supabase / Postgres)

All tables are `public.*`, RLS enabled, and (drafts + slots) added to the
`supabase_realtime` publication for live cross-tab/teammate sync.

### `social_media_drafts` — the draft + approval store
(migration `20260619_social_media_drafts.sql` + `…_selected_deliverables` + `…_review_status`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` / `updated_at` | timestamptz | `updated_at` maintained by a trigger |
| `created_by` / `created_by_name` | uuid / text | **No FK** to users — some operators are auth-only accounts without a `public.users` row |
| `caption` | text | |
| `media_urls` | jsonb | shared/fallback media |
| `platforms` | jsonb | target networks |
| `ready` | boolean | "in the publishable bucket" (== approved) |
| `media_by_deliverable` | jsonb | per-crop media |
| `selected_deliverables` | jsonb | which `"<platformId>\|<spec label>"` crops are checked |
| `review_status` | text | `draft → in_review → approved` (CHECK constraint); `ready=true` backfilled to `approved` |

RLS: any authenticated user (the surface is already super-admin gated at the
route + page level; kept simple to avoid a users-table dependency).

### `social_media_schedule_slots` — recurring posting slots
(`20260515_social_media_schedule_slots.sql`)

Recurrence definitions (`rrule_kind`: daily / every-other-day / weekly /
biweekly, `days_of_week int[]`, `hour`, `minute`, `anchor_date`). UI-only:
when an occurrence is "dropped" with a post, it's still sent through
`/api/social-media/post` with a matching `scheduleDate`. RLS: owner-scoped
insert/delete, all-authenticated select.

### `social_media_analytics_snapshots` — owned time-series
(`20260429_social_media_analytics_snapshots.sql`)

One row per connected platform per cron run: `captured_at`, `platform`,
`raw jsonb` (full Ayrshare blob — field shapes differ wildly per network, so
we don't split into columns), `source` (`cron` | `manual`).

### `activity_log` (shared table) — post status events
The webhook + the post route write events here: `social.posted`,
`social.failed`, `social.webhook`, with `metadata` carrying the Ayrshare id,
platforms, and raw payload. The **Scheduled** and **History** views read our
own records here rather than trusting Ayrshare's `/history` (which doesn't
reliably surface future-scheduled posts).

### `app_flags` (shared table) — runtime flags
`social_posting_enabled` (boolean) is the global posting kill switch, read
via `src/lib/app-flags.ts#readFlag`.

---

## 5. API routes (`src/app/api/social-media/*`)

All gated by `requireSuperAdmin` (`src/lib/social-media-auth.ts`) except the
cron (CRON_SECRET) and the webhook (shared `?secret=`).

| Route | Method | Purpose |
|---|---|---|
| `/accounts` | GET | Connected accounts for the active profile (Ayrshare `/user`). |
| `/connect-link` | POST | Mints a single-use Ayrshare JWT URL (`/profiles/generateJWT`); admin opens it in a popup to OAuth-connect a network. Requires `AYRSHARE_PROFILE_KEY`. |
| `/post` | POST | The publish path (see §6). |
| `/delete` | POST | Cancels a scheduled post / removes a record (Ayrshare `/delete` by id). |
| `/scheduled` | GET | Scheduled-but-unsent posts, sourced from **our** `activity_log`. |
| `/history` | GET | Recent posts from Ayrshare `/history?lastRecords=N`. |
| `/posting-toggle` | GET/PUT | Reads/flips the `social_posting_enabled` kill switch. |
| `/queue-slots` | GET/PUT | Team-wide recurring posting slots. |
| `/webhook` | POST | Receives Ayrshare status events → `activity_log` (see §7). |
| `/analytics`, `/analytics/refresh`, `/analytics/post`, `/analytics/history` | — | Read snapshots / force a refresh / per-post + historical analytics. |
| `/api/cron/social-media/analytics` | GET/POST | Daily snapshot writer (see §8). |

AI caption routes (`src/app/api/claude/social-caption/*`): `generate`,
`variants`, and the base `social-caption` — plain Anthropic Messages calls,
model `claude-opus-4-8`, no JSON schema (caption returned as text).

---

## 6. Posting flow

1. **Compose / draft.** Admin writes a caption (optionally via the AI
   route), picks platforms, and attaches media. The composer understands
   **per-platform specs** (`platform-specs.ts`) and **deliverables**
   (`deliverables.ts`) — the crops/slots each network needs, keyed
   `"<platformId>|<spec label>"`. Drafts persist to `social_media_drafts`
   and sync live via Realtime.
2. **Approve.** Drafts move `draft → in_review → approved`; `ready/approved`
   marks them publishable.
3. **Publish** → `POST /api/social-media/post`:
   - Kill-switch check (`social_posting_enabled`, else `423`).
   - Body: `{ post, platforms[], mediaUrls?, mediaByPlatform?, scheduleDate? }`.
   - **Posts per network:** platforms are grouped by their resolved media,
     and each distinct-media group is a separate Ayrshare `/post` call — so
     Instagram gets its 1:1 and Facebook its 1.91:1, instead of one shared
     image. Collapses to a single call when all media match.
   - `scheduleDate` (ISO8601, future) schedules instead of posting now.
   - We capture every Ayrshare post id (`ayrshareIdsOf` digs through
     `posts[]`, `postIds[]`, top-level) so scheduled posts can be cancelled
     later, and record the result to `activity_log`.
4. **Status** comes back asynchronously via the **webhook** (§7).

---

## 7. Status webhook (`/api/social-media/webhook`)

- Register the URL in the Ayrshare dashboard (Webhooks → action/social) as
  `https://<host>/api/social-media/webhook?secret=<AYRSHARE_WEBHOOK_SECRET>`.
- Auth is the `?secret=` query param (Ayrshare can't send custom headers);
  fail-closed if the env var is unset.
- Maps Ayrshare status → our event types (`social.posted` / `social.failed`
  / `social.webhook`) and inserts into `activity_log` (service-role client).
- Always ACKs — never makes Ayrshare retry on our own logging failure.

This is why **we treat `activity_log` as the source of truth** for the
Scheduled/History UI rather than polling Ayrshare.

---

## 8. Analytics

- **Daily cron** `/api/cron/social-media/analytics` (Vercel cron `0 13 * * *`,
  authed by `CRON_SECRET`): calls Ayrshare `/user` to discover connected
  platforms, then `/analytics/social`, and writes one
  `social_media_analytics_snapshots` row per platform.
- The **Refresh** button hits the same handler with `source=manual`.
- Owning the snapshots gives a real time-series instead of relying on
  Ayrshare returning live data per page view. The UI extracts headline
  numbers with a shared `extractStats` helper (platform field shapes vary).

---

## 9. Auth & permissions

- `src/lib/social-media-auth.ts#requireSuperAdmin` — every
  `/api/social-media/*` route requires `users.is_super_admin = true`
  (posts publish under the shared brand account).
- Exceptions: the cron (CRON_SECRET) and the webhook (shared secret).
- The page itself (`/feather/social-media`) is also super-admin gated.

---

## 10. Front-end map (`src/app/feather/social-media/`)

- `content.tsx` — the page shell + tabs (Compose/Post, Scheduled, History,
  Library, Templates, AI, Analytics, Schedule slots).
- `create/` — the Compose page; `drafts/[id]/` — per-draft detail/approval.
- `platform-specs.ts` — source of truth for each platform's accepted
  sizes/aspect ratios/limits (edit here when a network changes a rule).
- `deliverables.ts` — shared crop/slot enumeration + the `"<pid>|<label>"`
  key format both pages must agree on.
- Components: `PostPreview`, `MediaPicker`, `SpecCard`, `PlatformIcon`,
  `QueueCard`, `ScheduledCalendar`, `ScheduleSlotsPanel`, `PostingStatus`,
  `PostStatusToast`, `UndoToast`, `Loader`.

---

## 11. Rebuild checklist (for another platform)

1. **Sign up for Ayrshare**, grab the API key; decide single-account vs.
   multi-profile (Business plan → Profile-Key per brand).
2. **Set env:** `AYRSHARE_API_KEY` (+ `AYRSHARE_PROFILE_KEY`),
   `AYRSHARE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `CRON_SECRET`.
3. **Port the Ayrshare client** (`src/lib/ayrshare.ts`) — one auth chokepoint
   + the get/post/delete helpers + error normalizer + platform list.
4. **Create the tables:** drafts (+ selected_deliverables, review_status),
   schedule_slots, analytics_snapshots; plus an events log
   (`activity_log` equivalent) and a flags table (`app_flags`).
5. **Port the routes:** accounts, connect-link, post (per-network grouping +
   kill switch), delete, scheduled (from your own log), history,
   posting-toggle, queue-slots, webhook, analytics + the daily cron.
6. **Register the webhook** URL (with `?secret=`) in Ayrshare; schedule the
   analytics cron.
7. **Gate it** to your admin role; publish goes out under one brand account.
8. **Port the composer** (specs + deliverables + media-per-crop) and the AI
   caption routes if you want the same authoring experience.

The only hard external dependency is **Ayrshare** — swap it and you'd
re-implement per-network OAuth + publishing yourself, which is the whole
reason this design leans on it.
