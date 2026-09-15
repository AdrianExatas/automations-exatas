import { load, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { DownloadInfo, DownloadListingPage, HtmlForm } from "../types.js";

const redirectPatterns = [
  /location\.href\s*=\s*['"]([^'"]+)['"]/i,
  /window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i,
  /document\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/i,
];

function urlJoin(baseUrl: string, href: string): string {
  return new URL(href, baseUrl).toString();
}

function firstQueryValue(url: string, key: string, defaultValue = ""): string {
  return new URL(url).searchParams.get(key) ?? defaultValue;
}

function textOf($: CheerioAPI, element: Element): string {
  return $(element).text().replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function decodedUrlVariants(value: string): string[] {
  const variants = [value.replace(/&amp;/gi, "&")];
  for (let index = 0; index < 2; index += 1) {
    const current = variants[variants.length - 1];
    if (current == null) {
      break;
    }
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) {
        break;
      }
      variants.push(decoded);
    } catch {
      break;
    }
  }
  return variants;
}

function isNewRequestUrl(href: string): boolean {
  return decodedUrlVariants(href).some((variant) =>
    /(?:^|[?&;])transid\s*=\s*t10464(?:$|[&#;])/i.test(variant),
  );
}

function elementLabel($: CheerioAPI, element: Element): string {
  const root = $(element);
  const parts = [textOf($, element)];
  for (const attr of ["title", "alt", "value", "aria-label"]) {
    const value = root.attr(attr);
    if (value) {
      parts.push(value);
    }
  }
  root.find("[title],[alt],[value],[aria-label]").each((_, child) => {
    const childNode = $(child);
    for (const attr of ["title", "alt", "value", "aria-label"]) {
      const value = childNode.attr(attr);
      if (value) {
        parts.push(value);
      }
    }
  });
  return parts.join(" ");
}

function isNewRequestLabel(label: string): boolean {
  const normalized = normalizeSearchText(label);
  return /\bnov[oa]\b/.test(normalized) || normalized.includes("nova solicitacao");
}

export function parseJsRedirect(baseUrl: string, htmlText: string): string | undefined {
  for (const pattern of redirectPatterns) {
    const match = pattern.exec(htmlText);
    if (match?.[1]) {
      return urlJoin(baseUrl, match[1]);
    }
  }
  return undefined;
}

export function parsePortalMenuLink(baseUrl: string, htmlText: string, linkText: string): string | undefined {
  const $ = load(htmlText);
  const needle = linkText.toLowerCase();
  for (const element of $("a[href]").toArray()) {
    if (textOf($, element).toLowerCase().includes(needle)) {
      return urlJoin(baseUrl, $(element).attr("href") ?? "");
    }
  }
  return undefined;
}

export function parseLinkByPredicate(
  baseUrl: string,
  htmlText: string,
  predicate: ($: CheerioAPI, element: Element) => boolean,
): string | undefined {
  const $ = load(htmlText);
  for (const element of $("a[href]").toArray()) {
    if (predicate($, element)) {
      return urlJoin(baseUrl, $(element).attr("href") ?? "");
    }
  }
  return undefined;
}

export function firstValue(form: HtmlForm, name: string, defaultValue = ""): string {
  return form.fields[name]?.[0] ?? defaultValue;
}

export function formAsPayload(form: HtmlForm): Array<[string, string]> {
  const payload: Array<[string, string]> = [];
  for (const [name, values] of Object.entries(form.fields)) {
    for (const value of values) {
      payload.push([name, value]);
    }
  }
  return payload;
}

export function parseForm(baseUrl: string, pageUrl: string, htmlText: string, formName?: string): HtmlForm {
  const $ = load(htmlText);
  let target = formName ? $(`form[name="${formName}"]`).first() : undefined;
  if (!target?.length) {
    target = $("form")
      .filter((_, form) => $(form).find("input,select,textarea").length > 0)
      .first();
  }
  if (!target.length) {
    throw new Error("Nenhum formulario encontrado na pagina");
  }

  const fields: Record<string, string[]> = {};
  const selectOptions: Record<string, Record<string, string>> = {};
  const submitButtons: Record<string, string> = {};

  target.find("input,select,textarea").each((_, control) => {
    const node = $(control);
    const name = node.attr("name") || node.attr("id");
    if (!name) {
      return;
    }
    const tagName = control.tagName.toLowerCase();
    const inputType = (node.attr("type") ?? "").toLowerCase();

    if (tagName === "select") {
      const options: Record<string, string> = {};
      const selectedValues: string[] = [];
      node.find("option").each((__, option) => {
        const optionNode = $(option);
        const value = optionNode.attr("value") ?? "";
        const optionText = optionNode.text().replace(/\s+/g, " ").trim();
        options[optionText] = value;
        if (optionNode.attr("selected") !== undefined) {
          selectedValues.push(value);
        }
      });
      fields[name] = selectedValues.length ? selectedValues : [""];
      selectOptions[name] = options;
      return;
    }

    if (tagName === "textarea") {
      fields[name] = [node.text()];
      return;
    }

    if (inputType === "radio" || inputType === "checkbox") {
      if (node.attr("checked") !== undefined) {
        fields[name] = [...(fields[name] ?? []), node.attr("value") ?? "on"];
      }
      return;
    }

    const value = node.attr("value") ?? "";
    if (inputType === "submit") {
      submitButtons[name] = value;
      return;
    }
    fields[name] = [...(fields[name] ?? []), value];
  });

  const action = target.attr("action") || pageUrl;
  const method = ((target.attr("method") || "GET").toUpperCase() === "POST" ? "POST" : "GET") as "GET" | "POST";
  const title = $("p").first().text().replace(/\s+/g, " ").trim() || undefined;

  return {
    url: pageUrl,
    actionUrl: urlJoin(baseUrl, action),
    method,
    fields,
    selectOptions,
    submitButtons,
    title,
    rawHtml: htmlText,
  };
}

export function parseErrorMessage(htmlText: string): string | undefined {
  const $ = load(htmlText);
  const errorText = $(".fontMessageError").first().text().replace(/\s+/g, " ").trim();
  if (errorText) {
    return errorText;
  }

  const text = $.text().replace(/\s+/g, " ").trim();
  const lowered = text.toLowerCase();
  const markers = [
    "arquivo não foi localizado",
    "o arquivo não foi localizado",
    "nao foi localizado",
    "usuário ou senha inválidos",
    "usuario ou senha invalido",
  ];
  return markers.some((marker) => lowered.includes(marker)) ? text : undefined;
}

export function isSessionExpired(htmlText: string): boolean {
  const $ = load(htmlText);
  if ($('input[name="UserName"]').length && $('input[name="Password"]').length) {
    return true;
  }
  const text = $.text().replace(/\s+/g, " ").trim().toLowerCase();
  return htmlText.toLowerCase().includes("atoacessocontabilista") || text.includes("acesso rápido") || text.includes("acesso rapido");
}

export function parseDownloadListing(
  baseUrl: string,
  pageUrl: string,
  htmlText: string,
  readyOnly = false,
): DownloadListingPage {
  const $ = load(htmlText);
  const downloads: DownloadInfo[] = [];

  for (const element of $("a[href]").toArray()) {
    const href = $(element).attr("href") ?? "";
    if (!href.includes("process.jsp") || !href.includes("nmArquivo=")) {
      continue;
    }

    const absoluteUrl = urlJoin(baseUrl, href);
    let situacao = firstQueryValue(absoluteUrl, "dsSituacao");
    const row = $(element).parents("tr").first();
    const rowText = row.length ? row.text().replace(/\s+/g, " ").trim() : textOf($, element);

    if (!situacao && row.length) {
      const cells = row
        .find("td")
        .toArray()
        .map((cell) => $(cell).text().replace(/\s+/g, " ").trim());
      situacao = cells.find((cell) => /PRONTO|PROCESSANDO|NENHUM/i.test(cell)) ?? "";
    }

    if (readyOnly && !situacao.toUpperCase().includes("PRONTO")) {
      continue;
    }

    downloads.push({
      url: absoluteUrl,
      nmArquivo: firstQueryValue(absoluteUrl, "nmArquivo"),
      situacao,
      tipoDownload: firstQueryValue(absoluteUrl, "tdb_dsTipoDownload", "DESCONHECIDO") || "DESCONHECIDO",
      dtSolicitacao: firstQueryValue(absoluteUrl, "dtSolicitacao") || undefined,
      filePath: firstQueryValue(absoluteUrl, "FilePath") || undefined,
      rowText,
    });
  }

  const pageLinks: Record<number, string> = {};
  let currentPage: number | undefined;
  let nextPageUrl: string | undefined;
  let newRequestUrl: string | undefined;
  const linkCount = $("a[href]").length;

  const currentText = $("td.pgAtualNav b, font.fontPgAtualNav b").first().text().trim();
  if (/^\d+$/.test(currentText)) {
    currentPage = Number(currentText);
  }

  for (const element of $("a[href]").toArray()) {
    const text = textOf($, element);
    const href = $(element).attr("href") ?? "";
    const absoluteUrl = urlJoin(baseUrl, href);
    if (/^\d+$/.test(text)) {
      pageLinks[Number(text)] = absoluteUrl;
    } else if (text.includes("Próximo") || text.includes("Prximo") || absoluteUrl.includes("Próximo")) {
      nextPageUrl = absoluteUrl;
    }
    if (isNewRequestUrl(href) || isNewRequestLabel(elementLabel($, element))) {
      newRequestUrl = absoluteUrl;
    }
  }

  if (!newRequestUrl) {
    newRequestUrl = parseLinkByPredicate(
      baseUrl,
      htmlText,
      ($api, element) =>
        isNewRequestUrl($api(element).attr("href") ?? "") ||
        isNewRequestLabel(elementLabel($api, element)),
    );
  }

  return { url: pageUrl, currentPage, downloads, pageLinks, nextPageUrl, newRequestUrl, linkCount };
}

export function parseEmpresasDoFormulario(form: HtmlForm): Array<{ inscricao: string; nome: string }> {
  const empresas: Array<{ inscricao: string; nome: string }> = [];
  for (const [texto, valor] of Object.entries(form.selectOptions.cdPessoaContribuinte ?? {})) {
    const inscricao = valor.trim();
    const nome = texto.trim();
    if (!inscricao || !nome || nome.toLowerCase().startsWith("selecione")) {
      continue;
    }
    empresas.push({ inscricao, nome });
  }
  return empresas;
}

export function simplifyFormPayload(
  form: HtmlForm,
  overrides: Record<string, unknown>,
  submitName = "okButton",
): Array<[string, string]> {
  const consumedSingletons = new Set<string>();
  const result: Array<[string, string]> = [];
  const mutableOverrides = new Map(Object.entries(overrides));

  function nextOverrideValue(name: string, original: string): string {
    const value = mutableOverrides.get(name);
    if (value == null) {
      return original;
    }
    if (Array.isArray(value)) {
      const current = value.length ? value.shift() : original;
      return String(current);
    }
    if (consumedSingletons.has(name)) {
      return original;
    }
    consumedSingletons.add(name);
    return String(value);
  }

  for (const [name, value] of formAsPayload(form)) {
    if (name in form.submitButtons) {
      continue;
    }
    result.push([name, nextOverrideValue(name, value)]);
  }

  const submitValue = form.submitButtons[submitName];
  if (submitValue != null) {
    result.push([submitName, submitValue]);
  } else if (submitName in overrides) {
    result.push([submitName, String(overrides[submitName])]);
  }

  for (const [name, value] of Object.entries(overrides)) {
    if (name in form.fields || name in form.submitButtons) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        result.push([name, String(item)]);
      }
    } else {
      result.push([name, String(value)]);
    }
  }

  return result;
}
