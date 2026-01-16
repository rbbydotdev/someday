import { toZonedTime } from "date-fns-tz";

export class Timeslots {
  private cache: Record<string, Date[]> = {};
  constructor(
    public readonly timeslots: Date[],
    public readonly timezone: string
  ) {
    this.timeslots.sort((a, b) => a.getTime() - b.getTime());
  }
  allZoned() {
    return (this.cache.allzoned =
      this.cache.allzoned ||
      this.timeslots.map((timeslot) =>
        toZonedTime(new Date(timeslot), this.timezone)
      ));
  }
  slotsForDate(date: Date) {
    return (this.cache[date.toString()] =
      this.cache[date.toString()] ||
      this.allZoned().filter(
        (slot) =>
          date.getDate() === slot.getDate() &&
          date.getMonth() === slot.getMonth() &&
          date.getFullYear() === slot.getFullYear()
      )).sort();
  }
  hasSlotsForDate(date: Date) {
    return this.slotsForDate(date).length > 0;
  }
}
