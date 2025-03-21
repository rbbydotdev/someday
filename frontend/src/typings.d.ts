/// <reference types="vite/client" />

declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_BUILD_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleLib {
  script: {
    run: {
      withSuccessHandler: (
        cb: (arg0: { timeslots: string[]; durationMinutes: number }) => void
      ) => {
        withFailureHandler: (_cb: any) => {
          fetchAvailability: () => void;
          bookTimeslot: (...args: any[]) => void;
        };
      };
    };
  };
}
