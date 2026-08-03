import path from "node:path";
import process from "node:process";
import { runAutomation } from "./automation.js";
import { runHttpMap } from "./http-map.js";
import type { CliOptions } from "./types.js";

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, options.inputPath);

  if (options.mode === "http-map") {
    await runHttpMap({
      inputPath,
      cwd,
      headed: options.headed,
      browserChannel: options.browserChannel,
      rowNumber: options.rowNumber,
      log: console.log,
    });
    return;
  }

  const result = await runAutomation({
    inputPath,
    cwd,
    headed: options.headed,
    browserChannel: options.browserChannel,
    transport: options.transport,
    mapDir: options.mapDir,
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
  let transport: CliOptions["transport"] = "browser";
  let mode: CliOptions["mode"] = "run";
  let rowNumber: number | undefined;
  let mapDir: string | undefined;

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

    if (arg === "--http-map") {
      mode = "http-map";
      headed = true;
      continue;
    }

    if (arg === "--transport") {
      const value = args[index + 1];
      if (value === "browser" || value === "http" || value === "auto") {
        transport = value;
      }
      index += 1;
      continue;
    }

    if (arg === "--row-number") {
      const value = Number.parseInt(args[index + 1] ?? "", 10);
      rowNumber = Number.isFinite(value) ? value : undefined;
      index += 1;
      continue;
    }

    if (arg === "--map-dir") {
      mapDir = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--browser-channel") {
      browserChannel = args[index + 1];
      index += 1;
      continue;
    }
  }

  return { inputPath, headed, browserChannel, transport, mode, rowNumber, mapDir };
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
