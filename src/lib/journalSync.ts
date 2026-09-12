import type { JournalEntry } from './journalStorage';

const FILE_NAME = 'weathernow-journal-v1.json';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

async function checked(response: Response) {
  if (response.ok) return response;
  let detail = '';
  try {
    const payload = await response.clone().json();
    detail = String(payload?.error?.message || payload?.error_description || '');
  } catch { /* Google did not return JSON. */ }
  if (response.status === 401) throw new Error('Google access expired. Reconnect your Google account to sync this journal.');
  if (response.status === 403) {
    if (/drive api.*(disabled|has not been used)|access not configured/i.test(detail)) {
      throw new Error('Google Drive API is not enabled for this OAuth project, so cross-device journal sync cannot start.');
    }
    throw new Error(detail || 'Reconnect your Google account and allow private journal sync.');
  }
  throw new Error(`Google Drive journal sync failed (${response.status}).`);
}

async function findFiles(token: string, request: typeof fetch): Promise<string[]> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}' and trashed=false`,
    fields: 'files(id,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '100',
  });
  const response = await checked(await request(`${DRIVE}/files?${params}`, { headers: { Authorization: `Bearer ${token}` } }));
  const files = (await response.json()).files;
  return Array.isArray(files) ? files.map((file: any) => String(file?.id || '')).filter(Boolean) : [];
}

export function mergeJournalEntries(local: JournalEntry[], remote: JournalEntry[]): JournalEntry[] {
  const entries = new Map<string, JournalEntry>();
  for (const entry of [...remote, ...local]) {
    const saved = entries.get(entry.id);
    if (!saved || (entry.updatedAt || entry.createdAt) >= (saved.updatedAt || saved.createdAt)) entries.set(entry.id, entry);
  }
  return [...entries.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadJournalFromDrive(token: string, request: typeof fetch = fetch): Promise<JournalEntry[]> {
  const ids = await findFiles(token, request);
  if (!ids.length) return [];

  // Older versions could create duplicate appData files when two devices saved
  // before either device saw the other's file. Read every matching file so a
  // record made on one device cannot become stranded in a different duplicate.
  let merged: JournalEntry[] = [];
  for (const id of ids) {
    const response = await checked(await request(`${DRIVE}/files/${encodeURIComponent(id)}?alt=media`, { headers: { Authorization: `Bearer ${token}` } }));
    const value = await response.json();
    if (Array.isArray(value?.entries)) merged = mergeJournalEntries(merged, value.entries);
  }
  return merged;
}

export async function saveJournalToDrive(token: string, entries: JournalEntry[], request: typeof fetch = fetch): Promise<void> {
  let ids = await findFiles(token, request);
  if (!ids.length) {
    const response = await checked(await request(`${DRIVE}/files`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }),
    }));
    const id = (await response.json()).id;
    if (id) ids = [id];
  }
  if (!ids.length) throw new Error('Google Drive did not create the journal sync file.');

  // Converge all duplicate sync files to the same merged content. This keeps
  // existing installations compatible and prevents desktop/mobile divergence.
  await Promise.all(ids.map(async id => checked(await request(`${UPLOAD}/files/${encodeURIComponent(id)}?uploadType=media`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 2, entries }),
  }))));
}
export async function syncJournalWithDrive(token: string, localEntries: JournalEntry[], request: typeof fetch = fetch): Promise<JournalEntry[]> {
  const remote = await loadJournalFromDrive(token, request);
  const merged = mergeJournalEntries(localEntries, remote);
  await saveJournalToDrive(token, merged, request);
  return merged;
}
