// Shared chat room helpers (client + server).
//
// Group rooms are plain names ('general'). DM rooms are keyed
// 'dm:<uidA>:<uidB>' with the two participant uuids sorted, so the
// same pair always lands in the same room and membership is testable
// straight off the key — no join table needed.

export const GENERAL_ROOM = 'general';

export function dmRoomFor(a: string, b: string): string {
  return `dm:${[a, b].sort().join(':')}`;
}

export function isDmRoom(room: string): boolean {
  return room.startsWith('dm:');
}

export function dmParticipants(room: string): [string, string] | null {
  if (!isDmRoom(room)) return null;
  const parts = room.slice(3).split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export function isDmParticipant(room: string, userId: string): boolean {
  const p = dmParticipants(room);
  return !!p && (p[0] === userId || p[1] === userId);
}

export function dmOtherParticipant(room: string, userId: string): string | null {
  const p = dmParticipants(room);
  if (!p) return null;
  if (p[0] === userId) return p[1];
  if (p[1] === userId) return p[0];
  return null;
}
