export interface CalendarSwipePoint { x: number; y: number; time: number }

export function calendarSwipeDirection(start: CalendarSwipePoint, end: CalendarSwipePoint): 'prev' | 'next' | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const duration = end.time - start.time;
  if (duration < 0 || duration > 1000 || Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.4) return null;
  return dx < 0 ? 'next' : 'prev';
}
