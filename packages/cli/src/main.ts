import { select } from "@clack/prompts";
import { program } from "commander";
import * as path from "path";
import { createConfig } from "./configuration/createConfig";
import { deployGoogleAppsScript } from "./google-apps-script";
import { loadJSON } from "./utilities";

async function deployFromFile(configurationPath: string) {
  const configuration = await loadJSON(configurationPath);
  await deployGoogleAppsScript({
    values: configuration,
    path: configurationPath,
  });
}

async function startMainPrompt() {
  const nextStep = await select({
    message:
      "You did not specific a configuration file. Would you like to create one?",
    options: [
      { value: "create", label: "Create a new configuration file" },
      { value: "use", label: "Deploy an existing configuration file" },
      { value: "help", label: "Display help information for someday" },
      { value: "quit", label: "Quit" },
    ],
  });

  if (nextStep === "create") {
    createConfig(path.join(process.cwd(), "someday.json"));
  } else if (nextStep === "use") {
    console.log("Current unimplemented, but would prompt for a file to load");
  } else if (nextStep === "help") {
    console.log(); // Add blank line
    program.help();
  }
}

export function main() {
  program
    .argument("[configuration file path]", "Path to someday configuration file")
    .action(async (configurationPath) => {
      if (!configurationPath) await startMainPrompt();
      else await deployFromFile(configurationPath);
    });

  program.parse();
}
