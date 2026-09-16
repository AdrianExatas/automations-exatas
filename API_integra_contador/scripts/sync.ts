import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import {
  examplesFromPage,
  fieldsFromTables,
  parsePage,
  sha256,
  uniqueBy,
} from "../src/html.ts";
import {
  OPERATION_PATHS,
  type ManifestEntry,
  type OperationPath,
  type ParsedPage,
  type ReferenceLink,
  type ServiceRecord,
  type SourceManifest,
} from "../src/types.ts";

const PROJECT_ROOT = resolve(import.meta.dir, "..");
const SOURCE_ROOT = "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/";
const CENTRAL_HELP_URL = "https://centraldeajuda.serpro.gov.br/duvidas/pt/documentacoes/informacoesdocumentacoes/";
const CENTRAL_HELP_ROOT = "https://centraldeajuda.serpro.gov.br/duvidas/pt/";
const CENTRAL_HELP_PAGES = [
  CENTRAL_HELP_URL,
  `${CENTRAL_HELP_ROOT}documentacoes/doc_integracontador/`,
  `${CENTRAL_HELP_ROOT}suporte/sup_integracontador/`,
  `${CENTRAL_HELP_ROOT}avisos/integracontadoreventosatualizacao/`,
] as const;
const OPENAPI_URL = `${SOURCE_ROOT}pt/chamadas/api_reference/api-integra-contador-sp.yaml`;
const CONCURRENCY = 6;
const CHECK_ONLY = process.argv.includes("--check");

interface FetchResult {
  url: string;
  html?: string;
  error?: string;
}

interface CatalogMetadata {
  family: string;
  operationPath: OperationPath | null;
  status: string | null;
  description: string | null;
}

interface ProcurationMetadata {
  required: boolean | null;
  codes: string[];
  name: string | null;
}

function assertInsideProject(path: string): void {
  const normalizedRoot = `${resolve(PROJECT_ROOT)}${sep}`.toLowerCase();
  const normalizedPath = resolve(path).toLowerCase();
  if (!normalizedPath.startsWith(normalizedRoot) && normalizedPath !== resolve(PROJECT_ROOT).toLowerCase()) {
    throw new Error(`Caminho de saída fora do projeto: ${path}`);
  }
}

async function writeProjectFile(path: string, content: string | Uint8Array): Promise<void> {
  const absolute = resolve(PROJECT_ROOT, path);
  assertInsideProject(absolute);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(resolve(PROJECT_ROOT, path), "utf8")) as T;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "API-Integra-Contador-Knowledge-Base/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await Bun.sleep(300 * 2 ** (attempt - 1));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function discoverUrls(): Promise<string[]> {
  const response = await fetchWithRetry(SOURCE_ROOT);
  const html = await response.text();
  const urls = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(match[1], SOURCE_ROOT);
    } catch {
      continue;
    }
    url.hash = "";
    url.search = "";
    if (!url.href.startsWith(`${SOURCE_ROOT}pt/`)) continue;
    if (!url.pathname.endsWith("/")) continue;
    if (/\/(?:imgs?|css|js|assets|swagger-ui)\//i.test(url.pathname)) continue;
    urls.add(url.href);
  }
  return [...urls].sort();
}

