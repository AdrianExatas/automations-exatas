import { runCli } from "./automation";
import { isGesttaAuthFatalError } from "./api/client";

runCli().catch((err) => {
  if (isGesttaAuthFatalError(err)) {
    console.error(`[auth] Execucao interrompida: ${err.message}`);
    process.exit(1);
  }

  console.error(err);
  process.exit(1);
});
