import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { FilterFields, NotaFiscal, NotaPage } from "./types";

type NodeSet = Cheerio<AnyNode>;

export function parseViewState(html: string | Buffer): string {
  const $ = cheerio.load(html.toString());
  const value = $('input[name="javax.faces.ViewState"]').first().attr("value")?.trim() ?? "";
  if (!value) {
    throw new Error("Nao foi possivel localizar javax.faces.ViewState.");
  }
  return value;
}

export function parseFilterFields(html: string | Buffer, viewState?: string): FilterFields {
  const $ = cheerio.load(html.toString());
  const form = $("#form_conteudo").first().length
    ? $("#form_conteudo").first()
    : $('form[name="form_conteudo"]').first();
  if (!form.length) {
    throw new Error("Formulario form_conteudo nao encontrado.");
  }

  const dateInputs = form
    .find("input")
    .filter((_, el) => attr($(el), "type") === "text" && classes($(el)).includes("rich-calendar-input"))
    .toArray();
  if (dateInputs.length < 2) {
    throw new Error("Campos de data do filtro nao encontrados.");
  }

  const pesquisa = nameOrFail(
    form.find("input").filter((_, el) => name($(el)).endsWith(":pesquisa")).first(),
    "campo pesquisa",
  );
  const startDate = nameOrFail($(dateInputs[0]), "data inicial");
  const endDate = nameOrFail($(dateInputs[1]), "data final");
  const startCurrentMonth = nameOrFail(findByName($, form, startDate.replace("InputDate", "InputCurrentDate")), "mes atual inicial");
  const endCurrentMonth = nameOrFail(findByName($, form, endDate.replace("InputDate", "InputCurrentDate")), "mes atual final");

  const textInputs = form
    .find("input")
    .filter((_, el) => {
      const input = $(el);
      const inputName = name(input);
      return (
        attr(input, "type") === "text" &&
        inputName !== pesquisa &&
        inputName !== startDate &&
        inputName !== endDate &&
        !classes(input).includes("rich-calendar-input")
      );
    });
  if (!textInputs.length) {
    throw new Error("Campo de exercicio nao encontrado.");
  }

  const status = nameOrFail(form.find('input[type="radio"][value="F"]').first(), "status finalizada");
  const formMarker = nameOrFail(form.find('input[name="form_conteudo"]').first(), "marcador do formulario");
  const autoScroll = nameOrFail(form.find('input[name="autoScroll"]').first(), "autoScroll");
  const submit = form
    .find("a")
    .filter((_, el) => {
      const link = $(el);
      return name(link).endsWith(":lupa") || (link.attr("id") ?? "").endsWith(":lupa");
    })
    .first();
  const submitName = nameOrFail(submit, "botao de pesquisa");

  return {
    pesquisa,
    startDate,
    startCurrentMonth,
    endDate,
    endCurrentMonth,
    exercise: nameOrFail(textInputs.first(), "exercicio"),
    status,
    formMarker,
    autoScroll,
    viewState: viewState ?? parseViewState(html),
    submitName,
  };
}

export function parseNotaPage(html: string | Buffer, fallbackViewState = ""): NotaPage {
  const $ = cheerio.load(html.toString());
  const table = findNotesTable($);
  if (!table.length) {
    return {
      tableId: "",
      currentPage: 1,
      pageLinks: new Set([1]),
      hasNext: false,
      notas: [],
      viewState: readViewStateOrFallback(html, fallbackViewState),
    };
  }

  const tableId = table.attr("id") ?? "";
  const columns = headerColumns($, table);
  const required = {
    codigo: findHeader(columns, "codigo"),
    numero: findHeader(columns, "numero"),
    exercicio: findHeader(columns, "exercicio"),
    contribuinte: findHeader(columns, "contribuinte"),
    destinatario: findHeader(columns, "destinatario"),
    emissao: findHeader(columns, "data de emissao"),
    total: findHeader(columns, "total"),
    xml: findHeader(columns, "xml"),
  };

  const tbody = table.find("tbody").filter((_, el) => (($(el).attr("id") ?? "").endsWith(":tb"))).first();
  const rows = (tbody.length ? tbody : table.find("tbody").first()).children("tr");
  const notas: NotaFiscal[] = [];

  rows.each((_, rowEl) => {
    const row = $(rowEl);
    const xmlCell = cellBySuffix($, row, required.xml);
    const xmlActionName = extractXmlActionName($, xmlCell);
    if (!xmlActionName) {
      return;
    }

    notas.push({
      codigo: cellText($, row, required.codigo),
      numero: cellText($, row, required.numero),
      exercicio: cellText($, row, required.exercicio),
      contribuinte: cellText($, row, required.contribuinte),
      destinatario: cellText($, row, required.destinatario),
      emissao: cellText($, row, required.emissao),
      total: cellText($, row, required.total),
      xmlActionName,
    });
  });

  return {
    tableId,
    currentPage: parseCurrentPage($, table),
    pageLinks: parsePageLinks($, table),
    hasNext: parseHasNext($, table),
    notas,
    viewState: readViewStateOrFallback(html, fallbackViewState),
  };
}

