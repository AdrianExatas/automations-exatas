import { runAutomation } from "./app.js";

function parseArgs(): { maxCompanies?: number; specificCnpj?: string; anoVigencia?: number } {
  const args = process.argv.slice(2);
  let maxCompanies: number | undefined;
  let specificCnpj: string | undefined;
  let anoVigencia: number | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--max" && args[i + 1]) {
      maxCompanies = parseInt(args[i + 1], 10);
      i += 1;
    } else if (arg === "--cnpj" && args[i + 1]) {
      specificCnpj = args[i + 1];
      i += 1;
    } else if (arg === "--ano" && args[i + 1]) {
      anoVigencia = parseInt(args[i + 1], 10);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Uso: bun run start [opcoes]

Opcoes:
  --max <numero>     Limita a execucao a N empresas
  --cnpj <documento> Executa apenas para o CNPJ informado
  --ano <ano>        Define o ano de vigencia do FAP (ex: 2026)
  --help, -h         Exibe esta ajuda
`);
      process.exit(0);
    }
  }

  return { maxCompanies, specificCnpj, anoVigencia };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outcome = await runAutomation(options);
  process.exit(outcome.exitCode);
}

main().catch((error) => {
  console.error("Erro fatal na execucao:", error);
  process.exit(1);
});
