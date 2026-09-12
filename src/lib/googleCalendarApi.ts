const base =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export async function listEvents(token: string, date: string, calendarId = 'primary') {
  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59Z`;

  const response = await fetch(
    `${base.replace('/primary/', `/${encodeURIComponent(calendarId)}/`)}?timeMin=${encodeURIComponent(start)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) throw new Error('Could not load calendar events');
  return (await response.json()).items || [];
}

export async function createEvent(token: string, summary: string, date: string) {
  const response = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      start: { date },
      end: { date },
    }),
  });

  if (!response.ok) throw new Error('Could not create event');
  return response.json();
}

export async function updateEvent(
  token: string,
  eventId: string,
  summary: string,
  date: string
) {
  const response = await fetch(`${base}/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      start: { date },
      end: { date },
    }),
  });

  if (!response.ok) throw new Error('Could not update event');
  return response.json();
}

export async function deleteEvent(token: string, eventId: string) {
  await fetch(`${base}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listEventsRange(token: string, startDate: string, endDate: string, calendarId = 'primary') {
  const calendarBase = base.replace('/primary/', `/${encodeURIComponent(calendarId)}/`);
  const response = await fetch(
    `${calendarBase}?timeMin=${encodeURIComponent(`${startDate}T00:00:00Z`)}&timeMax=${encodeURIComponent(`${endDate}T23:59:59Z`)}&singleEvents=true&orderBy=startTime&maxResults=2500`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw new Error('Could not load calendar events');
  return (await response.json()).items || [];
}
