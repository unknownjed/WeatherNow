import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import allLocales from '@fullcalendar/core/locales-all';
import { listEventsRange } from '../lib/googleCalendarApi';
import { getHolidayCalendarId } from '../lib/calendar';
import { calendarSwipeDirection, type CalendarSwipePoint } from '../lib/calendarSwipe';
import { agendaForDate, type CalendarAgendaItem } from '../lib/calendarAgenda';
import { getUiLabels } from '../lib/uiLabels';

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// FullCalendar v6's class component types are not yet compatible with the
// React 19 JSX typings used by this project; the runtime API is unchanged.
const Calendar = FullCalendar as any;

export default function GoogleCalendarPanel({
  token,
  onDateSelected,
  country,
  language = 'en',
  selectedJournalDate,
  journalDates = {},
  onAgendaChange,
}: {
  token: string | null;
  onDateSelected: (date: string) => void;
  country?: string;
  language?: string;
  selectedJournalDate: string;
  journalDates?: Record<string, number>;
  onAgendaChange?: (items: CalendarAgendaItem[]) => void;
}) {
  const ui = getUiLabels(language);
  const [events, setEvents] = React.useState<any[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(() => selectedJournalDate);
  const calendarRef = React.useRef<any>(null);
  const swipeRef = React.useRef<(CalendarSwipePoint & { pointerId: number }) | null>(null);
  const touchSwipeRef = React.useRef<CalendarSwipePoint | null>(null);
  const suppressDateClickUntil = React.useRef(0);
  const rangeRequestRef = React.useRef(0);

  const loadRange = React.useCallback(async (startDate: string, endDate: string) => {
    const request = ++rangeRequestRef.current;
    if (!token) return;
    const holidayId = getHolidayCalendarId(country);
    const [personal, holidays] = await Promise.all([
      listEventsRange(token, startDate, endDate),
      holidayId ? listEventsRange(token, startDate, endDate, holidayId).catch(() => []) : Promise.resolve([]),
    ]);
    if (request !== rangeRequestRef.current) return;
    setEvents([
      ...personal.map((event: any) => ({ ...event, kind: 'reminder' as const })),
      ...holidays.map((event: any) => ({ ...event, kind: 'holiday' as const })),
    ].map((event: any) => ({ id: event.id, title: event.summary || ui.calendarEvent,
      start: event.start?.dateTime || event.start?.date, end: event.end?.dateTime || event.end?.date, kind: event.kind })));
  }, [token, country, ui.calendarEvent]);

  React.useEffect(() => {
    const view = calendarRef.current?.getApi().view;
    if (view) void loadRange(localDate(view.activeStart), localDate(view.activeEnd))
      .catch(error => console.error('Failed to load calendar events:', error));
    return () => { rangeRequestRef.current += 1; };
  }, [loadRange]);
  React.useEffect(() => {
    onAgendaChange?.(agendaForDate(events, selectedDate || selectedJournalDate));
  }, [events, selectedDate, selectedJournalDate, onAgendaChange]);
  async function handleDateClick(info: { dateStr: string }) {
    if (Date.now() < suppressDateClickUntil.current) return;
    setSelectedDate(info.dateStr);
    onDateSelected(info.dateStr);
  }

  return (
    <div className="google-calendar-panel h-full w-full" dir="ltr" style={{ touchAction: 'pan-y' }}
      onPointerDownCapture={(event) => {
        if (!event.isPrimary) { swipeRef.current = null; return; }
        // Touch has dedicated handlers below. Keeping pointer handling for a
        // stylus avoids a synthetic pointer+touch gesture advancing twice.
        if (event.pointerType !== 'pen') return;
        if (!(event.target as HTMLElement).closest('.fc-view-harness')) return;
        swipeRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: Date.now() };
      }}
      onPointerUpCapture={(event) => {
        const start = swipeRef.current;
        swipeRef.current = null;
        if (!start || start.pointerId !== event.pointerId) return;
        const direction = calendarSwipeDirection(start, { x: event.clientX, y: event.clientY, time: Date.now() });
        if (!direction) return;
        // A swipe changes the view only; a tap still selects the journal date.
        suppressDateClickUntil.current = Date.now() + 350;
        event.preventDefault();
        event.stopPropagation();
        calendarRef.current?.getApi()[direction]();
      }}
      onPointerCancel={() => { swipeRef.current = null; }}
      onTouchStartCapture={(event) => {
        if (event.touches.length !== 1 || !(event.target as HTMLElement).closest('.fc-view-harness')) {
          touchSwipeRef.current = null;
          return;
        }
        const touch = event.touches[0];
        touchSwipeRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      }}
      onTouchEndCapture={(event) => {
        const start = touchSwipeRef.current;
        touchSwipeRef.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch) return;
        const direction = calendarSwipeDirection(start, { x: touch.clientX, y: touch.clientY, time: Date.now() });
        if (!direction) return;
        suppressDateClickUntil.current = Date.now() + 350;
        event.preventDefault();
        event.stopPropagation();
        calendarRef.current?.getApi()[direction]();
      }}
      onTouchCancel={() => { touchSwipeRef.current = null; }}
    >
      <Calendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        locales={allLocales}
        locale={language === 'pt' ? 'pt-br' : language === 'zh' ? 'zh-cn' : language}
        initialView="dayGridMonth"
        initialDate={selectedJournalDate}
        dateClick={handleDateClick}
        eventClick={(info: { event: { start: Date | null } }) => {
          // Clicking a reminder, holiday, or journal marker selects that day
          // too. FullCalendar does not emit dateClick for event clicks.
          if (info.event.start) void handleDateClick({ dateStr: localDate(info.event.start) });
        }}
        customButtons={{
          weatherNowToday: {
            text: ui.todayUpper,
            click: () => {
              setSelectedDate(null);
              calendarRef.current?.getApi().today();
              onDateSelected(localDate(new Date()));
            },
          },
        }}
        headerToolbar={{ left: 'title', center: '', right: 'prev,next weatherNowToday' }}
        datesSet={(info: { startStr: string; endStr: string }) => {
          void loadRange(info.startStr.slice(0, 10), info.endStr.slice(0, 10)).catch(error => console.error('Failed to load calendar events:', error));
        }}
        dayCellClassNames={(info: { date: Date }) => {
          const date = localDate(info.date);
          return date === selectedDate ? ['weathernow-selected-day'] : [];
        }}
        eventClassNames={(info: any) => {
          const id = String(info.event?.id || '');
          const kind = info.event?.extendedProps?.kind;
          return id.startsWith('journal:') || kind === 'holiday' ? ['calendar-marker-compact'] : [];
        }}
        events={[...events, ...Object.entries(journalDates).map(([date, count]) => ({
          id: `journal:${date}`, title: `${ui.journalMarker} (${count})`, start: date,
          allDay: true, backgroundColor: '#2563eb', borderColor: '#2563eb', textColor: '#fff',
        }))]}
        height="auto"
        contentHeight="auto"
        fixedWeekCount={true}
        showNonCurrentDates={true}
      />
    </div>
  );
}
