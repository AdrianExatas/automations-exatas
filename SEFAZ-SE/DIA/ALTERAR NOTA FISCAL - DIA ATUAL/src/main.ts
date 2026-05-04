import { loadConfig } from "./config";
import { messageOf } from "./errors";
import { runAlterarNotaFiscal } from "./runner";

async function main(): Promise<void> {
  const config = await loadConfig();
  await runAlterarNotaFiscal(config, { onLog: (message) => console.log(message) });
}

main().catch((error) => {
  console.error(messageOf(error));
  process.exitCode = 1;
});
