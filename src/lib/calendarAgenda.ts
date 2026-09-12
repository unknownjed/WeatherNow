export interface CalendarAgendaItem {
  id: string;
  title: string;
  start: string;
  end?: string;
  kind: 'reminder' | 'holiday';
}

function eventDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';
}

export function agendaForDate(events: CalendarAgendaItem[], date: string): CalendarAgendaItem[] {
  return events.filter(event => eventDate(event.start) === date)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}
