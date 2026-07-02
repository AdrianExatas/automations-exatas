import path from "path";
import { selecionarPlanilhasNoExplorer } from "./file-dialog";
import { gerarPlanilhaSaida } from "./gerar-saida";
import { lerPlanilhaEntrada } from "./ler-entrada";
import { transformarLinhas } from "./transformar";
import { PlanilhaEntradaError } from "./types";

interface ResultadoProcessamento {
  arquivo: string;
  sucesso: boolean;
  saida?: string;
  erro?: string;
}

function obterArquivosEntrada(argv: string[]): string[] {
  const arquivos = argv.filter((arg) => !arg.startsWith("-"));
  if (arquivos.length > 0) return arquivos;

  const selecionados = selecionarPlanilhasNoExplorer();
  if (!selecionados || selecionados.length === 0) {
    console.log("Selecao cancelada ou nenhum arquivo escolhido.");
    process.exit(0);
  }

  return selecionados;
}

function processarArquivo(filePath: string): ResultadoProcessamento {
  const resolved = path.resolve(filePath);
  try {
    const linhasEntrada = lerPlanilhaEntrada(resolved);
    const linhasSaida = transformarLinhas(linhasEntrada);
    const outputPath = gerarPlanilhaSaida(resolved, linhasSaida);

    console.log(`OK: ${path.basename(resolved)} -> ${path.basename(outputPath)} (${linhasSaida.length} linhas)`);
    return { arquivo: resolved, sucesso: true, saida: outputPath };
  } catch (error) {
    const mensagem =
      error instanceof PlanilhaEntradaError || error instanceof Error
        ? error.message
        : String(error);
    console.error(`ERRO: ${path.basename(resolved)} - ${mensagem}`);
    return { arquivo: resolved, sucesso: false, erro: mensagem };
  }
}

export function executar(argv: string[] = process.argv.slice(2)): void {
  const arquivos = obterArquivosEntrada(argv);
  const resultados = arquivos.map(processarArquivo);

  const sucessos = resultados.filter((r) => r.sucesso).length;
  const erros = resultados.length - sucessos;

  console.log("");
  console.log(`Resumo: ${sucessos} processado(s), ${erros} erro(s).`);

  if (erros > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  executar();
}
