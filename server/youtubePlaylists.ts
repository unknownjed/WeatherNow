import type { YouTubeResult } from '../src/lib/musicQueue';

export async function getYouTubePlaylistPage(playlistId: string, pageToken: string, apiKey: string, request: typeof fetch = fetch) {
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(playlistId)) throw new Error('Invalid playlist ID.');
  const get = async (resource: string, params: URLSearchParams) => {
    const response = await request(`https://www.googleapis.com/youtube/v3/${resource}?${params}`, {
      headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(12_000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'YouTube playlist is unavailable.');
    return data;
  };
  const params = new URLSearchParams({ part: 'snippet,contentDetails', playlistId, maxResults: '50' });
  if (pageToken) params.set('pageToken', pageToken);
  const page = await get('playlistItems', params);
  const entries = Array.isArray(page.items) ? page.items : [];
  const ids = entries.map((item: any) => item.contentDetails?.videoId).filter((id: unknown) => typeof id === 'string');
  // playlistItems can include private/deleted/non-embeddable videos. Verify
  // availability through videos.list, while preserving original playlist order.
  const videos = ids.length ? await get('videos', new URLSearchParams({ part: 'snippet,status', id: ids.join(',') })) : { items: [] };
  const available = new Map<string, any>((videos.items || []).filter((v: any) => v.status?.embeddable && v.status?.privacyStatus !== 'private').map((v: any) => [v.id, v]));
  const items: YouTubeResult[] = [];
  for (const item of entries) {
    const video = available.get(item.contentDetails?.videoId);
    if (!video?.snippet?.title) continue;
    items.push({ videoId: video.id, title: video.snippet.title, channelTitle: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || '' });
  }
  return { playlistId, items, nextPageToken: page.nextPageToken || null };
}
