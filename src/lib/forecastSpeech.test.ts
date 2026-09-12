import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectForecastVoice } from './forecastSpeech.ts';
const voice = (name: string, lang: string, localService: boolean) => ({ name, lang, localService } as SpeechSynthesisVoice);
test('installed female voice beats an earlier-priority online female voice', () => {
  const local = voice('Microsoft Aria', 'en-US', true);
  assert.equal(selectForecastVoice([voice('Zira Online', 'en-US', false), local], 'en-US'), local);
});
test('remote female and unnamed language voices remain available', () => {
  const remote = voice('Nanami Online', 'ja-JP', false);
  assert.equal(selectForecastVoice([voice('Zira', 'en-US', true), remote], 'ja-JP'), remote);
  const local = voice('Android voice', 'fr_FR', true);
  assert.equal(selectForecastVoice([local], 'fr-FR'), local);
  assert.equal(selectForecastVoice([], 'de-DE'), undefined);
});
