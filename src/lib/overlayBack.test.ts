import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOverlayBack } from './overlayBack.ts';

function fixture() {
  const events = new EventTarget();
  const states: any[] = [{ page: 'dashboard' }];
  let index = 0;
  const host = { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    history: { get state() { return states[index]; },
      pushState(value: any) { states.splice(++index); states[index] = value; },
      back() { this.go(-1); },
      go(delta: number) { index = Math.max(0, Math.min(states.length - 1, index + delta)); events.dispatchEvent(new Event('popstate')); },
    },
  };
  return { host, states, back: createOverlayBack(host as any) };
}
test('device/browser Back closes the photo before the expanded journal', () => {
  const { host, back, states } = fixture();
  const closed: string[] = [];
  back.open(() => closed.push('journal'));
  back.open(() => closed.push('photo'));
  assert.equal(states.length, 3);
  host.history.back();
  assert.deepEqual(closed, ['photo']);
  host.history.back();
  assert.deepEqual(closed, ['photo', 'journal']);
  assert.deepEqual(host.history.state, { page: 'dashboard' });
  back.dispose();
});
test('close controls consume their own history entry without leaving the dashboard', () => {
  const { host, back } = fixture();
  let closes = 0;
  back.open(() => closes++);
  back.closeTop();
  assert.equal(closes, 1);
  assert.deepEqual(host.history.state, { page: 'dashboard' });
  back.dispose();
});
test('leaving the calendar removes its temporary Back entries', () => {
  const { host, back } = fixture();
  back.open(() => {});
  back.open(() => {});
  back.dispose();
  assert.deepEqual(host.history.state, { page: 'dashboard' });
});
test('history contains IDs only and retains pre-existing page state', () => {
  const { host, back } = fixture();
  back.open(() => {});
  assert.deepEqual(Object.keys(host.history.state).sort(), ['__weatherNowOverlay', 'page']);
  back.dispose();
});
