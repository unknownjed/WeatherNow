import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarSwipeDirection } from './calendarSwipe.ts';
const start = { x: 150, y: 100, time: 1000 };
test('horizontal swipe moves exactly one month in either direction', () => {
  assert.equal(calendarSwipeDirection(start, { x: 60, y: 110, time: 1300 }), 'next');
  assert.equal(calendarSwipeDirection(start, { x: 240, y: 110, time: 1300 }), 'prev');
});
test('taps, vertical scrolling, diagonal scrolls and long presses do not change the month', () => {
  for (const end of [{ x: 154, y: 101, time: 1100 }, { x: 160, y: 200, time: 1300 }, { x: 210, y: 170, time: 1300 }, { x: 60, y: 100, time: 2400 }]) {
    assert.equal(calendarSwipeDirection(start, end), null);
  }
});
