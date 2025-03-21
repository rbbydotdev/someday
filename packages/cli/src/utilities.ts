import * as child_process from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { dirname } from "node:path";
import { z } from "zod";
import { configSchema } from "./configuration/configSchema";

export async function loadJSON(filePath: string) {
  let contents;
  try {
    contents = configSchema.parse(
      JSON.parse(await fs.readFile(filePath, "utf8"))
    );
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error(`"${filePath}" did not contain valid JSON.
        expected: ${JSON.stringify(configSchema.parse({}), null, 4)}
        `);
    }
    if (e instanceof z.ZodError) {
      throw new Error(
        `The configuration file at "${filePath}" did not match the expected schema:
        ${JSON.stringify(configSchema.parse({}), null, 4)}
        \n${e.errors.map((error) => error.message).join("\n")}`
      );
    }
    switch ((e as any).code) {
      case "ENOENT":
        throw new Error(
          `Path "${filePath}" does not exist or you do not have permission to access it.`
        );
      case "EISDIR":
        throw new Error(`"${filePath}" is not a file, but a directory.`);
      default:
        throw new Error(
          `An unexpected error occurred when attempting to read "${filePath}":`
        );
    }
  }

  return contents;
}

export async function write(path: string, content: string) {
  try {
    await fs.writeFile(path, content, { flag: "w" });
  } catch (e: any) {
    if (e.code === "ENOENT") {
      // Create the file if it doesn't exist
      await fs.mkdir(dirname(path), { recursive: true });
      await fs.writeFile(path, content, { flag: "w" });
    } else {
      throw e;
    }
  }
}

export function saveJSON(path: string, content: { scriptId: string }) {
  return write(path, JSON.stringify(content));
}

export async function saveConfiguration(configuration: {
  path: string;
  values: { scriptId: string };
}) {
  return await saveJSON(configuration.path, configuration.values);
}

class SpawnError extends Error {
  childProcess: child_process.ChildProcess;
  constructor(message: string, childProcess: child_process.ChildProcess) {
    super(message);
    this.childProcess = childProcess;
  }
}

export function spawn(
  command: string,
  args: readonly string[] | undefined,
  options: child_process.SpawnOptionsWithoutStdio | undefined
) {
  return new Promise<void>((resolve, reject) => {
    const child = child_process.spawn(command, args, options);

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new SpawnError(`Command failed with code ${code}`, child));
    });

    child.on("error", (err) => {
      reject(
        new SpawnError(`Command encountered error: ${err.message}`, child)
      );
    });
  });
}