async function fetchAll(urls: string[]): Promise<FetchResult[]> {
  const results = new Array<FetchResult>(urls.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= urls.length) return;
      const url = urls[index];
      try {
        const response = await fetchWithRetry(url);
        results[index] = { url, html: new TextDecoder("utf-8").decode(await response.arrayBuffer()) };
      } catch (error) {
        results[index] = { url, error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return results;
}

function sourceLocalPath(relativeUrl: string): string {
  const clean = relativeUrl.replace(/^pt\//, "").replace(/\/$/, "") || "introducao";
  return `docs/generated/source/${clean}/index.md`;
}

function classify(relativeUrl: string): string {
  if (/^central-ajuda\/avisos\//.test(relativeUrl)) return "official-alert";
  if (/^central-ajuda\//.test(relativeUrl)) return "central-help";
  if (/^pt\/cenarios_trial\//.test(relativeUrl)) return "trial-scenario";
  if (/\/servicos\/exemplos\//.test(relativeUrl) || /\/exemplos\//.test(relativeUrl)) return "example";
  if (/\/servicos\/[^/]+\/$/.test(relativeUrl)) return "service-contract";
  if (/\/mensagens?\/$/.test(relativeUrl)) return "messages";
  if (/\/limites\/$/.test(relativeUrl)) return "limits";
  if (/\/dados_de_dominio\/$/.test(relativeUrl)) return "domains";
  if (/\/changelog\/$/.test(relativeUrl)) return "changelog";
  if (relativeUrl === "pt/catalogo_de_servicos/") return "catalog";
  if (relativeUrl === "pt/servicos_vs_procuracoes/") return "procurations";
  return "reference";
}

function tableIndex(headers: string[], pattern: RegExp): number {
  return headers.findIndex((header) => pattern.test(header));
}

function toOperationPath(value: string): OperationPath | null {
  const normalized = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return OPERATION_PATHS.find((path) => normalized.includes(path.toLowerCase())) ?? null;
}

function catalogMap(page: ParsedPage | undefined): Map<string, CatalogMetadata> {
  const result = new Map<string, CatalogMetadata>();
  if (!page) return result;
  for (const table of page.tables) {
    const systemIndex = tableIndex(table.headers, /id\s*sistema/i);
    const serviceIndex = tableIndex(table.headers, /id\s*servi[cç]o/i);
    if (systemIndex < 0 || serviceIndex < 0) continue;
    const typeIndex = tableIndex(table.headers, /^tipo$/i);
    const statusIndex = tableIndex(table.headers, /situa[cç][aã]o/i);
    const descriptionIndex = tableIndex(table.headers, /descri[cç][aã]o/i);
    for (const row of table.rows) {
      const systemId = row[systemIndex]?.trim();
      const serviceId = row[serviceIndex]?.trim();
      if (!systemId || !serviceId) continue;
      result.set(`${systemId}.${serviceId}`, {
        family: familySlug(table.section),
        operationPath: typeIndex >= 0 ? toOperationPath(row[typeIndex] ?? "") : null,
        status: statusIndex >= 0 ? row[statusIndex] || null : null,
        description: descriptionIndex >= 0 ? row[descriptionIndex] || null : null,
      });
    }
  }
  return result;
}

function familySlug(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug === "integra-parcelamentos" ? "integra-parcelamento" : slug;
}

function procurationMap(page: ParsedPage | undefined): Map<string, ProcurationMetadata> {
  const result = new Map<string, ProcurationMetadata>();
  if (!page) return result;
  for (const table of page.tables) {
    const systemIndex = tableIndex(table.headers, /id\s*sistema/i);
    const serviceIndex = tableIndex(table.headers, /id\s*servi[cç]o/i);
    const codeIndex = tableIndex(table.headers, /c[oó]d.*procura[cç][aã]o/i);
    const nameIndex = tableIndex(table.headers, /nome.*servi[cç]o/i);
    if (systemIndex < 0 || serviceIndex < 0) continue;
    for (const row of table.rows) {
      const systemId = row[systemIndex]?.trim();
      const serviceId = row[serviceIndex]?.trim();
      if (!systemId || !serviceId) continue;
      const rawCode = codeIndex >= 0 ? row[codeIndex] ?? "" : "";
      const nA = /^n\/?a$/i.test(rawCode.trim()) || rawCode.trim() === "--";
      const codes = [...rawCode.matchAll(/\b\d{5}\b/g)].map((match) => match[0]);
      result.set(`${systemId}.${serviceId}`, {
        required: nA ? false : codes.length > 0 || /^sim/i.test(rawCode.trim()) ? true : null,
        codes,
        name: nameIndex >= 0 && !/^n\/?a$/i.test(row[nameIndex] ?? "") ? row[nameIndex] || null : null,
      });
    }
  }
  return result;
}

function serviceLocation(page: ParsedPage): { family: string; system: string } | null {
  const match = page.relativeUrl.match(/^pt\/solucoes\/([^/]+)\/([^/]+)\/servicos\//);
  return match ? { family: match[1], system: match[2] } : null;
}

function systemAndService(page: ParsedPage): { systemId: string; serviceId: string; version: string | null } | null {
  const systemId = page.semanticText.match(/id\s*Sistema\s*:?\s*([A-Z][A-Z0-9_-]+)/i)?.[1]?.toUpperCase();
  const serviceId = page.semanticText.match(/id\s*Servi[cç]o\s*:?\s*([A-Z][A-Z0-9_-]+)/i)?.[1]?.toUpperCase();
  if (!systemId || !serviceId) return null;
  const version = page.semanticText.match(/vers[aã]o\s*Sistema\s*:?\s*["']?([0-9]+(?:\.[0-9]+)*)/i)?.[1] ?? null;
  return { systemId, serviceId, version };
}

function referenceLinks(pages: ParsedPage[], family: string, system: string, kind: string): ReferenceLink[] {
  const prefix = `pt/solucoes/${family}/${system}/`;
  return pages.filter((page) => page.relativeUrl.startsWith(prefix) && classify(page.relativeUrl) === kind).map((page) => ({
    title: page.title,
    sourceUrl: page.url,
    localPath: sourceLocalPath(page.relativeUrl),
  }));
}

function mergeServices(
  pages: ParsedPage[],
  catalog: Map<string, CatalogMetadata>,
  procurations: Map<string, ProcurationMetadata>,
  retrievedAt: string,
): Promise<ServiceRecord[]> {
  const servicePages = pages.filter((page) => classify(page.relativeUrl) === "service-contract");
  const groups = new Map<string, ParsedPage[]>();
  for (const page of servicePages) {
    const ids = systemAndService(page);
    if (!ids) continue;
    const key = `${ids.systemId}.${ids.serviceId}`;
    groups.set(key, [...(groups.get(key) ?? []), page]);
  }
  return Promise.all([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(async ([key, group]) => {
    const first = group[0];
    const location = serviceLocation(first)!;
    const ids = systemAndService(first)!;
    const catalogData = catalog.get(key);
    const procuration = procurations.get(key) ?? { required: null, codes: [], name: null };
    const siblingStems = new Set(group.map((page) => page.relativeUrl.replace(/_(?:entrada|saida)\/$/i, "/")));
    const siblingContractPages = pages.filter((page) =>
      classify(page.relativeUrl) === "service-contract"
      && siblingStems.has(page.relativeUrl.replace(/_(?:entrada|saida)\/$/i, "/")),
    );
    const contractPages = uniqueBy([...group, ...siblingContractPages], (page) => page.url);
    const linkedExampleUrls = new Set(contractPages.flatMap((page) => page.links.map((link) => link.url)));
    const linkedExamplePages = pages.filter((page) => linkedExampleUrls.has(page.url) && classify(page.relativeUrl) === "example");
    const documentPages = uniqueBy([...contractPages, ...linkedExamplePages], (page) => page.url);
    const extracted = documentPages.map(examplesFromPage);
    const operationPath = catalogData?.operationPath ?? null;
    const combinedHash = await sha256(documentPages.map((page) => page.hash).sort().join("\n"));
    return {
      key,
      title: first.title,
      summary: catalogData?.description ?? first.summary,
      family: location.family,
      systemId: ids.systemId,
      serviceId: ids.serviceId,
      version: group.map(systemAndService).find((value) => value?.version)?.version ?? null,
      operationPath,
      status: catalogData?.status ?? null,
      billable: operationPath === "Apoiar" || operationPath === "Monitorar" ? false : null,
      procuration,
      request: uniqueBy(contractPages.flatMap((page) => fieldsFromTables(page.tables, "request")), (field) => `${field.section}|${field.name}|${field.typeRaw}`),
      response: uniqueBy(contractPages.flatMap((page) => fieldsFromTables(page.tables, "response")), (field) => `${field.section}|${field.name}|${field.typeRaw}`),
      examples: uniqueBy(extracted.flatMap((item) => item.examples), (example) => `${example.kind}|${example.official}`),
      messages: referenceLinks(pages, location.family, location.system, "messages"),
      limits: referenceLinks(pages, location.family, location.system, "limits"),
      domains: referenceLinks(pages, location.family, location.system, "domains"),
      source: {
        url: first.url,
        relatedUrls: documentPages.slice(1).map((page) => page.url),
        updatedAt: documentPages.map((page) => page.updatedAt).filter(Boolean).sort().at(-1) ?? null,
        retrievedAt,
        hash: combinedHash,
        status: "fetched",
      },
      issues: uniqueBy(extracted.flatMap((item) => item.issues), (issue) => `${issue.code}|${issue.sourceUrl}|${String(issue.officialValue)}`),
    } satisfies ServiceRecord;
  }));
}

async function catalogPlaceholders(
  catalog: Map<string, CatalogMetadata>,
  existing: ServiceRecord[],
  catalogPage: ParsedPage,
  procurations: Map<string, ProcurationMetadata>,
  retrievedAt: string,
): Promise<ServiceRecord[]> {
  const existingKeys = new Set(existing.map((service) => service.key));
  const placeholders: ServiceRecord[] = [];
  for (const [key, metadata] of catalog) {
    if (existingKeys.has(key)) continue;
    const [systemId, serviceId] = key.split(".", 2);
    const operationPath = metadata.operationPath;
    placeholders.push({
      key,
      title: metadata.description ?? serviceId,
      summary: metadata.description,
      family: metadata.family,
      systemId,
      serviceId,
      version: null,
      operationPath,
      status: metadata.status,
      billable: operationPath === "Apoiar" || operationPath === "Monitorar" ? false : null,
      procuration: procurations.get(key) ?? { required: null, codes: [], name: null },
      request: [],
      response: [],
      examples: [],
      messages: [],
      limits: [],
      domains: [],
      source: {
        url: catalogPage.url,
        relatedUrls: [],
        updatedAt: catalogPage.updatedAt,
        retrievedAt,
        hash: await sha256(`${catalogPage.hash}\n${key}`),
        status: "fetched",
      },
      issues: [{
        code: "catalog-entry-without-contract-page",
        severity: "warning",
        field: null,
        officialValue: { operationPath, status: metadata.status, description: metadata.description },
        normalizedValue: null,
        note: "A operação consta no catálogo oficial, mas nenhuma página de contrato correspondente foi localizada na navegação publicada. Não inferir payload.",
        sourceUrl: catalogPage.url,
      }],
    });
  }
  return placeholders;
}

function serviceMarkdown(service: ServiceRecord): string {
  const sources = [service.source.url, ...service.source.relatedUrls];
  const fields = (items: ServiceRecord["request"]): string => items.length
    ? [
        "| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |",
        "| --- | --- | --- | --- | --- | --- |",
        ...items.map((item) => `| ${item.section} | ${item.name} | ${item.typeRaw ?? "—"} | ${item.requiredRaw ?? "—"} | ${item.domainRaw ?? "—"} | ${(item.description ?? "—").replace(/\|/g, "\\|")} |`),
      ].join("\n")
    : "Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.";
  const examples = service.examples.length
    ? service.examples.map((example, index) => {
        const normalized = example.normalized
          ? `\n\nForma normalizada:\n\n\`\`\`json\n${example.normalized}\n\`\`\``
          : "";
        return `### Exemplo ${index + 1} — ${example.kind}\n\nFonte oficial:\n\n\`\`\`text\n${example.official.replace(/```/g, "` ` `")}\n\`\`\`${normalized}`;
      }).join("\n\n")
    : "Nenhum bloco de exemplo foi extraído desta página.";
  const references = (items: ReferenceLink[]): string => items.length
    ? items.map((item) => `- [${item.title}](../../../${item.localPath.replace(/^docs\//, "")}) — [fonte SERPRO](${item.sourceUrl})`).join("\n")
    : "- Nenhuma referência específica localizada.";
  const issues = service.issues.length
    ? service.issues.map((issue) => `- **${issue.severity} / ${issue.code}:** ${issue.note} ([fonte](${issue.sourceUrl}))`).join("\n")
    : "- Nenhuma anomalia detectada automaticamente.";
  return `---
key: ${JSON.stringify(service.key)}
family: ${JSON.stringify(service.family)}
systemId: ${JSON.stringify(service.systemId)}
serviceId: ${JSON.stringify(service.serviceId)}
version: ${JSON.stringify(service.version)}
operationPath: ${JSON.stringify(service.operationPath)}
sourceStatus: ${JSON.stringify(service.source.status)}
---

# ${service.title}

${service.summary ?? "Descrição não disponível no catálogo oficial."}

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | \`${service.key}\` |
| Família | \`${service.family}\` |
| Caminho físico | ${service.operationPath ? `\`POST /${service.operationPath}\`` : "Não determinado"} |
| Versão | ${service.version ? `\`${service.version}\`` : "Não informada"} |
| Situação oficial | ${service.status ?? "Não informada"} |
| Bilhetamento | ${service.billable === false ? "Não bilhetado" : "Consultar regra comercial vigente"} |
| Procuração | ${service.procuration.required === true ? `Obrigatória (${service.procuration.codes.join(", ") || "código não informado"})` : service.procuration.required === false ? "Não indicada" : "Não conclusivo"} |

## Entrada

${fields(service.request)}

## Saída

${fields(service.response)}

## Exemplos oficiais e normalizados

${examples}

## Referências relacionadas

### Mensagens

${references(service.messages)}

### Limites

${references(service.limits)}

### Dados de domínio

${references(service.domains)}

## Anomalias

${issues}

## Proveniência

${sources.map((url) => `- [Documentação oficial SERPRO](${url})`).join("\n")}

- Última atualização informada pela fonte: ${service.source.updatedAt ?? "não informada"}
- Conteúdo coletado em: ${service.source.retrievedAt}
- SHA-256 semântico: \`${service.source.hash}\`
`;
}

function sourceMarkdown(page: ParsedPage, retrievedAt: string): string {
  return redactSensitiveExamples(`---
source: ${JSON.stringify(page.url)}
sourceUpdatedAt: ${JSON.stringify(page.updatedAt)}
retrievedAt: ${JSON.stringify(retrievedAt)}
semanticHash: ${JSON.stringify(page.hash)}
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](${page.url}).

${page.markdown}
`);
}

function redactSensitiveExamples(value: string): string {
  return value
    .replace(/(Consumer Key:\s*)[A-Za-z0-9._-]{12,}/gi, "$1<SERPRO_CONSUMER_KEY>")
    .replace(/(Consumer Secret:\s*)[A-Za-z0-9._-]{12,}/gi, "$1<SERPRO_CONSUMER_SECRET>")
    .replace(/(Authorization\s*:\s*Basic\s*)[A-Za-z0-9+/=_-]{16,}/gi, "$1<BASIC_CREDENTIALS>")
    .replace(/(Authorization\s*:\s*Bearer\s*)[A-Za-z0-9._-]{12,}/gi, "$1<ACCESS_TOKEN>")
    .replace(/(jwt_token\s*:\s*)eyJ[A-Za-z0-9._-]+/gi, "$1<JWT_TOKEN>")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "<JWT_TOKEN>")
    .replace(/[A-Za-z0-9+/=]{1000,}/g, (encoded) => `<BASE64_REMOVIDO_TAMANHO_${encoded.length}>`);
}

function serviceSchema(): Record<string, unknown> {
  const nullableString = { type: ["string", "null"] };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://local.exatas/api-integra-contador/service-record.schema.json",
    title: "ServiceRecord da API Integra Contador",
    type: "object",
    additionalProperties: false,
    required: ["key", "title", "summary", "family", "systemId", "serviceId", "version", "operationPath", "status", "billable", "procuration", "request", "response", "examples", "messages", "limits", "domains", "source", "issues"],
    properties: {
      key: { type: "string", pattern: "^[A-Z0-9_-]+\\.[A-Z0-9_-]+$" },
      title: { type: "string", minLength: 1 },
      summary: nullableString,
      family: { type: "string", minLength: 1 },
      systemId: { type: "string", minLength: 1 },
      serviceId: { type: "string", minLength: 1 },
      version: nullableString,
      operationPath: { enum: [...OPERATION_PATHS, null] },
      status: nullableString,
      billable: { type: ["boolean", "null"] },
      procuration: {
        type: "object",
        additionalProperties: false,
        required: ["required", "codes", "name"],
        properties: { required: { type: ["boolean", "null"] }, codes: { type: "array", items: { type: "string" } }, name: nullableString },
      },
      request: { type: "array", items: { $ref: "#/$defs/field" } },
      response: { type: "array", items: { $ref: "#/$defs/field" } },
      examples: { type: "array", items: { $ref: "#/$defs/example" } },
      messages: { type: "array", items: { $ref: "#/$defs/reference" } },
      limits: { type: "array", items: { $ref: "#/$defs/reference" } },
      domains: { type: "array", items: { $ref: "#/$defs/reference" } },
      source: { $ref: "#/$defs/source" },
      issues: { type: "array", items: { $ref: "#/$defs/issue" } },
    },
    $defs: {
      field: {
        type: "object",
        additionalProperties: false,
        required: ["section", "name", "description", "typeRaw", "requiredRaw", "domainRaw"],
        properties: { section: { type: "string" }, name: { type: "string" }, description: nullableString, typeRaw: nullableString, requiredRaw: nullableString, domainRaw: nullableString },
      },
      example: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "official", "normalized", "validJson", "sourceUrl"],
        properties: { kind: { enum: ["request", "response", "curl", "other"] }, official: { type: "string" }, normalized: nullableString, validJson: { type: ["boolean", "null"] }, sourceUrl: { type: "string", format: "uri" } },
      },
      reference: {
        type: "object",
        additionalProperties: false,
        required: ["title", "sourceUrl", "localPath"],
        properties: { title: { type: "string" }, sourceUrl: { type: "string", format: "uri" }, localPath: { type: "string" } },
      },
      source: {
        type: "object",
        additionalProperties: false,
        required: ["url", "relatedUrls", "updatedAt", "retrievedAt", "hash", "status"],
        properties: { url: { type: "string", format: "uri" }, relatedUrls: { type: "array", items: { type: "string", format: "uri" } }, updatedAt: nullableString, retrievedAt: { type: "string", format: "date-time" }, hash: { type: "string", pattern: "^[a-f0-9]{64}$" }, status: { enum: ["fetched", "stale", "missing", "removed"] } },
      },
      issue: {
        type: "object",
        additionalProperties: false,
        required: ["code", "severity", "field", "officialValue", "normalizedValue", "note", "sourceUrl"],
        properties: { code: { type: "string" }, severity: { enum: ["info", "warning", "error"] }, field: nullableString, officialValue: {}, normalizedValue: {}, note: { type: "string" }, sourceUrl: { type: "string", format: "uri" } },
      },
    },
  };
}

function serviceIndex(services: ServiceRecord[]): string {
  const families = new Map<string, ServiceRecord[]>();
  for (const s of services) {
    const list = families.get(s.family) || [];
    list.push(s);
    families.set(s.family, list);
  }
  const sections = [...families.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([family, items]) => {
    const rows = items.sort((a, b) => a.key.localeCompare(b.key)).map((service) => {
      const location = `services/${service.family}/${service.systemId.toLowerCase()}/${service.serviceId.toLowerCase()}.md`;
      return `| [${service.key}](${location}) | ${service.title} | ${service.operationPath ?? "—"} | ${service.status ?? "—"} |`;
    });
    return `## ${family}\n\n| Serviço | Descrição | Caminho | Situação |\n| --- | --- | --- | --- |\n${rows.join("\n")}`;
  });
  return `# Índice de serviços\n\nGerado a partir do catálogo e das páginas oficiais do SERPRO.\n\n${sections.join("\n\n")}\n`;
}

function llmsIndex(services: ServiceRecord[], retrievedAt: string): string {
  const families = [...new Set(services.map((service) => service.family))].sort();
  return `# API Integra Contador — base local para IA

> Snapshot oficial SERPRO coletado em ${retrievedAt}. Consulte sources/manifest.json para proveniência e estado de cada fonte.

## Comece aqui

- [Visão geral e regras de uso](README.md)
- [Resumo de uma página para a liderança](docs/guides/resumo-executivo.md)
- [Visão executiva e oportunidades para a liderança](docs/guides/visao-executiva.md)
- [Índice completo de serviços](docs/SERVICE_INDEX.md)
- [Autenticação mTLS e OAuth2](docs/guides/autenticacao.md)
- [Envelope e chamadas](docs/guides/envelope-e-chamadas.md)
- [Erros, timeout e retentativas](docs/guides/erros-e-retentativas.md)
- [Procurações](docs/guides/procuracoes.md)
- [Rastreabilidade](docs/guides/rastreabilidade.md)
- [Catálogo para máquinas](catalog/services.json)
- [Catálogo NDJSON para RAG](catalog/services.ndjson)
- [OpenAPI oficial](openapi/official.yaml)

## Famílias cobertas

${families.map((family) => `- ${family}`).join("\n")}

## Regras críticas para agentes

- SERPRO é a única fonte normativa desta base.
- O endpoint físico é escolhido por operationPath; idSistema e idServico ficam no envelope.
- pedidoDados.dados é uma string contendo JSON escapado, não um objeto JSON direto.
- Não invente campos quando issues ou source.status indicarem incerteza.
- Não repita automaticamente operações mutáveis após HTTP 504; o backend pode ter concluído a operação.
`;
}

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log("Descobrindo páginas oficiais...");
  const apiCenterUrls = await discoverUrls();
  const urls = [...new Set([...apiCenterUrls, ...CENTRAL_HELP_PAGES])].sort();
  console.log(`Coletando ${urls.length} páginas com concorrência ${CONCURRENCY}...`);
  const fetched = await fetchAll(urls);
  const parsed: ParsedPage[] = [];
  const failures = new Map<string, string>();
  for (const item of fetched) {
    if (!item.html) {
      failures.set(item.url, item.error ?? "Falha desconhecida");
      continue;
    }
    const isCentralHelp = item.url.startsWith(CENTRAL_HELP_ROOT);
    const page = await parsePage(item.html, item.url, isCentralHelp ? CENTRAL_HELP_ROOT : SOURCE_ROOT);
    if (isCentralHelp) page.relativeUrl = `central-ajuda/${page.relativeUrl}`;
    parsed.push(page);
  }

  const previousManifest = await readJsonIfExists<SourceManifest>("sources/manifest.json");
  const previousByUrl = new Map(previousManifest?.pages.map((entry) => [entry.url, entry]) ?? []);
  const manifestEntries: ManifestEntry[] = parsed.map((page) => ({
    url: page.url,
    title: page.title,
    kind: classify(page.relativeUrl),
    localPath: sourceLocalPath(page.relativeUrl),
    updatedAt: page.updatedAt,
    retrievedAt: previousByUrl.get(page.url)?.hash === page.hash ? previousByUrl.get(page.url)!.retrievedAt : startedAt,
    hash: page.hash,
    status: "fetched",
  }));
  for (const [url, error] of failures) {
    const previous = previousByUrl.get(url);
    manifestEntries.push(previous
      ? { ...previous, status: "stale", error }
      : { url, title: "Fonte indisponível", kind: "unknown", localPath: sourceLocalPath(url.slice(SOURCE_ROOT.length)), updatedAt: null, retrievedAt: startedAt, hash: "", status: "missing", error });
  }
  for (const previous of previousManifest?.pages ?? []) {
    if (!urls.includes(previous.url)) manifestEntries.push({ ...previous, status: "removed" });
  }
  manifestEntries.sort((a, b) => a.url.localeCompare(b.url));

  const manifestChanged = !previousManifest
    || manifestEntries.length !== previousManifest.pages.length
    || manifestEntries.some((entry) => {
      const previous = previousByUrl.get(entry.url);
      return !previous || previous.hash !== entry.hash || previous.status !== entry.status;
    });
  const snapshotAt = manifestChanged ? startedAt : previousManifest.retrievedAt;

  const catalogPage = parsed.find((page) => page.relativeUrl === "pt/catalogo_de_servicos/");
  const procurationPage = parsed.find((page) => page.relativeUrl === "pt/servicos_vs_procuracoes/");
  const catalog = catalogMap(catalogPage);
  const procurations = procurationMap(procurationPage);
  const services = await mergeServices(parsed, catalog, procurations, startedAt);
  if (!catalogPage) throw new Error("Catálogo oficial não pôde ser interpretado.");
  services.push(...await catalogPlaceholders(catalog, services, catalogPage, procurations, startedAt));
  const previousServices = await readJsonIfExists<ServiceRecord[]>("catalog/services.json") ?? [];
  const previousServiceByKey = new Map(previousServices.map((service) => [service.key, service]));
  for (const service of services) {
    const previous = previousServiceByKey.get(service.key);
    if (previous?.source.hash === service.source.hash) service.source.retrievedAt = previous.source.retrievedAt;
  }
  const serviceSourceUrls = new Set(services.flatMap((service) => [service.source.url, ...service.source.relatedUrls]));
  for (const previous of previousServices) {
    if (!services.some((service) => service.key === previous.key) && [...failures.keys()].some((url) => previous.source.url === url || previous.source.relatedUrls.includes(url))) {
      services.push({ ...previous, source: { ...previous.source, status: "stale" } });
      serviceSourceUrls.add(previous.source.url);
    }
  }
  services.sort((a, b) => a.key.localeCompare(b.key));
  const unmappedCatalogEntries = [...catalog.keys()].filter((key) => !services.some((service) => service.key === key));

  const families = new Set(parsed.map(serviceLocation).filter(Boolean).map((value) => value!.family));
  const manifest: SourceManifest = {
    schemaVersion: 1,
    sourceRoot: SOURCE_ROOT,
    centralHelpUrl: CENTRAL_HELP_URL,
    retrievedAt: snapshotAt,
    counts: {
      discoveredPages: urls.length,
      apiCenterPages: apiCenterUrls.length,
      centralHelpPages: CENTRAL_HELP_PAGES.length,
      fetchedPages: manifestEntries.filter((entry) => entry.status === "fetched").length,
      stalePages: manifestEntries.filter((entry) => entry.status === "stale").length,
      missingPages: manifestEntries.filter((entry) => entry.status === "missing").length,
      removedPages: manifestEntries.filter((entry) => entry.status === "removed").length,
      serviceContractPages: parsed.filter((page) => classify(page.relativeUrl) === "service-contract").length,
      logicalServices: services.length,
      catalogEntries: catalog.size,
      unmappedCatalogEntries: unmappedCatalogEntries.length,
      trialScenarios: parsed.filter((page) => classify(page.relativeUrl) === "trial-scenario").length,
      families: families.size,
    },
    pages: manifestEntries,
  };

  if (CHECK_ONLY) {
    if (!previousManifest) {
      console.error("Nenhum snapshot anterior existe. Execute bun run sync.");
      process.exit(1);
    }
    const oldHashes = new Map(previousManifest.pages.map((entry) => [entry.url, entry.hash]));
    const changed = parsed.filter((page) => oldHashes.get(page.url) !== page.hash).map((page) => page.url);
    const added = urls.filter((url) => !oldHashes.has(url));
    const removed = previousManifest.pages.filter((entry) => !urls.includes(entry.url) && entry.status !== "removed").map((entry) => entry.url);
    if (changed.length || added.length || removed.length || failures.size) {
      console.error(JSON.stringify({ changed, added, removed, failures: Object.fromEntries(failures) }, null, 2));
      process.exit(1);
    }
    console.log("Snapshot local está sincronizado com as fontes oficiais.");
    return;
  }

  console.log("Gravando documentação normalizada...");
  const entryByUrl = new Map(manifestEntries.map((entry) => [entry.url, entry]));
  await Promise.all(parsed.map((page) => writeProjectFile(
    sourceLocalPath(page.relativeUrl),
    sourceMarkdown(page, entryByUrl.get(page.url)?.retrievedAt ?? snapshotAt),
  )));
  await Promise.all(services.map((service) => writeProjectFile(
    `docs/services/${service.family}/${service.systemId.toLowerCase()}/${service.serviceId.toLowerCase()}.md`,
    serviceMarkdown(service),
  )));
  await writeProjectFile("catalog/services.json", `${JSON.stringify(services, null, 2)}\n`);
  await writeProjectFile("catalog/services.ndjson", `${services.map((service) => JSON.stringify(service)).join("\n")}\n`);
  await writeProjectFile("catalog/service-record.schema.json", `${JSON.stringify(serviceSchema(), null, 2)}\n`);
  await writeProjectFile("sources/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  await writeProjectFile("docs/SERVICE_INDEX.md", serviceIndex(services));
  await writeProjectFile("llms.txt", llmsIndex(services, snapshotAt));
  try {
    const openapiResponse = await fetchWithRetry(OPENAPI_URL);
    await writeProjectFile("openapi/official.yaml", new Uint8Array(await openapiResponse.arrayBuffer()));
  } catch (error) {
    if (!(await Bun.file(resolve(PROJECT_ROOT, "openapi/official.yaml")).exists())) throw error;
    console.warn(`OpenAPI indisponível; mantendo snapshot anterior: ${error}`);
  }
  console.log(JSON.stringify(manifest.counts, null, 2));
}

await main();
