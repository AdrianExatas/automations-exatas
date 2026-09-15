import { runAutomation } from "./app.js";
import { sanitizeText } from "./logger.js";

async function main(): Promise<void> {
  try {
    const outcome = await runAutomation();
    process.exitCode = outcome.exitCode;
  } catch (error) {
    console.error(`[FATAL] ${sanitizeText(error)}`);
    process.exitCode = 1;
  }
}

await main();
