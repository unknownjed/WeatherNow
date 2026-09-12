import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchingMusicHistory, normalizeMusicTitle, nextDifferentSong, uniquePlaylistSongs } from './musicQueue.ts';
const song = (id: string, title: string) => ({ videoId: id, title, channelTitle: 'Artist', thumbnail: '' });
test('history only matches typed text and never exceeds five unique entries', () => {
  const history = ['Rain 1', 'Rain 2', 'RAIN', 'rain', 'Rain 3', 'Rain 4', 'Rain 5', 'Sun'];
  assert.deepEqual(matchingMusicHistory(history, ''), []);
  assert.deepEqual(matchingMusicHistory(history, '   '), []);
  assert.deepEqual(matchingMusicHistory(history, 'snow'), []);
  assert.deepEqual(matchingMusicHistory(history, ' rain '), ['RAIN', 'Rain 1', 'Rain 2', 'Rain 3', 'Rain 4']);
});
test('official, audio, lyrics and artist variants of the same title match', () => {
  const titles = ['Artist - My Song (Official Video)', 'Artist - My Song [Lyrics]', 'Artist – My Song (Official Audio)', 'My Song lyrics', 'Other Artist - My Song (Cover)'];
  for (const title of titles) assert.equal(normalizeMusicTitle(title), 'my song');
  assert.notEqual(normalizeMusicTitle('歌手 - 夜に駆ける'), normalizeMusicTitle('歌手 - 群青'));
});
test('next skips duplicate video IDs and song titles in playlist order, without wrapping', () => {
  const queue = [song('one','Artist - Song A'), song('two','Song A (Lyrics)'), song('three','Artist - Song B')];
  assert.equal(nextDifferentSong(queue, 0), 2);
  assert.equal(nextDifferentSong(queue, 2), -1);
  assert.deepEqual(uniquePlaylistSongs([queue[0]], queue), [queue[2]]);
});
test('pagination deduplicates against earlier pages and within the next page', () => {
  const existing = [song('1','One'), song('2','Two')];
  assert.deepEqual(uniquePlaylistSongs(existing,[song('3','One (official audio)'),song('4','Three'),song('5','Three [lyrics]')]),[song('4','Three')]);
});
