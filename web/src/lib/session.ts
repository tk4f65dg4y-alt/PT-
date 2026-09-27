// Shared localStorage bookkeeping for an in-progress workout session, so
// both the list view and the guided flow agree on whether one is running.
export interface LocalSession {
  id: string;
  startedAt: number;
}

function key(dayId: string) {
  return `pt_session_${dayId}`;
}

export function loadSession(dayId: string): LocalSession | null {
  const raw = localStorage.getItem(key(dayId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(dayId: string, session: LocalSession) {
  localStorage.setItem(key(dayId), JSON.stringify(session));
}

export function clearSession(dayId: string) {
  localStorage.removeItem(key(dayId));
}
