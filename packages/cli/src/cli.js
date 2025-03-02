#!/usr/bin/env node

import { program } from "commander";
import { log, select } from "@clack/prompts";
import { deployGoogleAppsScript } from "./google-apps-script.js";
import { loadJSON } from "./utilities.js";
import Errors from "./errors.js";

async function deployFromFile(configurationPath) {
  let configuration = {};

  try {
    configuration = await loadJSON(configurationPath);
  } catch (e) {
    log.error(e.message);
    process.exit(Errors.configuration);
  }

  configuration = {
    path: configurationPath,
    values: configuration,
  };

  await deployGoogleAppsScript(configuration);
}

async function startMainPrompt() {
  const nextStep = await select({
    message:
      "You did not specific a configuration file. Would you like to create one?",
    options: [
      { value: "create", label: "Create a new configuration file" },
      { value: "use-existing", label: "Deploy an existing configuration file" },
      { value: "help", label: "Display help information for someday" },
      { value: "quit", label: "Quit" },
    ],
  });

  switch (nextStep) {
    case "create":
      console.log("Unimplemented");
      break;
    case "use-existing":
      console.log("Current unimplemented, but would prompt for a file to load");
      break;
    case "help":
      console.log(); // Add blank line
      program.help();
      break;
    default:
      break;
  }
}

program
  .argument("[configuration file path]", "Path to someday configuration file")
  .action(async (configurationPath) => {
    if (!configurationPath) await startMainPrompt();
    else await deployFromFile(configurationPath);
  });

program.parse();
