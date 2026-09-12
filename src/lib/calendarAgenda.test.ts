import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaForDate } from './calendarAgenda.ts';

test('selected-day agenda includes reminders and holidays and excludes other dates', () => {
  const events = [
    { id: 'r', title: 'Reminder', start: '2026-09-01T09:00:00', kind: 'reminder' as const },
    { id: 'h', title: 'Holiday', start: '2026-09-01', kind: 'holiday' as const },
    { id: 'x', title: 'Tomorrow', start: '2026-09-02', kind: 'reminder' as const },
  ];
  assert.deepEqual(agendaForDate(events, '2026-09-01').map(event => event.id).sort(), ['h', 'r']);
});
