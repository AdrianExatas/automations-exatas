import fs from "fs";
import path from "path";
import { loadRuntimeAuthArtifact } from "./auth-artifact";
import { normalizeCompanyName, isDarfCotaKind, type DocumentKind } from "./document-identity";
import type {
  CalendarUpdateResult,
  CompletionResult,
  ExpressDocumentsGateway,
  IntegrationStatus,
  PublishedDocument,
  TaskDocumentAttachment,
  TaskDocumentSlot,
  TaskReference,
  TaskResolutionInput,
} from "./types";

const VERIFIED_CAPABILITIES = {
  companyLookup: true,
  taskLookup: true,
  taskCompletion: true,
  portalPublication: true,
  dueDateUpdate: true,
};

const MUTATION_UNAVAILABLE = "Login ou contratos autenticados de publicacao indisponiveis.";
type FetchLike = typeof fetch;
type RecordValue = Record<string, unknown>;

export class GatewayOperationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly stage: string,
    readonly context: { attachmentId?: string; publicationCorrelationId?: string } = {},
  ) {
    super(message);
    this.name = "GatewayOperationError";
  }
}

function records(value: unknown): RecordValue[] {
  if (Array.isArray(value)) return value.filter((item): item is RecordValue => Boolean(item && typeof item === "object"));
  if (!value || typeof value !== "object") return [];
  const record = value as RecordValue;
  for (const key of ["docs", "data", "items", "results"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return records(nested);
    if (nested && typeof nested === "object" && Array.isArray((nested as RecordValue).items)) return records((nested as RecordValue).items);
  }
  return [];
}

function dataRecord(value: unknown): RecordValue {
  if (!value || typeof value !== "object") throw new GatewayOperationError("A integracao retornou uma resposta invalida.", "INVALID_RESPONSE", "response");
  const record = value as RecordValue;
  return record.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data as RecordValue : record;
}

function attachedFileName(file: unknown): string | undefined {
  if (!file) return undefined;
  const raw = String(file);
  if (!raw) return undefined;
  try {
    const decoded = decodeURIComponent(raw);
    const quoted = /filename="([^"]+)"/i.exec(decoded);
    if (quoted) return quoted[1];
    const unquoted = /filename=([^&;]+)/i.exec(decoded);
    if (unquoted) return unquoted[1].trim();
  } catch {
    return undefined;
  }
  return undefined;
}

function competenceOf(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = String(value);
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    // Gestta grava competencia em America/Sao_Paulo; fim de junho vira 2026-07-01T02:59:59.999Z.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    if (year && month) return `${year}-${month}`;
  }
  const match = /^(\d{4})-(\d{2})/.exec(raw);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

