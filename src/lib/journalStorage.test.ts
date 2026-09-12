import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOURNAL_KEY, journalDateCounts, journalEntriesForDate, readJournalEntries, updateJournalEntries, type JournalEntry } from './journalStorage.ts';
import { saveJournalPhoto } from './journalPhotos.ts';

const entry = (id: string): JournalEntry => ({ id, date: '2026-08-30', location: 'Manila', note: id, photos: ['data:image/png;base64,AA=='], createdAt: 1 });
function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => data.delete(key) };
}

test('yesterday remains selectable in the calendar after a new day and reload, including photos', () => {
  const local = storage();
  const yesterday = entry('yesterday');
  const today = { ...entry('today'), date: '2026-08-31' };
  updateJournalEntries(local, () => [today, yesterday]);
  const reloaded = readJournalEntries(local);
  assert.deepEqual(journalDateCounts(reloaded), { '2026-08-31': 1, '2026-08-30': 1 });
  assert.deepEqual(journalEntriesForDate(reloaded, '2026-08-30'), [yesterday]);
  assert.deepEqual(journalEntriesForDate(reloaded, '2026-08-31'), [today]);
  assert.deepEqual(readJournalEntries(local), [today, yesterday]);
});

test('Google sign-out leaves notes and posted photos available for restoration', () => {
  const local = storage();
  const session = storage();
  updateJournalEntries(local, () => [entry('saved')]);
  session.setItem('weathernow_google_calendar_session', 'test-session');
  const before = local.getItem(JOURNAL_KEY);
  session.removeItem('weathernow_google_calendar_session');
  assert.equal(local.getItem(JOURNAL_KEY), before);
  assert.deepEqual(readJournalEntries(local), [entry('saved')]);
});

test('delayed backup completion preserves newer entries and edited text', () => {
  const local = storage();
  updateJournalEntries(local, () => [entry('first')]);
  updateJournalEntries(local, current => [entry('second'), ...current.map(item => ({ ...item, note: 'edited' }))]);
  updateJournalEntries(local, current => current.map(item => item.id === 'first' ? { ...item, photosBackedUp: true } : item));
  assert.equal(readJournalEntries(local).length, 2);
  assert.equal(readJournalEntries(local)[1].note, 'edited');
  updateJournalEntries(local, current => current.filter(item => item.id !== 'first'));
  updateJournalEntries(local, current => current.map(item => item.id === 'first' ? { ...item, photosBackedUp: true } : item));
  assert.deepEqual(readJournalEntries(local).map(item => item.id), ['second']);
});

test('storage quota failure preserves previously saved data and reports failure', () => {
  const local = storage();
  updateJournalEntries(local, () => [entry('saved')]);
  const fullStorage = { getItem: local.getItem, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.throws(() => updateJournalEntries(fullStorage, current => [entry('new'), ...current]));
  assert.deepEqual(readJournalEntries(local), [entry('saved')]);
});

test('unreadable data is never overwritten by a new save', () => {
  const local = storage();
  local.setItem(JOURNAL_KEY, '{invalid data');
  assert.throws(() => updateJournalEntries(local, () => [entry('new')]));
  assert.equal(local.getItem(JOURNAL_KEY), '{invalid data');
});

function photosRequest(result: unknown, status = 200) {
  let calls = 0;
  return (async () => ++calls === 1
    ? new Response('upload-token')
    : new Response(JSON.stringify(result), { status })) as typeof fetch;
}

test('Google Photos backup requires a confirmed media item, not just HTTP 200', async () => {
  await assert.rejects(saveJournalPhoto('test', entry('photo').photos![0], 'journal', 'photo', photosRequest({ newMediaItemResults: [{ status: { code: 7, message: 'Permission denied' } }] })), /Permission denied/);
  await assert.rejects(saveJournalPhoto('test', entry('photo').photos![0], 'journal', 'photo', photosRequest({})), /did not confirm/);
  const saved = await saveJournalPhoto('test', entry('photo').photos![0], 'journal', 'photo', photosRequest({ newMediaItemResults: [{ status: { code: 0 }, mediaItem: { id: 'saved-id', productUrl: 'https://photos.google.com/photo/test' } }] }));
  assert.equal(saved.id, 'saved-id');
});

test('Google Photos authorization failure provides a reconnect instruction', async () => {
  await assert.rejects(saveJournalPhoto('test', entry('photo').photos![0], 'journal', 'photo', photosRequest({}, 401)), /Reconnect Google Calendar/);
});
