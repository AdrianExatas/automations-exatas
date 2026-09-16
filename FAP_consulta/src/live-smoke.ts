import { runAutomation } from "./app.js";

async function main(): Promise<void> {
  if (process.env.RUN_LIVE !== "1") {
    console.log("Teste live desativado por padrao. Para rodar, use: $env:RUN_LIVE=\"1\"; bun run test:live");
    process.exit(0);
  }

  console.log("Iniciando live smoke test limitado a 1 empresa...");
  const outcome = await runAutomation({ maxCompanies: 1 });
  console.log("Resultado do smoke test:", {
    exitCode: outcome.exitCode,
    runDir: outcome.runDir,
    totalEstabelecimentos: outcome.report.summary.totalEstabelecimentos,
    totalCalculosFap: outcome.report.summary.totalCalculosFap,
  });
  process.exit(outcome.exitCode === 1 ? 1 : 0);
}

main().catch((error) => {
  console.error("Falha no live smoke test:", error);
  process.exit(1);
});
