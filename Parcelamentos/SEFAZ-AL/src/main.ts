import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { DEFAULT_OUTPUT_DIR, runAutomation } from "./automation.js";
import type { CliOptions } from "./types.js";

export const DEFAULT_INPUT_PATH = "model.xlsx";
export { DEFAULT_OUTPUT_DIR };

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseCliArgs(argv);
  const cwd = process.cwd();

  const result = await runAutomation({
    inputPath: options.inputPath,
    cwd,
    outputDir: options.outputDir,
    headed: options.headed,
    log: (message) => console.log(message),
  });

  if (result.errorCount > 0) {
    process.exitCode = 1;
  }
}

export function parseCliArgs(args: string[]): CliOptions {
  let inputPath = DEFAULT_INPUT_PATH;
  let outputDir = DEFAULT_OUTPUT_DIR;
  let headed = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--input") {
      inputPath = args[index + 1] ?? inputPath;
      index += 1;
      continue;
    }

    if (arg === "--output") {
      outputDir = args[index + 1] ?? outputDir;
      index += 1;
      continue;
    }

    if (arg === "--headed") {
      headed = true;
    }
  }

  return { inputPath, outputDir, headed };
}

export function resolveOutputDir(cwd: string, outputDir = DEFAULT_OUTPUT_DIR): string {
  return path.resolve(cwd, outputDir);
}

const executedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : null;

if (executedFilePath && pathToFileURL(executedFilePath).href === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
