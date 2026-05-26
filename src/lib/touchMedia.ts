// Fire-and-forget recency bump for a picked media asset.
//
// Every media picker in the app (social-media Build,
// MediaPicker, content editor, email-campaign image picker)
// calls this on selection. The server endpoint sets
// last_used_at = now() on the matching site_images /
// site_videos row, so the next library query (which orders
// by last_used_at desc, created_at desc) puts the asset at
// the top across every surface.
//
// Failures are intentionally swallowed — losing a recency
// signal is a worse UX hit if it blocked the actual pick.

export function touchMedia(kind: 'image' | 'video', id: string): void {
  // No await — the picker shouldn't wait on the bump.
  void fetch('/api/media/touch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, id }),
    keepalive: true,
  }).catch(() => { /* non-fatal */ });
}
