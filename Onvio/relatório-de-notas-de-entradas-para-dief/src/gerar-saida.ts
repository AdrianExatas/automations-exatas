import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { COLUNAS_SAIDA, linhaSaidaParaArray } from "./transformar";
import { LinhaSaida } from "./types";

const NOME_ABA_RELATORIO = "RelatorioNotas";
const NOME_TEMPLATE = "ENTRADAS - tratada.xls";
const LINHA_INICIO_DADOS = 2;
const TOTAL_COLUNAS = 12;

function caminhoTemplate(): string {
  return path.join(__dirname, "..", "assets", NOME_TEMPLATE);
}

function criarTemplatePadrao(): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const relatorio = XLSX.utils.aoa_to_sheet([[], [...COLUNAS_SAIDA]]);
  const finalidades = XLSX.utils.aoa_to_sheet([["Finalidade"]]);

  XLSX.utils.book_append_sheet(workbook, relatorio, NOME_ABA_RELATORIO);
  XLSX.utils.book_append_sheet(workbook, finalidades, "Lista de finalidades");
  return workbook;
}

export function caminhoSaidaParaEntrada(inputPath: string): string {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);

  if (base.toLowerCase().endsWith(" - tratada")) {
    return path.join(dir, `${base}${ext || ".xls"}`);
  }

  return path.join(dir, `${base} - tratada${ext || ".xls"}`);
}

function limparDadosRelatorioNotas(sheet: XLSX.WorkSheet): void {
  const ref = sheet["!ref"];
  if (!ref) return;

  const range = XLSX.utils.decode_range(ref);
  for (let r = LINHA_INICIO_DADOS; r <= range.e.r; r++) {
    for (let c = 0; c < TOTAL_COLUNAS; c++) {
      delete sheet[XLSX.utils.encode_cell({ r, c })];
    }
  }
}

function escreverLinhasNoRelatorio(sheet: XLSX.WorkSheet, linhas: LinhaSaida[]): void {
  linhas.forEach((linha, index) => {
    const rowIndex = LINHA_INICIO_DADOS + index;
    const valores = linhaSaidaParaArray(linha);

    valores.forEach((valor, colIndex) => {
      const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      if (valor === "" || valor === null || valor === undefined) {
        delete sheet[addr];
        return;
      }
      sheet[addr] = { t: typeof valor === "number" ? "n" : "s", v: valor };
    });
  });

  const lastRow = LINHA_INICIO_DADOS + linhas.length - 1;
  sheet["!ref"] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: Math.max(lastRow, 1), c: TOTAL_COLUNAS - 1 }
  );
}

export function gerarPlanilhaSaida(inputPath: string, linhas: LinhaSaida[]): string {
  const templatePath = caminhoTemplate();
  const workbook = fs.existsSync(templatePath) ? XLSX.readFile(templatePath) : criarTemplatePadrao();
  const sheet = workbook.Sheets[NOME_ABA_RELATORIO];
  if (!sheet) {
    throw new Error(`Aba "${NOME_ABA_RELATORIO}" nao encontrada no template.`);
  }

  limparDadosRelatorioNotas(sheet);
  escreverLinhasNoRelatorio(sheet, linhas);

  const outputPath = caminhoSaidaParaEntrada(inputPath);
  if (fs.existsSync(outputPath)) {
    console.log(`Sobrescrevendo: ${outputPath}`);
  }

  XLSX.writeFile(workbook, outputPath);
  return outputPath;
}
