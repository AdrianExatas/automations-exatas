import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type * as ServiceRequests from "@exatas/onvio-solicitacoes-servico";
import type { AuthManager } from "../auth/auth-manager.js";
import type { CapabilityCatalog } from "../catalog/catalog.js";
import type { AppConfig } from "../config.js";
import type { ApiClient } from "../http/api-client.js";
import type { CapabilityDefinition, OperationResult } from "../types.js";
import { redact } from "../security/redact.js";
import { resolveAllowedInput } from "../security/paths.js";
import { FirmResolver } from "./firm-resolver.js";
import { CustomerResolver } from "./customer-resolver.js";
import { validateInput } from "./schema-validation.js";

const require = createRequire(import.meta.url);
const { openServiceRequest } = require("@exatas/onvio-solicitacoes-servico") as typeof ServiceRequests;

function encodeOperationCursor(operationId: string, page: number): string {
  return Buffer.from(JSON.stringify({ operationId, page }), "utf8").toString("base64url");
}

function decodeOperationCursor(operationId: string, cursor: unknown): number | undefined {
  if (cursor === undefined) return undefined;
  if (typeof cursor !== "string" || !cursor) throw new Error("Cursor de operação inválido.");
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Record<string, unknown>;
    if (parsed.operationId !== operationId || !Number.isInteger(parsed.page) || Number(parsed.page) < 1) throw new Error("invalid");
    return Number(parsed.page);
  } catch {
    throw new Error("Cursor de operação inválido ou pertencente a outra operação.");
  }
}

function interpolatePath(template: string, input: Record<string, unknown>): { path: string; used: Set<string> } {
  const used = new Set<string>();
  const pathValue = template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key: string) => {
    const value = input[key];
    if (value === undefined || value === null || value === "") throw new Error(`Parâmetro de rota ausente: ${key}`);
    used.add(key);
    return encodeURIComponent(String(value));
  });
  return { path: pathValue, used };
}

function buildSearchBody(input: Record<string, unknown>): Record<string, unknown> {
  const page = Number(input.page || input.pageIndex || 1);
  const limit = Number(input.limit || input.itemsPerPage || 50);
  const search = typeof input.search === "string" && input.search ? input.search : null;
  const activeFilter = input.active === false
    ? null
    : '{"useOr":true,"items":[{"by":"clientMainExpanded.status.id","op":"EQ","value":"ACTIVE"}]}';
  return {
    filterSearchSort: {
      orderBy: "name asc",
      search,
      searchBy: null,
      filter: activeFilter,
    },
    pagingDataRequest: { startIndex: null, pageIndex: page, itemsPerPage: limit },
    expand: "primaryContactExpanded",
    frp: "Onvio.StaffStorage",
    excludeCount: false,
  };
}

function stripControlInput(input: Record<string, unknown>, used: Set<string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => !used.has(key) && key !== "firmId" && key !== "cursor" && value !== undefined,
    ),
  );
}

function extractItems(data: unknown): { items?: unknown[]; meta?: Record<string, unknown> } {
  if (Array.isArray(data)) return { items: data };
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.docs)) {
    const { docs, ...meta } = record;
    return { items: docs, meta };
  }
  if (Array.isArray(record.items)) {
    const { items, ...meta } = record;
    return { items, meta };
  }
  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) return { items: nested.items, meta: { ...record, data: undefined } };
    if (Array.isArray(record.data)) return { items: record.data as unknown[] };
  }
  return {};
}

export class OperationExecutor {
  readonly firms: FirmResolver;
  readonly customers: CustomerResolver;

  constructor(
    private readonly config: AppConfig,
    private readonly auth: AuthManager,
    private readonly client: ApiClient,
    private readonly catalog: CapabilityCatalog,
  ) {
    this.firms = new FirmResolver(client);
    this.customers = new CustomerResolver(client, this.firms);
  }

  async query(operationId: string, input: Record<string, unknown>): Promise<OperationResult> {
    const capability = await this.catalog.runtime(operationId);
    if (capability.kind !== "read") throw new Error(`${operationId} é uma operação de escrita; use prepare/commit.`);
    return this.execute(capability, input, false);
  }

  async write(operationId: string, input: Record<string, unknown>): Promise<OperationResult> {
    const capability = await this.catalog.runtime(operationId);
    if (capability.kind !== "write") throw new Error(`${operationId} é uma operação de leitura.`);
    return this.execute(capability, input, true);
  }

