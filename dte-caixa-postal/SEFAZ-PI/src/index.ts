import { runSefazPiMailboxAutomation } from "./app.js";

async function main(): Promise<void> {
  await runSefazPiMailboxAutomation();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
