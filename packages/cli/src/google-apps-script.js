import util from "node:util";
import child_process from "node:child_process";
import path from "node:path";
import * as fs from "node:fs/promises";
import { google } from "googleapis";
import { confirm, log, select, spinner } from "@clack/prompts";
import { saveConfiguration, saveJSON, spawn } from "./utilities.js";
import Errors from "./errors.js";

const execFile = util.promisify(child_process.execFile);

export async function deployGoogleAppsScript(configuration) {
  const rootDirectory = path.dirname(import.meta.dirname);
  const appsScriptDirectory = path.join(
    rootDirectory,
    "dist",
    "google_apps_script",
  );

  const clasp = decodeURI(import.meta.resolve("@google/clasp")).replace(
    /^file:\/\//,
    "",
  );

  const loginStatus = await execFile(clasp, ["login", "--status"], {
    cwd: appsScriptDirectory,
  });

  if (!loginStatus.stdout.startsWith("You are logged in as")) {
    log.info("You are not logged in to clasp.");

    await spawn(clasp, ["login"], {
      cwd: appsScriptDirectory,
      stdio: "inherit",
    });
  } else {
    log.info(loginStatus.stdout);

    const shouldChangeLogin = await select({
      message:
        "Do you want to continue with this account, or log in with a different account?",
      options: [
        { value: false, label: "Continue with this account" },
        { value: true, label: "Log in with a different account" },
      ],
    });

    if (shouldChangeLogin) {
      await spawn(clasp, ["login"], {
        cwd: appsScriptDirectory,
        stdio: "inherit",
      });
    }
  }

  try {
    await fs.unlink(path.join(appsScriptDirectory, ".clasp.json"));
  } catch (e) {
    if (e.code == "ENOENT") {
      //ignore
    } else {
      // TODO: throw error
    }
  }

  const s = spinner();

  if (configuration.values.scriptId) {
    saveJSON(path.join(appsScriptDirectory, ".clasp.json"), {
      scriptId: configuration.values.scriptId,
    });
  } else {
    const shouldContinue = await confirm({
      message:
        "The specified configuration file does not appear to have been deployed before, because it does not include a script ID. Would you like to continue with creating a new Google Apps Script? If so, your configuration file will be updated with the new script ID.",
    });

    if (!shouldContinue) {
      process.exit(Errors.userCancelled);
    }

    try {
      s.start("Creating Google Apps Script");
      const creation = await execFile(clasp, ["create", "--type", "webapp"], {
        cwd: appsScriptDirectory,
      });
      s.stop("Google Apps Script created");
    } catch (e) {
      const errorMessages = e.stderr.split("\n").filter((x) => x.length > 0);

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
        log.error(e.message);
        process.exit(Errors.unknown);
      }
    }

    const claspConfiguration = await loadJSON(
      path.join(appsScriptDirectory, ".clasp.json"),
    );

    configuration.values.scriptId = claspConfiguration.scriptId;

    saveConfiguration(configuration);
  }

  const configurationToWrite = { ...configuration.values };
  delete configurationToWrite["scriptId"];
  await fs.writeFile(
    path.join(appsScriptDirectory, "configuration.gs"),
    `function getConfiguration() {\n return ${JSON.stringify(configurationToWrite)};\n}`,
  );

  s.start("Pushing files (this may take a minute)");
  await execFile(clasp, ["push", "--force"], {
    cwd: appsScriptDirectory,
  });
  s.stop("Files pushed");

  s.start("Creating deployment");
  const deployment = await execFile(clasp, ["deploy"], {
    cwd: appsScriptDirectory,
  });
  s.stop("Deployment created");

  const deploymentOutput = deployment.stdout
    .split("\n")
    .filter((x) => x.length > 0);

  const lastDeploymentOutput =
    deploymentOutput.length > 0
      ? deploymentOutput[deploymentOutput.length - 1]
      : "";

  log.info(
    `Deployed to https://script.google.com/macros/s/${lastDeploymentOutput.split(" ")[1]}/exec`,
  );
}
