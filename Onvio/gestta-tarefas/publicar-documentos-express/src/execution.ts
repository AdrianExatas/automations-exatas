import crypto from "crypto";
import { isIsoDate } from "./date";
import { readPdfFile, type PdfTextExtractor } from "./pdf";
import { ProcessedDocumentStore } from "./processed-store";
import { GatewayOperationError } from "./gateway";
import { CORRECTABLE_VALIDATION_CODES } from "./validation";
import type {
  BatchExecutionReport,
  CalendarUpdateResult,
  CompanyReference,
  DocumentConfirmation,
  DocumentInspection,
  ExecutionItemResult,
  ExpressDocumentsGateway,
  CompanyResolver,
  PublishedDocument,
  TaskReference,
} from "./types";

export interface ExecutionCallbacks {
  isCancellationRequested: () => boolean;
  onItemStatus?: (payload: { id: string; status: string; message: string }) => void;
}

function hardValidationErrors(row: DocumentInspection): string[] {
  return row.messages
    .filter((item) => item.severity === "error" && !CORRECTABLE_VALIDATION_CODES.has(item.code))
    .map((item) => item.message);
}

function now(): string {
  return new Date().toISOString();
}

interface PreparedItem {
  row: DocumentInspection;
  confirmation: DocumentConfirmation;
  company: CompanyReference;
  task: TaskReference;
  attachmentId?: string;
  publicationCorrelationId?: string;
  document?: PublishedDocument;
  startedAt: string;
}

export class BatchExecutor {
  constructor(
    private readonly companies: CompanyResolver,
    private readonly gateway: ExpressDocumentsGateway,
    private readonly store: ProcessedDocumentStore,
    private readonly extractText?: PdfTextExtractor,
  ) {}

  async run(
    rows: DocumentInspection[],
    confirmations: DocumentConfirmation[],
    callbacks: ExecutionCallbacks,
  ): Promise<BatchExecutionReport> {
    if (!this.gateway.status().available) throw new Error(this.gateway.status().reason || "Integracao indisponivel.");
    const startedAt = now();
    const confirmationById = new Map(confirmations.map((item) => [item.id, item]));
    const resultsById = new Map<string, ExecutionItemResult>();
    const eligible: Array<{ row: DocumentInspection; confirmation: DocumentConfirmation }> = [];

    for (const row of rows) {
      if (callbacks.isCancellationRequested()) {
        resultsById.set(row.id, this.result(row, confirmationById.get(row.id), "canceled", "Execucao cancelada antes deste documento."));
        continue;
      }
      const confirmation = confirmationById.get(row.id);
      const preflightError = this.preflightError(row, confirmation);
      if (preflightError) {
        resultsById.set(row.id, this.result(row, confirmation, "failed", preflightError));
        continue;
      }
      eligible.push({ row, confirmation: confirmation! });
    }

    const groups = new Map<string, Array<{ row: DocumentInspection; confirmation: DocumentConfirmation }>>();
    for (const item of eligible) {
      const taskId = item.row.task!.id;
      const group = groups.get(taskId) || [];
      group.push(item);
      groups.set(taskId, group);
    }

    for (const group of groups.values()) {
      const prepared: PreparedItem[] = [];
      for (const item of group) {
        if (callbacks.isCancellationRequested()) {
          resultsById.set(item.row.id, this.result(item.row, item.confirmation, "canceled", "Execucao cancelada antes deste documento."));
          continue;
        }
        callbacks.onItemStatus?.({ id: item.row.id, status: "processing", message: "Concluindo tarefa e publicando documento..." });
        const confirmed = await this.confirmDocument(item.row, item.confirmation);
        if ("status" in confirmed) {
          resultsById.set(item.row.id, confirmed);
          continue;
        }
        prepared.push(confirmed);
      }

      if (!prepared.length) continue;
      const blocked = await this.missingTaskDocumentsMessage(prepared[0].task);
      if (blocked) {
        for (const item of prepared) {
          resultsById.set(item.row.id, {
            ...this.result(item.row, item.confirmation, "pending_review", blocked, item.startedAt),
            company: item.company,
            task: item.task,
            attachmentId: item.attachmentId,
            publicationCorrelationId: item.publicationCorrelationId,
          });
        }
        continue;
      }

      for (const item of prepared) {
        if (callbacks.isCancellationRequested()) {
          resultsById.set(item.row.id, this.result(item.row, item.confirmation, "canceled", "Execucao cancelada antes deste documento.", item.startedAt));
          continue;
        }
        resultsById.set(item.row.id, await this.publishAndApplyDueDate(item, callbacks));
      }
    }

    const results = rows.map((row) => resultsById.get(row.id)).filter((item): item is ExecutionItemResult => Boolean(item));
    const finishedAt = now();
    return {
      executionId: crypto.randomUUID(),
      startedAt,
      finishedAt,
      canceled: callbacks.isCancellationRequested(),
      totals: {
        selected: rows.length,
        completed: results.filter((item) => item.status === "completed").length,
        pendingReview: results.filter((item) => item.status === "pending_review").length,
        failed: results.filter((item) => item.status === "failed").length,
        canceled: results.filter((item) => item.status === "canceled").length,
      },
      items: results,
    };
  }

