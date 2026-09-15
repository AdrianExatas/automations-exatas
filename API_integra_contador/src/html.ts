import type {
  DocumentationIssue,
  FieldDefinition,
  ParsedPage,
  ParsedTable,
  ServiceExample,
} from "./types.ts";

const BLOCK_TAGS = /<\/?(?:article|section|div|p|ul|ol|li|table|thead|tbody|tr|blockquote|aside|details|summary)[^>]*>/gi;

export function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return named[entity.toLowerCase()] ?? `&${entity};`;
  });
}

export function plainText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(BLOCK_TAGS, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href: string, pageUrl: string): string {
  try {
    return new URL(decodeHtml(href), pageUrl).href;
  } catch {
    return decodeHtml(href);
  }
}

function extractArticle(html: string): string {
  return html.match(/<article\b[^>]*class="[^"]*md-content__inner[^"]*"[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? "";
}

function lastHeading(before: string): string {
  const headings = [...before.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  return headings.length ? plainText(headings.at(-1)![1]) : "Geral";
}

function lastParagraph(before: string): string | null {
  const paragraphs = [...before.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  return paragraphs.length ? plainText(paragraphs.at(-1)![1]) : null;
}

function tableSection(before: string): string {
  const text = plainText(before);
  const inputAt = Math.max(text.lastIndexOf("Dados de Entrada"), text.lastIndexOf("Dados Entrada"));
  const outputAt = Math.max(text.lastIndexOf("Dados de Saída"), text.lastIndexOf("Dados de Saida"));
  const direction = inputAt > outputAt && inputAt >= 0 ? "Dados de Entrada" : outputAt >= 0 ? "Dados de Saída" : lastHeading(before);
  const paragraph = lastParagraph(before);
  if (!paragraph || paragraph === direction) return direction;
  const usefulLabel = /^(?:objeto|lista|tabela|estrutura)\b/i.test(paragraph) ? paragraph : null;
  return usefulLabel ? `${direction} — ${usefulLabel}` : direction;
}

function extractTables(article: string): ParsedTable[] {
  const result: ParsedTable[] = [];
  for (const match of article.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const tableHtml = match[1];
    const allRows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
      [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => plainText(cell[1])),
    ).filter((row) => row.length > 0);
    if (!allRows.length) continue;
    const explicitHeader = /<th\b/i.test(tableHtml);
    const firstLooksLikeHeader = allRows[0].some((cell) => /^(?:campo|nome|descri[cç][aã]o|tipo|obrigat[oó]rio|dom[ií]nio|id\s*sistema|id\s*servi[cç]o|sequencial|c[oó]digo)/i.test(cell));
    const headers = explicitHeader || firstLooksLikeHeader ? allRows.shift()! : allRows[0].map((_, index) => `coluna_${index + 1}`);
    result.push({
      section: tableSection(article.slice(0, match.index)),
      headers,
      rows: allRows,
    });
  }
  return result;
}

function extractCodeBlocks(article: string): Array<{ section: string; code: string }> {
  const blocks: Array<{ section: string; code: string }> = [];
  for (const match of article.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)) {
    const raw = match[1].replace(/^<code\b[^>]*>|<\/code>$/gi, "");
    const code = decodeHtml(raw.replace(/<[^>]+>/g, "")).replace(/^\s+|\s+$/g, "");
    if (code) {
      const before = article.slice(0, match.index);
      const paragraph = lastParagraph(before);
      blocks.push({ section: paragraph ? `${lastHeading(before)} — ${paragraph}` : lastHeading(before), code });
    }
  }
  return blocks;
}

function tableMarkdown(tableHtml: string): string {
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) =>
      plainText(cell[1]).replace(/\|/g, "\\|").replace(/\n/g, " "),
    ),
  ).filter((row) => row.length);
  if (!rows.length) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [...row, ...Array(width - row.length).fill("")]);
  const header = normalized.shift()!;
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...normalized.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

