import * as fs from "node:fs/promises";

export async function fileExists(f) {
  try {
    await fs.lstat(f);
    return true;
  } catch {
    return false;
  }
}

export async function loadJSON(filePath) {
  let contents;
  try {
    contents = await fs.readFile(filePath, "utf8");
  } catch (e) {
    switch (e.code) {
      case "ENOENT":
        throw new Error(
          `Path "${filePath}" does not exist or you do not have permission to access it.`,
        );
      case "EISDIR":
        throw new Error(`"${filePath}" is not a file, but a directory.`);
      default:
        throw new Error(
          `An unexpected error occurred when attempting to read "${filePath}":`,
        );
    }
  }

  try {
    contents = JSON.parse(contents);
  } catch (e) {
    throw new Error(`"${filePath}" did not contain valid JSON.`);
  }

  return contents;
}

export async function saveJSON(path, content) {
  return await fs.writeFile(path, JSON.stringify(content));
}

export async function saveConfiguration(configuration) {
  return await saveJSON(configuration.path, configuration.values);
}

class SpawnError extends Error {
  constructor(...args) {
    super(...args.slice(0, -1));
    this.childProcess = args[-1];
  }
}

export function spawn(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = child_process.spawn(command, args, options);

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new SpawnError(`Command failed with code ${code}`, child));
    });

    child.on("error", (err) => {
      reject(
        new SpawnError(
          `Command encountered error: ${err.message}`,
          { cause: err },
          child,
        ),
      );
    });
  });
}