  private async execute(
    capability: CapabilityDefinition & { available?: boolean; availabilityReason?: string },
    rawInput: Record<string, unknown>,
    allowWrite: boolean,
  ): Promise<OperationResult> {
    if (capability.status !== "verified" || capability.available === false) {
      throw new Error(`Operação indisponível: ${capability.availabilityReason || capability.unavailableReason || capability.status}`);
    }
    if (capability.kind === "write" && !allowWrite) throw new Error("Escrita bloqueada fora do commit.");
    const input = { ...(capability.request?.defaultInput || {}), ...rawInput };
    const cursorPage = decodeOperationCursor(capability.operationId, input.cursor);
    delete input.cursor;
    if (cursorPage !== undefined) {
      if (capability.inputSchema.properties?.page) input.page = cursorPage;
      else if (capability.inputSchema.properties?.pageIndex) input.pageIndex = cursorPage;
      else throw new Error("Esta operação não oferece paginação por cursor.");
    }
    if (capability.operationId === "unified.customer.resolve") {
      validateInput(capability.inputSchema, input);
      const data = await this.customers.resolve(input);
      return { operationId: capability.operationId, success: true, summary: "Cliente resolvido sem ambiguidade.", data };
    }
    let resolvedFirmId: string | undefined;
    if (capability.product !== "gestta" && capability.product !== "external") {
      resolvedFirmId = await this.firms.resolve(input.firmId);
      if (capability.inputSchema.properties?.firmId || capability.request?.path.includes("{firmId}")) input.firmId = resolvedFirmId;
      else delete input.firmId;
    }
    validateInput(capability.inputSchema, input);

    if (capability.operationId === "onvio.service_requests.create") {
      return this.createServiceRequest(capability.operationId, input);
    }
    if (capability.operationId === "onvio.storage.document.upload") {
      return this.uploadDocument(capability.operationId, input);
    }
    if (capability.operationId === "onvio.storage.document.move") {
      return this.moveDocument(capability.operationId, input);
    }
    if (capability.operationId === "onvio.storage.document.download") {
      const uri = `gestta-onvio://documents/onvio/${encodeURIComponent(String(input.folderId))}/${encodeURIComponent(String(input.documentId))}`;
      return {
        operationId: capability.operationId,
        success: true,
        summary: "Documento disponível como recurso MCP.",
        data: { uri, outputFileName: input.outputFileName },
        resourceLinks: [{ uri, name: String(input.outputFileName || input.documentId), mimeType: "application/octet-stream" }],
      };
    }
    if (!capability.request) throw new Error("Capacidade sem contrato executável.");

    const { path: requestPath, used } = interpolatePath(capability.request.path, input);
    const remainder = stripControlInput(input, used);
    const headers: Record<string, string> = {};
    if (capability.request.provider === "onvio" && resolvedFirmId) headers["x-company-id"] = resolvedFirmId;
    const body = capability.request.bodyMode === "search"
      ? buildSearchBody(input)
      : capability.request.bodyMode === "input"
        ? remainder
        : undefined;
    const query = capability.request.method === "GET" ? remainder : undefined;
    const data = await this.client.request({
      provider: capability.request.provider,
      method: capability.request.method,
      path: requestPath,
      query,
      body,
      headers,
      readLike: capability.request.readLike || capability.kind === "read",
      responseMode: capability.request.responseMode,
    });
    const normalized = extractItems(data);
    const page = Number(input.page || input.pageIndex || 1);
    const limit = Number(input.limit || input.itemsPerPage || 50);
    const nextCursor = normalized.items && normalized.items.length >= limit
      ? encodeOperationCursor(capability.operationId, page + 1)
      : undefined;
    return {
      operationId: capability.operationId,
      success: true,
      summary: `${capability.title} concluído.`,
      data: normalized.items ? { items: normalized.items, meta: { ...normalized.meta, nextCursor } } : data,
    };
  }

  private async createServiceRequest(operationId: string, input: Record<string, unknown>): Promise<OperationResult> {
    const attachments = Array.isArray(input.attachments)
      ? input.attachments.map((raw) => {
          const item = raw as Record<string, unknown>;
          const filePath = resolveAllowedInput(String(item.path), this.config.allowedRoots);
          return { fileBuffer: fs.readFileSync(filePath), fileName: String(item.fileName || path.basename(filePath)) };
        })
      : [];
    const result = await openServiceRequest({
      token: this.auth.getOnvioToken(),
      departmentId: String(input.departmentId),
      requesterId: input.requesterId ? String(input.requesterId) : undefined,
      clientId: String(input.clientId),
      subject: String(input.subject),
      description: String(input.description),
      attachments,
    });
    return { operationId, success: true, summary: "Solicitação de serviço criada.", data: redact(result) };
  }

  private async uploadDocument(operationId: string, input: Record<string, unknown>): Promise<OperationResult> {
    const filePath = resolveAllowedInput(String(input.filePath), this.config.allowedRoots);
    const form = new FormData();
    form.append("file[]", new Blob([new Uint8Array(fs.readFileSync(filePath))]), path.basename(filePath));
    const folderId = encodeURIComponent(String(input.folderId));
    const data = await this.client.request({
      provider: "onvio",
      method: "POST",
      path: `/api/storage/v1/folders/${folderId}/documents`,
      query: { notify: input.notify === true },
      body: form,
      headers: { "x-company-id": String(input.firmId) },
    });
    return { operationId, success: true, summary: "Documento enviado.", data };
  }

  private async moveDocument(operationId: string, input: Record<string, unknown>): Promise<OperationResult> {
    const source = encodeURIComponent(String(input.sourceFolderId));
    const documentId = encodeURIComponent(String(input.documentId));
    const metadata = await this.client.request<Record<string, unknown>>({
      provider: "onvio",
      method: "GET",
      path: `/api/storage/v1/folders/${source}/documents/${documentId}`,
      headers: { "x-company-id": String(input.firmId) },
      readLike: true,
    });
    const payload = { ...metadata, containerId: input.targetFolderId, parentId: input.targetFolderId };
    const data = await this.client.request({
      provider: "onvio",
      method: "PUT",
      path: `/api/storage/v1/folders/${source}/documents/${documentId}`,
      headers: { "x-company-id": String(input.firmId) },
      body: payload,
    });
    return { operationId, success: true, summary: "Documento movido.", data };
  }
}
