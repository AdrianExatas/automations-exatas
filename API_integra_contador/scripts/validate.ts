import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { OPERATION_PATHS, type ServiceRecord, type SourceManifest } from "../src/types.ts";

const ROOT = resolve(import.meta.dir, "..");
const failures: string[] = [];
const warnings: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function warn(message: string): void {
  warnings.push(message);
}

async function readText(path: string): Promise<string> {
  try {
    return await readFile(resolve(ROOT, path), "utf8");
  } catch (error) {
    fail(`Arquivo ausente ou ilegível: ${path} (${error})`);
    return "";
  }
}

async function exists(path: string): Promise<boolean> {
  return Bun.file(resolve(ROOT, path)).exists();
}

function inspectObjectShape(service: ServiceRecord): void {
  const required = ["key", "title", "family", "systemId", "serviceId", "procuration", "request", "response", "examples", "messages", "limits", "domains", "source", "issues"];
  for (const field of required) if (!(field in service)) fail(`${service.key || "serviço sem chave"}: campo obrigatório ausente: ${field}`);
  if (service.key !== `${service.systemId}.${service.serviceId}`) fail(`${service.key}: chave não corresponde a systemId.serviceId`);
  if (service.operationPath !== null && !OPERATION_PATHS.includes(service.operationPath)) fail(`${service.key}: caminho inválido ${service.operationPath}`);
  if (!/^https:\/\/apicenter\.estaleiro\.serpro\.gov\.br\/documentacao\/api-integra-contador\//.test(service.source.url)) {
    fail(`${service.key}: fonte não oficial ou fora do escopo`);
  }
  if (!/^[a-f0-9]{64}$/.test(service.source.hash)) fail(`${service.key}: hash semântico inválido`);
  for (const example of service.examples) {
    if (example.normalized !== null) {
      try {
        const value = JSON.parse(example.normalized);
        const dados = value?.pedidoDados?.dados;
        if (typeof dados === "string" && dados.trim()) JSON.parse(dados);
      } catch (error) {
        fail(`${service.key}: exemplo marcado como normalizado não é JSON válido (${error})`);
      }
    }
  }
}

function detectSecrets(content: string, path: string): void {
  const patterns = [
    /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
    /SERPRO_CONSUMER_SECRET\s*=\s*(?!<)[^\s]+/,
    /SERPRO_CERT_PASSWORD\s*=\s*(?!<)[^\s]+/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  ];
  for (const pattern of patterns) if (pattern.test(content)) fail(`${path}: possível segredo ou token não redigido (${pattern})`);
}

