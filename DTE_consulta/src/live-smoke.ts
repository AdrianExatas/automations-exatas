import { runAutomation } from "./app.js";

if (process.env.RUN_LIVE !== "1") {
  console.log("Teste live ignorado. Defina RUN_LIVE=1 para consultar apenas a primeira empresa do SPE.");
} else {
  const outcome = await runAutomation({ maxCompanies: 1 });
  process.exitCode = outcome.exitCode;
}
