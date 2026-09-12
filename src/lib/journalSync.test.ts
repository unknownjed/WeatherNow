import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadJournalFromDrive, mergeJournalEntries, saveJournalToDrive } from './journalSync.ts';

const local = { id: 'local', date: '2026-09-01', location: 'Manila', note: 'rain', createdAt: 2 };
const remote = { id: 'remote', date: '2026-09-01', location: 'Cebu', note: 'sun', createdAt: 1 };

test('merges records from different devices without dropping either one', () => {
  assert.deepEqual(mergeJournalEntries([local], [remote]).map(entry => entry.id), ['local', 'remote']);
});

test('loads a private app-data journal file', async () => {
  const calls: string[] = [];
  const request = async (url: string | URL | Request) => {
    calls.push(String(url));
    return calls.length === 1
      ? new Response(JSON.stringify({ files: [{ id: 'file1' }] }), { status: 200 })
      : new Response(JSON.stringify({ entries: [remote] }), { status: 200 });
  };
  assert.deepEqual(await loadJournalFromDrive('token', request as typeof fetch), [remote]);
  assert.match(calls[0], /spaces=appDataFolder/);
  assert.match(calls[1], /file1\?alt=media/);
});

test('creates and uploads the journal when no cloud file exists', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const request = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return new Response(JSON.stringify({ files: [] }), { status: 200 });
    if (calls.length === 2) return new Response(JSON.stringify({ id: 'new-file' }), { status: 200 });
    return new Response('', { status: 200 });
  };
  await saveJournalToDrive('token', [local], request as typeof fetch);
  assert.equal(calls[1].init?.method, 'POST');
  assert.equal(calls[2].init?.method, 'PATCH');
  assert.match(String(calls[2].init?.body), /"local"/);
});

test('reports a disabled Drive API instead of claiming the journal synced', async () => {
  const request = async () => new Response(JSON.stringify({
    error: { message: 'Google Drive API has not been used in project before or it is disabled.' },
  }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(loadJournalFromDrive('token', request as typeof fetch), /Google Drive API is not enabled/);
});
