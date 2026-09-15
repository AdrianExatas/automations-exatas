/**
 * Levantamento somente leitura: cruza Particularidades (DATA DE PAGAMENTO FOLHA)
 * com as tarefas Gestta FOLHA DE PAGAMENTO GERAL - GRUPO 1/2 (inclui VIA WHATSAPP).
 *
 *   npx ts-node scripts/levantamento-folha-grupo-particularidades.ts
 *   npx ts-node scripts/levantamento-folha-grupo-particularidades.ts --dir "C:\\path\\Particularidades"
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import { listarTarefasRecorrentes } from "../src/endpoints";
import {
  ClassificacaoEmpresa,
  DEFAULT_PARTICULARIDADES_DIR,
  LinkAtual,
  REQUIRED_TASK_NAMES,
  TARGET_NAMES,
  TargetTaskName,
  contarStatus,
  emptySheet,
  findTaskByNameOptional,
  findUniqueTaskByName,
  getArgValue,
  indexarClientes,
  lerParticularidades,
  listarClientes,
  montarPlano,
  snapshotLinks,
} from "./lib/folha-grupo-particularidades";

function parseArgs(argv: string[]): { dirPath: string; reportsDir: string } {
  return {
    dirPath: path.resolve(
      getArgValue(argv, "--dir") || DEFAULT_PARTICULARIDADES_DIR,
    ),
    reportsDir: path.resolve(
      getArgValue(argv, "--reports-dir") ||
        path.join(__dirname, "..", "..", "relatorios"),
    ),
  };
}

function writeWorkbook(
  filePath: string,
  mapa: ReturnType<typeof lerParticularidades>["empresas"],
  classificacoes: ClassificacaoEmpresa[],
  currentLinks: LinkAtual[],
  customerIds: Set<string>,
): void {
  const mapaSheet = mapa.map((row) => ({
    Arquivo: row.origemArquivo,
    "Código planilha": row.codigoPlanilha,
    Empresa: row.nomePlanilha,
    CNPJ: row.documento,
    "Responsável interno": row.responsavelPlanilha,
    "DATA DE PAGAMENTO FOLHA": row.grupoBruto,
    Grupo: row.grupoPlanilha ?? "",
  }));

  const statusSheet = classificacoes.map((row) => ({
    Arquivo: row.origemArquivo,
    "Código planilha": row.codigoPlanilha,
    "Código Gestta": row.codigoGestta ?? "",
    "Nome planilha": row.nomePlanilha,
    "Nome Gestta": row.nomeGestta ?? "",
    CNPJ: row.documento,
    "Grupo planilha": row.grupoPlanilha ?? "",
    "Grupo Gestta": row.grupoGestta,
    Status: row.status,
    Detalhe: row.detalhe,
    "Tarefas atuais": row.tarefasAtuais.join(" | "),
    "Ativo Gestta":
      row.ativoGestta == null ? "" : row.ativoGestta ? "sim" : "não",
    "Customer ID": row.customerId ?? "",
  }));

  const vinculos = currentLinks
    .filter(
      (link) =>
        customerIds.has(link.customerId) ||
        classificacoes.some(
          (item) =>
            item.documento &&
            item.documento.replace(/\D/g, "") === link.cnpjDigits,
        ),
    )
    .map((link) => ({
      Tarefa: link.taskName,
      Grupo: link.grupo,
      "Via WhatsApp": link.viaWhatsapp ? "sim" : "não",
      Código: link.customerCode,
      Empresa: link.customerName,
      CNPJ: link.cnpj,
      Responsável: link.companyUserName ?? "",
      "ID vínculo": link.linkId,
      "Customer ID": link.customerId,
    }));

  const problemas = classificacoes.filter((row) =>
    ["ambos_grupos", "grupo_errado", "sem_tarefa", "conflito_planilha"].includes(
      row.status,
    ),
  );
  const semGrupo = classificacoes.filter(
    (row) => row.status === "grupo_vazio_planilha",
  );
  const naoResolvidas = classificacoes.filter((row) =>
    ["nao_encontrada", "ambiguo"].includes(row.status),
  );

  const contagem = contarStatus(classificacoes);
  const resumo = [
    { Item: "Empresas na planilha", Qtd: mapa.length },
    { Item: "GRUPO 1 na planilha", Qtd: mapa.filter((i) => i.grupoPlanilha === "GRUPO 1").length },
    { Item: "GRUPO 2 na planilha", Qtd: mapa.filter((i) => i.grupoPlanilha === "GRUPO 2").length },
    { Item: "Sem grupo na planilha", Qtd: mapa.filter((i) => !i.grupoPlanilha).length },
    ...Object.entries(contagem).map(([status, qtd]) => ({
      Item: `Status ${status}`,
      Qtd: qtd,
    })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      mapaSheet.length > 0 ? mapaSheet : emptySheet(["Arquivo", "Empresa"]),
    ),
    "Mapa planilha",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      statusSheet.length > 0
        ? statusSheet
        : emptySheet(["Código planilha", "Status"]),
    ),
    "Status empresas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      vinculos.length > 0 ? vinculos : emptySheet(["Tarefa", "Empresa", "CNPJ"]),
    ),
    "Vinculos atuais",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      problemas.length > 0
        ? problemas.map((row) => ({
            Status: row.status,
            "Código planilha": row.codigoPlanilha,
            Empresa: row.nomeGestta || row.nomePlanilha,
            CNPJ: row.documento,
            "Grupo planilha": row.grupoPlanilha ?? "",
            "Grupo Gestta": row.grupoGestta,
            Detalhe: row.detalhe,
            "Tarefas atuais": row.tarefasAtuais.join(" | "),
          }))
        : emptySheet(["Status", "Empresa", "Detalhe"]),
    ),
    "Corrigir",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      semGrupo.length > 0
        ? semGrupo.map((row) => ({
            Arquivo: row.origemArquivo,
            "Código planilha": row.codigoPlanilha,
            Empresa: row.nomePlanilha,
            CNPJ: row.documento,
            Detalhe: row.detalhe,
          }))
        : emptySheet(["Código planilha", "Empresa"]),
    ),
    "Sem grupo",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      naoResolvidas.length > 0
        ? naoResolvidas.map((row) => ({
            Status: row.status,
            "Código planilha": row.codigoPlanilha,
            Empresa: row.nomePlanilha,
            CNPJ: row.documento,
            Detalhe: row.detalhe,
          }))
        : emptySheet(["Código planilha", "Empresa", "Status"]),
    ),
    "Nao resolvidas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(resumo),
    "Resumo",
  );
  XLSX.writeFile(workbook, filePath);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.reportsDir, { recursive: true });

  console.log(`[folha-grupo] pasta=${args.dirPath}`);
  const parsed = lerParticularidades(args.dirPath);
  for (const aviso of parsed.avisos) console.warn(`[folha-grupo] aviso: ${aviso}`);
  console.log(
    `[folha-grupo] arquivos=${parsed.arquivos.length} empresas=${parsed.empresas.length} g1=${
      parsed.empresas.filter((item) => item.grupoPlanilha === "GRUPO 1").length
    } g2=${
      parsed.empresas.filter((item) => item.grupoPlanilha === "GRUPO 2").length
    } vazio=${parsed.empresas.filter((item) => !item.grupoPlanilha).length}`,
  );

  const client = createGesttaClient(getJwt());
  console.log("[folha-grupo] carregando clientes...");
  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const indexes = indexarClientes([...ativos, ...inativos]);

  console.log("[folha-grupo] carregando modelos recorrentes...");
  const allTasks = await listarTarefasRecorrentes(client);
  const tasks: Partial<Record<TargetTaskName, ReturnType<typeof findUniqueTaskByName>>> =
    {};
  for (const name of REQUIRED_TASK_NAMES) {
    tasks[name] = findUniqueTaskByName(allTasks, name);
    console.log(`[folha-grupo] ${name} = ${tasks[name]!._id}`);
  }
  for (const name of TARGET_NAMES) {
    if (tasks[name]) continue;
    const found = findTaskByNameOptional(allTasks, name);
    if (found) {
      tasks[name] = found;
      console.log(`[folha-grupo] ${name} = ${found._id}`);
    } else {
      console.warn(`[folha-grupo] modelo opcional ausente: ${name}`);
    }
  }

  const currentLinks = await snapshotLinks(client, tasks, indexes);
  const plano = montarPlano(parsed.empresas, indexes, tasks, currentLinks);
  const customerIds = new Set(
    plano.classificacoes
      .map((item) => item.customerId)
      .filter((id): id is string => Boolean(id)),
  );

  const dateStamp = new Date().toISOString().slice(0, 10);
  const baseName = `levantamento_folha_grupo_particularidades_${dateStamp}`;
  const excelOut = path.join(args.reportsDir, `${baseName}.xlsx`);
  const jsonOut = path.join(args.reportsDir, `${baseName}.json`);
  writeWorkbook(
    excelOut,
    parsed.empresas,
    plano.classificacoes,
    currentLinks,
    customerIds,
  );
  fs.writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceDir: args.dirPath,
        arquivos: parsed.arquivos,
        avisos: parsed.avisos,
        totalEmpresasPlanilha: parsed.empresas.length,
        status: contarStatus(plano.classificacoes),
        plano: {
          manter: plano.keeps.length,
          remover: plano.removals.length,
          adicionar: plano.additions.length,
        },
        empresas: parsed.empresas,
        classificacoes: plano.classificacoes,
        keeps: plano.keeps,
        removals: plano.removals,
        additions: plano.additions,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`[folha-grupo] Excel: ${excelOut}`);
  console.log(`[folha-grupo] JSON: ${jsonOut}`);
  console.log(
    `[folha-grupo] status=${JSON.stringify(contarStatus(plano.classificacoes))} manter=${plano.keeps.length} remover=${plano.removals.length} adicionar=${plano.additions.length}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
