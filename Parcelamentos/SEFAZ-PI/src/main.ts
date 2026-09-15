import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { runAutomation } from "./automation.js";
import type { CliOptions } from "./types.js";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(argv);
  const cwd = process.cwd();

  const result = await runAutomation({
    inputPath: options.inputPath,
    cwd,
    headed: options.headed,
    log: (message) => console.log(message),
  });

  if (result.errorCount > 0) {
    process.exitCode = 1;
  }
}

export function parseCliArgs(args: string[]): CliOptions {
  let inputPath = "model.xlsx";
  let headed = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--input") {
      inputPath = args[index + 1] ?? inputPath;
      index += 1;
      continue;
    }

    if (arg === "--headed") {
      headed = true;
      continue;
    }
  }

  return { inputPath, headed };
}

const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedFilePath && pathToFileURL(executedFilePath).href === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