function legalDateOf(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = String(value);
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

const UNIFIED_COTA_DOCUMENT = "COTA IRPJ E CSLL";
const UNIFIED_DARF_6012_3373 = "DARF 6012 E 3373";
const UNIFIED_COTA_DOCUMENTS = [UNIFIED_COTA_DOCUMENT, UNIFIED_DARF_6012_3373];

interface DocumentKindResolution {
  allowedDocuments: string[];
  preferredDocuments: string[];
  taskNameFilter?: string;
  taskLabel: string;
  demoDocumentName: string;
  demoTaskName: string;
}

function resolutionFor(kind: DocumentKind): DocumentKindResolution {
  if (kind === "fgts_consignado") {
    return {
      allowedDocuments: ["FGTS DIGITAL CONSIGNADO"],
      preferredDocuments: ["FGTS DIGITAL CONSIGNADO"],
      taskLabel: "FGTS Digital Consignado compativel",
      demoDocumentName: "FGTS DIGITAL CONSIGNADO",
      demoTaskName: "FGTS DIGITAL CONSIGNADO",
    };
  }
  if (kind === "fgts_digital") {
    return {
      allowedDocuments: ["FGTS DIGITAL"],
      preferredDocuments: ["FGTS DIGITAL"],
      taskLabel: "FGTS Digital compativel",
      demoDocumentName: "FGTS DIGITAL",
      demoTaskName: "FGTS DIGITAL",
    };
  }
  if (kind === "darf_6012") {
    return {
      allowedDocuments: ["DARF 6012", ...UNIFIED_COTA_DOCUMENTS],
      preferredDocuments: ["DARF 6012"],
      taskLabel: "IRPJ e CSLL em cotas",
      demoDocumentName: "DARF 6012",
      demoTaskName: "IRPJ e CSLL EM COTAS",
    };
  }
  if (kind === "darf_3373") {
    return {
      allowedDocuments: ["DARF 3373", ...UNIFIED_COTA_DOCUMENTS],
      preferredDocuments: ["DARF 3373"],
      taskLabel: "IRPJ e CSLL em cotas",
      demoDocumentName: "DARF 3373",
      demoTaskName: "IRPJ e CSLL EM COTAS",
    };
  }
  if (kind === "darf_6012_3373") {
    return {
      allowedDocuments: [...UNIFIED_COTA_DOCUMENTS],
      preferredDocuments: [...UNIFIED_COTA_DOCUMENTS],
      taskLabel: "IRPJ e CSLL em cotas",
      demoDocumentName: UNIFIED_COTA_DOCUMENT,
      demoTaskName: "IRPJ e CSLL EM COTAS",
    };
  }
  return {
    allowedDocuments: ["DARF DCTFWEB"],
    preferredDocuments: ["DARF DCTFWEB"],
    taskNameFilter: "DCTFWEB SETOR PESSOAL",
    taskLabel: "DCTFWEB",
    demoDocumentName: "DARF DCTFWEB",
    demoTaskName: "DCTFWEB - SETOR PESSOAL",
  };
}

function pickCompatibleDocument(documents: RecordValue[], resolution: DocumentKindResolution): RecordValue | undefined {
  const allowed = new Set(resolution.allowedDocuments.map(normalizeCompanyName));
  const preferred = new Set(resolution.preferredDocuments.map(normalizeCompanyName));
  const matches = documents.filter((document) =>
    allowed.has(normalizeCompanyName(String(document.name || ""))) && Boolean(document._id));
  if (matches.length === 1) return matches[0];
  const preferredMatches = matches.filter((document) => preferred.has(normalizeCompanyName(String(document.name || ""))));
  return preferredMatches.length === 1 ? preferredMatches[0] : undefined;
}

function taskStatus(value: unknown): "open" | "completed" {
  return ["OPEN", "IMPEDIMENT"].includes(String(value || "").toUpperCase()) ? "open" : "completed";
}

async function checkedJson(response: Response, operation: string, stage: string): Promise<unknown> {
  if (response.status === 401 || response.status === 403) {
    throw new GatewayOperationError(`${operation}: a sessao expirou. Autentique novamente.`, "SESSION_EXPIRED", stage);
  }
  if (!response.ok) throw new GatewayOperationError(`${operation} falhou (HTTP ${response.status}).`, "HTTP_ERROR", stage);
  try {
    return await response.json();
  } catch {
    throw new GatewayOperationError(`${operation} retornou JSON invalido.`, "INVALID_RESPONSE", stage);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GatewayOptions {
  publicationTimeoutMs?: number;
  publicationPollMs?: number;
  sleeper?: (ms: number) => Promise<void>;
}

export class AuthenticatedExpressDocumentsGateway implements ExpressDocumentsGateway {
  private readonly publicationTimeoutMs: number;
  private readonly publicationPollMs: number;
  private readonly sleeper: (ms: number) => Promise<void>;

  constructor(
    private readonly artifactPath: string,
    private readonly fetcher: FetchLike = fetch,
    options: GatewayOptions = {},
  ) {
    this.publicationTimeoutMs = options.publicationTimeoutMs ?? 5 * 60_000;
    this.publicationPollMs = options.publicationPollMs ?? 10_000;
    this.sleeper = options.sleeper ?? sleep;
  }

  status(): IntegrationStatus {
    return { available: true, mode: "verified", contractVersion: "express-documents-v1", capabilities: VERIFIED_CAPABILITIES };
  }

  private auth() {
    const artifact = loadRuntimeAuthArtifact(this.artifactPath);
    if (!artifact) throw new GatewayOperationError("Login nao encontrado. Autentique novamente.", "SESSION_MISSING", "preflight");
    return artifact;
  }

  private gesttaHeaders(json = false): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `JWT ${this.auth().gestta.jwt}`,
      Origin: "https://app.gestta.com.br",
      Referer: "https://app.gestta.com.br/",
    };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
  }

  private onvioHeaders(firmId?: string, json = false): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `UDSLongToken ${this.auth().onvio.udsLongToken}`,
      Referer: "https://onvio.com.br/staff/",
      Accept: "application/json",
    };
    if (firmId) headers["x-company-id"] = firmId;
    if (json) headers["Content-Type"] = "application/json; charset=UTF-8";
    return headers;
  }

  private async firmId(): Promise<string> {
    const response = await this.fetcher("https://onvio.com.br/api/profiles/v1/accounts?active=true&hideNonOnvio=true", {
      headers: this.onvioHeaders(), signal: AbortSignal.timeout(30_000),
    });
    const ids = records(await checkedJson(response, "Consulta do escritorio no Onvio", "preflight"))
      .map((item) => String(item.companyId || "")).filter(Boolean);
    if (ids.length !== 1) throw new GatewayOperationError("O escritorio Onvio nao foi identificado de forma unica.", "FIRM_AMBIGUOUS", "preflight");
    return ids[0];
  }

  private async taskDetails(taskId: string): Promise<RecordValue> {
    const response = await this.fetcher(`https://api.gestta.com.br/core/customer/task/${encodeURIComponent(taskId)}`, {
      headers: this.gesttaHeaders(), signal: AbortSignal.timeout(30_000),
    });
    return dataRecord(await checkedJson(response, "Consulta atual da tarefa no Express", "task_revalidation"));
  }

  async findTasks(input: TaskResolutionInput): Promise<TaskReference[]> {
    const compatible = await this.compatibleTasks(input);
    return compatible.map((item) => this.toTaskReference(input.company, item));
  }

  async resolveTask(input: TaskResolutionInput): Promise<TaskReference> {
    const compatible = await this.compatibleTasks(input);
    const resolution = input.documentKind ? resolutionFor(input.documentKind) : undefined;
    const taskLabel = resolution?.taskLabel || "compativel";
    if (input.preferredTaskId) {
      const preferred = compatible.find((item) => String(item.task._id) === input.preferredTaskId);
      if (!preferred) throw new Error("A tarefa selecionada nao corresponde mais a empresa e ao documento.");
      return this.toTaskReference(input.company, preferred);
    }
    if (compatible.length === 0) {
      throw new Error(isDarfCotaKind(input.documentKind)
        ? `Nenhuma tarefa ${taskLabel} em aberto foi encontrada para ${input.company.name}.`
        : `Nenhuma tarefa ${taskLabel} em aberto foi encontrada para ${input.company.name} na competencia ${input.competence}.`);
    }
    if (compatible.length > 1) {
      throw new Error(isDarfCotaKind(input.documentKind)
        ? `Mais de uma tarefa ${taskLabel} em aberto foi encontrada para ${input.company.name}.`
        : `Mais de uma tarefa ${taskLabel} em aberto foi encontrada para ${input.company.name} na competencia ${input.competence}.`);
    }
    return this.toTaskReference(input.company, compatible[0]);
  }

  private async compatibleTasks(input: TaskResolutionInput): Promise<Array<{ task: RecordValue; details: RecordValue; document: RecordValue }>> {
    if (!input.documentKind) throw new Error("O tipo do documento nao permite resolver uma tarefa com seguranca.");
    const darfCota = isDarfCotaKind(input.documentKind);
    if (!darfCota && !input.competence) throw new Error("A competencia do PDF nao foi identificada de forma unica.");
    if (darfCota && !input.competence && !input.dueDate) {
      throw new Error("A competencia ou o vencimento do PDF nao foram identificados de forma unica.");
    }
    const response = await this.fetcher("https://api.gestta.com.br/core/customer/task/search", {
      method: "POST", headers: this.gesttaHeaders(true),
      body: JSON.stringify({ page: 1, limit: 500, customer: [input.company.id], status: ["OPEN", "IMPEDIMENT"] }),
      signal: AbortSignal.timeout(30_000),
    });
    const tasks = records(await checkedJson(response, "Consulta de tarefas no Express", "task_lookup")).filter((task) => {
      const customer = task.customer && typeof task.customer === "object" ? task.customer as RecordValue : {};
      if (String(customer._id || "") !== input.company.id || taskStatus(task.status) !== "open") return false;
      if (!darfCota) return competenceOf(task.competence_date) === input.competence;
      return true;
    });
    const resolution = resolutionFor(input.documentKind);
    const namedTasks = resolution.taskNameFilter
      ? tasks.filter((task) => normalizeCompanyName(String(task.name || "")) === resolution.taskNameFilter)
      : tasks;
    const detailedTasks = await Promise.all(namedTasks.map(async (task) => ({
      task,
      details: await this.taskDetails(String(task._id)),
    })));
    let compatible = detailedTasks.flatMap(({ task, details }) => {
      const document = pickCompatibleDocument(records(details.company_documents), resolution);
      return document ? [{ task, details, document }] : [];
    });
    if (darfCota && compatible.length > 1 && input.dueDate) {
      compatible = compatible.filter(({ task, details }) =>
        legalDateOf(details.legal_date ?? task.legal_date) === input.dueDate);
    }
    return compatible;
  }

  private toTaskReference(
    company: TaskResolutionInput["company"],
    item: { task: RecordValue; document: RecordValue },
  ): TaskReference {
    return {
      id: String(item.task._id),
      name: String(item.task.name),
      competence: competenceOf(item.task.competence_date),
      status: "open",
      company,
      companyDocumentId: String(item.document._id),
      companyDocumentName: String(item.document.name || ""),
    };
  }

  private async validatedTaskDetails(task: TaskReference): Promise<RecordValue> {
    const details = await this.taskDetails(task.id);
    const customer = details.customer && typeof details.customer === "object" ? details.customer as RecordValue : {};
    if (String(customer._id || "") !== task.company.id) {
      throw new GatewayOperationError("A tarefa passou a pertencer a outra empresa.", "TASK_COMPANY_CHANGED", "task_revalidation");
    }
    if (competenceOf(details.competence_date) !== task.competence) {
      throw new GatewayOperationError("A competencia da tarefa foi alterada.", "TASK_COMPETENCE_CHANGED", "task_revalidation");
    }
    if (task.companyDocumentId && !records(details.company_documents).some((document) => String(document._id || "") === task.companyDocumentId)) {
      throw new GatewayOperationError("O documento configurado foi removido da tarefa.", "TASK_DOCUMENT_CHANGED", "task_revalidation");
    }
    return details;
  }

  async getTaskStatus(task: TaskReference): Promise<"open" | "completed"> {
    return taskStatus((await this.validatedTaskDetails(task)).status);
  }

  async getTaskDocumentAttachment(task: TaskReference): Promise<TaskDocumentAttachment> {
    if (!task.companyDocumentId) throw new GatewayOperationError("O tipo de documento da tarefa nao foi resolvido.", "DOCUMENT_TYPE_MISSING", "task_revalidation");
    const details = await this.validatedTaskDetails(task);
    const document = records(details.company_documents).find((item) => String(item._id || "") === task.companyDocumentId);
    if (!document) throw new GatewayOperationError("O documento configurado foi removido da tarefa.", "TASK_DOCUMENT_CHANGED", "task_revalidation");
    const fileName = attachedFileName(document.file);
    return { present: Boolean(document.file), fileName };
  }

  async listTaskDocumentSlots(task: TaskReference): Promise<TaskDocumentSlot[]> {
    const details = await this.validatedTaskDetails(task);
    return records(details.company_documents)
      .filter((document) => document.disconsidered !== true)
      .map((document) => ({
        id: String(document._id || ""),
        name: String(document.name || ""),
        present: Boolean(document.file),
      }))
      .filter((slot) => slot.id);
  }

  async completeTaskWithDocument(input: { task: TaskReference; filePath: string; sha256: string }): Promise<CompletionResult> {
    if (!input.task.companyDocumentId) throw new GatewayOperationError("O tipo de documento da tarefa nao foi resolvido.", "DOCUMENT_TYPE_MISSING", "upload");
    if (await this.getTaskStatus(input.task) !== "open") {
      throw new GatewayOperationError("A tarefa nao esta mais em aberto.", "TASK_NOT_OPEN", "task_revalidation");
    }
    const duplicate = await this.findPublishedDocument({ task: input.task, fileName: path.basename(input.filePath), sha256: input.sha256 });
    if (duplicate) throw new GatewayOperationError("Um documento com o mesmo nome ja foi publicado para a empresa.", "PORTAL_DUPLICATE", "preflight");

    const bytes = fs.readFileSync(input.filePath);
    const form = new FormData();
    form.append("customer_task", input.task.id);
    form.append("company_document", input.task.companyDocumentId);
    form.append("file", new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), path.basename(input.filePath));
    const uploadResponse = await this.fetcher("https://api.gestta.com.br/es/file/upload/automatic", {
      method: "POST", headers: { ...this.gesttaHeaders(), "x-version": "v2" }, body: form,
      signal: AbortSignal.timeout(120_000),
    });
    const upload = dataRecord(await checkedJson(uploadResponse, "Anexo do PDF no Express", "upload"));
    const attachmentId = String(upload._id || "");
    const uploadedTask = upload.customer_task && typeof upload.customer_task === "object" ? upload.customer_task as RecordValue : {};
    const uploadedDocument = upload.company_document && typeof upload.company_document === "object" ? upload.company_document as RecordValue : {};
    if (!attachmentId || String(uploadedTask._id || "") !== input.task.id || String(uploadedDocument._id || "") !== input.task.companyDocumentId) {
      throw new GatewayOperationError("O Express retornou um anexo sem os vinculos esperados.", "UPLOAD_MISMATCH", "upload", { attachmentId });
    }
    if (await this.getTaskStatus(input.task) !== "open") {
      throw new GatewayOperationError("A tarefa mudou de estado depois do anexo; a conclusao nao foi repetida.", "TASK_CHANGED_AFTER_UPLOAD", "completion", { attachmentId, publicationCorrelationId: attachmentId });
    }
    try {
      const confirmResponse = await this.fetcher(`https://api.gestta.com.br/es/file/${encodeURIComponent(attachmentId)}/confirm`, {
        method: "POST", headers: this.gesttaHeaders(true),
        body: JSON.stringify({ company_document: input.task.companyDocumentId, customer_task: input.task.id }),
        signal: AbortSignal.timeout(60_000),
      });
      if (confirmResponse.status === 401 || confirmResponse.status === 403) throw new GatewayOperationError("A sessao expirou durante a conclusao.", "SESSION_EXPIRED", "completion");
      if (!confirmResponse.ok) throw new GatewayOperationError(`A conclusao da tarefa falhou (HTTP ${confirmResponse.status}); ela nao sera repetida automaticamente.`, "COMPLETION_UNCERTAIN", "completion");
      const text = (await confirmResponse.text()).trim();
      if (text !== "OK") throw new GatewayOperationError("A conclusao retornou um resultado inesperado e nao sera repetida automaticamente.", "COMPLETION_UNCERTAIN", "completion");
    } catch (error) {
      if (error instanceof GatewayOperationError) {
        throw new GatewayOperationError(error.message, error.code, error.stage, { attachmentId, publicationCorrelationId: attachmentId });
      }
      throw new GatewayOperationError("O resultado da conclusao e incerto; a operacao nao sera repetida automaticamente.", "COMPLETION_UNCERTAIN", "completion", { attachmentId, publicationCorrelationId: attachmentId });
    }
    return { attachmentId, publicationCorrelationId: attachmentId };
  }

  private async portalProjects(clientId: string): Promise<RecordValue[]> {
    const url = new URL("https://onvio.com.br/api/storage/v1/projects");
    url.search = new URLSearchParams({ primaryAssociationId: clientId, primaryAssociationType: "Client", getScheduleItems: "true" }).toString();
    const response = await this.fetcher(url, { headers: this.onvioHeaders(), signal: AbortSignal.timeout(30_000) });
    const projects = records(await checkedJson(response, "Consulta das pastas do Portal", "portal_search"));
    if (!projects.length) throw new GatewayOperationError("Nenhum projeto do Portal foi encontrado para a empresa.", "PORTAL_PROJECTS_MISSING", "portal_search");
    return projects;
  }

  async findPublishedDocument(input: { task: TaskReference; fileName: string; sha256: string; publicationCorrelationId?: string }): Promise<PublishedDocument | undefined> {
    const clientId = input.task.company.onvioId;
    if (!clientId) throw new GatewayOperationError("A empresa nao possui identificador Onvio.", "ONVIO_LINK_MISSING", "portal_search");
    const projects = await this.portalProjects(clientId);
    const containers = projects.map((project) => ({ containerType: "projects", containerId: String(project.id || project.guid || ""), parentId: clientId }))
      .filter((item) => item.containerId);
    const response = await this.fetcher("https://onvio.com.br/api/storage/v2/search/documents?fromIndex=0&pageSize=100", {
      method: "POST", headers: this.onvioHeaders(undefined, true),
      body: JSON.stringify({ searchTerm: input.fileName, sortBy: [{ fieldName: "name", order: "Ascending" }], containers }),
      signal: AbortSignal.timeout(30_000),
    });
    const matches = records(await checkedJson(response, "Busca do documento publicado", "portal_search")).filter((item) => {
      const metadata = item.itemMetadata && typeof item.itemMetadata === "object" ? item.itemMetadata as RecordValue : {};
      if (String(metadata.name || "") !== input.fileName || Boolean(item.isObjectNotFound)) return false;
      const itemContainers = records(item.containers);
      return itemContainers.some((container) => records(container.containerPath).some((part) =>
        String(part.primaryAssociationId || "") === clientId || String(part.containerId || "") === clientId));
    });
    if (matches.length > 1) throw new GatewayOperationError("Mais de um documento com o mesmo nome foi localizado no Portal.", "PORTAL_DOCUMENT_AMBIGUOUS", "portal_search");
    if (!matches.length) return undefined;
    const match = matches[0];
    const itemContainers = records(match.containers);
    const folderId = String(itemContainers[0]?.containerId || "");
    const pathParts = records(itemContainers[0]?.containerPath);
    const projectId = String(pathParts.find((item) => String(item.containerType || "").toLowerCase() === "projects")?.containerId || "");
    if (!match.guid || !folderId) throw new GatewayOperationError("O Portal retornou o documento sem IDs de pasta.", "PORTAL_RESPONSE_INVALID", "portal_search");
    return { id: String(match.guid), folderId, projectId: projectId || undefined };
  }

  async waitForPublishedDocument(input: { task: TaskReference; fileName: string; sha256: string; publicationCorrelationId: string }): Promise<PublishedDocument> {
    const deadline = Date.now() + this.publicationTimeoutMs;
    do {
      const found = await this.findPublishedDocument(input);
      if (found) return found;
      if (Date.now() >= deadline) break;
      await this.sleeper(this.publicationPollMs);
    } while (true);
    throw new GatewayOperationError("Tempo esgotado aguardando a publicacao no Portal do Cliente.", "PUBLICATION_TIMEOUT", "portal_publication");
  }

  async setDocumentDueDate(input: { company: TaskReference["company"]; document: PublishedDocument; dueDate: string; showInTaxCalendar: true }): Promise<CalendarUpdateResult> {
    if (!input.company.onvioId) throw new GatewayOperationError("A empresa nao possui identificador Onvio.", "ONVIO_LINK_MISSING", "due_date");
    const firmId = await this.firmId();
    const route = `https://onvio.com.br/api/storage/v1/Folders/${encodeURIComponent(input.document.folderId)}/documents/${encodeURIComponent(input.document.id)}`;
    const metadataResponse = await this.fetcher(`${route}/metadata?LoadItemMetadata=false`, {
      headers: this.onvioHeaders(firmId), signal: AbortSignal.timeout(30_000),
    });
    const metadata = dataRecord(await checkedJson(metadataResponse, "Leitura do documento no Onvio", "due_date"));
    if (String(metadata.id || "") !== input.document.id || String(metadata.containerId || "") !== input.document.folderId
      || String(metadata.primaryAssociationClientId || "") !== input.company.onvioId) {
      throw new GatewayOperationError("Os metadados do documento nao correspondem a empresa e pasta validadas.", "DOCUMENT_METADATA_MISMATCH", "due_date");
    }
    const customFields = metadata.customFields && typeof metadata.customFields === "object" ? metadata.customFields as RecordValue : {};
    const userTags = Array.isArray(metadata.userTags) ? metadata.userTags.map(String) : [];
    const expectedDueDate = `${input.dueDate}T00:00:00`;
    const alreadyTagged = userTags.includes("TAX_DOCUMENT");
    if (String(customFields.dueDate || "").startsWith(input.dueDate) && alreadyTagged) {
      return { documentId: input.document.id, dueDate: input.dueDate, shownInTaxCalendar: true };
    }
    const body = {
      ...metadata,
      customFields: { ...customFields, clientId: input.company.onvioId, dueDate: expectedDueDate },
      addUserTags: alreadyTagged ? [] : ["TAX_DOCUMENT"],
    };
    const updateResponse = await this.fetcher(route, {
      method: "PUT", headers: this.onvioHeaders(firmId, true), body: JSON.stringify(body), signal: AbortSignal.timeout(60_000),
    });
    const updated = dataRecord(await checkedJson(updateResponse, "Atualizacao do vencimento no Onvio", "due_date"));
    const updatedFields = updated.customFields && typeof updated.customFields === "object" ? updated.customFields as RecordValue : {};
    const updatedTags = Array.isArray(updated.userTags) ? updated.userTags.map(String) : [];
    if (!String(updatedFields.dueDate || "").startsWith(input.dueDate) || !updatedTags.includes("TAX_DOCUMENT")) {
      throw new GatewayOperationError("O Onvio nao confirmou o vencimento no calendario.", "DUE_DATE_NOT_CONFIRMED", "due_date");
    }
    return { documentId: input.document.id, dueDate: input.dueDate, shownInTaxCalendar: true };
  }
}