export function articleToMarkdown(articleInput: string, pageUrl: string): string {
  let article = articleInput
    .replace(/<aside\b[^>]*class="[^"]*md-source-file[^"]*"[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<div\b[^>]*class=(?:"[^"]*md-source-file[^"]*"|md-source-file)[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<form\b[^>]*class=(?:"[^"]*md-feedback[^"]*"|md-feedback)[^>]*>[\s\S]*?<\/form>/gi, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");

  const placeholders = new Map<string, string>();
  let sequence = 0;
  const hold = (content: string): string => {
    const key = `@@BLOCK_${sequence++}@@`;
    placeholders.set(key, content);
    return `\n\n${key}\n\n`;
  };

  article = article.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_whole, body: string) => {
    const code = decodeHtml(body.replace(/^<code\b[^>]*>|<\/code>$/gi, "").replace(/<[^>]+>/g, "")).trim();
    return hold(`\`\`\`text\n${code.replace(/```/g, "` ` `")}\n\`\`\``);
  });
  article = article.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_whole, body: string) => hold(tableMarkdown(body)));
  article = article.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_whole, href: string, label: string) => {
    const text = plainText(label) || absoluteUrl(href, pageUrl);
    return `[${text}](${absoluteUrl(href, pageUrl)})`;
  });
  article = article.replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/gi, (_whole, alt: string) => alt ? `[Imagem: ${decodeHtml(alt)}]` : "");
  article = article.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_whole, level: string, body: string) =>
    `\n\n${"#".repeat(Number(level))} ${plainText(body)}\n\n`,
  );
  article = article.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_whole, body: string) => `\n- ${plainText(body)}`);
  article = article.replace(/<br\s*\/?>/gi, "\n");
  article = article.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_whole, body: string) => `\`${plainText(body).replace(/`/g, "\\`")}\``);
  article = article.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, (_whole, body: string) => `**${plainText(body)}**`);
  article = article.replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, (_whole, body: string) => `*${plainText(body)}*`);
  article = article.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_whole, body: string) => `\n\n${plainText(body)}\n\n`);
  article = decodeHtml(article.replace(/<[^>]+>/g, " "));
  for (const [key, value] of placeholders) article = article.replace(key, value);
  return article
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sha256(value: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(value);
  return hasher.digest("hex");
}

export async function parsePage(html: string, pageUrl: string, rootUrl: string): Promise<ParsedPage> {
  const article = extractArticle(html);
  const title = plainText(article.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "Sem título");
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => plainText(match[1])).filter(Boolean);
  const dateTitles = [...article.matchAll(/title="([^"]*\b\d{4}\b[^"]*)"/gi)].map((match) => match[1]);
  const updatedAt = dateTitles[0]
    ?? plainText(article).match(/(?:Última atualização|Atualizado em)[:\s]+([^|]+?)(?:\s{2,}|$)/i)?.[1]
    ?? null;
  const semanticText = plainText(article
    .replace(/<aside\b[^>]*class="[^"]*md-source-file[^"]*"[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<div\b[^>]*class=(?:"[^"]*md-source-file[^"]*"|md-source-file)[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<form\b[^>]*class=(?:"[^"]*md-feedback[^"]*"|md-feedback)[^>]*>[\s\S]*?<\/form>/gi, ""));
  const links = [...article.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    title: plainText(match[2]) || decodeHtml(match[1]),
    url: absoluteUrl(match[1], pageUrl),
  }));
  return {
    url: pageUrl,
    relativeUrl: pageUrl.startsWith(rootUrl) ? pageUrl.slice(rootUrl.length) : pageUrl,
    title,
    summary: paragraphs.find((text) => text.length >= 25) ?? null,
    updatedAt,
    semanticText,
    markdown: articleToMarkdown(article, pageUrl),
    tables: extractTables(article),
    codeBlocks: extractCodeBlocks(article),
    links,
    hash: await sha256(semanticText),
  };
}

function headerIndex(headers: string[], candidates: RegExp[]): number {
  return headers.findIndex((header) => candidates.some((candidate) => candidate.test(header)));
}

