const props = PropertiesService.getScriptProperties();

interface EventType {
  id: string;
  name: string;
  duration: number;
  selectable: boolean;
  description?: string;
  WORKDAYS?: number[];
  WORKHOURS?: { start: number; end: number };
  DAYS_IN_ADVANCE?: number;
  CALENDARS?: string[];
  schedulingStrategy?: 'collective' | 'round_robin';
  // Guest permissions
  guestsCanModify?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  // Meeting visibility
  visibility?: 'default' | 'public' | 'private';
}

const CONFIG = {
  TIME_ZONE: props.getProperty('TIME_ZONE') || "America/New_York",
  WORKDAYS: JSON.parse(props.getProperty('WORKDAYS') || "[1, 2, 3, 4, 5]"),
  WORKHOURS: JSON.parse(props.getProperty('WORKHOURS') || '{"start": 9, "end": 16}'),
  DAYS_IN_ADVANCE: parseInt(props.getProperty('DAYS_IN_ADVANCE') || "28", 10),
  EVENT_TYPES: (() => {
    const etProp = props.getProperty('EVENT_TYPES');
    if (etProp) return JSON.parse(etProp) as EventType[];

    // Migration from legacy TIMESLOT_DURATION
    const legacyDuration = parseInt(props.getProperty('TIMESLOT_DURATION') || "30", 10);
    return [{
      id: "default",
      name: "Appointment",
      duration: legacyDuration,
      selectable: true
    }] as EventType[];
  })(),
  CALENDARS: (() => {
    const calendarsProp = props.getProperty('CALENDARS');
    try {
      if (!calendarsProp) return ["primary"];
      const parsed = JSON.parse(calendarsProp);
      return Array.isArray(parsed) ? parsed : ["primary"];
    } catch (e) {
      return ["primary"];
    }
  })(),
  schedulingStrategy: (props.getProperty('schedulingStrategy') || 'collective') as 'collective' | 'round_robin'
};

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
  const config = {
    TIME_ZONE: CONFIG.TIME_ZONE,
    WORKDAYS: CONFIG.WORKDAYS,
    WORKHOURS: CONFIG.WORKHOURS,
    DAYS_IN_ADVANCE: CONFIG.DAYS_IN_ADVANCE,
    EVENT_TYPES: CONFIG.EVENT_TYPES,
    CALENDARS: CONFIG.CALENDARS,
    schedulingStrategy: CONFIG.schedulingStrategy,
  };

  if (!isOwner()) {
    // Return safe public config for visitors
    return { ...config, CALENDARS: [] };
  }

  return config;
}

function setConfig(newConfig: Partial<typeof CONFIG>) {
  if (!isOwner()) {
    throw new Error("Unauthorized: Only the script owner can update configuration.");
  }

  if (newConfig.TIME_ZONE) props.setProperty('TIME_ZONE', newConfig.TIME_ZONE);
  if (newConfig.WORKDAYS) props.setProperty('WORKDAYS', JSON.stringify(newConfig.WORKDAYS));
  if (newConfig.WORKHOURS) props.setProperty('WORKHOURS', JSON.stringify(newConfig.WORKHOURS));
  if (newConfig.DAYS_IN_ADVANCE !== undefined) props.setProperty('DAYS_IN_ADVANCE', newConfig.DAYS_IN_ADVANCE.toString());
  if (newConfig.EVENT_TYPES) props.setProperty('EVENT_TYPES', JSON.stringify(newConfig.EVENT_TYPES));
  if (newConfig.CALENDARS) props.setProperty('CALENDARS', JSON.stringify(newConfig.CALENDARS));
  if (newConfig.schedulingStrategy) props.setProperty('schedulingStrategy', newConfig.schedulingStrategy);

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

function getScriptUrl(): string {
  return ScriptApp.getService().getUrl();
}

function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile("dist/index")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function fetchAvailability(eventTypeId?: string): {
  timeslots: string[];
  durationMinutes: number;
} {
  const eventType = CONFIG.EVENT_TYPES.find((et: EventType) => et.id === eventTypeId) || CONFIG.EVENT_TYPES[0];
  const durationMinutes = eventType.duration;
  const durationMs = durationMinutes * 60000;

  // Use event-specific overrides or fall back to global CONFIG
  const timeZone = CONFIG.TIME_ZONE;
  const workDays = eventType.WORKDAYS ?? CONFIG.WORKDAYS;
  const workHours = eventType.WORKHOURS ?? CONFIG.WORKHOURS;
  const daysInAdvance = eventType.DAYS_IN_ADVANCE ?? CONFIG.DAYS_IN_ADVANCE;
  const calendarsToQuery = eventType.CALENDARS ?? CONFIG.CALENDARS;

  const nearestTimeslot = new Date(
    Math.floor(new Date().getTime() / durationMs) * durationMs
  );
  const now = nearestTimeslot;
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysInAdvance
    )
  );

  const response = Calendar.Freebusy!.query({
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
    items: calendarsToQuery.map((id: string) => ({ id })),
  });

  const eventsByCalendar: Record<string, { start: Date; end: Date }[]> = {};
  calendarsToQuery.forEach((calendarId: string) => {
    const busyTimes = (response as any).calendars[calendarId].busy;
    eventsByCalendar[calendarId] = busyTimes.map(({ start, end }: { start: string; end: string }) => ({
      start: new Date(start),
      end: new Date(end)
    }));
  });

  //get all timeslots between now and end date
  const timeslots = [];
  const strategy = eventType.schedulingStrategy ?? CONFIG.schedulingStrategy ?? 'collective';

  for (
    let t = nearestTimeslot.getTime();
    t + durationMs <= end.getTime();
    t += durationMs
  ) {
    const start = new Date(t);
    const endTime = new Date(t + durationMs);
    const startTZ = new Date(
      Utilities.formatDate(start, timeZone, "yyyy-MM-dd'T'HH:mm:ss")
    );
    if (startTZ.getHours() < workHours.start) continue;
    if (startTZ.getHours() >= workHours.end) continue;
    if (workDays.indexOf(startTZ.getDay()) < 0) continue;

    const freeCalendarsCount = calendarsToQuery.filter((calId: string) => {
      return !eventsByCalendar[calId].some((event) => event.start < endTime && event.end > start);
    }).length;

    const isAvailable = strategy === 'round_robin'
      ? freeCalendarsCount > 0
      : freeCalendarsCount === calendarsToQuery.length;

    if (isAvailable) {
      timeslots.push(start.toISOString());
    }
  }
  return { timeslots, durationMinutes };
}

