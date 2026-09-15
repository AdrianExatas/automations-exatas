#!/usr/bin/env bun
/**
 * CLI para conciliação fiscal REINF × DCTFWeb × Domínio
 * Comandos:
 *   bun run src/cli.ts compare --competencia AAAA-MM --empresa CODIGO
 *   bun run src/cli.ts batch --competencia AAAA-MM [--yes] [--export relatorio.xlsx]
 */
import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as readline from "node:readline";

import { loadConfig } from "./config.ts";
import { DominioOdbcClient } from "./dominio/client.ts";
import { DominioMockAdapter, createDefaultMockDctfwebProvider } from "./dominio/mock_adapter.ts";
import { SerproAuthManager } from "./serpro/auth.ts";
import { SerproClient } from "./serpro/client.ts";
import { DctfwebService } from "./serpro/dctfweb_service.ts";
import { SqliteStorage } from "./storage/sqlite.ts";
import { ExcelExporter } from "./export/excel.ts";
import { ConferenciaOrchestrator } from "./orchestrator.ts";

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolvePrompt) => {
    rl.question(question, (answer) => {
      rl.close();
      const clean = answer.trim().toLowerCase();
      resolvePrompt(clean === "s" || clean === "sim" || clean === "y" || clean === "yes");
    });
  });
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      competencia: { type: "string", short: "c" },
      empresa: { type: "string", short: "e" },
      export: { type: "string", short: "o" },
      yes: { type: "boolean", short: "y", default: false },
      mock: { type: "boolean", short: "m", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  const command = positionals[0] || (values.empresa ? "compare" : "batch");

  if (values.help || (!values.competencia && command !== "help")) {
    console.log(`
Uso:
  bun run src/cli.ts compare --competencia AAAA-MM --empresa CODIGO [opções]
  bun run src/cli.ts batch --competencia AAAA-MM [opções]

Opções:
  -c, --competencia <AAAA-MM>   Competência fiscal (obrigatório, ex: 2026-01)
  -e, --empresa <CODIGO>        Código ou CNPJ da empresa (obrigatório no comando compare)
  -o, --export <ARQUIVO.xlsx>   Caminho para salvar o relatório Excel gerado
  -y, --yes                     Confirmação automática de chamadas tarifadas SERPRO
  -m, --mock                    Utiliza dados simulados em memória para testes offline
  -h, --help                    Exibe esta mensagem de ajuda
`);
    return;
  }

  const competencia = values.competencia!;
  const config = loadConfig();

  // Inicializar adaptador de banco Domínio
  const dominioClient = values.mock
    ? new DominioMockAdapter()
    : new DominioOdbcClient({
        dsn: config.dominioOdbcDsn,
        user: config.dominioUser,
        password: config.dominioPassword,
      });

  // Inicializar cliente SERPRO ou MockProvider
  let dctfwebService: DctfwebService | undefined;
  let mockProvider: ((cnpj: string, comp: string) => Promise<string | null>) | undefined;

  if (values.mock) {
    mockProvider = createDefaultMockDctfwebProvider();
  } else {
    const authManager = new SerproAuthManager({
      consumerKey: config.serproConsumerKey,
      consumerSecret: config.serproConsumerSecret,
      certificatePfxPath: config.serproCertPfxPath,
      certificatePassword: config.serproCertPassword,
    });
    const client = new SerproClient(authManager, config.serproContratanteCnpj);
    dctfwebService = new DctfwebService(client);
  }

  const storage = new SqliteStorage(config.sqliteDbPath);
  const orchestrator = new ConferenciaOrchestrator({
    dominioClient,
    dctfwebService,
    sqliteStorage: storage,
    mockDctfwebProvider: mockProvider,
  });

  if (command === "compare") {
    if (!values.empresa) {
      console.error("Erro: O comando 'compare' exige a opção --empresa <CODIGO>");
      process.exit(1);
    }

    console.log(`\n=== Conferência Individual: Empresa ${values.empresa} (${competencia}) ===`);
    const res = await orchestrator.reconcileCompany(competencia, values.empresa);

    console.log(`Empresa: ${res.empresa.codiEmp} - ${res.empresa.razaoSocial} (CNPJ: ${res.empresa.cnpj})`);
    console.log(`Status: [ ${res.status} ]`);
    console.log(`Total Domínio: R$ ${res.totalGeralDominio.toFixed(2)} | Total DCTFWeb: R$ ${res.totalGeralDctfweb.toFixed(2)} | Diferença: R$ ${res.diferencaGeral.toFixed(2)}`);

    if (res.reciboReinfR2000 || res.reciboReinfR4000) {
      console.log(`Recibos REINF: R-2000: ${res.reciboReinfR2000 || "N/A"} | R-4000: ${res.reciboReinfR4000 || "N/A"}`);
    }
    console.log(`Recibo DCTFWeb: ${res.reciboDctfweb || "N/A"}`);

    if (res.detalhes.length > 0) {
      console.log("\nDetalhamento por Código de Receita:");
      console.table(
        res.detalhes.map((d) => ({
          Série: d.serie,
          Origem: d.origem,
          Código: d.codigoReceita,
          "Vlr Domínio": d.valorDominio.toFixed(2),
          "Vlr DCTFWeb": d.valorDctfweb.toFixed(2),
          Diferença: d.diferenca.toFixed(2),
          Situação: d.situacao,
        })),
      );
    }

    if (res.pendencias.length > 0) {
      console.log("\nPendências:");
      res.pendencias.forEach((p) => console.log(` - ${p}`));
    }
    if (res.mensagens.length > 0) {
      console.log("\nMensagens:");
      res.mensagens.forEach((m) => console.log(` - ${m}`));
    }
  } else if (command === "batch") {
    console.log(`\n=== Preparando Processamento em Lote: Competência ${competencia} ===`);

    const estimativa = await orchestrator.estimateSerproCalls(competencia);
    console.log(`Total de empresas localizadas: ${estimativa.totalEmpresas}`);
    console.log(`Estimativa de chamadas à API SERPRO: ${estimativa.chamadasEstimadas} consulta(s)`);

    if (!values.yes) {
      console.log("\nAVISO: As chamadas ao SERPRO são tarifadas de acordo com o contrato vigente.");
      const confirmed = await askConfirmation("Deseja prosseguir com o lote? (s/N): ");
      if (!confirmed) {
        console.log("Operação cancelada pelo usuário.");
        return;
      }
    }

    console.log("\nIniciando processamento das empresas...");
    const summary = await orchestrator.reconcileBatch(competencia, (curr, tot, r) => {
      process.stdout.write(`\r[${curr}/${tot}] Processando ${r.empresa.codiEmp} - Status: ${r.status}         `);
    });
    console.log("\n\n=== Resumo do Processamento ===");
    console.log(`Tempo total: ${(summary.tempoExecucaoMs / 1000).toFixed(2)}s`);
    console.log(`Total: ${summary.totalEmpresas}`);
    console.log(`Conformes: ${summary.conformes}`);
    console.log(`Divergentes: ${summary.divergentes}`);
    console.log(`Pendentes: ${summary.pendentes}`);
    console.log(`Sem DCTFWeb: ${summary.semDctfweb}`);
    console.log(`Erros: ${summary.erros}`);

    // Exportar Excel se solicitado
    const exportPath = values.export || `conferencia_${competencia.replace("-", "_")}.xlsx`;
    console.log(`\nGerando relatório Excel em: ${exportPath}...`);
    const exporter = new ExcelExporter();
    const excelBuffer = await exporter.generateReport(summary);
    writeFileSync(resolve(process.cwd(), exportPath), excelBuffer);
    console.log(`Relatório Excel salvo com sucesso! (${excelBuffer.length} bytes)`);
  }
}

// Se executado diretamente via CLI
if (import.meta.main) {
  runCli().catch((err) => {
    console.error("\nErro fatal na execução da CLI:", err);
    process.exit(1);
  });
}