export class UnavailableExpressDocumentsGateway implements ExpressDocumentsGateway {
  status(): IntegrationStatus {
    return { available: false, mode: "unavailable", reason: MUTATION_UNAVAILABLE, capabilities: {
      companyLookup: false, taskLookup: false, taskCompletion: false, portalPublication: false, dueDateUpdate: false,
    } };
  }
  async findTasks(): Promise<TaskReference[]> { throw new Error(this.status().reason); }
  async resolveTask(): Promise<TaskReference> { throw new Error(this.status().reason); }
  async getTaskStatus(): Promise<"open" | "completed"> { throw new Error(MUTATION_UNAVAILABLE); }
  async getTaskDocumentAttachment(): Promise<TaskDocumentAttachment> { throw new Error(MUTATION_UNAVAILABLE); }
  async listTaskDocumentSlots(): Promise<TaskDocumentSlot[]> { throw new Error(MUTATION_UNAVAILABLE); }
  async findPublishedDocument(): Promise<PublishedDocument | undefined> { throw new Error(MUTATION_UNAVAILABLE); }
  async completeTaskWithDocument(): Promise<CompletionResult> { throw new Error(MUTATION_UNAVAILABLE); }
  async waitForPublishedDocument(): Promise<PublishedDocument> { throw new Error(MUTATION_UNAVAILABLE); }
  async setDocumentDueDate(): Promise<CalendarUpdateResult> { throw new Error(MUTATION_UNAVAILABLE); }
}

