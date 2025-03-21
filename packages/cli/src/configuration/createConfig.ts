import * as fs from "node:fs";
import { configSchema } from "./configSchema";

export function createConfig(path: string) {
  return fs.writeFileSync(
    path,
    JSON.stringify(configSchema.parse({}), null, 2)
  );
}