export function fieldsFromTables(tables: ParsedTable[], direction: "request" | "response"): FieldDefinition[] {
  const directionPattern = direction === "request" ? /entrada|requisi[cç][aã]o|body/i : /sa[ií]da|retorno|resposta/i;
  const selected = tables.filter((table) => directionPattern.test(table.section));
  const fields: FieldDefinition[] = [];
  for (const table of selected) {
    const nameIndex = headerIndex(table.headers, [/^campo$/i, /^nome$/i, /par[aâ]metro/i]);
    if (nameIndex < 0) continue;
    const descriptionIndex = headerIndex(table.headers, [/descri[cç][aã]o/i]);
    const typeIndex = headerIndex(table.headers, [/tipo/i]);
    const requiredIndex = headerIndex(table.headers, [/obrigat[oó]rio/i]);
    const domainIndex = headerIndex(table.headers, [/dom[ií]nio/i]);
    for (const row of table.rows) {
      const name = row[nameIndex]?.trim();
      if (!name || /^campo$/i.test(name)) continue;
      fields.push({
        section: table.section,
        name,
        description: descriptionIndex >= 0 ? row[descriptionIndex] || null : null,
        typeRaw: typeIndex >= 0 ? row[typeIndex] || null : null,
        requiredRaw: requiredIndex >= 0 ? row[requiredIndex] || null : null,
        domainRaw: domainIndex >= 0 ? row[domainIndex] || null : null,
      });
    }
  }
  return uniqueBy(fields, (field) => `${field.section}|${field.name}|${field.typeRaw}`);
}

function normalizeJson(code: string): { normalized: string | null; valid: boolean | null } {
  const trimmed = code.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return { normalized: null, valid: null };
  try {
    return { normalized: JSON.stringify(JSON.parse(trimmed), null, 2), valid: true };
  } catch {
    return { normalized: null, valid: false };
  }
}

export function examplesFromPage(page: ParsedPage): { examples: ServiceExample[]; issues: DocumentationIssue[] } {
  const examples: ServiceExample[] = [];
  const issues: DocumentationIssue[] = [];
  for (const block of page.codeBlocks) {
    let official = block.code;
    official = official.replace(/[A-Za-z0-9+/=]{1000,}/g, (value) => {
      issues.push({
        code: "official-example-large-payload-redacted",
        severity: "info",
        field: "examples",
        officialValue: { encodedLength: value.length },
        normalizedValue: `<BASE64_REMOVIDO_TAMANHO_${value.length}>`,
        note: "Uma carga Base64 extensa foi substituída por marcador para manter a base adequada a contexto de IA.",
        sourceUrl: page.url,
      });
      return `<BASE64_REMOVIDO_TAMANHO_${value.length}>`;
    });
    let truncated = false;
    if (official.length > 12_000) {
      const originalLength = official.length;
      official = `${official.slice(0, 12_000)}\n<EXEMPLO_TRUNCADO_TAMANHO_ORIGINAL_${originalLength}>`;
      truncated = true;
      issues.push({
        code: "official-example-truncated-for-ai",
        severity: "info",
        field: "examples",
        officialValue: { originalLength },
        normalizedValue: { retainedCharacters: 12_000 },
        note: "O exemplo extenso foi limitado no catálogo; a página normalizada e a fonte oficial preservam o contexto completo.",
        sourceUrl: page.url,
      });
    }
    const lower = `${block.section} ${official.slice(0, 80)}`.toLowerCase();
    const kind: ServiceExample["kind"] = lower.includes("curl")
      ? "curl"
      : /sa[ií]da|retorno|resposta/.test(lower)
        ? "response"
        : /entrada|requisi[cç][aã]o|body/.test(lower)
          ? "request"
          : "other";
    const parsed = truncated ? { normalized: null, valid: null as boolean | null } : normalizeJson(official);
    if (parsed.valid === false) {
      issues.push({
        code: "official-example-invalid-json",
        severity: "warning",
        field: "examples",
        officialValue: { preview: official.slice(0, 500), length: official.length },
        normalizedValue: null,
        note: "O bloco oficial aparenta ser JSON, mas não pôde ser interpretado sem inferência.",
        sourceUrl: page.url,
      });
    }
    if (parsed.valid === true) {
      const value = JSON.parse(parsed.normalized!);
      const dados = value?.pedidoDados?.dados;
      if (typeof dados === "string" && dados.trim()) {
        try {
          JSON.parse(dados);
        } catch {
          parsed.normalized = null;
          parsed.valid = false;
          issues.push({
            code: "official-pedido-dados-invalid-json",
            severity: "warning",
            field: "pedidoDados.dados",
            officialValue: { preview: dados.slice(0, 500), length: dados.length },
            normalizedValue: null,
            note: "O envelope oficial é JSON válido, mas o JSON escapado em pedidoDados.dados é inválido.",
            sourceUrl: page.url,
          });
        }
      }
    }
    examples.push({ kind, official, normalized: parsed.normalized, validJson: parsed.valid, sourceUrl: page.url });
  }
  return { examples, issues };
}

export function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function escapeYaml(value: string | null): string {
  return JSON.stringify(value ?? "");
}
