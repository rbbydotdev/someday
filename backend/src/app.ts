const CALENDARS: string[] = (() => {
  const calendarsProp = PropertiesService.getScriptProperties().getProperty('CALENDARS');
  try {
    if (!calendarsProp) return ["primary"];
    const parsed = JSON.parse(calendarsProp);
    return Array.isArray(parsed) ? parsed : ["primary"];
  } catch (e) {
    Logger.log(`Error parsing CALENDARS property: ${e}`);
    return ["primary"];
  }
})();
const TIME_ZONE = "America/Los_Angeles";
//  America/Los_Angeles
//  America/Denver
//  America/Chicago
//  Europe/London
//  Europe/Berlin
const WORKDAYS = [1, 2, 3, 4, 5];
const WORKHOURS = {
  start: 9,
  end: 16,
};
const DAYS_IN_ADVANCE = 28;
//high numbered days in advance cause significant loading time slow down
const TIMESLOT_DURATION = 30;

const TSDURMS = TIMESLOT_DURATION * 60000;

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile("dist/index")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function fetchAvailability(): {
  timeslots: string[];
  durationMinutes: number;
} {
  const nearestTimeslot = new Date(
    Math.floor(new Date().getTime() / TSDURMS) * TSDURMS
  );
  const now = nearestTimeslot;
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + DAYS_IN_ADVANCE
    )
  );

  const response = Calendar.Freebusy!.query({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    items: CALENDARS.map((id: string) => ({ id })),
  });

  const events = CALENDARS.map((calendarId: string) => {
    const busyTimes = (response as any).calendars[calendarId].busy;
    Logger.log(`Busy times for ${calendarId}: ${JSON.stringify(busyTimes)}`);
    return busyTimes.map(({ start, end }: { start: string; end: string }) => ({ 
      start: new Date(start), 
      end: new Date(end) 
    }));
  }).reduce((acc, curr) => acc.concat(curr), []);

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
      Utilities.formatDate(start, TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss")
    );
    if (startTZ.getHours() < WORKHOURS.start) continue;
    if (startTZ.getHours() >= WORKHOURS.end) continue;
    if (WORKDAYS.indexOf(startTZ.getDay()) < 0) continue;
    if (events.some((event: { start: Date; end: Date }) => event.start < end && event.end > start)) {
      continue;
    }
    timeslots.push(start.toISOString());
  }
  return { timeslots, durationMinutes: TIMESLOT_DURATION };
}

function bookTimeslot(
  timeslot: string,
  name: string,
  email: string,
  phone: string,
  note: string
): string {
  const calendarId = CALENDARS[0];
  const startTime = new Date(timeslot);
  if (isNaN(startTime.getTime())) {
    throw new Error("Invalid start time");
  }
  const endTime = new Date(startTime.getTime());
  endTime.setUTCMinutes(startTime.getUTCMinutes() + TIMESLOT_DURATION);

  try {
    const possibleEvents = Calendar.Freebusy!.query({
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: CALENDARS.map((id: string) => ({ id })),
    });

    const hasConflict = CALENDARS.some((calId: string) => 
      (possibleEvents as any).calendars[calId].busy.length > 0
    );

    if (hasConflict) {
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
      }
    );
    return `Timeslot booked successfully`;
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to create event: ${error.message}`);
  }
}
