import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { z } from "zod";
import { AuthManager } from "./auth/auth-manager.js";
import { CapabilityCatalog } from "./catalog/catalog.js";
import { FrontendVersionGuard } from "./catalog/version-guard.js";
import { loadConfig, type AppConfig } from "./config.js";
import { ApiClient } from "./http/api-client.js";
import { ChangeEngine } from "./operations/change-engine.js";
import { OperationExecutor } from "./operations/executor.js";
import { JobStore } from "./operations/job-store.js";
import { DocumentResources } from "./resources/documents.js";
import { AuditLogger } from "./security/audit.js";
import { redact, safeError } from "./security/redact.js";

const productSchema = z.enum(["gestta", "onvio_gestao", "onvio_portal", "onvio_messenger", "external"]);
const kindSchema = z.enum(["read", "write"]);
const statusSchema = z.enum(["verified", "unavailable", "policy_blocked", "drifted"]);
const jsonObjectSchema = z.record(z.string(), z.unknown());

function jsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(redact(value))) as T;
}

function success(value: unknown) {
  const clean = jsonValue(value);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(clean, null, 2) }],
    structuredContent: clean as Record<string, unknown>,
  };
}

function failure(error: unknown) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: safeError(error) }],
  };
}

function guarded<TArgs extends Record<string, unknown>>(
  callback: (args: TArgs) => Promise<unknown> | unknown,
) {
  return async (args: TArgs) => {
    try {
      return success(await callback(args));
    } catch (error) {
      return failure(error);
    }
  };
}

export interface AppServices {
  config: AppConfig;
  auth: AuthManager;
  client: ApiClient;
  versionGuard: FrontendVersionGuard;
  catalog: CapabilityCatalog;
  executor: OperationExecutor;
  changes: ChangeEngine;
  jobs: JobStore;
  documents: DocumentResources;
}

export function createServices(config = loadConfig()): AppServices {
  const auth = new AuthManager(config);
  const client = new ApiClient(config, auth);
  const versionGuard = new FrontendVersionGuard();
  const catalog = new CapabilityCatalog(client, versionGuard);
  const executor = new OperationExecutor(config, auth, client, catalog);
  const audit = new AuditLogger(config);
  const changes = new ChangeEngine(config, catalog, executor, audit);
  const jobs = new JobStore();
  const documents = new DocumentResources(config, client, executor.firms, catalog);
  return { config, auth, client, versionGuard, catalog, executor, changes, jobs, documents };
}

