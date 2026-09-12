export interface YouTubeResult {
  videoId?: string;
  playlistId?: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

export function matchingMusicHistory(history: string[], input: string): string[] {
  const query = input.trim().toLocaleLowerCase();
  if (!query) return [];
  const seen = new Set<string>();
  return history.filter(item => {
    const key = item.trim().toLocaleLowerCase();
    if (!key.includes(query) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => Number(b.trim().toLocaleLowerCase() === query) - Number(a.trim().toLocaleLowerCase() === query)).slice(0, 5);
}

// Song identity, not upload identity. Keep non-Latin titles; remove common
// artist prefixes and upload labels so audio/lyrics/official uploads match.
export function normalizeMusicTitle(title: string): string {
  let text = title.normalize('NFKC').toLocaleLowerCase()
    .replace(/&amp;/g, '&').replace(/&(?:quot|#34);/g, '"').replace(/&(?:apos|#39);/g, "'")
    .replace(/[（(\[].*?[）)\]]/g, ' ')
    .replace(/\b(?:official\s+)?(?:music\s+video|lyric\s+video|lyrics?|audio|video|visuali[sz]er|hd|hq|4k)\b/g, ' ')
    .replace(/\s*[|｜].*$/, '').trim();
  const parts = text.split(/\s+[-–—]\s+/).map(part => part.trim()).filter(Boolean);
  if (parts.length > 1) text = parts[1];
  return text.replace(/\b(?:feat\.?|ft\.?)\s+.*$/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function nextDifferentSong(queue: YouTubeResult[], index: number): number {
  const current = queue[index];
  const title = normalizeMusicTitle(current?.title || '');
  return queue.findIndex((item, i) => i > index && Boolean(item.videoId)
    && item.videoId !== current?.videoId && normalizeMusicTitle(item.title) !== title);
}

export function uniquePlaylistSongs(existing: YouTubeResult[], incoming: YouTubeResult[]): YouTubeResult[] {
  const ids = new Set(existing.map(item => item.videoId));
  const titles = new Set(existing.map(item => normalizeMusicTitle(item.title)));
  return incoming.filter(item => {
    const title = normalizeMusicTitle(item.title);
    if (!item.videoId || !title || ids.has(item.videoId) || titles.has(title)) return false;
    ids.add(item.videoId); titles.add(title);
    return true;
  });
}
