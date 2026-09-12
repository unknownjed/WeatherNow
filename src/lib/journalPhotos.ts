export interface SavedJournalPhoto { id: string; productUrl?: string }

export async function journalPhotoKey(dataUrl: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function requireSuccess(response: Response): Promise<void> {
  if (response.ok) return;
  if (response.status === 401) throw new Error('Google authorization expired. Reconnect Google Calendar and retry the photo backup.');
  if (response.status === 403) throw new Error('Google denied photo access. Enable the Photos Library API and grant Google Photos upload permission when reconnecting.');
  throw new Error(`Google Photos request failed (${response.status}). Please retry.`);
}

export async function saveJournalPhoto(
  accessToken: string, dataUrl: string, description: string, fileName: string,
  request: typeof fetch = fetch,
): Promise<SavedJournalPhoto> {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (!match) throw new Error('This journal photo could not be read.');
  const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
  const upload = await request('https://photoslibrary.googleapis.com/v1/uploads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream', 'X-Goog-Upload-Content-Type': match[1], 'X-Goog-Upload-Protocol': 'raw' },
    body: bytes,
  });
  await requireSuccess(upload);
  const uploadToken = (await upload.text()).trim();
  if (!uploadToken) throw new Error('Google Photos did not return an upload token.');
  const extension = match[1].split('/')[1].replace('jpeg', 'jpg');
  const create = await request('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ newMediaItems: [{ description, simpleMediaItem: { fileName: `${fileName}.${extension}`, uploadToken } }] }),
  });
  await requireSuccess(create);
  const result = (await create.json()).newMediaItemResults?.[0];
  // HTTP 200 alone is not confirmation: Google returns per-photo errors here.
  if (!result?.mediaItem?.id || (result.status?.code ?? 0) !== 0) {
    throw new Error(result?.status?.message || 'Google Photos did not confirm that the photo was saved.');
  }
  const productUrl = result.mediaItem.productUrl;
  return {
    id: result.mediaItem.id,
    productUrl: typeof productUrl === 'string' && productUrl.startsWith('https://photos.google.com/') ? productUrl : undefined,
  };
}