export function createServer(services = createServices()): McpServer {
  const server = new McpServer(
    { name: "gestta-onvio", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  server.registerTool(
    "gestta_onvio_auth_status",
    { title: "Status da autenticação", description: "Verifica a sessão sem revelar tokens.", inputSchema: z.object({}) },
    guarded(async () => services.auth.status()),
  );

  server.registerTool(
    "gestta_onvio_auth_refresh",
    {
      title: "Renovar autenticação",
      description: "Renova o artefato compartilhado por navegador e nunca retorna credenciais.",
      inputSchema: z.object({ headed: z.boolean().optional().default(false) }),
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: true },
    },
    guarded(async ({ headed }) => {
      const result = await services.auth.refresh(headed);
      services.catalog.invalidateEntitlements();
      services.versionGuard.invalidate();
      return result;
    }),
  );

  server.registerTool(
    "gestta_onvio_capabilities",
    {
      title: "Catálogo de capacidades",
      description: "Lista operações e seu estado efetivo para as permissões/licenças atuais.",
      inputSchema: z.object({
        product: productSchema.optional(),
        domain: z.string().optional(),
        kind: kindSchema.optional(),
        status: statusSchema.optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional().default(50),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    guarded((args) => services.catalog.list(args)),
  );

  server.registerTool(
    "gestta_onvio_query",
    {
      title: "Consultar Gestta/Onvio",
      description: "Executa somente uma operação de leitura verificada do catálogo.",
      inputSchema: z.object({ operationId: z.string().min(1), input: jsonObjectSchema.default({}) }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    guarded(({ operationId, input }) => services.executor.query(operationId, input)),
  );

  server.registerTool(
    "gestta_onvio_prepare",
    {
      title: "Preparar alteração",
      description: "Valida uma escrita e produz prévia com token temporário, sem alterar dados.",
      inputSchema: z.object({
        operationId: z.string().min(1),
        input: jsonObjectSchema.default({}),
        idempotencyKey: z.string().min(8).max(200).optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    guarded(({ operationId, input, idempotencyKey }) => services.changes.prepare(operationId, input, idempotencyKey)),
  );

  server.registerTool(
    "gestta_onvio_commit",
    {
      title: "Confirmar alteração",
      description: "Revalida e executa exatamente um plano preparado com token de uso único.",
      inputSchema: z.object({ planId: z.string().uuid(), confirmationToken: z.string().min(20) }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    guarded(({ planId, confirmationToken }) => services.changes.commit(planId, confirmationToken)),
  );

  server.registerTool(
    "gestta_onvio_cancel",
    {
      title: "Cancelar plano",
      description: "Invalida um plano preparado antes do commit.",
      inputSchema: z.object({ planId: z.string().uuid() }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guarded(({ planId }) => services.changes.cancel(planId)),
  );

  server.registerTool(
    "gestta_onvio_job_status",
    {
      title: "Status de job",
      description: "Consulta um job assíncrono pelo identificador opaco.",
      inputSchema: z.object({ jobId: z.string().uuid() }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    guarded(({ jobId }) => services.jobs.get(jobId)),
  );

  server.registerResource(
    "capabilities",
    "gestta-onvio://capabilities",
    { title: "Catálogo Gestta/Onvio", description: "Catálogo completo com disponibilidade efetiva.", mimeType: "application/json" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await services.catalog.list({ limit: 500 })) }] }),
  );

  server.registerResource(
    "operation-schema",
    new ResourceTemplate("gestta-onvio://schemas/{operationId}", { list: undefined }),
    { title: "Schema de operação", description: "Contrato versionado de entrada e saída.", mimeType: "application/json" },
    async (uri, variables) => {
      const definition = services.catalog.definition(String(variables.operationId));
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ operationId: definition.operationId, inputSchema: definition.inputSchema, outputSchema: definition.outputSchema }) }] };
    },
  );

  server.registerResource(
    "job",
    new ResourceTemplate("gestta-onvio://jobs/{jobId}", { list: undefined }),
    { title: "Job Gestta/Onvio", mimeType: "application/json" },
    async (uri, variables) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(services.jobs.get(String(variables.jobId))) }] }),
  );

  server.registerResource(
    "document",
    new ResourceTemplate("gestta-onvio://documents/{provider}/{containerId}/{documentId}", { list: undefined }),
    { title: "Documento Gestta/Onvio", description: "Conteúdo até o limite configurado ou referência segura em disco.", mimeType: "application/octet-stream" },
    async (uri, variables) => {
      const result = await services.documents.read(
        uri,
        String(variables.provider),
        String(variables.containerId),
        String(variables.documentId),
      );
      return { contents: [{ uri: result.uri, mimeType: result.mimeType, ...(result.blob ? { blob: result.blob } : { text: result.text || "" }) }] };
    },
  );

  server.registerPrompt(
    "gestta_onvio_safe_change",
    {
      title: "Alteração segura Gestta/Onvio",
      description: "Orienta o host a descobrir, preparar, revisar e confirmar uma alteração.",
      argsSchema: z.object({ objective: z.string(), customerRef: z.string().optional() }),
    },
    ({ objective, customerRef }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Objetivo: ${objective}\nCliente: ${customerRef || "não informado"}\nConsulte as capacidades, resolva o cliente se necessário, execute gestta_onvio_prepare, mostre a prévia e somente então solicite confirmação para gestta_onvio_commit.`,
        },
      }],
    }),
  );

  return server;
}
