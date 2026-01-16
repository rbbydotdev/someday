const props = PropertiesService.getScriptProperties();

const CONFIG = {
  TIME_ZONE: props.getProperty('TIME_ZONE') || "America/New_York",
  WORKDAYS: JSON.parse(props.getProperty('WORKDAYS') || "[1, 2, 3, 4, 5]"),
  WORKHOURS: JSON.parse(props.getProperty('WORKHOURS') || '{"start": 9, "end": 16}'),
  DAYS_IN_ADVANCE: parseInt(props.getProperty('DAYS_IN_ADVANCE') || "28", 10),
  TIMESLOT_DURATION: parseInt(props.getProperty('TIMESLOT_DURATION') || "30", 10),
  CALENDARS: (() => {
    const calendarsProp = props.getProperty('CALENDARS');
    try {
      if (!calendarsProp) return ["primary"];
      const parsed = JSON.parse(calendarsProp);
      return Array.isArray(parsed) ? parsed : ["primary"];
    } catch (e) {
      return ["primary"];
    }
  })()
};

const TSDURMS = CONFIG.TIMESLOT_DURATION * 60000;

function isOwner(): boolean {
  try {
    const effectiveUser = Session.getEffectiveUser().getEmail();
    const activeUser = Session.getActiveUser().getEmail();
    // In "Execute as: Me" mode, activeUser is empty unless the user has authorized the script.
    // If they are the owner, they definitely have.
    return effectiveUser === activeUser && effectiveUser !== "";
  } catch (e) {
    return false;
  }
}

function getConfig() {
  if (!isOwner()) {
    throw new Error("Unauthorized: Only the script owner can access configuration.");
  }
  return {
    TIME_ZONE: CONFIG.TIME_ZONE,
    WORKDAYS: CONFIG.WORKDAYS,
    WORKHOURS: CONFIG.WORKHOURS,
    DAYS_IN_ADVANCE: CONFIG.DAYS_IN_ADVANCE,
    TIMESLOT_DURATION: CONFIG.TIMESLOT_DURATION,
    CALENDARS: CONFIG.CALENDARS,
  };
}

function setConfig(newConfig: Partial<typeof CONFIG>) {
  if (!isOwner()) {
    throw new Error("Unauthorized: Only the script owner can update configuration.");
  }

  if (newConfig.TIME_ZONE) props.setProperty('TIME_ZONE', newConfig.TIME_ZONE);
  if (newConfig.WORKDAYS) props.setProperty('WORKDAYS', JSON.stringify(newConfig.WORKDAYS));
  if (newConfig.WORKHOURS) props.setProperty('WORKHOURS', JSON.stringify(newConfig.WORKHOURS));
  if (newConfig.DAYS_IN_ADVANCE !== undefined) props.setProperty('DAYS_IN_ADVANCE', newConfig.DAYS_IN_ADVANCE.toString());
  if (newConfig.TIMESLOT_DURATION !== undefined) props.setProperty('TIMESLOT_DURATION', newConfig.TIMESLOT_DURATION.toString());
  if (newConfig.CALENDARS) props.setProperty('CALENDARS', JSON.stringify(newConfig.CALENDARS));

  return { success: true };
}

function listCalendars() {
  if (!isOwner()) {
    throw new Error("Unauthorized: Only the script owner can list calendars.");
  }
  const calendars = CalendarApp.getAllCalendars();
  return calendars.map(cal => ({
    id: cal.getId(),
    name: cal.getName(),
  }));
}

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
      now.getUTCDate() + CONFIG.DAYS_IN_ADVANCE
    )
  );

  const response = Calendar.Freebusy!.query({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    items: CONFIG.CALENDARS.map((id: string) => ({ id })),
  });

  const events = CONFIG.CALENDARS.map((calendarId: string) => {
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
      Utilities.formatDate(start, CONFIG.TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ss")
    );
    if (startTZ.getHours() < CONFIG.WORKHOURS.start) continue;
    if (startTZ.getHours() >= CONFIG.WORKHOURS.end) continue;
    if (CONFIG.WORKDAYS.indexOf(startTZ.getDay()) < 0) continue;
    if (events.some((event: { start: Date; end: Date }) => event.start < end && event.end > start)) {
      continue;
    }
    timeslots.push(start.toISOString());
  }
  return { timeslots, durationMinutes: CONFIG.TIMESLOT_DURATION };
}

function bookTimeslot(
  timeslot: string,
  name: string,
  email: string,
  phone: string,
  note: string
): string {
  const calendarId = CONFIG.CALENDARS[0];
  const startTime = new Date(timeslot);
  if (isNaN(startTime.getTime())) {
    throw new Error("Invalid start time");
  }
  const endTime = new Date(startTime.getTime());
  endTime.setUTCMinutes(startTime.getUTCMinutes() + CONFIG.TIMESLOT_DURATION);

  try {
    const possibleEvents = Calendar.Freebusy!.query({
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: CONFIG.CALENDARS.map((id: string) => ({ id })),
    });

    const hasConflict = CONFIG.CALENDARS.some((calId: string) =>
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
