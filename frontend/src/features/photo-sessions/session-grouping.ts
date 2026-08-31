import type { PhotoSession } from '@features/photo-sessions/actions';

export interface SessionGroup {
  date: string;
  sessions: PhotoSession[];
}

// Assumes sessions arrive pre-sorted by date (the /photo-sessions list
// endpoint does) - this only merges adjacent same-date entries, it doesn't sort.
export function groupSessionsByDate(sessions: PhotoSession[]): SessionGroup[] {
  const groups: SessionGroup[] = [];

  for (const session of sessions) {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.date === session.date) {
      currentGroup.sessions.push(session);
    } else {
      groups.push({ date: session.date, sessions: [session] });
    }
  }

  return groups;
}
