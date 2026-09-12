import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Edit3, ImagePlus, Maximize2, Minimize2, Plus, Trash2, X } from 'lucide-react';

import { JOURNAL_KEY, JournalEntry, activeJournalEntries, journalDateCounts, journalEntriesForDate, readJournalEntries, updateJournalEntries } from '../lib/journalStorage';
import { journalPhotoKey, saveJournalPhoto } from '../lib/journalPhotos';
import { createOverlayBack } from '../lib/overlayBack';
import { getUiLabels } from '../lib/uiLabels';
import { syncJournalWithDrive } from '../lib/journalSync';

function readEntries(): JournalEntry[] {
  try { return readJournalEntries(localStorage); } catch { return []; }
}

function getLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function WeatherJournal({ locationName, language = 'en', googleAccessToken, accountLinked = Boolean(googleAccessToken), selectedDate, onDatesChange }: { locationName: string; language?: string; googleAccessToken?: string | null; accountLinked?: boolean; selectedDate: string; onDatesChange?: (dates: Record<string, number>) => void }) {
  const ui = getUiLabels(language);
  const [entries, setEntries] = useState<JournalEntry[]>(readEntries);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoPickerActive, setPhotoPickerActive] = useState(false);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<JournalEntry | null>(null);
  const overlayBack = useRef<ReturnType<typeof createOverlayBack> | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const backupsInFlight = useRef(new Set<string>());
  const cloudSyncInFlight = useRef(false);
  const [backingUpIds, setBackingUpIds] = useState<string[]>([]);
  const activeToken = useRef(googleAccessToken);
  activeToken.current = googleAccessToken;
  const visibleEntries = useMemo(() => accountLinked
    ? journalEntriesForDate(entries, selectedDate)
    : [], [entries, selectedDate, accountLinked]);

  const todayDate = getLocalDate();
  const isTodaySelected = selectedDate === todayDate;
  const canRecordJournal = accountLinked && isTodaySelected;

  useEffect(() => {
    onDatesChange?.(accountLinked ? journalDateCounts(entries) : {});
  }, [entries, accountLinked, onDatesChange]);

  useEffect(() => {
    if (isTodaySelected) return;
    setEditingId(null);
    setNote('');
    setPhotos([]);
    setPhotoPickerActive(false);
  }, [isTodaySelected, selectedDate]);

  useEffect(() => {
    const restoreRecords = () => {
      try { setEntries(readJournalEntries(localStorage)); }
      catch { setBackupStatus(ui.journalReadError); }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === JOURNAL_KEY || event.key === null) restoreRecords();
    };
    restoreRecords();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', restoreRecords);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', restoreRecords);
    };
  }, [googleAccessToken, selectedDate]);

  useEffect(() => {
    if (accountLinked && !googleAccessToken) {
      setBackupStatus(ui.journalReconnectDrive);
    }
  }, [accountLinked, googleAccessToken]);

  useEffect(() => {
    if (!googleAccessToken) return;
    let cancelled = false;

    const syncCloudJournal = async () => {
      if (cloudSyncInFlight.current || !navigator.onLine) return;
      cloudSyncInFlight.current = true;
      try {
        const local = readJournalEntries(localStorage);
        const merged = await syncJournalWithDrive(googleAccessToken, local);
        if (cancelled) return;
        const latest = updateJournalEntries(localStorage, current => {
          // A local edit may have happened while the network request was running.
          // Merge it back in before updating the UI so that edit is never lost.
          const byId = new Map(merged.map(entry => [entry.id, entry]));
          for (const entry of current) {
            const saved = byId.get(entry.id);
            if (!saved || (entry.updatedAt || entry.createdAt) >= (saved.updatedAt || saved.createdAt)) byId.set(entry.id, entry);
          }
          return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
        });
        setEntries(latest);
        if (latest.length !== merged.length || latest.some((entry, index) => entry.id !== merged[index]?.id || (entry.updatedAt || entry.createdAt) !== (merged[index]?.updatedAt || merged[index]?.createdAt))) {
          await syncJournalWithDrive(googleAccessToken, latest);
        }
      } catch (error) {
        if (!cancelled) setBackupStatus(`${ui.localPhotosKept} ${error instanceof Error ? error.message : ui.cloudSyncFailed}`);
      } finally {
        cloudSyncInFlight.current = false;
      }
    };

    const syncWhenActive = () => {
      if (document.visibilityState === 'visible') void syncCloudJournal();
    };

    void syncCloudJournal();
    // Also poll frequently while the page stays open so records saved on another
    // device appear with minimal delay even when this tab remains active.
    const cloudRefresh = window.setInterval(() => void syncCloudJournal(), 2_000);
    window.addEventListener('focus', syncWhenActive);
    window.addEventListener('pageshow', syncWhenActive);
    document.addEventListener('visibilitychange', syncWhenActive);
    window.addEventListener('online', syncWhenActive);

    return () => {
      cancelled = true;
      window.clearInterval(cloudRefresh);
      window.removeEventListener('focus', syncWhenActive);
      window.removeEventListener('pageshow', syncWhenActive);
      document.removeEventListener('visibilitychange', syncWhenActive);
      window.removeEventListener('online', syncWhenActive);
    };
  }, [googleAccessToken]);

  useEffect(() => {
    if (!photoPickerActive) return;
    const clearPickerState = () => setPhotoPickerActive(false);
    window.addEventListener('focus', clearPickerState, { once: true });
    return () => window.removeEventListener('focus', clearPickerState);
  }, [photoPickerActive]);

  useEffect(() => {
    const back = createOverlayBack(window);
    overlayBack.current = back;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) back.closeTop();
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      back.dispose();
      overlayBack.current = null;
    };
  }, []);

  const toggleJournalExpanded = () => {
    if (journalExpanded) overlayBack.current?.closeTop();
    else if (overlayBack.current?.open(() => setJournalExpanded(false))) setJournalExpanded(true);
  };
  const openPhoto = (photo: string) => {
    if (overlayBack.current?.open(() => setPreviewPhoto(null))) setPreviewPhoto(photo);
  };
  const closePhoto = () => overlayBack.current?.closeTop();

  const persist = (update: (current: JournalEntry[]) => JournalEntry[]) => {
    try {
      const next = updateJournalEntries(localStorage, update);
      setEntries(next);
      if (activeToken.current) {
        const token = activeToken.current;
        void syncJournalWithDrive(token, next).then(merged => {
          if (activeToken.current !== token) return;
          const latest = updateJournalEntries(localStorage, current => {
            const byId = new Map(merged.map(entry => [entry.id, entry]));
            for (const entry of current) {
              const saved = byId.get(entry.id);
              if (!saved || (entry.updatedAt || entry.createdAt) >= (saved.updatedAt || saved.createdAt)) byId.set(entry.id, entry);
            }
            return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
          });
          setEntries(latest);
          if (latest.length !== merged.length || latest.some((entry, index) => entry.id !== merged[index]?.id || (entry.updatedAt || entry.createdAt) !== (merged[index]?.updatedAt || merged[index]?.createdAt))) {
            void syncJournalWithDrive(token, latest).catch(() => undefined);
          }
        }).catch(error => {
          setBackupStatus(`${ui.savedOnDevice} ${error instanceof Error ? error.message : ui.cloudSyncFailed}`);
        });
      }
      return true;
    } catch {
      setBackupStatus(ui.journalSaveError);
      return false;
    }
  };
  const deleteEntry = (id: string) => persist(current => current.map(item => item.id === id ? { ...item, deleted: true, updatedAt: Date.now(), photos: undefined, photoBackups: undefined, photosBackedUp: undefined } : item));
  const backupPhotos = async (entry: JournalEntry) => {
    if (!googleAccessToken || !entry.photos?.length || backupsInFlight.current.has(entry.id)) return;
    const token = googleAccessToken;
    backupsInFlight.current.add(entry.id);
    setBackingUpIds(ids => [...ids, entry.id]);
    setBackupStatus(ui.savingJournalPhotos);
    try {
      for (const [index, dataUrl] of entry.photos.entries()) {
        // Stop initiating uploads after sign-out; keep all records and photos.
        if (activeToken.current !== token) return;
        const currentEntry = readJournalEntries(localStorage).find(item => item.id === entry.id);
        if (!currentEntry || !currentEntry.photos?.includes(dataUrl)) continue;
        const key = await journalPhotoKey(dataUrl);
        if (currentEntry.photoBackups?.[key]?.id) continue;
        const saved = await saveJournalPhoto(token, dataUrl, `Weather journal ${entry.date} — ${entry.location}`, `weathernow-${entry.date}-${index + 1}`);
        // Preserve newer records and edits, and never resurrect a deleted entry.
        if (!persist(current => current.map(item => item.id === entry.id
          ? { ...item, photoBackups: { ...item.photoBackups, [key]: saved } }
          : item))) return;
      }
      if (activeToken.current !== token) return;
      const latest = readJournalEntries(localStorage).find(item => item.id === entry.id);
      if (!latest?.photos?.length) return;
      const keys = await Promise.all(latest.photos.map(journalPhotoKey));
      const complete = keys.every(key => Boolean(latest.photoBackups?.[key]?.id));
      if (persist(current => current.map(item => item.id === entry.id && JSON.stringify(item.photos) === JSON.stringify(latest.photos)
        ? { ...item, photosBackedUp: complete } : item))) {
        setBackupStatus(complete ? ui.photosSaved : ui.photosNeedBackup);
      }
    } catch (error) {
      setBackupStatus(`${ui.localPhotosKept} ${error instanceof Error ? error.message : ui.cloudSyncFailed}`);
    } finally {
      backupsInFlight.current.delete(entry.id);
      setBackingUpIds(ids => ids.filter(id => id !== entry.id));
    }
  };

  const addEntry = async () => {
    if (!canRecordJournal) {
      setBackupStatus(ui.journalOnlyToday);
      return;
    }
    const clean = note.trim();
    if (!clean && !photos.length) return;
    // Journal recording is restricted to the current local date.
    const entryDate = todayDate;
    const entry: JournalEntry = { id: editingId || crypto.randomUUID?.() || `${Date.now()}`, date: entryDate, location: locationName, note: clean, photos: photos.length ? photos : undefined, createdAt: editingId ? (entries.find(item => item.id === editingId)?.createdAt || Date.now()) : Date.now(), updatedAt: Date.now() };
    const saved = editingId
      ? persist(current => current.map(item => item.id === editingId
        ? { ...item, ...entry, photosBackedUp: JSON.stringify(item.photos) === JSON.stringify(entry.photos) && item.photosBackedUp }
        : item))
      : persist(current => [entry, ...current]);
    if (!saved) return;
    setEditingId(null); setNote(''); setPhotos([]);
    setBackupStatus(`${ui.journalSaved} ${entry.date}. ${entry.date !== selectedDate ? ui.selectDateToView : ui.savedOnDevice}`);
    if (entry.photos?.length) {
      if (googleAccessToken) await backupPhotos(entry);
      else setBackupStatus(`${ui.journalSaved} ${entry.date}. ${ui.savedOnDevice} ${ui.journalCloudPaused}`);
    }
  };

  const beginEdit = (entry: JournalEntry) => {
    if (!isTodaySelected || entry.date !== todayDate) {
      setBackupStatus(ui.journalOldDatesViewOnly);
      return;
    }
    setEditingId(entry.id);
    setNote(entry.note);
    setPhotos(entry.photos || []);
    setBackupStatus(null);
  };

  const cancelEdit = () => { setEditingId(null); setNote(''); setPhotos([]); setBackupStatus(null); };

  const addPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoPickerActive(false);
    const files = Array.from(event.target.files || []) as File[];
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => setPhotos(current => [...current, String(reader.result)]);
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  return (
    <aside className="relative flex h-[560px] min-h-0 flex-col overflow-hidden rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sky-900 dark:text-slate-200"><BookOpen size={17} className="text-indigo-500" />{ui.personalWeatherJournal}</h2>
      </div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{locationName}</div>
      {accountLinked && <p className="mb-2 text-[10px] text-slate-500">{ui.viewingJournalFor} <time dateTime={selectedDate}>{selectedDate}</time> · {visibleEntries.length} {visibleEntries.length === 1 ? ui.savedRecord : ui.savedRecords}</p>}
      <textarea disabled={!canRecordJournal} value={note} onChange={event => setNote(event.target.value)} onKeyDown={event => { if (event.ctrlKey && event.key === 'Enter') addEntry(); }} placeholder={!accountLinked ? ui.connectGoogleToRecord : isTodaySelected ? ui.recordObservation : ui.viewOnlyPlaceholder} className="min-h-24 resize-y rounded-lg border border-sky-200 !bg-white p-3 text-xs text-slate-900 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:!bg-slate-800 dark:text-white" />
      <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={addPhotos} className="hidden" />
      <button type="button" disabled={!canRecordJournal} onClick={() => { setPhotoPickerActive(true); photoInputRef.current?.click(); }} className={`mt-2 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${photoPickerActive ? 'border-blue-700 bg-blue-600 shadow-[inset_0_0_0_1px_rgba(147,197,253,0.9)] dark:border-blue-400 dark:bg-blue-600' : 'border-blue-700 bg-blue-600 hover:bg-blue-500 dark:border-blue-400 dark:bg-blue-600 dark:hover:bg-blue-500'}`}><ImagePlus size={14} />{ui.addPhotos}</button>
      {photos.length > 0 && <div className="mt-2 grid grid-cols-4 gap-1">{photos.map((photo, index) => <div key={`${photo.slice(-20)}-${index}`} className="group relative aspect-square overflow-hidden rounded"><img src={photo} alt={`${ui.selectedJournalPhoto} ${index + 1}`} className="h-full w-full object-cover" /><button type="button" aria-label={ui.removeSelectedPhoto} onClick={() => setPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 group-hover:opacity-100"><X size={11} /></button></div>)}</div>}
      <button type="button" onClick={addEntry} disabled={!canRecordJournal || (!note.trim() && !photos.length)} className="my-3 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={14} />{editingId ? ui.saveChanges : ui.saveJournalEntry}</button>
      {accountLinked && !isTodaySelected && <p className="-mt-1 mb-3 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">{ui.viewOnlyToday} ({todayDate}).</p>}
      {editingId && <button type="button" onClick={cancelEdit} className="-mt-2 mb-3 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">{ui.cancelEdit}</button>}
      {backupStatus && <p role="status" className="mb-2 text-[10px] text-slate-500 dark:text-slate-400">{backupStatus}</p>}
      <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto ${journalExpanded ? 'fixed bottom-16 left-0 right-0 top-16 z-[100000] bg-sky-50 p-4 dark:bg-slate-900 md:left-14' : ''}`}>
        {!accountLinked ? <p className="py-6 text-center text-xs text-slate-500">{ui.signedOutJournalInfo}</p> : visibleEntries.length ? visibleEntries.map(entry => (
          <article key={entry.id} className="rounded-lg border border-sky-100 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-1 flex items-center justify-between gap-2"><strong className="truncate text-indigo-600 dark:text-indigo-300">{entry.location}</strong><div className="flex items-center gap-1"><button type="button" aria-label={ui.editJournalEntry} disabled={!isTodaySelected || entry.date !== todayDate} onClick={() => beginEdit(entry)} className="flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"><Edit3 size={13} /><span>{ui.edit}</span></button><button type="button" aria-label={ui.deleteJournalEntry} onClick={() => setDeleteConfirmEntry(entry)} className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-700"><Trash2 size={13} /><span>{ui.delete}</span></button><button type="button" onClick={toggleJournalExpanded} className="rounded bg-slate-600 p-1 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600" aria-label={journalExpanded ? ui.restoreJournalSize : ui.expandJournal} title={journalExpanded ? ui.restoreSize : ui.expandJournal}>{journalExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button></div></div>
            <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{entry.note}</p>
            {!!entry.photos?.length && <div className="mt-2 grid grid-cols-2 gap-2">{entry.photos.map((photo, index) => <img key={`${entry.id}-photo-${index}`} src={photo} alt={`${ui.weatherJournalPhoto} ${index + 1}`} onClick={() => openPhoto(photo)} className={`w-full cursor-zoom-in rounded-md ${journalExpanded ? 'h-52 max-h-52 object-contain' : 'aspect-square object-cover'}`} loading="lazy" />)}</div>}
            {entry.photosBackedUp && Object.keys(entry.photoBackups || {}).length > 0 && <div className="mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{ui.backedUpGooglePhotos}</div>}
            {!!entry.photos?.length && (!entry.photosBackedUp || !Object.keys(entry.photoBackups || {}).length) && <button type="button" disabled={backingUpIds.includes(entry.id)} onClick={() => void backupPhotos(entry)} className="mt-2 rounded bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50">{backingUpIds.includes(entry.id) ? ui.savingGooglePhotos : ui.retryGooglePhotos}</button>}
          </article>
        )) : null}
      </div>
      {deleteConfirmEntry && (
        <div
          className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="journal-delete-title"
          onClick={() => setDeleteConfirmEntry(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-300 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="journal-delete-title" className="text-base font-bold text-slate-950 dark:text-white">{ui.deleteJournalTitle}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{ui.deleteJournalMessage}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmEntry(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                {ui.cancel}
              </button>
              <button
                type="button"
                onClick={() => { const id = deleteConfirmEntry.id; setDeleteConfirmEntry(null); deleteEntry(id); }}
                className="rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {ui.delete}
              </button>
            </div>
          </div>
        </div>
      )}
      {previewPhoto && <div className="fixed inset-0 z-[110000] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-label={ui.fullSizeJournalPhoto} onClick={closePhoto}><img src={previewPhoto} alt={ui.fullSizeJournalPhoto} className="max-h-[95vh] max-w-[95vw] object-contain" onClick={event => event.stopPropagation()} /><button type="button" aria-label={ui.closePhotoPreview} onClick={closePhoto} className="absolute right-4 top-4 rounded-full bg-black/70 p-2 text-white hover:bg-black"><X size={20} /></button></div>}
    </aside>
  );
}
