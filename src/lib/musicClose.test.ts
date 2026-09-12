import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual component handlers with fake player/network boundaries.
const source = readFileSync(new URL('../components/MusicWidget.tsx', import.meta.url), 'utf8');
function setup() {
  const state: Record<string, any> = {};
  const frame = { src: 'video', contentWindow: { postMessage() {} } };
  const refs: Record<string, any> = Object.fromEntries(['youtubeSession', 'playerSwitch', 'youtubeIndex', 'youtubeQueueLength'].map(key => [key + 'Ref', { current: 0 }]));
  for (const key of ['youtubeIsPlaying', 'youtubeWasPlaying', 'youtubePlaylist', 'youtubeNextPageToken']) refs[key + 'Ref'] = { current: true };
  refs.youtubeResultsRef = { current: [{ videoId: 'old' }] };
  refs.youtubeRef = { current: frame };
  refs.activePlayerRef = { current: 'youtube' };
  const setters = Object.fromEntries(['YoutubeId', 'YoutubeResults', 'YoutubeIndex', 'YoutubeQueueLength', 'YoutubePlaylistTitle', 'YoutubeInput', 'YoutubeSuggestions', 'YoutubeError', 'IsSearchingYoutube', 'YoutubeConsentAcknowledged', 'YoutubeSearchHistory'].map(key => ['set' + key, (value: any) => { state[key] = value; }]));
  const context = vm.createContext({ ...refs, ...setters, window: { dispatchEvent() {} }, CustomEvent: class {}, JSON, Boolean, Error,
    youtubeConsent: true, youtubeInput: 'song', youtubeId: 'old', youtubeSearchHistory: [], youtubeSearchType: 'video',
    activatePlayer: (value: string) => { refs.activePlayerRef.current = value; }, apiUrl: (url: string) => url,
    uniquePlaylistSongs: (_old: any, items: any) => items, localStorage: { setItem() {} },
  });
  for (const name of ['closeYouTubePlayer', 'searchYouTube']) {
    const start = source.indexOf(`  const ${name} = `);
    const end = source.indexOf('\n  };', start) + 5;
    vm.runInContext(ts.transpile(source.slice(start, end).replace(`const ${name} =`, `globalThis.${name} =`)), context);
  }
  return { context, state, refs, frame };
}
test('close stops video and clears results, pagination, index, suggestions and pending state', () => {
  const { context, state, refs, frame } = setup();
  context.closeYouTubePlayer();
  assert.equal(frame.src, 'about:blank');
  assert.equal(state.YoutubeId, null);
  assert.equal(state.YoutubeResults.length, 0);
  assert.equal(refs.youtubeResultsRef.current.length, 0);
  assert.equal(refs.youtubeNextPageTokenRef.current, null);
  assert.equal(state.YoutubeIndex, -1);
  assert.equal(state.IsSearchingYoutube, false);
});
test('a late search response cannot bring results back after close', async () => {
  const { context, state } = setup();
  let resolve!: (value: any) => void;
  context.fetch = () => new Promise(done => { resolve = done; });
  const pending = context.searchYouTube('song');
  assert.equal(state.IsSearchingYoutube, true);
  context.closeYouTubePlayer();
  resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ items: [{ videoId: 'late' }] }) });
  await pending;
  assert.equal(state.YoutubeResults.length, 0);
  assert.equal(state.IsSearchingYoutube, false);
});

test('closing a paused YouTube video leaves the device player and saved history alone', () => {
  const { context, state, refs } = setup();
  refs.activePlayerRef.current = 'local';
  context.closeYouTubePlayer();
  assert.equal(refs.activePlayerRef.current, 'local');
  assert.equal(state.YoutubeSearchHistory, undefined);
});
