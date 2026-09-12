import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MUSIC_VOLUME, createYouTubeVolume } from './musicVolume.ts';

test('default MP3 volume is 70 percent', () => assert.equal(DEFAULT_MUSIC_VOLUME, 0.7));

test('YouTube volume is applied before play, once per iframe', () => {
  const controller = createYouTubeVolume();
  const calls: unknown[] = [];
  const command = (name: string, args: number[]) => calls.push([name, args]);
  controller.handle({ event: 'initialDelivery', info: { volume: 100 } }, command, true);
  controller.handle({ event: 'onReady' }, command, true);
  assert.deepEqual(calls, [['setVolume', [70]], ['playVideo', []]]);
});

test('user volume survives track changes and pause/resume', () => {
  const controller = createYouTubeVolume();
  const calls: unknown[] = [];
  const command = (name: string, args: number[]) => calls.push([name, args]);
  controller.handle({ event: 'onReady' }, command, true);
  controller.handle({ event: 'infoDelivery', info: { volume: 70 } }, command, true);
  controller.handle({ event: 'infoDelivery', info: { volume: 35 } }, command, true);
  controller.resetFrame();
  calls.length = 0;
  controller.handle({ event: 'initialDelivery', info: { volume: 100 } }, command, false);
  assert.deepEqual(calls, [['setVolume', [35]]]);
});

test('late YouTube readiness does not start it after switching to MP3', () => {
  const calls: unknown[] = [];
  createYouTubeVolume().handle({ event: 'onReady' }, (name, args) => calls.push([name, args]), false);
  assert.deepEqual(calls, [['setVolume', [70]]]);
});

test('old and invalid volume reports cannot overwrite the startup default', () => {
  const controller = createYouTubeVolume();
  const calls: unknown[] = [];
  const command = (name: string, args: number[]) => calls.push([name, args]);
  controller.handle({ event: 'onReady' }, command, false);
  for (const volume of [100, -1, 500, '30', NaN]) {
    controller.handle({ event: 'infoDelivery', info: { volume } }, command, false);
  }
  controller.resetFrame();
  calls.length = 0;
  controller.handle({ event: 'onReady' }, command, true);
  assert.deepEqual(calls, [['setVolume', [70]], ['playVideo', []]]);
});
