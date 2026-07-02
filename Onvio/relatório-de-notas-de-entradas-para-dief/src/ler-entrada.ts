import * as XLSX from "xlsx";
import {
  COLUNAS_ENTRADA_OBRIGATORIAS,
  LinhaEntrada,
  PlanilhaEntradaError,
} from "./types";

const NOME_ABA_PREFERIDA = "RelatorioNotas";

const MARCADORES_CABECALHO = ["chave acesso", "uf emit."];

export function normalizarNomeColuna(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

function linhaTemMarcadorCabecalho(cells: unknown[]): boolean {
  const normalizados = cells.map((cell) => normalizarNomeColuna(String(cell ?? "")));
  return MARCADORES_CABECALHO.some((marcador) => normalizados.includes(marcador));
}

function linhaVazia(cells: unknown[]): boolean {
  return cells.every((cell) => String(cell ?? "").trim() === "");
}

function obterAbaEntrada(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  const nomeAba =
    workbook.SheetNames.find(
      (name) => normalizarNomeColuna(name) === normalizarNomeColuna(NOME_ABA_PREFERIDA)
    ) ?? workbook.SheetNames[0];

  if (!nomeAba) {
    throw new PlanilhaEntradaError("Planilha sem abas.");
  }

  const sheet = workbook.Sheets[nomeAba];
  if (!sheet) {
    throw new PlanilhaEntradaError(`Aba "${nomeAba}" nao encontrada.`);
  }

  if (nomeAba !== NOME_ABA_PREFERIDA) {
    console.warn(`Aviso: aba "${NOME_ABA_PREFERIDA}" nao encontrada; usando "${nomeAba}".`);
  }

  return sheet;
}

function detectarLinhaCabecalho(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    if (linhaTemMarcadorCabecalho(rows[i])) return i;
  }
  throw new PlanilhaEntradaError(
    'Cabecalho nao encontrado. Esperado coluna "Chave Acesso" ou "UF Emit.".'
  );
}

function mapearCabecalhos(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const nome = String(cell ?? "").trim();
    if (!nome) return;
    map.set(normalizarNomeColuna(nome), index);
  });
  return map;
}

function validarColunasObrigatorias(headerMap: Map<string, number>): void {
  const faltantes = COLUNAS_ENTRADA_OBRIGATORIAS.filter(
    (coluna) => !headerMap.has(normalizarNomeColuna(coluna))
  );

  if (faltantes.length > 0) {
    throw new PlanilhaEntradaError(
      `Colunas obrigatorias ausentes: ${faltantes.join(", ")}.`
    );
  }
}

function extrairValorLinha(
  row: unknown[],
  headerMap: Map<string, number>,
  coluna: string
): unknown {
  const index = headerMap.get(normalizarNomeColuna(coluna));
  if (index === undefined) return "";
  return row[index] ?? "";
}

function formatarDataEmissao(valor: unknown): string {
  if (valor instanceof Date) {
    const dia = String(valor.getDate()).padStart(2, "0");
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const ano = valor.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  if (typeof valor === "number" && Number.isFinite(valor)) {
    const date = XLSX.SSF.parse_date_code(valor);
    if (date) {
      const dia = String(date.d).padStart(2, "0");
      const mes = String(date.m).padStart(2, "0");
      return `${dia}/${mes}/${date.y}`;
    }
  }

  return String(valor ?? "").trim();
}

function formatarValor(valor: unknown, coluna: string): string | number {
  if (coluna === "Data Emissao") return formatarDataEmissao(valor);
  if (coluna === "Valor N.F.") {
    const num = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
    return Number.isFinite(num) ? num : String(valor ?? "").trim();
  }
  return String(valor ?? "").trim();
}

export function lerPlanilhaEntrada(filePath: string): LinhaEntrada[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = obterAbaEntrada(workbook);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (rows.length === 0) {
    throw new PlanilhaEntradaError("Planilha vazia.");
  }

  const headerRowIndex = detectarLinhaCabecalho(rows);
  const headerMap = mapearCabecalhos(rows[headerRowIndex]);
  validarColunasObrigatorias(headerMap);

  const linhas: LinhaEntrada[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || linhaVazia(row)) continue;

    const linha: LinhaEntrada = {};
    for (const coluna of COLUNAS_ENTRADA_OBRIGATORIAS) {
      linha[coluna] = formatarValor(extrairValorLinha(row, headerMap, coluna), coluna);
    }
    linhas.push(linha);
  }

  if (linhas.length === 0) {
    throw new PlanilhaEntradaError("Nenhuma linha de dados encontrada apos o cabecalho.");
  }

  return linhas;
}
