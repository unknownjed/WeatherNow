import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { calendarSwipeDirection } from './calendarSwipe.ts';

const source = ts.createSourceFile('GoogleCalendarPanel.tsx', readFileSync(new URL('../components/GoogleCalendarPanel.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function handlers() {
  let month = new Date(2026, 11, 1);
  const context = vm.createContext({ Date, calendarSwipeDirection, swipeRef: { current: null }, touchSwipeRef: { current: null }, suppressDateClickUntil: { current: 0 }, calendarRef: { current: { getApi: () => ({
    next: () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); },
    prev: () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); },
  }) } } });
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && ['onPointerDownCapture', 'onPointerUpCapture', 'onPointerCancel', 'onTouchStartCapture', 'onTouchEndCapture', 'onTouchCancel'].includes(node.name.getText()) && node.initializer && ts.isJsxExpression(node.initializer)) {
      vm.runInContext(ts.transpile(`globalThis.${node.name.getText()} = ${node.initializer.expression!.getText()};`), context);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const event = (x: number, overrides = {}) => ({ clientX: x, clientY: 100, pointerId: 1, pointerType: 'touch', isPrimary: true,
    target: { closest: () => true }, preventDefault() {}, stopPropagation() {}, ...overrides });
  const touchEvent = (x: number, overrides = {}) => ({ touches: [{ clientX: x, clientY: 100 }], changedTouches: [{ clientX: x, clientY: 100 }],
    target: { closest: () => true }, preventDefault() {}, stopPropagation() {}, ...overrides });
  return { context, event, touchEvent, month: () => month };
}
test('real touch handlers advance once across the year boundary and suppress accidental date clicks', () => {
  const { context, touchEvent, month } = handlers();
  context.onTouchStartCapture(touchEvent(200));
  context.onTouchEndCapture(touchEvent(90));
  assert.equal(month().getFullYear(), 2027);
  assert.equal(month().getMonth(), 0);
  assert.ok(context.suppressDateClickUntil.current > Date.now());
  context.onTouchEndCapture(touchEvent(90));
  assert.equal(month().getMonth(), 0);
  context.onTouchStartCapture(touchEvent(90));
  context.onTouchEndCapture(touchEvent(200));
  assert.equal(month().getFullYear(), 2026);
});
test('taps, cancelled gestures and multitouch do not navigate', () => {
  const { context, touchEvent, month } = handlers();
  context.onTouchStartCapture(touchEvent(200));
  context.onTouchEndCapture(touchEvent(201));
  assert.equal(context.suppressDateClickUntil.current, 0);
  context.onTouchStartCapture(touchEvent(200));
  context.onTouchCancel();
  context.onTouchEndCapture(touchEvent(90));
  context.onTouchStartCapture(touchEvent(200, { touches: [{ clientX: 200, clientY: 100 }, { clientX: 180, clientY: 100 }] }));
  context.onTouchEndCapture(touchEvent(90));
  assert.equal(month().getMonth(), 11);
});
