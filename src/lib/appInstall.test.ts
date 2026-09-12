import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requestAppInstall } from './appInstall.ts';
test('uses the captured browser prompt directly and reports accepted/dismissed choices', async () => {
  for (const outcome of ['accepted', 'dismissed'] as const) {
    let prompted = false;
    const result = requestAppInstall({ prompt: async () => { prompted = true; }, userChoice: Promise.resolve({ outcome }) });
    assert.equal(prompted, true, 'prompt starts within the Install click');
    assert.equal(await result, outcome);
  }
});
test('prompt errors are surfaced rather than marked installed', async () => {
  await assert.rejects(requestAppInstall({ prompt: async () => { throw new Error('unavailable'); }, userChoice: Promise.resolve({ outcome: 'accepted' }) }), /unavailable/);
});
test('dashboard install action never opens a helper window or redirects', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const handler = app.slice(app.indexOf('  const handleInstallClick'), app.indexOf('  useEffect', app.indexOf('  const handleInstallClick')));
  assert.match(handler, /setInstallDialogOpen\(true\)/);
  assert.doesNotMatch(handler, /window\.open|location\.|install\.html/);
});
