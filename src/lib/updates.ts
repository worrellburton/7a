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
