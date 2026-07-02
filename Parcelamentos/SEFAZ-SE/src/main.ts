import path from "node:path";
import process from "node:process";
import { runAutomation } from "./automation.js";
import type { CliOptions } from "./types.js";

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, options.inputPath);
  const result = await runAutomation({
    inputPath,
    cwd,
    headed: options.headed,
    browserChannel: options.browserChannel,
    log: console.log,
  });

  if (result.errorCount > 0) {
    process.exitCode = 1;
  }
}

function parseCliArgs(args: string[]): CliOptions {
  let inputPath = "model.xlsx";
  let headed = false;
  let browserChannel: string | undefined;

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

    if (arg === "--browser-channel") {
      browserChannel = args[index + 1];
      index += 1;
      continue;
    }
  }

  return { inputPath, headed, browserChannel };
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
