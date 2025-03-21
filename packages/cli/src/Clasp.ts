import Errors from "./errors.js";

import { log } from "@clack/prompts";
import * as child_process from "node:child_process";
import * as util from "node:util";

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { spawn } from "./utilities.js";
const execFile = util.promisify(child_process.execFile);

export class Clasp {
  async CheckVersion() {
    const { stdout: version } = await this.Version();
    const [major, _minor, _patch] = version.split(".");
    return Number(major) === 2;
  }
  // loggedInUser: string | null = null;
  public clasp = decodeURI(import.meta.resolve("@google/clasp")).replace(
    /^file:\/\//,
    ""
  );
  constructor(public appsScriptDirectory: string) {}
  async Version() {
    try {
      return await execFile(this.clasp, ["--version"], {
        cwd: this.appsScriptDirectory,
      });
    } catch (e) {
      log.error("failed to check clasp version" + (e as any).message);
      log.error(
        "clasp may not be installed. Please install clasp by running `npm install -g @google/clasp@^2.5.0`."
      );
      process.exit(Errors.missingDependency);
    }
  }
  isLoggedin = async () => {
    try {
      const { stdout } = await execFile(this.clasp, ["login", "--status"], {
        cwd: this.appsScriptDirectory,
      });
      if (!stdout.includes("You are logged in as")) return false;
      log.info(stdout);
      return true;
    } catch (e) {
      if (
        (e as any).message?.includes("of undefined (reading 'access_token')")
      ) {
        return false;
      }
      log.error("failed to check login status" + (e as any).message);
      process.exit(Errors.unknown);
    }
  };

  async Push() {
    try {
      return await execFile(this.clasp, ["push", "--force"], {
        cwd: this.appsScriptDirectory,
      });
    } catch (e) {
      log.error("failed to push files" + (e as any).message);
      process.exit(Errors.unknown);
    }
  }

  async CreateWebApp() {
    try {
      await fs.unlink(path.join(this.appsScriptDirectory, ".clasp.json"));
      const _creation = await execFile(
        this.clasp,
        ["create", "--type", "webapp", "--rootDir", this.appsScriptDirectory],
        {
          cwd: this.appsScriptDirectory,
        }
      );
    } catch (e) {
      const errorMessages = (e as any).stderr
        .split("\n")
        .filter((x: any[]) => x.length > 0);

      const lastErrorMessage =
        errorMessages.length > 0
          ? errorMessages[errorMessages.length - 1]
          : null;

      if (
        lastErrorMessage.includes("User has not enabled the Apps Script API.")
      ) {
        log.error(lastErrorMessage);
        process.exit(Errors.permissions);
      } else {
        log.error((e as any).message);
        process.exit(Errors.unknown);
      }
    }
  }
  Login() {
    return spawn(this.clasp, ["login"], {
      //@ts-expect-error
      stdio: "inherit",
    });
  }
  async Deploy() {
    let deploymentOutput: string[] = [];
    try {
      const deployment = await execFile(this.clasp, ["deploy"], {
        cwd: this.appsScriptDirectory,
      });
      deploymentOutput = deployment.stdout
        .split("\n")
        .filter((x) => x.length > 0);
    } catch (e) {
      log.error("failed to deploy" + (e as any).message);
      process.exit(Errors.unknown);
    }
    return deploymentOutput;
  }
}
