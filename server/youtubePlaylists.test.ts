import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubePlaylistPage } from './youtubePlaylists.ts';
test('playlist items remain in playlist order and unavailable videos are excluded', async () => {
  const calls: string[] = [];
  const fake = (async (input: any) => {
    const url = String(input); calls.push(url);
    const data = url.includes('/playlistItems?') ? { items:[{contentDetails:{videoId:'b'}},{contentDetails:{videoId:'a'}},{contentDetails:{videoId:'private'}}],nextPageToken:'PAGE2' }
      : {items:[{id:'a',snippet:{title:'A'},status:{embeddable:true}},{id:'private',snippet:{title:'Private'},status:{embeddable:false}},{id:'b',snippet:{title:'B'},status:{embeddable:true}}]};
    return new Response(JSON.stringify(data));
  }) as typeof fetch;
  const result = await getYouTubePlaylistPage('PL1234567890','PAGE1','test-only',fake);
  assert.deepEqual(result.items.map(v=>v.videoId),['b','a']);
  assert.equal(result.nextPageToken,'PAGE2');
  assert(calls[0].includes('playlistId=PL1234567890') && calls[0].includes('pageToken=PAGE1'));
  assert(calls.every(url=>!url.includes('/search?')));
});
test('invalid playlists and upstream failures are explicit', async () => {
  await assert.rejects(getYouTubePlaylistPage('bad','', 'unused'), /Invalid playlist/);
  await assert.rejects(getYouTubePlaylistPage('PL1234567890','', 'unused', (async()=>new Response(JSON.stringify({error:{message:'Not available'}}),{status:404})) as typeof fetch), /Not available/);
});
