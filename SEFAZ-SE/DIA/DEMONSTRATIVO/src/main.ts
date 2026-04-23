import { loadConfig } from "./config";
import { messageOf } from "./errors";
import { runSefazDia } from "./runner";

async function main(): Promise<void> {
  const config = await loadConfig();
  await runSefazDia(config, { onLog: (message) => console.log(message) });
}

main().catch((error) => {
  console.error(messageOf(error));
  process.exitCode = 1;
});