  private preflightError(row: DocumentInspection, confirmation: DocumentConfirmation | undefined): string | undefined {
    const hardErrors = hardValidationErrors(row);
    if (hardErrors.length) return hardErrors.join(" ");
    if (!row.company) return "A empresa nao foi resolvida.";
    if (!row.task) return "A tarefa nao foi resolvida.";
    if (!confirmation || confirmation.sha256 !== row.sha256 || confirmation.companyId !== row.company.id || confirmation.taskId !== row.task.id) {
      return "A confirmacao nao corresponde ao documento validado.";
    }
    if (!confirmation.companyConfirmed || !confirmation.taskConfirmed || !confirmation.dueDateConfirmed || !isIsoDate(confirmation.confirmedDueDate)) {
      return "Confirme a empresa, a tarefa e o vencimento antes de executar.";
    }
    const stored = this.store.get(row.sha256, row.task.id);
    if (stored?.stage === "due_date_applied") return "Este documento ja concluiu todas as etapas para esta tarefa.";
    return undefined;
  }

  private async missingTaskDocumentsMessage(task: TaskReference): Promise<string | undefined> {
    const slots = await this.gateway.listTaskDocumentSlots(task);
    const missing = slots.filter((slot) => !slot.present);
    if (!missing.length) return undefined;
    const names = missing.map((slot) => slot.name || slot.id).join(", ");
    return `A tarefa ainda exige o documento ${names} antes da publicacao no Portal do Cliente.`;
  }

  private async confirmDocument(
    row: DocumentInspection,
    confirmation: DocumentConfirmation,
  ): Promise<PreparedItem | ExecutionItemResult> {
    const startedAt = now();
    try {
      const current = await readPdfFile(row.filePath, this.extractText);
      if (current.sha256 !== row.sha256) throw new Error("O arquivo mudou depois da validacao.");
      if (!current.extractedIdentifierType || !current.extractedIdentifierValue
        || current.unsupportedIdentifierType || current.invalidCompanyIdentifier) {
        throw new Error("O identificador da empresa deixou de ser unico e valido. Valide o documento novamente.");
      }
      const matches = await this.companies.findCompanies({
        identifierType: current.extractedIdentifierType,
        identifierValue: current.extractedIdentifierValue,
        extractedCompanyName: current.extractedCompanyName,
      });
      const company = matches.find((item) => item.id === confirmation.companyId);
      if (!row.company || !company || company.id !== row.company.id) {
        throw new Error("A empresa mudou depois da validacao. Valide o documento novamente.");
      }
      if (!row.task) throw new Error("A tarefa nao foi confirmada.");
      let stored = this.store.get(current.sha256, row.task.id);
      let task = row.task;
      if (!stored) {
        task = await this.gateway.resolveTask({
          filePath: current.filePath,
          fileName: current.fileName,
          sha256: current.sha256,
          competence: current.competence,
          dueDate: confirmation.confirmedDueDate,
          company,
          documentKind: current.documentKind,
          extractedText: current.text,
          preferredTaskId: confirmation.taskId,
        });
        if (task.id !== row.task.id || task.status !== "open") {
          throw new Error("A tarefa mudou depois da validacao. Valide o documento novamente.");
        }
      } else if (stored.taskId !== row.task.id || stored.company?.id !== company.id) {
        throw new Error("O estado salvo nao corresponde a empresa e tarefa validadas.");
      }

      let attachmentId = stored?.attachmentId;
      let publicationCorrelationId = stored?.publicationCorrelationId;
      let document = stored?.portalDocumentId && stored.portalFolderId ? {
        id: stored.portalDocumentId,
        folderId: stored.portalFolderId,
      } : undefined;

      if (stored && stored.stage !== "document_published") {
        const remoteAttachment = await this.gateway.getTaskDocumentAttachment(task);
        if (!remoteAttachment.present) {
          this.store.remove(current.sha256, task.id);
          stored = undefined;
          attachmentId = undefined;
          publicationCorrelationId = undefined;
          document = undefined;
        }
      }

      if (!stored) {
        this.store.add({
          sha256: current.sha256, taskId: task.id, fileName: current.fileName, stage: "completion_started",
          company, task, updatedAt: now(),
        });
        try {
          const completion = await this.gateway.completeTaskWithDocument({ task, filePath: current.filePath, sha256: current.sha256 });
          attachmentId = completion.attachmentId;
          publicationCorrelationId = completion.publicationCorrelationId;
          this.store.add({
            sha256: current.sha256, taskId: task.id, fileName: current.fileName, stage: "task_completed",
            company, task, attachmentId, publicationCorrelationId, updatedAt: now(),
          });
        } catch (error) {
          const context = error instanceof GatewayOperationError ? error.context : {};
          this.store.add({
            sha256: current.sha256, taskId: task.id, fileName: current.fileName,
            stage: context.attachmentId ? "attachment_uploaded" : "completion_started",
            company, task, attachmentId: context.attachmentId, publicationCorrelationId: context.publicationCorrelationId,
            lastError: error instanceof Error ? error.message : String(error), updatedAt: now(),
          });
          return {
            ...this.result(row, confirmation, "pending_review", error instanceof Error ? error.message : String(error), startedAt),
            company, task, attachmentId: context.attachmentId, publicationCorrelationId: context.publicationCorrelationId,
          };
        }
      }

      return { row, confirmation, company, task, attachmentId, publicationCorrelationId, document, startedAt };
    } catch (error) {
      return this.result(row, confirmation, "failed", error instanceof Error ? error.message : String(error), startedAt);
    }
  }