export class DemoExpressDocumentsGateway implements ExpressDocumentsGateway {
  taskDocumentAttachment: TaskDocumentAttachment = { present: false };
  taskDocumentSlots?: TaskDocumentSlot[];
  private readonly completedDocumentIds = new Set<string>();

  status(): IntegrationStatus {
    return { available: true, mode: "demo", contractVersion: "demo-v3", capabilities: VERIFIED_CAPABILITIES };
  }
  async findTasks(input: TaskResolutionInput): Promise<TaskReference[]> {
    return [await this.resolveTask(input)];
  }
  async resolveTask(input: TaskResolutionInput): Promise<TaskReference> {
    const resolution = input.documentKind ? resolutionFor(input.documentKind) : resolutionFor("dctfweb");
    return {
      id: input.preferredTaskId || `demo-task-${input.sha256.slice(0, 12)}`,
      name: resolution.demoTaskName,
      competence: input.competence,
      status: "open",
      company: input.company,
      companyDocumentId: "demo-document-type",
      companyDocumentName: resolution.demoDocumentName,
    };
  }
  async getTaskStatus(): Promise<"open"> { return "open"; }
  async getTaskDocumentAttachment(): Promise<TaskDocumentAttachment> { return this.taskDocumentAttachment; }
  async listTaskDocumentSlots(task: TaskReference): Promise<TaskDocumentSlot[]> {
    if (this.taskDocumentSlots) {
      return this.taskDocumentSlots.map((slot) => ({
        ...slot,
        present: slot.present || this.completedDocumentIds.has(slot.id),
      }));
    }
    return [{
      id: task.companyDocumentId || "demo-document-type",
      name: task.companyDocumentName || "DARF DCTFWEB",
      present: true,
    }];
  }
  async findPublishedDocument(): Promise<undefined> { return undefined; }
  async completeTaskWithDocument(input: { task: TaskReference; sha256: string }): Promise<CompletionResult> {
    if (input.task.companyDocumentId) this.completedDocumentIds.add(input.task.companyDocumentId);
    return { attachmentId: `attachment-${input.sha256.slice(0, 12)}`, publicationCorrelationId: `publication-${input.task.id}` };
  }
  async waitForPublishedDocument(input: { sha256: string }): Promise<PublishedDocument> {
    return { id: `document-${input.sha256.slice(0, 12)}`, folderId: "demo-tax-folder", projectId: "demo-tax-project" };
  }
  async setDocumentDueDate(input: { document: PublishedDocument; dueDate: string }): Promise<CalendarUpdateResult> {
    return { documentId: input.document.id, dueDate: input.dueDate, shownInTaxCalendar: true };
  }
}

export function createExpressDocumentsGateway(artifactPath?: string): ExpressDocumentsGateway {
  if (process.env.EXPRESS_DOCUMENTS_DEMO === "1") return new DemoExpressDocumentsGateway();
  return artifactPath ? new AuthenticatedExpressDocumentsGateway(artifactPath) : new UnavailableExpressDocumentsGateway();
}