function bookTimeslot(
  timeslot: string,
  name: string,
  email: string,
  phone: string,
  note: string,
  eventTypeId?: string
): string {
  const eventType = CONFIG.EVENT_TYPES.find((et: EventType) => et.id === eventTypeId) || CONFIG.EVENT_TYPES[0];
  const durationMinutes = eventType.duration;
  const calendarsToUse = eventType.CALENDARS ?? CONFIG.CALENDARS;
  const calendarId = calendarsToUse[0];
  const startTime = new Date(timeslot);
  if (isNaN(startTime.getTime())) {
    throw new Error("Invalid start time");
  }
  const endTime = new Date(startTime.getTime());
  endTime.setUTCMinutes(startTime.getUTCMinutes() + durationMinutes);

  try {
    const possibleEvents = Calendar.Freebusy!.query({
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      items: calendarsToUse.map((id: string) => ({ id })),
    });

    const freeCalendars = calendarsToUse.filter((calId: string) =>
      (possibleEvents as any).calendars[calId].busy.length === 0
    );

    const strategy = eventType.schedulingStrategy ?? CONFIG.schedulingStrategy ?? 'collective';
    let targetCalendarId = calendarsToUse[0];
    let guestsToInvite = [email];

    if (strategy === 'round_robin') {
      if (freeCalendars.length === 0) {
        throw new Error("Timeslot not available");
      }
      // Randomly select one of the free calendars
      targetCalendarId = freeCalendars[Math.floor(Math.random() * freeCalendars.length)];
      // Round Robin: Only the assignee (targetCalendar) and the customer (email) attend.
      // guestsToInvite remains [email]
    } else {
      // Collective: Check if ALL are free
      if (freeCalendars.length !== calendarsToUse.length) {
        throw new Error("Timeslot not available");
      }
      // Default to first calendar
      targetCalendarId = calendarsToUse[0];
      // Collective: Invite all other calendars so everyone is blocked/attending
      const teamGuests = calendarsToUse.filter((id: string) => id !== targetCalendarId);
      guestsToInvite = [...guestsToInvite, ...teamGuests];
    }

    const event = CalendarApp.getCalendarById(targetCalendarId).createEvent(
      `Appointment with ${name}`,
      startTime,
      endTime,
      {
        description: `Phone: ${phone}\nNote: ${note}`,
        guests: guestsToInvite.join(','),
        sendInvites: true,
        status: "confirmed",
      }
    );

    // Apply guest permissions (defaults: modify=false, invite=false, see=true)
    event.setGuestsCanModify(eventType.guestsCanModify ?? false);
    event.setGuestsCanInviteOthers(eventType.guestsCanInviteOthers ?? false);
    event.setGuestsCanSeeGuests(eventType.guestsCanSeeOtherGuests ?? true);

    // Apply visibility setting
    if (eventType.visibility === 'public') {
      event.setVisibility(CalendarApp.Visibility.PUBLIC);
    } else if (eventType.visibility === 'private') {
      event.setVisibility(CalendarApp.Visibility.PRIVATE);
    }
    // 'default' visibility doesn't require explicit setting
    return `Timeslot booked successfully`;
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to create event: ${error.message}`);
  }
}