function findNotesTable($: CheerioAPI): NodeSet {
  const tables = $("table").toArray();
  const found = tables.find((table) => {
    const headers = $(table)
      .find("th")
      .map((_, th) => normalizeText($(th).text()))
      .toArray();
    return headers.includes("numero") && headers.includes("xml") && headers.includes("data de emissao");
  });
  return found ? $(found) : $();
}

function headerColumns($: CheerioAPI, table: NodeSet): Record<string, string> {
  const columns: Record<string, string> = {};
  table.find("th").each((_, th) => {
    const text = normalizeText($(th).text());
    const thId = $(th).attr("id") ?? "";
    const match = /:(j_id\d+)header$/.exec(thId);
    if (text && match?.[1]) {
      columns[text] = match[1];
    }
  });
  return columns;
}

function findHeader(columns: Record<string, string>, header: string): string {
  const normalized = normalizeText(header);
  const value = columns[normalized];
  if (!value) {
    throw new Error(`Coluna obrigatoria nao encontrada: ${header}.`);
  }
  return value;
}

function cellBySuffix($: CheerioAPI, row: NodeSet, suffix: string): NodeSet {
  const found = row.children("td").toArray().find((cell) => (($(cell).attr("id") ?? "").endsWith(`:${suffix}`)));
  return found ? $(found) : $();
}

function cellText($: CheerioAPI, row: NodeSet, suffix: string): string {
  return cellBySuffix($, row, suffix).text().replace(/\s+/g, " ").trim();
}

function extractXmlActionName($: CheerioAPI, cell: NodeSet): string {
  const onclick = cell.find("a[onclick]").first().attr("onclick") ?? "";
  const match = /jsfcljs\(document\.forms\['form_conteudo'\],'([^,']+),\1'/.exec(onclick);
  return match?.[1] ?? "";
}

function parseCurrentPage($: CheerioAPI, table: NodeSet): number {
  const active = table.find(".rich-datascr-act").first().text().trim();
  return /^\d+$/.test(active) ? Number(active) : 1;
}

function parsePageLinks($: CheerioAPI, table: NodeSet): Set<number> {
  const pages = new Set<number>();
  table.find('[class*="rich-datascr"]').each((_, cell) => {
    const text = $(cell).text().trim();
    if (/^\d+$/.test(text)) {
      pages.add(Number(text));
    }
  });
  pages.add(parseCurrentPage($, table));
  return pages;
}

function parseHasNext($: CheerioAPI, table: NodeSet): boolean {
  return table
    .find("[onclick]")
    .toArray()
    .some((cell) => {
      const item = $(cell);
      return (item.attr("onclick") ?? "").includes("'page': 'next'") && !classes(item).includes("rich-datascr-button-dsbld");
    });
}

function readViewStateOrFallback(html: string | Buffer, fallback: string): string {
  try {
    return parseViewState(html);
  } catch {
    return fallback;
  }
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findByName($: CheerioAPI, parent: NodeSet, expectedName: string): NodeSet {
  return parent.find("input").filter((_, el) => name($(el)) === expectedName).first();
}

function name(tag: NodeSet): string {
  return tag.attr("name") ?? tag.attr("id") ?? "";
}

function nameOrFail(tag: NodeSet, label: string): string {
  const value = name(tag);
  if (!value) {
    throw new Error(`Nao foi possivel localizar ${label}.`);
  }
  return value;
}

function attr(tag: NodeSet, attrName: string): string {
  return (tag.attr(attrName) ?? "").toLowerCase();
}

function classes(tag: NodeSet): string {
  return tag.attr("class") ?? "";
}
