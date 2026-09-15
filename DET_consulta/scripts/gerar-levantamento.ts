import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { fetchActiveDominioCompanies, normalizeDocument } from "../src/dominio.js";
import type { CompanyResult, RunReport } from "../src/types.js";
import { loadConfig } from "../src/config.js";

async function main() {
  console.log("=== GERANDO LEVANTAMENTO DOMÍNIO X SPE/DTE ===");

  const config = await loadConfig();
  console.log("Conectando ao banco Domínio...");
  const dominioResult = await fetchActiveDominioCompanies(config);
  console.log(`Domínio: ${dominioResult.companies.length} empresas ativas encontradas.`);

  // Também buscar todas as empresas cadastradas no Domínio (inclusive inativas) para saber o status das 86 do SPE
  const odbc = await import("odbc");
  const connectionString = `DSN=${config.dominioDsn};UID=${config.dominioUser};PWD=${config.dominioPassword || ""};`;
  const conn = await odbc.connect(connectionString);
  const allDomRows = (await conn.query(`
    SELECT codi_emp AS CODI_EMP, TRIM(cgce_emp) AS CGC_EMP, TRIM(COALESCE(razao_emp, nome_emp)) AS RAZAO_EMP, stat_emp AS STAT_EMP
    FROM bethadba.geempre
    WHERE cgce_emp IS NOT NULL AND TRIM(cgce_emp) <> ''
  `)) as Array<{ CODI_EMP: number; CGC_EMP: string; RAZAO_EMP: string; STAT_EMP: string }>;
  await conn.close();

  const dominioAllMap = new Map<string, { codiEmp: number; cnpj: string; corporateName: string; statEmp: string }>();
  for (const r of allDomRows) {
    const doc = normalizeDocument(r.CGC_EMP);
    if (doc) {
      dominioAllMap.set(doc, {
        codiEmp: Number(r.CODI_EMP),
        cnpj: doc,
        corporateName: (r.RAZAO_EMP || "").trim(),
        statEmp: (r.STAT_EMP || "").trim(),
      });
    }
  }

  // Carregar execução recente do SPE
  const execPath = path.resolve("output/2026-09-15_09-48-25_melhorado/execucao.json");
  const execData: RunReport = JSON.parse(await Bun.file(execPath).text());
  const speCompanies = execData.companies || [];
  console.log(`SPE: ${speCompanies.length} empresas carregadas da última execução.`);

  const speMap = new Map<string, CompanyResult>();
  for (const c of speCompanies) {
    const doc = normalizeDocument(c.cnpj);
    speMap.set(doc, c);
  }

  // Cruzamentos
  // 1. Ativas Domínio SEM Procuração
  const ativasSemProcuracao: Array<{
    codiEmp: number;
    cnpj: string;
    cnpjFormatado: string;
    corporateName: string;
    statusDominio: string;
    acao: string;
  }> = [];

  for (const dom of dominioResult.companies) {
    if (!speMap.has(dom.cnpj)) {
      ativasSemProcuracao.push({
        codiEmp: dom.codiEmp,
        cnpj: dom.cnpj,
        cnpjFormatado: formatCnpj(dom.cnpj),
        corporateName: dom.corporateName,
        statusDominio: "Ativa",
        acao: "Solicitar procuração eletrônica no SPE/DTE",
      });
    }
  }
  ativasSemProcuracao.sort((a, b) => a.codiEmp - b.codiEmp);

  // 2. Ativas Domínio COM Procuração
  const ativasComProcuracao: Array<{
    codiEmp: number;
    cnpj: string;
    cnpjFormatado: string;
    corporateName: string;
    procurationStatus: string;
    totalMensagens: number;
    naoLidas: number | string;
    statusDte: string;
  }> = [];

  for (const dom of dominioResult.companies) {
    const spe = speMap.get(dom.cnpj);
    if (spe) {
      ativasComProcuracao.push({
        codiEmp: dom.codiEmp,
        cnpj: dom.cnpj,
        cnpjFormatado: formatCnpj(dom.cnpj),
        corporateName: dom.corporateName,
        procurationStatus: spe.procurationStatus,
        totalMensagens: spe.totalMessages,
        naoLidas: spe.unreadMessages ?? 0,
        statusDte: spe.status,
      });
    }
  }
  ativasComProcuracao.sort((a, b) => a.codiEmp - b.codiEmp);

  // 3. No SPE mas Inativas ou Não Encontradas na Domínio
  const speSemDominioAtivo: Array<{
    codiEmp: number | string;
    cnpj: string;
    cnpjFormatado: string;
    corporateNameSpe: string;
    corporateNameDominio: string;
    statusDominio: string;
    totalMensagens: number;
    naoLidas: number | string;
    acao: string;
  }> = [];

  for (const spe of speCompanies) {
    const doc = normalizeDocument(spe.cnpj);
    if (!dominioResult.activeCnpjs.has(doc)) {
      const domRecord = dominioAllMap.get(doc);
      speSemDominioAtivo.push({
        codiEmp: domRecord ? domRecord.codiEmp : "N/C",
        cnpj: doc,
        cnpjFormatado: formatCnpj(doc),
        corporateNameSpe: spe.corporateName,
        corporateNameDominio: domRecord ? domRecord.corporateName : "Não cadastrada na Domínio",
        statusDominio: domRecord ? (domRecord.statEmp === "I" ? "Inativa na Domínio" : `Outro (${domRecord.statEmp})`) : "Não Cadastrada",
        totalMensagens: spe.totalMessages,
        naoLidas: spe.unreadMessages ?? 0,
        acao: "Ignorar nas consultas DTE / Avaliar revogação no SPE",
      });
    }
  }
  speSemDominioAtivo.sort((a, b) => String(a.codiEmp).localeCompare(String(b.codiEmp), undefined, { numeric: true }));

  console.log(`Resultados do Levantamento:`);
  console.log(`- Ativas na Domínio SEM procuração no SPE: ${ativasSemProcuracao.length}`);
  console.log(`- Ativas na Domínio COM procuração no SPE: ${ativasComProcuracao.length}`);
  console.log(`- No SPE mas Inativas/Não Domínio: ${speSemDominioAtivo.length}`);

  // Exportar para XLSX e CSV
  const outDir = path.resolve("output");
  await mkdir(outDir, { recursive: true });
  const xlsxPath = path.join(outDir, "levantamento_empresas_dominio_x_spe.xlsx");
  const csvSemProcPath = path.join(outDir, "empresas_ativas_sem_procuracao.csv");
  const csvComProcPath = path.join(outDir, "empresas_ativas_com_procuracao.csv");

  // Salvar CSVs
  const csvSemProc = [
    "CODIGO_DOMINIO;CNPJ;CNPJ_FORMATADO;RAZAO_SOCIAL;STATUS_DOMINIO;ACAO_NECESSARIA",
    ...ativasSemProcuracao.map(
      (e) => `${e.codiEmp};"${e.cnpj}";"${e.cnpjFormatado}";"${e.corporateName}";"${e.statusDominio}";"${e.acao}"`
    ),
  ].join("\r\n");
  await writeFile(csvSemProcPath, `\uFEFF${csvSemProc}\r\n`, "utf8");

  const csvComProc = [
    "CODIGO_DOMINIO;CNPJ;CNPJ_FORMATADO;RAZAO_SOCIAL;SITUACAO_PROCURACAO;TOTAL_MENSAGENS;NAO_LIDAS;STATUS_DTE",
    ...ativasComProcuracao.map(
      (e) => `${e.codiEmp};"${e.cnpj}";"${e.cnpjFormatado}";"${e.corporateName}";"${e.procurationStatus}";${e.totalMensagens};${e.naoLidas};"${e.statusDte}"`
    ),
  ].join("\r\n");
  await writeFile(csvComProcPath, `\uFEFF${csvComProc}\r\n`, "utf8");

  // Criar Workbook Excel Rico
  const wb = new ExcelJS.Workbook();
  wb.creator = "Exatas Contabilidade - Automação DTE";
  wb.created = new Date();

  // Aba 1: Painel Resumo
  const sheetDash = wb.addWorksheet("Resumo_Geral");
  sheetDash.views = [{ state: "frozen", ySplit: 3 }];
  sheetDash.mergeCells("A1:F1");
  sheetDash.getCell("A1").value = "Levantamento de Procurações SPE x Empresas Ativas Domínio";
  sheetDash.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheetDash.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1351B4" } };
  sheetDash.getCell("A1").alignment = { vertical: "middle" };
  sheetDash.getRow(1).height = 30;

  sheetDash.mergeCells("A2:F2");
  sheetDash.getCell("A2").value = `Posição atualizada em ${new Date().toLocaleString("pt-BR")} | Base Domínio (Contabil Oficial) cruzada com SPE Gov.br`;
  sheetDash.getCell("A2").alignment = { vertical: "middle" };
  sheetDash.getCell("A2").font = { italic: true, color: { argb: "FF333333" } };
  sheetDash.getRow(2).height = 24;

  const kpis: Array<[string, number | string, string]> = [
    ["Total de Empresas Ativas na Domínio", dominioResult.companies.length, "Cadastros em bethadba.geempre com stat_emp = 'A'"],
    ["Empresas Ativas COM Procuração no SPE", ativasComProcuracao.length, "Empresas ativas cobertas pelo robô DTE"],
    ["Empresas Ativas SEM Procuração no SPE", ativasSemProcuracao.length, "URGENTE: Necessitam de solicitação/outorga de procuração"],
    ["Percentual de Cobertura de Procuração", `${((ativasComProcuracao.length / dominioResult.companies.length) * 100).toFixed(1)}%`, "Proporção de empresas ativas atendidas pelo SPE"],
    ["Empresas no SPE Inativas ou Fora da Domínio", speSemDominioAtivo.length, "Consultas eliminadas pelo novo filtro inteligente"],
  ];

  sheetDash.getCell("A4").value = "INDICADOR ESTRATÉGICO";
  sheetDash.getCell("B4").value = "QUANTIDADE";
  sheetDash.getCell("C4").value = "DETALHES / IMPACTO";
  ["A4", "B4", "C4"].forEach((addr) => {
    const c = sheetDash.getCell(addr);
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1351B4" } };
    c.alignment = { vertical: "middle" };
  });

  kpis.forEach(([label, val, desc], idx) => {
    const rowNum = idx + 5;
    sheetDash.getCell(rowNum, 1).value = label;
    sheetDash.getCell(rowNum, 2).value = val;
    sheetDash.getCell(rowNum, 3).value = desc;

    if (label.includes("SEM Procuração")) {
      sheetDash.getCell(rowNum, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE5CD" } };
      sheetDash.getCell(rowNum, 2).font = { bold: true, color: { argb: "FFB45F06" } };
    }
  });

  sheetDash.columns = [{ width: 44 }, { width: 18 }, { width: 60 }];

  // Aba 2: Ativas Sem Procuração
  addSheetWithStyle(
    wb,
    "Ativas_SEM_Procuracao",
    ativasSemProcuracao,
    [
      { key: "codiEmp", header: "CÓDIGO DOMÍNIO", width: 18 },
      { key: "cnpjFormatado", header: "CNPJ", width: 22 },
      { key: "cnpj", header: "CNPJ (APENAS NÚMEROS)", width: 22 },
      { key: "corporateName", header: "RAZÃO SOCIAL / NOME", width: 50 },
      { key: "statusDominio", header: "SITUAÇÃO DOMÍNIO", width: 20 },
      { key: "acao", header: "AÇÃO RECOMENDADA", width: 40 },
    ],
    "FFF8D7DA"
  );

  // Aba 3: Ativas Com Procuração
  addSheetWithStyle(
    wb,
    "Ativas_COM_Procuracao",
    ativasComProcuracao,
    [
      { key: "codiEmp", header: "CÓDIGO DOMÍNIO", width: 18 },
      { key: "cnpjFormatado", header: "CNPJ", width: 22 },
      { key: "cnpj", header: "CNPJ (APENAS NÚMEROS)", width: 22 },
      { key: "corporateName", header: "RAZÃO SOCIAL / NOME", width: 50 },
      { key: "procurationStatus", header: "SITUAÇÃO SPE", width: 18 },
      { key: "totalMensagens", header: "TOTAL MENSAGENS", width: 18 },
      { key: "naoLidas", header: "NÃO LIDAS", width: 16 },
      { key: "statusDte", header: "STATUS CONSULTA", width: 18 },
    ],
    "FFD9EAD3"
  );

  // Aba 4: SPE Inativas ou Não Domínio
  addSheetWithStyle(
    wb,
    "SPE_Inativas_ou_Nao_Dominio",
    speSemDominioAtivo,
    [
      { key: "codiEmp", header: "CÓDIGO DOMÍNIO", width: 18 },
      { key: "cnpjFormatado", header: "CNPJ", width: 22 },
      { key: "cnpj", header: "CNPJ (APENAS NÚMEROS)", width: 22 },
      { key: "corporateNameSpe", header: "RAZÃO SOCIAL NO SPE", width: 45 },
      { key: "corporateNameDominio", header: "CADASTRO NO DOMÍNIO", width: 45 },
      { key: "statusDominio", header: "STATUS NO DOMÍNIO", width: 24 },
      { key: "totalMensagens", header: "TOTAL MENSAGENS", width: 18 },
      { key: "naoLidas", header: "NÃO LIDAS", width: 16 },
      { key: "acao", header: "AÇÃO AUTOMÁTICA", width: 40 },
    ],
    "FFF3F3F3"
  );

  await wb.xlsx.writeFile(xlsxPath);
  console.log(`Planilha gerada com sucesso em: ${xlsxPath}`);
  console.log(`CSV Ativas Sem Procuração gerado em: ${csvSemProcPath}`);
  console.log(`CSV Ativas Com Procuração gerado em: ${csvComProcPath}`);
}

function formatCnpj(doc: string): string {
  if (doc.length === 14) {
    return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
  }
  if (doc.length === 11) {
    return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`;
  }
  return doc;
}

function addSheetWithStyle(
  wb: ExcelJS.Workbook,
  name: string,
  data: any[],
  columns: Array<{ key: string; header: string; width: number }>,
  accentColor: string
) {
  const sheet = wb.addWorksheet(name);
  sheet.columns = columns.map((c) => ({ key: c.key, header: c.header, width: c.width }));
  data.forEach((row) => sheet.addRow(row));

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).height = 26;
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1351B4" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "middle" };
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accentColor } };
      });
    }
  });
}

main().catch(console.error);
