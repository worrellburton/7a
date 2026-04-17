// Build / release log shown on the home dashboard.
//
// Add a new entry to the TOP of `updates` whenever you ship something user-
// visible. Keep `at` in ISO-8601 (UTC). `items` is a short bulleted list of
// what changed in plain English.

export interface UpdateEntry {
  at: string; // ISO timestamp
  title: string;
  items: string[];
}

export const updates: UpdateEntry[] = [
  {
    at: '2026-04-17T09:00:00Z',
    title: 'Mobile optimization pass',
    items: [
      'All major tables (calls, clients, notes, policies, kingdom requests) now scroll horizontally on phones with less-important columns hidden at small widths.',
      'Home dashboard clients/horses rows no longer overflow or left-align on phones.',
      'Admitting-soon clients stack above the admitted row on mobile instead of squishing sideways.',
      'Client chart header avatar + typography scales down gracefully on small screens.',
      'Calls stat cards, filters, and table row padding tightened for phone-sized viewports.',
      'Policies + Notes + Clients + Kingdom Requests headers now wrap properly instead of cramming.',
      'Ask Policies and signed-JD widgets center and add horizontal breathing room on mobile.',
    ],
  },
  {
    at: '2026-04-17T08:00:00Z',
    title: 'AI call scoring: audio analysis + UI fixes',
    items: [
      'AI call scoring now downloads and listens to the actual call recording when available — analysis is based on what was said, not just metadata.',
      'Falls back to metadata-only scoring if audio can\'t be downloaded or the API doesn\'t support it.',
      'AI review popup no longer gets clipped by the table — renders as a floating panel.',
      'Sign-in activity spam fixed — one log per session, not per auth event.',
      'Home dashboard: "Admitting soon" clients now appear on the right side. Hovering admitted clients shows days left until discharge.',
    ],
  },
  {
    at: '2026-04-17T07:00:00Z',
    title: 'Calls: AI scoring for admins',
    items: [
      'Admins now see an "AI" badge on every call row. Hover (or click) to get a Claude-generated analysis: 0–100 score, inferred caller name + interest, sentiment, call summary, operator strengths, areas to coach, and a recommended next step.',
      'Scores are cached per-call in call_ai_scores so they don\'t re-run on every hover. Hit the refresh icon to re-score.',
      'Gated to admins only \u2014 RLS on the scores table backs that up server-side.',
    ],
  },
  {
    at: '2026-04-17T06:00:00Z',
    title: 'Clients module + home dashboard: who\'s in care, who\'s coming, who\'s on the team',
    items: [
      'New /app/clients page with list + grid views. Search, status filter, sortable columns (Name, MRN, Status, Admitted, Clinician).',
      'Seeded 10 test clients with realistic (but clearly fake) data — demographics, insurance, auth, ICD-10, LOC, emergency contact.',
      'Client chart at /app/clients/[id]: Overview, Insurance & Billing, Documents, Finance (admin-only), Notes tabs.',
      'Insurance tab shows payer, plan, member/group IDs, subscriber info, effective/term dates, auth number, LOC code, authorized vs used units (with progress bar), and ICD-10 diagnoses.',
      'Documents tab: standard intake paperwork seeded per client; signed/unsigned badges; upload + download + delete.',
      'Finance tab (admins only): billed / paid / balance totals + line-item ledger.',
      'Home dashboard: "Clients in care" row of circles under Online today. Hover any client for admission + clinician details.',
      'Admitting-soon clients show as pills under the main row with "Arriving today / Tomorrow / In N days" and a full hover card.',
      'Home dashboard: "Horses on the team" row — hover any horse for age, role, weight (latest log), and last fed.',
      'Every client surface includes a visible "Not real information" banner.',
    ],
  },
  {
    at: '2026-04-17T05:00:00Z',
    title: 'Meet the Herd + click-to-change profile picture',
    items: [
      'Public site: the Equine-Assisted Psychotherapy page now has a live "Meet the Herd" gallery. Cards pull straight from our internal horse roster; tap any horse to read their story.',
      'Only public-safe fields surface (name, age, what they work in, rideability, personality, notes) — no body scores, ownership, or internal notes leak.',
      'Home dashboard: click your profile picture to upload a new one. Updates users.avatar_url and auth metadata in one step.',
    ],
  },
  {
    at: '2026-04-17T04:00:00Z',
    title: 'Home dashboard refresh + Ask the policies',
    items: [
      'New: Ask about policies — type any question on the home dashboard and Claude answers it, grounded in every policy we have on file (with inline citations).',
      'What\'s new moved to a floating button in the lower-right. It pulses with a dot when there\'s a shipped update you haven\'t seen; opens into a roll-up panel.',
      'Your profile picture now sits above "Welcome back, …" on the dashboard.',
      'Feature Request button on the home dashboard is now a popup — pick a page from the dropdown (or "+ New page") and submit without navigating away.',
      'Kingdom Requests list gained a Page column and a per-page filter.',
      'Policies and Notes tables: click any column header to sort ascending/descending.',
      'Notes: New Note opens a popup with template + client dropdowns (no more card picker page).',
      'Notes: the spreadsheet list is now the default view.',
      'Bug fix: Biopsychosocial + Individual note fields no longer drop focus after each keystroke.',
      'Console backdrop: subtle animated desert-mountain flow in WebGL, using the existing warm palette (respects reduced-motion).',
    ],
  },
  {
    at: '2026-04-17T02:00:00Z',
    title: 'Policies 2.0 + Kingdom Requests',
    items: [
      'Policies: batch-select rows and reassign Section in one click. Click a name to rename it inline.',
      'Manage Sections button — add or remove policy sections on the fly.',
      'Policy detail: centered layout, logo at top, Seven Arrows branding, version badge (v1, v2…), and Back button in the upper left.',
      'Edit Policy mode: change name, section, purpose, scope, body — every save bumps the version and snapshots the previous one to policy_versions.',
      'Activity feed on each policy shows renames, section changes, reviews, revisions, and version bumps.',
      'Export PDF: one policy or all of them, with branded cover page, logo, colored section tags, and footer.',
      'Kingdom Requests: new feature-request board on the home dashboard and in the popup menu — drop in a request, check it off when it ships.',
    ],
  },
  {
    at: '2026-04-17T00:00:00Z',
    title: 'Notes + Policies: smarter editing',
    items: [
      'Notes: new Generate with AI button drafts a comprehensive, insurance-ready note from client context while preserving anything you\'ve already written.',
      'Notes: spreadsheet + grid views with columns for Type, Client, Session Date, Status, AI Completeness, and Updated. Always-visible delete.',
      'Notes: live completeness score per note with a colored progress bar.',
      'Policies: paste directly from Google Docs — lettered lists (A, B, C) and metadata blocks are now preserved and rendered with hanging-indent formatting.',
      'Activity: deduped sign-in logs so restoring a session or reloading no longer spams the feed.',
    ],
  },
  {
    at: '2026-04-16T06:00:00Z',
    title: 'Policies & Procedures',
    items: [
      'New Policies page — paste raw policy text and we format it with a proper header, section tag, and date strip.',
      'List view shows Section, Name, Date Created, Date Reviewed, and Date Revised columns. Filter by section or search by name.',
      'One-click Mark Reviewed and Mark Revised on the detail view.',
    ],
  },
  {
    at: '2026-04-16T05:00:00Z',
    title: 'Notes: clinical documentation templates',
    items: [
      'New Notes page with three ASAM 4th Edition-aligned templates: Group, Individual, and Biopsychosocial Assessment.',
      'Pick a fake client, fill the template, save as draft or finalize — all six ASAM dimensions are built in.',
      'Saved notes list with type badge, status, and quick delete.',
    ],
  },
  {
    at: '2026-04-16T04:00:00Z',
    title: 'Activity: every action shows up now',
    items: [
      'Audited every write across the app — Horses, Tours, Calendar, Groups, Facilities, Job Descriptions, Billing, RCM pipeline, Fleet, Departments, Profile.',
      'New events logged: weight logs, feed logs, vet visits, tour guests / presentations / staff / schedule / rooms, calendar moves + resizes, facility status/priority changes, JD assignments + deletes, claim status changes, fleet docs, and more.',
      'Open Activity and you\'ll see real work instead of a wall of sign-ins.',
    ],
  },
  {
    at: '2026-04-16T03:00:00Z',
    title: 'Horses: track weight + feed, tighten vet form',
    items: [
      'Hit the + next to Weight to log a new reading — each entry is saved and charted on a bar graph on the horse page.',
      'New Feed card with a + button for quick entries (type, amount, unit, notes). Last 30 days roll up into a per-type report.',
      'Rideable is now a proper dropdown (Yes / No / For staff / Maybe).',
      'Vet visit "Reason" is now a dropdown including Deworming, Vaccines, Dental, Lameness, Injury.',
      'Attach a PDF report right on the Add Visit form — no extra step after saving.',
    ],
  },
  {
    at: '2026-04-16T02:00:00Z',
    title: 'Tours: plan every visit end-to-end',
    items: [
      'New Tours page under Marketing & Admissions — schedule visits and they land on the calendar automatically.',
      'Track guests (name, company, title, LinkedIn), BD staff, and presentation sign-ups per tour.',
      'Assign who owns each of the seven standard activities (Trail Ride, Equine Experience, Property Tour, Clinical, Lunch, Sweat Lodge…) and mark approval status.',
      'Tour Rooms checklist: selectable, ready, approved by Pam, with setup notes.',
    ],
  },
  {
    at: '2026-04-16T01:30:00Z',
    title: 'Horses: crop the photo before saving',
    items: [
      'After picking a horse photo, a crop window opens — drag + zoom to frame the shot, then save.',
      'Output is a clean square avatar so every horse circle looks consistent.',
    ],
  },
  {
    at: '2026-04-16T01:00:00Z',
    title: 'Horses: profile pictures',
    items: [
      'Upload a photo for each horse — click the new avatar circle on any row to pick an image.',
      'Horse detail page now shows a big avatar you can tap to replace the photo.',
    ],
  },
  {
    at: '2026-04-16T00:30:00Z',
    title: 'Calendar: Events tab',
    items: [
      'New "Events" tab on the calendar — schedule standalone events not tied to a group or team member.',
      'Type an event name in the Events panel, then drag it onto any day.',
    ],
  },
  {
    at: '2026-04-16T00:15:00Z',
    title: 'Mobile polish pass',
    items: [
      'Home dashboard button no longer collides with the mobile top bar.',
      'Cursors are now hidden on mobile (touch devices only).',
      '"Online today" tooltips hidden on mobile to avoid overflow.',
      'Team page Org Chart button shrinks on small screens.',
      'Photo lightbox: delete button moved away from close to avoid mis-taps.',
    ],
  },
  {
    at: '2026-04-15T23:55:00Z',
    title: 'Profile, cursors, and sign-ins',
    items: [
      'Pick your own cursor color in My Profile — it updates live for everyone.',
      'Signed job description now lives in its own card just above What\'s new.',
      'Sign-ins are now logged to the Activity feed.',
    ],
  },
  {
    at: '2026-04-15T23:35:00Z',
    title: 'Cleaner cursors',
    items: [
      'Cursor labels are now just the profile picture — no name pill.',
    ],
  },
  {
    at: '2026-04-15T23:25:00Z',
    title: 'Avatars on every chat bubble',
    items: [
      'Each facilities chat message now shows the author\'s profile picture, not just the first in a streak.',
    ],
  },
  {
    at: '2026-04-15T23:10:00Z',
    title: 'Live collaboration',
    items: [
      'See teammates\' cursors in realtime with their profile picture and name.',
      'Cursors only show on the same page you\'re both viewing.',
      'Facilities issues now flip status, priority, and edits live for everyone watching.',
    ],
  },
  {
    at: '2026-04-15T22:50:00Z',
    title: 'Activity feed: facilities events',
    items: [
      'New facilities requests now show up in the Activity feed.',
      'Chat messages on facilities issues are logged to Activity too.',
    ],
  },
  {
    at: '2026-04-15T22:30:00Z',
    title: 'Facilities chat upgrades',
    items: [
      'Each row has a chat icon with message count and a red dot for unread messages.',
      'Your own chat bubbles now show your profile picture on the right.',
      'Opening a row marks its chat as read.',
    ],
  },
  {
    at: '2026-04-15T22:10:00Z',
    title: 'Update log',
    items: [
      'Home page now shows a scrollable build log of recent updates.',
      'New facilities request button moved to the upper right corner.',
    ],
  },
  {
    at: '2026-04-15T21:40:48Z',
    title: 'New facilities request shortcut',
    items: [
      'Added a button on the home dashboard to start a new facilities request in one click.',
    ],
  },
  {
    at: '2026-04-15T21:37:38Z',
    title: 'Home layout polish',
    items: [
      '"Online today" pinned to the top of the dashboard.',
      'Work-in-progress banner moved to the bottom.',
    ],
  },
  {
    at: '2026-04-15T21:36:37Z',
    title: 'Facilities chat',
    items: [
      'Each facilities issue now has its own iMessage-style chat thread.',
      'Realtime updates so teammates see new messages without refreshing.',
      'You can delete your own messages.',
    ],
  },
  {
    at: '2026-04-15T21:15:50Z',
    title: 'Faster, larger photo uploads',
    items: [
      'Photos now upload directly to Supabase Storage from the browser.',
      'Bypasses the 4.5MB serverless body limit — large phone photos work again.',
      'Client-side compression keeps things snappy.',
    ],
  },
  {
    at: '2026-04-15T20:50:51Z',
    title: 'Calendar drag-and-drop fix',
    items: [
      'Week view now correctly accepts drops onto the day grid again.',
    ],
  },
];
