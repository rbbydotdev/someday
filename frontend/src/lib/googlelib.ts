import { isDemoMode, isDev } from "@/clientEnv";
import { generateDummyData } from "@/hooks/dummydata";

const MOCK_EVENT_TYPES = [
  {
    id: "30min",
    name: "30 Minute Meeting",
    duration: 30,
    selectable: true,
    WORKDAYS: [1, 3, 5],
    WORKHOURS: { start: 10, end: 15 }
  },
  {
    id: "60min",
    name: "1 Hour Strategy",
    duration: 60,
    selectable: true,
    DAYS_IN_ADVANCE: 14,
    CALENDARS: ["work"]
  },
  { id: "secret", name: "Secret Meeting", duration: 15, selectable: false },
];

export const GoogleLib = {
  get google(): GoogleLib {
    if (isDev || isDemoMode) {
      console.log("Using demo mode");
      const dummyData = generateDummyData();
      console.log("Using dummy data", dummyData);
      return {
        script: {
          run: {
            withSuccessHandler: (cb: (data: any) => void) => {
              const runObj: any = {
                withFailureHandler: (_cb: any) => runObj,
                fetchAvailability: (eventTypeId?: string) => {
                  console.log(`Fetching availability for type: ${eventTypeId}`);
                  const eventType = MOCK_EVENT_TYPES.find(et => et.id === eventTypeId);
                  cb({
                    timeslots: dummyData,
                    durationMinutes: eventType ? eventType.duration : 30,
                  });
                },
                bookTimeslot: (...args: any) => {
                  console.log("Booked timeslot", args);
                  cb("Success");
                },
                getConfig: () => {
                  cb({
                    TIME_ZONE: "America/New_York",
                    WORKDAYS: [1, 2, 3, 4, 5],
                    WORKHOURS: { start: 9, end: 16 },
                    DAYS_IN_ADVANCE: 28,
                    EVENT_TYPES: MOCK_EVENT_TYPES,
                    CALENDARS: ["primary"],
                  });
                },
                listCalendars: () => {
                  cb([
                    { id: "primary", name: "Primary Calendar" }
                  ]);
                },
                setConfig: (config: any) => {
                  console.log("Saving config", config);
                  cb({ success: true });
                },
                isOwner: () => {
                  cb(true);
                },
                getScriptUrl: () => {
                  cb(window.location.origin + window.location.pathname);
                }
              };
              return runObj;
            },
            withFailureHandler: (_cb: any) => {
              // This is a dummy object to satisfy the base google.script.run
              // Real chaining is handled within withSuccessHandler's returned object
              return (GoogleLib.google.script.run as any).withSuccessHandler(() => { });
            }
          },
        },
      };
    }

    // @ts-expect-error google is not defined
    if (!window.google) {
      throw new Error("Google API not loaded");
    }

    // @ts-expect-error google is not defined
    return window.google;
  },
};
