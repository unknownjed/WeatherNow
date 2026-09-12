import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMp3Equalizer, spectrumHeights, MP3_BAR_COUNT } from './mp3Equalizer.ts';

test('silence flattens every bar, and stronger audio raises the measured band', () => {
  const data = new Uint8Array(1024);
  assert.deepEqual(spectrumHeights(data, 48000, 2048), Array(MP3_BAR_COUNT).fill(4));
  data[20] = 64;
  const quiet = spectrumHeights(data, 48000, 2048);
  data[20] = 255;
  const loud = spectrumHeights(data, 48000, 2048);
  assert.ok(Math.max(...loud) > Math.max(...quiet));
  assert.ok(loud.every(height => height >= 4 && height <= 24));
});
test('bass and treble energy move different bars rather than a preset animation', () => {
  const bass = new Uint8Array(1024), treble = new Uint8Array(1024);
  bass[5] = 255; treble[256] = 255;
  const bassBars = spectrumHeights(bass, 48000, 2048);
  const trebleBars = spectrumHeights(treble, 48000, 2048);
  assert.ok(bassBars.indexOf(24) >= 0);
  assert.ok(trebleBars.indexOf(24) > bassBars.indexOf(24));
});
test('capture preserves the playback path, reconnects on track change and flattens when paused', () => {
  const original = (globalThis as any).window;
  let captured = 0, disconnected = 0, stopped = 0, resumed = 0;
  class Context {
    state = 'suspended'; sampleRate = 48000;
    resume() { resumed++; this.state = 'running'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
    createAnalyser() { return { frequencyBinCount: 1024, fftSize: 2048, disconnect() {}, getByteFrequencyData(data: Uint8Array) { data.fill(0); data[20] = 180; } }; }
    createMediaStreamSource() { return { connect() {}, disconnect() { disconnected++; } }; }
    createMediaElementSource() { throw new Error('Must not reroute captured media'); }
  }
  (globalThis as any).window = { AudioContext: Context };
  const audio = () => ({ paused: false, ended: false, readyState: 4, captureStream() {
    captured++;
    return Object.assign(new EventTarget(), { getAudioTracks: () => [{}], getTracks: () => [{ stop() { stopped++; } }] });
  } }) as unknown as HTMLAudioElement;
  try {
    const meter = createMp3Equalizer();
    const first = audio(); meter.prepare();
    assert.ok(Math.max(...meter.read(first)) > 4);
    meter.read(first); assert.equal(captured, 1);
    meter.read(audio()); assert.equal(captured, 2); assert.equal(disconnected, 1);
    assert.deepEqual(meter.read({ paused: true } as HTMLAudioElement), Array(28).fill(4));
    meter.dispose(); assert.equal(stopped, 2); assert.equal(resumed, 1);
  } finally { (globalThis as any).window = original; }
});
