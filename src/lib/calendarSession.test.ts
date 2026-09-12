import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALENDAR_SESSION_KEY, clearCalendarSession, readCalendarSession, saveCalendarSession, validCalendarToken, type CalendarSession } from './calendarSession.ts';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}
const session = (): CalendarSession => ({ user: { email: 'test@example.com' }, accessToken: 'test-token', expiresAt: Date.now() + 3600000 });

test('refresh and a fresh browser/app window restore the saved account and valid token', () => {
  const local = storage();
  const saved = session();
  saveCalendarSession(local, storage(), saved);
  assert.deepEqual(readCalendarSession(local, storage()), saved);
  assert.deepEqual(readCalendarSession(local, storage()), saved);
});
test('existing tab sessions migrate to persistent storage before that tab closes', () => {
  const local = storage(), tab = storage();
  const saved = session();
  tab.setItem(CALENDAR_SESSION_KEY, JSON.stringify(saved));
  assert.deepEqual(readCalendarSession(local, tab), saved);
  assert.equal(tab.getItem(CALENDAR_SESSION_KEY), null);
  assert.deepEqual(readCalendarSession(local, storage()), saved);
});
test('token expiry keeps the account but never returns an expired Google API credential', () => {
  const local = storage();
  const saved = { ...session(), expiresAt: Date.now() - 1000 };
  saveCalendarSession(local, storage(), saved);
  const restored = readCalendarSession(local, storage());
  assert.deepEqual(restored?.user, saved.user);
  assert.equal(restored?.accessToken, null);
  assert.equal(validCalendarToken(saved), null);
  assert.deepEqual(readCalendarSession(local, storage()), restored);
});
test('explicit sign out stays signed out even when another old tab has a legacy session', () => {
  const local = storage(), oldTab = storage();
  saveCalendarSession(local, storage(), session());
  oldTab.setItem(CALENDAR_SESSION_KEY, JSON.stringify(session()));
  local.setItem('weathernow_weather_journal', 'notes and photos');
  clearCalendarSession(local, storage());
  assert.equal(readCalendarSession(local, oldTab), null);
  assert.equal(local.getItem('weathernow_weather_journal'), 'notes and photos');
});
test('invalid expiry cannot revive a token; failed persistence reports failure', () => {
  const local = storage();
  local.setItem(CALENDAR_SESSION_KEY, JSON.stringify({ ...session(), expiresAt: 'forever' }));
  assert.equal(readCalendarSession(local, storage()), null);
  assert.throws(() => saveCalendarSession({ ...local, setItem: () => { throw new Error('Storage blocked'); } }, storage(), session()), /Storage blocked/);
});
