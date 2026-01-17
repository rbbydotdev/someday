/// <reference types="vite/client" />

declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_BUILD_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleRun {
  withSuccessHandler: (cb: (data: any) => void) => GoogleRun;
  withFailureHandler: (cb: (error: any) => void) => GoogleRun;
  [key: string]: any;
}

interface GoogleLib {
  script: {
    run: GoogleRun;
  };
}
