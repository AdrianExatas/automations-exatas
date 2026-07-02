import type { Company } from "./types";

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}

export function stripTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function extractDemonstrativoLink(html: string): string {
  const links = html.matchAll(/<a\b[^>]*href=["']?([^"'\s>]+)[^>]*>([\s\S]*?)<\/a>/gi);
  for (const link of links) {
    const href = decodeHtmlEntities(link[1] ?? "");
    const text = stripTags(link[2] ?? "");
    if (/Demonstrativo\s*ICMS\s*Antecipado/i.test(text) && /process\.jsp/i.test(href)) {
      return href;
    }
  }

  throw new Error("Link 'Demonstrativo ICMS Antecipado' nao encontrado no portal.");
}

export function parseCompanies(html: string): Company[] {
  const select = html.match(/<select\b[^>]*\bid=["']cdPessoaLookup["'][^>]*>([\s\S]*?)<\/select>/i);
  if (!select) {
    throw new Error("Select cdPessoaLookup nao encontrado no HTML.");
  }

  const companies: Company[] = [];
  const options = select[1].matchAll(/<option\b[^>]*\bvalue=["']?([^"'\s>]*)[^>]*>([\s\S]*?)<\/option>/gi);
  for (const option of options) {
    const inscricao = decodeHtmlEntities(option[1] ?? "").trim();
    const label = stripTags(option[2] ?? "");
    if (!inscricao) {
      continue;
    }

    const name = label.replace(new RegExp(`^${escapeRegExp(inscricao)}\\s*-\\s*`), "").trim();
    companies.push({ inscricao, nome: name || label || inscricao });
  }

  return companies;
}

export function extractExcelDownloaderPath(html: string): string {
  const match = html.match(/window\.location\s*=\s*['"]([^'"]*Downloader\.jsp\?Arquivo=[^'"]+)['"]/i);
  if (!match) {
    throw new Error("URL do Downloader.jsp nao encontrada na resposta do Excel.");
  }

  return decodeHtmlEntities(match[1]);
}

export function extractPdfPath(html: string): string {
  const match = html.match(/window\.open\(\s*['"]([^'"]*JasperPDF\.jsp\?AppName=SIT&TransId=T34693[^'"]*)['"]/i);
  if (!match) {
    throw new Error("URL do JasperPDF.jsp nao encontrada na resposta do PDF.");
  }

  return decodeHtmlEntities(match[1]);
}

export function extractPortalError(html: string): string | undefined {
  const errorMatch = html.match(/<font\b[^>]*class=["'][^"']*fontMessageError[^"']*["'][^>]*>([\s\S]*?)<\/font>/i);
  if (errorMatch) {
    return stripTags(errorMatch[1] ?? "");
  }

  const genericMessage = html.match(/<font\b[^>]*class=["'][^"']*fontMessage[^"']*["'][^>]*>([\s\S]*?)<\/font>/i);
  const text = genericMessage ? stripTags(genericMessage[1] ?? "") : "";
  if (/erro|nao|não|inexistente|indispon/i.test(text)) {
    return text;
  }

  return undefined;
}

export function hasSelectOption(html: string, selectId: string, value: string): boolean {
  const select = html.match(new RegExp(`<select\\b[^>]*\\bid=["']${escapeRegExp(selectId)}["'][^>]*>([\\s\\S]*?)<\\/select>`, "i"));
  if (!select) {
    return false;
  }

  return new RegExp(`<option\\b[^>]*\\bvalue=["']?${escapeRegExp(value)}(["'\\s>])`, "i").test(select[1] ?? "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