async function main(): Promise<void> {
  const servicesText = await readText("catalog/services.json");
  const manifestText = await readText("sources/manifest.json");
  const schemaText = await readText("catalog/service-record.schema.json");
  const openapiText = await readText("openapi/official.yaml");
  if (!servicesText || !manifestText || !schemaText || !openapiText) process.exit(1);

  let services: ServiceRecord[] = [];
  let manifest: SourceManifest;
  try { services = JSON.parse(servicesText) as ServiceRecord[]; } catch (error) { fail(`catalog/services.json inválido: ${error}`); }
  try { manifest = JSON.parse(manifestText) as SourceManifest; } catch (error) { fail(`sources/manifest.json inválido: ${error}`); manifest = {} as SourceManifest; }
  try { JSON.parse(schemaText); } catch (error) { fail(`service-record.schema.json inválido: ${error}`); }

  const keys = new Set<string>();
  for (const service of services) {
    if (keys.has(service.key)) fail(`Serviço duplicado: ${service.key}`);
    keys.add(service.key);
    inspectObjectShape(service);
    const doc = `docs/services/${service.family}/${service.systemId.toLowerCase()}/${service.serviceId.toLowerCase()}.md`;
    if (!(await exists(doc))) fail(`${service.key}: documentação consolidada ausente em ${doc}`);
    else if (!(await readText(doc)).startsWith("---\n")) fail(`${service.key}: front matter ausente em ${doc}`);
    for (const reference of [...service.messages, ...service.limits, ...service.domains]) {
      if (!(await exists(reference.localPath))) fail(`${service.key}: referência local ausente em ${reference.localPath}`);
    }
  }

  if (services.length < 80) fail(`Cobertura lógica inesperadamente baixa: ${services.length} serviços`);
  if (manifest.counts?.apiCenterPages < 372) fail(`Cobertura do API Center abaixo da linha de base: ${manifest.counts?.apiCenterPages}`);
  if (manifest.counts?.centralHelpPages < 4) fail(`Fontes da Central de Ajuda incompletas: ${manifest.counts?.centralHelpPages}`);
  if (manifest.counts?.families < 12) fail(`Cobertura de famílias abaixo da linha de base: ${manifest.counts?.families}`);
  if (manifest.counts?.serviceContractPages < 100) fail(`Menos de 100 páginas de contrato: ${manifest.counts?.serviceContractPages}`);
  if (manifest.counts?.trialScenarios < 25) fail(`Menos de 25 cenários trial: ${manifest.counts?.trialScenarios}`);
  if (manifest.counts?.catalogEntries !== services.length) fail(`Catálogo oficial (${manifest.counts?.catalogEntries}) e serviços consolidados (${services.length}) divergem`);
  if (manifest.counts?.unmappedCatalogEntries > 0) fail(`${manifest.counts.unmappedCatalogEntries} entradas do catálogo não foram associadas a contratos`);
  if (manifest.counts?.missingPages > 0) fail(`${manifest.counts.missingPages} fontes nunca foram coletadas`);
  if (manifest.counts?.stalePages > 0) warn(`${manifest.counts.stalePages} fontes estão desatualizadas, mas preservadas`);
  if (manifest.counts?.removedPages > 0) warn(`${manifest.counts.removedPages} fontes não aparecem mais na navegação oficial`);
  const nullOperations = services.filter((service) => service.operationPath === null);
  if (nullOperations.length) warn(`${nullOperations.length} serviços sem caminho físico conclusivo: ${nullOperations.map((service) => service.key).join(", ")}`);

  for (const entry of manifest.pages ?? []) {
    if (entry.status === "fetched" && !(await exists(entry.localPath))) fail(`Snapshot normalizado ausente: ${entry.localPath}`);
    if (entry.status === "fetched" && !/^[a-f0-9]{64}$/.test(entry.hash)) fail(`Hash inválido no manifesto: ${entry.url}`);
  }

  for (const path of ["README.md", "AGENTS.md", "llms.txt", "docs/guides/resumo-executivo.md", "docs/guides/visao-executiva.md", "docs/guides/autenticacao.md", "docs/guides/envelope-e-chamadas.md", "examples/typescript/integra-contador.ts", ".env.example"]) {
    const content = await readText(path);
    detectSecrets(content, path);
  }
  detectSecrets(servicesText, "catalog/services.json");

  const openapi = Bun.YAML.parse(openapiText) as { servers?: Array<{ url?: string }>; paths?: Record<string, unknown> };
  const expectedPaths = ["/Apoiar", "/Consultar", "/Declarar", "/Emitir", "/Monitorar"];
  for (const path of expectedPaths) if (!openapi.paths?.[path]) fail(`OpenAPI oficial sem o caminho ${path}`);
  if (!openapi.servers?.some((server) => server.url === "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1")) {
    fail("OpenAPI oficial sem a URL de produção esperada");
  }

  for (const message of warnings) console.warn(`AVISO: ${message}`);
  if (failures.length) {
    for (const message of failures) console.error(`ERRO: ${message}`);
    console.error(`Validação falhou com ${failures.length} erro(s) e ${warnings.length} aviso(s).`);
    process.exit(1);
  }
  console.log(`Validação concluída: ${services.length} serviços, ${manifest.pages.length} fontes, ${warnings.length} aviso(s).`);
}

await main();
