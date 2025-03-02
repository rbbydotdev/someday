declare function getConfiguration(): {
  calendar: string;
  time_zone: string;
  workdays: [number];
  workhours: { start: number; end: number };
  days_in_advance: 28;
  timeslot_duration: number;
};

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile("index")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function fetchAvailability(): {
  timeslots: string[];
  durationMinutes: number;
} {
  const configuration = getConfiguration();
  const TSDURMS = configuration.timeslot_duration * 60000;

  const nearestTimeslot = new Date(
    Math.floor(new Date().getTime() / TSDURMS) * TSDURMS,
  );
  const calendarId = configuration.calendar;
  const now = nearestTimeslot;
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + configuration.days_in_advance,
    ),
  );

  const response = Calendar.Freebusy!.query({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    items: [{ id: calendarId }],
  });

  const events = (
    (response as any).calendars[calendarId].busy as {
      start: string;
      end: string;
    }[]
  ).map(({ start, end }) => ({ start: new Date(start), end: new Date(end) }));
  //get all timeslots between now and end date
  const timeslots = [];
  for (
    let t = nearestTimeslot.getTime();
    t + TSDURMS <= end.getTime();
    t += TSDURMS
  ) {
    const start = new Date(t);
    const end = new Date(t + TSDURMS);
    const startTZ = new Date(
      Utilities.formatDate(
        start,
        configuration.time_zone,
        "yyyy-MM-dd'T'HH:mm:ss",
      ),
    );
    if (startTZ.getHours() < configuration.workhours.start) continue;
    if (startTZ.getHours() >= configuration.workhours.end) continue;
    if (configuration.workdays.indexOf(startTZ.getDay()) < 0) continue;
    if (events.some((event) => event.start < end && event.end > start)) {
      continue;
    }
    timeslots.push(start.toISOString());
  }
  return { timeslots, durationMinutes: configuration.timeslot_duration };
}

function bookTimeslot(
  timeslot: string,
  name: string,
  email: string,
  phone: string,
  note: string,
): string {
  const configuration = getConfiguration();

  Logger.log(`Booking timeslot: ${timeslot} for ${name}`);
  const calendarId = configuration.calendar;
  const startTime = new Date(timeslot);
  if (isNaN(startTime.getTime())) {
    throw new Error("Invalid start time");
  }
  const endTime = new Date(startTime.getTime());
  endTime.setUTCMinutes(
    startTime.getUTCMinutes() + configuration.timeslot_duration,
  );

  Logger.log(`Timeslot start: ${startTime}, end: ${endTime}`);

  try {
    const possibleEvents = Calendar.Freebusy!.query({
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: [{ id: calendarId }],
    });

    const busy = (possibleEvents as any).calendars[calendarId].busy;

    if (
      busy.some((event: { start: Date; end: Date }) => {
        const eventStart = new Date(event.start.toString());
        const eventEnd = new Date(event.end.toString());
        return eventStart <= endTime && eventEnd >= startTime;
      })
    ) {
      throw new Error("Timeslot not available");
    }

    const event = CalendarApp.getCalendarById(calendarId).createEvent(
      `Appointment with ${name}`,
      startTime,
      endTime,
      {
        description: `Phone: ${phone}\nNote: ${note}`,
        guests: email,
        sendInvites: true,
        status: "confirmed",
      },
    );
    Logger.log(`Event created: ${event.getId()}`);
    return `Timeslot booked successfully`;
  } catch (e) {
    const error = e as Error;
    Logger.log(`Failed to create event: ${error.message}`);
    throw new Error(`Failed to create event: ${error.message}`);
  }
}
