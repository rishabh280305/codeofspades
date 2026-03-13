import { addMinutes, format, isBefore, parse } from "date-fns";

const DATE_PATTERN = "yyyy-MM-dd HH:mm";

export function combineDateAndTime(date: string, time: string): Date {
  return parse(`${date} ${time}`, DATE_PATTERN, new Date());
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function createTimeSlots(
  date: string,
  startTime: string,
  endTime: string,
  slotMinutes: number,
  bufferMinutes: number,
): Array<{ startTime: string; endTime: string; startAt: Date; endAt: Date }> {
  const slots: Array<{ startTime: string; endTime: string; startAt: Date; endAt: Date }> = [];

  let cursor = combineDateAndTime(date, startTime);
  const dayEnd = combineDateAndTime(date, endTime);

  while (isBefore(addMinutes(cursor, slotMinutes), addMinutes(dayEnd, 1))) {
    const slotEnd = addMinutes(cursor, slotMinutes);

    slots.push({
      startTime: formatTime(cursor),
      endTime: formatTime(slotEnd),
      startAt: cursor,
      endAt: slotEnd,
    });

    cursor = addMinutes(cursor, slotMinutes + bufferMinutes);
  }

  return slots;
}
