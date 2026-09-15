import { runCli } from "./automation";
import { isGesttaAuthFatalError } from "./api/client";
import { runFiscalCli } from "./reatribuicao-fiscal";
import { runPessoalCli } from "./reatribuicao-pessoal";
import { runPessoalPendentesCli } from "./reatribuicao-pessoal-pendentes";

(async () => {
  const executouPendentes = await runPessoalPendentesCli();
  const executouFluxoFiscal = !executouPendentes && await runFiscalCli();
  const executouFluxoPessoal = !executouPendentes && !executouFluxoFiscal && await runPessoalCli();
  if (!executouPendentes && !executouFluxoFiscal && !executouFluxoPessoal) await runCli();
})().catch((err) => {
  if (isGesttaAuthFatalError(err)) {
    console.error(`[auth] Execucao interrompida: ${err.message}`);
    process.exit(1);
  }

  console.error(err);
  process.exit(1);
});
