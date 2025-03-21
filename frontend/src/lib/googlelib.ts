import { isDemoMode, isDev } from "@/clientEnv";
import { generateDummyData } from "@/hooks/dummydata";

export const GoogleLib = {
  get google(): GoogleLib {
    if (isDev || isDemoMode) {
      console.log("Using demo mode");
      const dummyData = generateDummyData();
      console.log("Using dummy data", dummyData);
      return {
        script: {
          run: {
            withSuccessHandler: (
              cb: (arg0: {
                timeslots: string[];
                durationMinutes: number;
              }) => void
            ) => {
              cb({
                timeslots: dummyData,
                durationMinutes: 30,
              });
              return {
                withFailureHandler: (_cb: any) => {
                  return {
                    fetchAvailability: () => {},
                    bookTimeslot: (...args: any) => {
                      console.log("Booked timeslot", args);
                    },
                  };
                },
              };
            },
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
