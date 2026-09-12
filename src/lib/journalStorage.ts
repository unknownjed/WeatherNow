export interface JournalEntry {
  id: string;
  date: string;
  location: string;
  note: string;
  photos?: string[];
  photosBackedUp?: boolean;
  photoBackups?: Record<string, { id: string; productUrl?: string }>;
  createdAt: number;
  updatedAt?: number;
  /** Hidden sync tombstone. Newer tombstones prevent stale devices from resurrecting deleted entries. */
  deleted?: boolean;
}

export const JOURNAL_KEY = 'weathernow_weather_journal';
type JournalStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function activeJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter(entry => !entry.deleted);
}

export function journalDateCounts(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of activeJournalEntries(entries)) counts[entry.date] = (counts[entry.date] || 0) + 1;
  return counts;
}

export function journalEntriesForDate(entries: JournalEntry[], date: string): JournalEntry[] {
  return activeJournalEntries(entries).filter(entry => entry.date === date).sort((a, b) => b.createdAt - a.createdAt);
}

export function readJournalEntries(storage: JournalStorage): JournalEntry[] {
  const entries: unknown = JSON.parse(storage.getItem(JOURNAL_KEY) || '[]');
  if (!Array.isArray(entries) || entries.some(entry => !entry || typeof entry.id !== 'string' || typeof entry.date !== 'string')) {
    throw new Error('Saved journal data could not be read.');
  }
  return entries;
}

// Read immediately before writing instead of overwriting from an old render.
// Return only after storage succeeds so failed saves never look successful.
export function updateJournalEntries(storage: JournalStorage, update: (entries: JournalEntry[]) => JournalEntry[]): JournalEntry[] {
  const next = update(readJournalEntries(storage));
  storage.setItem(JOURNAL_KEY, JSON.stringify(next));
  return next;
}
