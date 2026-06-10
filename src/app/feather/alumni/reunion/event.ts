// Shared constants for the alumni reunion event, used by the Reunion
// page + the home teaser so the date / title never drift between them.
//
// Event: Oct 9–11, 2026 at the ranch in Elfrida ("El Frida"), Arizona.
// The countdown anchors to 00:00 of Oct 9 in Phoenix time (UTC-7, no
// DST) — the day the event starts.
export const REUNION_EVENT = {
  title: 'The Reunion at the Ranch',
  location: 'El Frida, Arizona',
  dateLabel: 'October 9 – 11, 2026',
  days: ['Fri · Oct 9', 'Sat · Oct 10', 'Sun · Oct 11'],
  startsAtMs: Date.parse('2026-10-09T00:00:00-07:00'),
  href: '/feather/alumni/reunion',
};
