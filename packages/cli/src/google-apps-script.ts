import { confirm, log, select, spinner } from "@clack/prompts";
import * as path from "node:path";
import { Clasp } from "./Clasp";
import { Configuration } from "./configuration/configSchema";
import Errors from "./errors.js";
import { loadJSON, saveConfiguration, saveJSON, write } from "./utilities.js";

//exit on ctrl+c
process.stdin.on("data", (data) => {
  const readableBuffer = data.toString();

  if (readableBuffer === "\u0003") {
    process.stdout.write("\x1B[?25h");
    process.exit();
  }
});

export async function deployGoogleAppsScript(configuration: {
  values: Configuration;
  path: string;
}) {
  const rootDirectory = path.dirname(import.meta.dirname);
  const appsScriptDirectory = path.join(
    rootDirectory,
    "bin",
    "google_apps_script"
  );

  const CLASP = new Clasp(appsScriptDirectory);

  await CLASP.CheckVersion();

  if (!(await CLASP.isLoggedin())) {
    log.info("You are not logged in to clasp.");
    await CLASP.Login();
  } else {
    const shouldChangeLogin = await select({
      message:
        "Do you want to continue with this account, or log in with a different account?",
      options: [
        { value: false, label: "Continue with this account" },
        { value: true, label: "Log in with a different account" },
      ],
    });

    if (shouldChangeLogin) {
      await CLASP.Login();
    }
  }

  const s = spinner();

  if (
    configuration.values.scriptId &&
    configuration.values.scriptId !== "[UNKNOWN]"
  ) {
    await saveJSON(path.join(appsScriptDirectory, ".clasp.json"), {
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

    await CLASP.CreateWebApp();

    const claspConfiguration = await loadJSON(
      path.join(appsScriptDirectory, ".clasp.json")
    );

    configuration.values.scriptId = claspConfiguration.scriptId;

    saveConfiguration(configuration);
  }

  const { scriptId: _, ...configurationToWrite } = configuration.values;

  await write(
    path.join(appsScriptDirectory, "configuration.gs"),
    `function getConfiguration() {\n return ${JSON.stringify(
      configurationToWrite
    )};\n}`
  );

  s.start("Pushing files (this may take a minute)");

  await CLASP.Push();

  s.stop("Files pushed");

  s.start("Creating deployment");

  const deploymentOutput = await CLASP.Deploy();

  s.stop("Deployment created");

  const lastDeploymentOutput =
    deploymentOutput.length > 0
      ? deploymentOutput[deploymentOutput.length - 1]
      : "";

  log.info(
    `Deployed to https://script.google.com/macros/s/${
      lastDeploymentOutput.split(" ")[1]
    }/exec`
  );
}
