export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink: string;
  colorId?: string;
}

/** Public Google holiday calendar ID for the selected dashboard country. */
export function getHolidayCalendarId(country?: string): string | null {
  const normalized = (country || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const countryCodes: Record<string, string> = {
    philippines: 'philippines',
    'united states': 'usa',
    usa: 'usa',
    canada: 'canada',
    australia: 'australia',
    india: 'india',
    indonesia: 'indonesia',
    malaysia: 'malaysia',
    singapore: 'singapore',
    japan: 'japanese',
    china: 'chinese',
    'south korea': 'south_korea',
    korea: 'south_korea',
    'united kingdom': 'uk',
    uk: 'uk',
  };
  const code = countryCodes[normalized];
  return code ? `en.${code}#holiday@group.v.calendar.google.com` : null;
}

export async function getGoogleCalendarSources(accessToken: string, primaryEmail: string): Promise<string[]> {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?showHidden=false&minAccessRole=reader', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Calendar list API error: ${res.status}`);
    const data = await res.json();
    const holidayIds = (data.items || [])
      .filter((calendar: { id?: string; deleted?: boolean }) =>
        !calendar.deleted && calendar.id?.includes('#holiday@group.v.calendar.google.com')
      )
      .map((calendar: { id: string }) => calendar.id);
    return Array.from(new Set([primaryEmail, ...holidayIds]));
  } catch (error) {
    console.error('Failed to load Google holiday calendars:', error);
    return [primaryEmail];
  }
}

export async function getUpcomingEvents(accessToken: string): Promise<CalendarEvent[]> {
  try {
    const timeMin = new Date().toISOString();
    // Fetch upcoming events for the next 7 days
    const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&orderBy=startTime&singleEvents=true&maxResults=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
      throw new Error(`Calendar API error: ${res.status}`);
    }
    
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return [];
  }
}
