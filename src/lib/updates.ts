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
