export interface CalendarUser {
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface CalendarSession {
  accessToken: string | null;
  expiresAt: number;
  user: CalendarUser;
  grantedScopes?: string;
}

export const CALENDAR_SESSION_KEY = 'weathernow_google_calendar_session';
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function validCalendarToken(session: CalendarSession | null, now = Date.now()): string | null {
  return session && session.expiresAt > now + 60_000 ? session.accessToken : null;
}

export function readCalendarSession(persistent: SessionStorage, legacy: SessionStorage): CalendarSession | null {
  // An explicit stored null means signed out, and must override an old tab.
  const stored = persistent.getItem(CALENDAR_SESSION_KEY);
  const raw = stored ?? legacy.getItem(CALENDAR_SESSION_KEY);
  if (!raw) return null;
  let session: CalendarSession;
  try { session = JSON.parse(raw); } catch { return null; }
  if (!session || typeof session.user?.email !== 'string' || !session.user.email
    || !Number.isFinite(session.expiresAt)
    || (session.accessToken !== null && typeof session.accessToken !== 'string')) return null;
  const restored = { ...session, accessToken: validCalendarToken(session) };
  // Expiry invalidates API access, not the remembered account or its journals.
  if (stored === null || restored.accessToken !== session.accessToken) {
    persistent.setItem(CALENDAR_SESSION_KEY, JSON.stringify(restored));
  }
  legacy.removeItem(CALENDAR_SESSION_KEY);
  return restored;
}

export function saveCalendarSession(persistent: SessionStorage, legacy: SessionStorage, session: CalendarSession): void {
  persistent.setItem(CALENDAR_SESSION_KEY, JSON.stringify(session));
  legacy.removeItem(CALENDAR_SESSION_KEY);
}

export function clearCalendarSession(persistent: SessionStorage, legacy: SessionStorage): void {
  persistent.setItem(CALENDAR_SESSION_KEY, 'null');
  legacy.removeItem(CALENDAR_SESSION_KEY);
}