  private async publishAndApplyDueDate(item: PreparedItem, callbacks: ExecutionCallbacks): Promise<ExecutionItemResult> {
    const { row, confirmation, company, task } = item;
    let { attachmentId, publicationCorrelationId, document } = item;
    try {
      callbacks.onItemStatus?.({ id: row.id, status: "processing", message: "Aguardando o documento no Portal do Cliente..." });
      if (!document) {
        try {
          document = await this.gateway.waitForPublishedDocument({
            task, fileName: row.fileName, sha256: row.sha256,
            publicationCorrelationId: publicationCorrelationId || attachmentId || task.id,
          });
        } catch (error) {
          this.store.add({
            sha256: row.sha256, taskId: task.id, fileName: row.fileName, stage: "task_completed",
            company, task, attachmentId, publicationCorrelationId,
            lastError: error instanceof Error ? error.message : String(error), updatedAt: now(),
          });
          return {
            ...this.result(row, confirmation, "pending_review", error instanceof Error ? error.message : String(error), item.startedAt),
            company, task, attachmentId, publicationCorrelationId,
          };
        }
        this.store.add({
          sha256: row.sha256, taskId: task.id, fileName: row.fileName, stage: "document_published",
          company, task, attachmentId, publicationCorrelationId,
          portalDocumentId: document.id, portalFolderId: document.folderId, updatedAt: now(),
        });
      }

      let calendarResult: CalendarUpdateResult;
      try {
        callbacks.onItemStatus?.({ id: row.id, status: "processing", message: "Aplicando o vencimento no calendario..." });
        calendarResult = await this.gateway.setDocumentDueDate({
          company,
          document,
          dueDate: confirmation.confirmedDueDate,
          showInTaxCalendar: true,
        });
      } catch (error) {
        this.store.add({
          sha256: row.sha256, taskId: task.id, fileName: row.fileName, stage: "document_published",
          company, task, attachmentId, publicationCorrelationId,
          portalDocumentId: document.id, portalFolderId: document.folderId,
          lastError: error instanceof Error ? error.message : String(error), updatedAt: now(),
        });
        return {
          ...this.result(row, confirmation, "pending_review", error instanceof Error ? error.message : String(error), item.startedAt),
          company,
          task,
          attachmentId,
          publicationCorrelationId,
          portalDocumentId: document.id,
          portalFolderId: document.folderId,
        };
      }

      this.store.add({
        sha256: row.sha256, taskId: task.id, fileName: row.fileName, stage: "due_date_applied",
        company, task, attachmentId, publicationCorrelationId,
        portalDocumentId: document.id, portalFolderId: document.folderId,
        dueDate: confirmation.confirmedDueDate, calendarShown: calendarResult.shownInTaxCalendar, updatedAt: now(),
      });

      return {
        ...this.result(row, confirmation, "completed", "Documento publicado e vencimento aplicado.", item.startedAt),
        company,
        task,
        attachmentId,
        publicationCorrelationId,
        portalDocumentId: document.id,
        portalFolderId: document.folderId,
        calendarResult,
      };
    } catch (error) {
      return this.result(row, confirmation, "failed", error instanceof Error ? error.message : String(error), item.startedAt);
    }
  }

  private result(
    row: DocumentInspection,
    confirmation: DocumentConfirmation | undefined,
    status: ExecutionItemResult["status"],
    message: string,
    startedAt = now(),
  ): ExecutionItemResult {
    return {
      id: row.id,
      fileName: row.fileName,
      sha256: row.sha256,
      status,
      company: row.company,
      task: row.task,
      confirmedDueDate: confirmation?.confirmedDueDate,
      message,
      startedAt,
      finishedAt: now(),
    };
  }
}
