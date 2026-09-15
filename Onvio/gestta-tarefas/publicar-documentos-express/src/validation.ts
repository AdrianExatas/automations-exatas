import { isIsoDate, todayIso } from "./date";
import { normalizeCompanyName, isDarfCotaKind, cnpjDigits } from "./document-identity";
import { readPdfFile, type PdfFileData, type PdfTextExtractor } from "./pdf";
import type {
  CompanyReference, CompanyResolver, DocumentConfirmation, DocumentInspection, ExpressDocumentsGateway, TaskReference, ValidationMessage,
} from "./types";
import { ProcessedDocumentStore } from "./processed-store";

export const CORRECTABLE_VALIDATION_CODES = new Set([
  "due_date_missing",
  "due_date_ambiguous",
  "past_due_date",
  "company_ambiguous",
  "task_ambiguous",
]);

const TASK_RESOLUTION_CODES = new Set([
  "task_ambiguous",
  "task_resolution_failed",
  "task_selected",
  "task_completed",
  "task_company_mismatch",
  "competence_mismatch",
  "previous_processing_cleared",
  "duplicate_reconciliation_failed",
]);

function message(code: string, severity: ValidationMessage["severity"], text: string): ValidationMessage {
  return { code, severity, message: text };
}

function pickCompanyByName(matches: CompanyReference[], extractedName?: string): CompanyReference | undefined {
  if (!extractedName) return undefined;
  const target = normalizeCompanyName(extractedName);
  const hits = matches.filter((item) => normalizeCompanyName(item.name) === target);
  return hits.length === 1 ? hits[0] : undefined;
}

export class DocumentValidator {
  constructor(
    private readonly companies: CompanyResolver,
    private readonly gateway: ExpressDocumentsGateway,
    private readonly store: ProcessedDocumentStore,
    private readonly extractText?: PdfTextExtractor,
  ) {}

  async inspectMany(filePaths: string[]): Promise<DocumentInspection[]> {
    const seenHashes = new Set<string>();
    const results: DocumentInspection[] = [];
    for (const filePath of [...new Set(filePaths)]) {
      const row = await this.inspectOne(filePath, seenHashes);
      if (row.sha256) seenHashes.add(row.sha256);
      results.push(row);
    }
    return results;
  }

  async applySelection(row: DocumentInspection, selection: { companyId?: string; taskId?: string }): Promise<DocumentInspection> {
    if (!selection.companyId && !selection.taskId) throw new Error("Selecione uma empresa ou uma tarefa.");
    if (!row.sha256) throw new Error("Documento invalido.");
    const pdf = await readPdfFile(row.filePath, this.extractText);
    if (pdf.sha256 !== row.sha256) throw new Error("O arquivo mudou desde a validacao.");

    let company = row.company;
    let companyCandidates = row.companyCandidates;
    let task = row.task;
    let taskCandidates = row.taskCandidates;
    let messages = row.messages.filter((item) => item.code !== "company_selected" && item.code !== "task_selected");
    let duplicate = row.duplicate;

    if (selection.companyId) {
      const pool = companyCandidates?.length ? companyCandidates : (row.company ? [row.company] : []);
      const selected = pool.find((item) => item.id === selection.companyId);
      if (!selected) throw new Error("A empresa selecionada nao esta entre as opcoes identificadas.");
      company = selected;
      companyCandidates = pool.length > 1 ? pool : companyCandidates;
      task = undefined;
      taskCandidates = undefined;
      messages = messages.filter((item) => item.code !== "company_ambiguous" && !TASK_RESOLUTION_CODES.has(item.code));
      messages.push(message("company_selected", "info", "Empresa selecionada manualmente entre as opcoes de matriz e filial."));
      const resolved = await this.resolveTasks(pdf, company, messages);
      task = resolved.task;
      taskCandidates = resolved.taskCandidates;
      duplicate = resolved.duplicate ?? duplicate;
    }

    if (selection.taskId) {
      const pool = taskCandidates?.length ? taskCandidates : (task ? [task] : []);
      const selected = pool.find((item) => item.id === selection.taskId);
      if (!selected) throw new Error("A tarefa selecionada nao esta entre as opcoes identificadas.");
      task = selected;
      taskCandidates = pool.length > 1 ? pool : taskCandidates;
      messages = messages.filter((item) => item.code !== "task_ambiguous" && item.code !== "task_resolution_failed");
      messages.push(message("task_selected", "info", "Tarefa selecionada manualmente."));
    }

    return {
      ...row,
      company,
      companyCandidates,
      task,
      taskCandidates,
      messages,
      duplicate,
      status: messages.some((item) => item.severity === "error") ? "pending_review" : "ready",
    };
  }

  validateConfirmation(row: DocumentInspection, confirmation: DocumentConfirmation): ValidationMessage[] {
    const messages: ValidationMessage[] = [];
    if (confirmation.id !== row.id || confirmation.sha256 !== row.sha256) {
      messages.push(message("stale_document", "error", "O arquivo mudou desde a validacao."));
    }
    if (!row.company || confirmation.companyId !== row.company.id || !confirmation.companyConfirmed) {
      messages.push(message("company_not_confirmed", "error", "Confirme a empresa identificada."));
    }
    if (!row.task || confirmation.taskId !== row.task.id || !confirmation.taskConfirmed) {
      messages.push(message("task_not_confirmed", "error", "Confirme a tarefa identificada."));
    }
    if (!confirmation.dueDateConfirmed || !isIsoDate(confirmation.confirmedDueDate)) {
      messages.push(message("due_date_not_confirmed", "error", "Confirme uma data de vencimento valida."));
    } else if (confirmation.confirmedDueDate < todayIso()) {
      messages.push(message("past_due_date", "warning", "A data de vencimento informada ja passou."));
    }
    return messages;
  }

  private async inspectOne(filePath: string, seenHashes: Set<string>): Promise<DocumentInspection> {
    try {
      const pdf = await readPdfFile(filePath, this.extractText);
      const messages: ValidationMessage[] = [];
      let stored = this.store.get(pdf.sha256);
      let duplicate = seenHashes.has(pdf.sha256);
      if (stored && stored.stage !== "due_date_applied") {
        messages.push(message("resume_pending", "info", "Existe um processamento parcial salvo; a execucao sera retomada sem repetir a conclusao."));
      }

      if (pdf.unsupportedIdentifierType) {
        messages.push(message("company_identifier_unsupported", "error", "Guias do FGTS Digital identificadas por CAEPF ainda nao sao suportadas."));
      } else if (pdf.invalidCompanyIdentifier) {
        messages.push(message("cnpj_invalid", "error", "O identificador do empregador no PDF e invalido."));
      } else if (!pdf.documentKind?.startsWith("fgts_") && pdf.cnpjCandidates.length > 1) {
        messages.push(message("cnpj_ambiguous", "error", "Mais de um CNPJ distinto foi identificado no PDF."));
      } else if ((!pdf.extractedIdentifierType || !pdf.extractedIdentifierValue) && pdf.invalidCnpjs.length > 0) {
        messages.push(message("cnpj_invalid", "error", "O CNPJ identificado no PDF possui digitos verificadores invalidos."));
      } else if (!pdf.extractedIdentifierType || !pdf.extractedIdentifierValue) {
        messages.push(message("cnpj_missing", "error", "Nenhum CNPJ pesquisavel foi identificado no PDF."));
      } else if (!pdf.documentKind?.startsWith("fgts_") && pdf.invalidCnpjs.length > 0) {
        messages.push(message("cnpj_invalid", "error", "O CNPJ identificado no PDF possui digitos verificadores invalidos."));
      } else if (pdf.documentKind?.startsWith("fgts_") && pdf.extractedIdentifierType !== "cpf") {
        const identifierDigits = pdf.extractedIdentifierValue.replace(/\D/g, "");
        const conflicts = pdf.cnpjCandidates.filter((candidate) => {
          const digits = candidate.replace(/\D/g, "");
          return pdf.extractedIdentifierType === "cnpj_root" ? !digits.startsWith(identifierDigits) : digits !== identifierDigits;
        });
        if (conflicts.length > 0) {
          messages.push(message("cnpj_ambiguous", "error", "Mais de um CNPJ distinto foi identificado no PDF."));
        } else if (pdf.invalidCnpjs.length > 0) {
          messages.push(message("cnpj_invalid", "error", "O PDF contem um CNPJ com digitos verificadores invalidos."));
        }
      }

      const competenceValues = [...new Set(pdf.competenceCandidates.map((item) => item.value))];
      if (competenceValues.length === 0) {
        messages.push(message("competence_missing", "error", "Nenhuma competencia foi identificada no PDF."));
      } else if (competenceValues.length > 1) {
        messages.push(message("competence_conflict", "error", "O PDF contem competencias conflitantes."));
      }

      if (pdf.dueDateCandidates.length === 0) {
        messages.push(message("due_date_missing", "error", "Nenhum vencimento identificado no PDF."));
      } else if (pdf.dueDateCandidates.length > 1) {
        messages.push(message("due_date_ambiguous", "error", "Mais de um vencimento foi identificado no PDF."));
      } else if (pdf.dueDateCandidates[0] < todayIso()) {
        messages.push(message("past_due_date", "warning", "O vencimento identificado ja passou."));
      }

      let company: CompanyReference | undefined;
      let companyCandidates: CompanyReference[] | undefined;
      if (pdf.extractedIdentifierType && pdf.extractedIdentifierValue && !pdf.unsupportedIdentifierType && !pdf.invalidCompanyIdentifier) {
        try {
          const matches = await this.companies.findCompanies({
            identifierType: pdf.extractedIdentifierType,
            identifierValue: pdf.extractedIdentifierValue,
            extractedCompanyName: pdf.extractedCompanyName,
          });
          if (matches.length === 0) {
            const label = pdf.extractedIdentifierType === "cpf"
              ? `o CPF ${pdf.extractedIdentifierValue}`
              : pdf.extractedIdentifierType === "cnpj_root"
                ? `a raiz de CNPJ ${pdf.extractedIdentifierValue}`
                : `o CNPJ ${pdf.extractedIdentifierValue}`;
            messages.push(message("company_resolution_failed", "error", `Nenhum cliente ativo foi encontrado no Gestta para ${label}.`));
          } else if (matches.length === 1) {
            company = matches[0];
            this.pushCompanyResolvedMessage(pdf, company, messages);
          } else {
            companyCandidates = matches;
            company = pickCompanyByName(matches, pdf.extractedCompanyName);
            messages.push(message(
              "company_ambiguous",
              "warning",
              company
                ? "Mais de uma empresa foi encontrada para a mesma raiz; a razao social do PDF foi pre-selecionada. Confirme matriz ou filial."
                : "Mais de um cliente ativo foi encontrado. Selecione a empresa correta (matriz ou filial).",
            ));
          }
        } catch (error) {
          messages.push(message("company_resolution_failed", "error", error instanceof Error ? error.message : String(error)));
        }
      }

      let task: TaskReference | undefined;
      let taskCandidates: TaskReference[] | undefined;
      if (company && pdf.competence) {
        const resolved = await this.resolveTasks(pdf, company, messages, stored);
        task = resolved.task;
        taskCandidates = resolved.taskCandidates;
        stored = resolved.stored;
        if (resolved.duplicate !== undefined) duplicate = resolved.duplicate;
      }

      if (stored?.stage === "due_date_applied") duplicate = true;
      if (duplicate) messages.push(message("duplicate", "error", "Este documento ja foi adicionado ou processado."));

      return {
        id: pdf.id, filePath: pdf.filePath, fileName: pdf.fileName, size: pdf.size, sha256: pdf.sha256,
        pageCount: pdf.pageCount, textLength: pdf.text.length,
        extractedDueDate: pdf.dueDateCandidates.length === 1 ? pdf.dueDateCandidates[0] : undefined,
        dueDateCandidates: pdf.dueDateCandidates,
        competence: pdf.competence,
        competenceSources: pdf.competenceCandidates.map((item) => item.source),
        extractedCnpj: pdf.validCnpjs.length === 1 ? pdf.validCnpjs[0] : undefined,
        extractedIdentifierType: pdf.extractedIdentifierType,
        extractedIdentifierValue: pdf.extractedIdentifierValue,
        cnpjCandidates: pdf.cnpjCandidates,
        extractedCompanyName: pdf.extractedCompanyName,
        documentKind: pdf.documentKind,
        company,
        companyCandidates,
        task,
        taskCandidates,
        status: messages.some((item) => item.severity === "error") ? "pending_review" : "ready",
        messages,
        duplicate,
      };
    } catch (error) {
      return {
        id: `invalid-${Buffer.from(filePath).toString("base64url").slice(0, 16)}`,
        filePath, fileName: filePath.split(/[\\/]/).pop() || filePath, size: 0, sha256: "", textLength: 0,
        dueDateCandidates: [], competenceSources: [], cnpjCandidates: [], status: "pending_review",
        messages: [message("invalid_pdf", "error", error instanceof Error ? error.message : String(error))], duplicate: false,
      };
    }
  }

  private pushCompanyResolvedMessage(pdf: PdfFileData, company: CompanyReference, messages: ValidationMessage[]): void {
    if (pdf.extractedIdentifierType === "cnpj_root") {
      if (pdf.extractedCompanyName && normalizeCompanyName(pdf.extractedCompanyName) !== normalizeCompanyName(company.name)) {
        messages.push(message("company_resolved_by_unique_cnpj_root", "warning", "Empresa resolvida pela raiz unica do CNPJ; a razao social do PDF esta abreviada ou diverge do cadastro oficial."));
      } else {
        messages.push(message("company_resolved_by_cnpj_root", "info", "Raiz do CNPJ identificada e confirmada pela razao social no cadastro oficial."));
      }
    } else if (pdf.extractedIdentifierType === "cpf") {
      const cpfDigits = cnpjDigits(pdf.extractedIdentifierValue || "");
      const officialDigits = cnpjDigits(company.cnpj || company.cpf || "");
      const matchedByRoot = Boolean(cpfDigits)
        && officialDigits !== cpfDigits
        && officialDigits.startsWith(cpfDigits.slice(0, 9));
      if (matchedByRoot) {
        messages.push(message("company_resolved_by_cpf_root", "info", "CPF do empregador casado pela raiz no documento cadastrado no Gestta (tipo Outro)."));
      } else if (pdf.extractedCompanyName && normalizeCompanyName(pdf.extractedCompanyName) !== normalizeCompanyName(company.name)) {
        messages.push(message("company_name_mismatch", "warning", "O nome do PDF diverge do cadastro oficial; o CPF oficial foi mantido."));
      } else {
        messages.push(message("company_resolved_by_cpf", "info", "CPF do empregador identificado e confirmado no cadastro oficial."));
      }
    } else if (pdf.extractedCompanyName && normalizeCompanyName(pdf.extractedCompanyName) !== normalizeCompanyName(company.name)) {
      messages.push(message("company_name_mismatch", "warning", "A razao social do PDF diverge do cadastro oficial; o CNPJ oficial foi mantido."));
    }
  }

  private async resolveTasks(
    pdf: PdfFileData,
    company: CompanyReference,
    messages: ValidationMessage[],
    stored = this.store.get(pdf.sha256),
  ): Promise<{ task?: TaskReference; taskCandidates?: TaskReference[]; stored?: ReturnType<ProcessedDocumentStore["get"]>; duplicate?: boolean }> {
    try {
      const canResumeStored = Boolean(
        stored?.task
        && stored.stage !== "due_date_applied"
        && stored.company?.id === company.id
        && (isDarfCotaKind(pdf.documentKind) || stored.task.competence === pdf.competence),
      );
      if (canResumeStored) {
        return { task: stored!.task!, stored };
      }
      const tasks = await this.gateway.findTasks({
        filePath: pdf.filePath,
        fileName: pdf.fileName,
        sha256: pdf.sha256,
        competence: pdf.competence,
        dueDate: pdf.dueDateCandidates.length === 1 ? pdf.dueDateCandidates[0] : undefined,
        company,
        documentKind: pdf.documentKind,
        extractedText: pdf.text,
      });
      if (tasks.length === 0) {
        messages.push(message("task_resolution_failed", "error", isDarfCotaKind(pdf.documentKind)
          ? `Nenhuma tarefa em aberto foi encontrada para ${company.name}.`
          : `Nenhuma tarefa em aberto foi encontrada para ${company.name} na competencia ${pdf.competence}.`));
        return { stored };
      }
      if (tasks.length > 1) {
        messages.push(message("task_ambiguous", "warning", `Mais de uma tarefa em aberto foi encontrada para ${company.name}. Selecione a tarefa correta.`));
        return { taskCandidates: tasks, stored };
      }

      const task = tasks[0];
      if (task.status !== "open" && !stored) messages.push(message("task_completed", "error", "A tarefa identificada ja esta concluida."));
      if (task.company.id !== company.id) messages.push(message("task_company_mismatch", "error", "A tarefa pertence a outra empresa."));
      if (task.competence && pdf.competence !== task.competence) {
        if (isDarfCotaKind(pdf.documentKind)) {
          messages.push(message("competence_mismatch", "info", "A competencia do PDF diverge da tarefa (esperado para cotas mensais com competencia fixa)."));
        } else {
          messages.push(message("competence_mismatch", "error", "A competencia do PDF diverge da tarefa."));
        }
      }

      let duplicate: boolean | undefined;
      let nextStored = stored;
      if (stored?.stage === "due_date_applied") {
        if (stored.taskId !== task.id || stored.company?.id !== company.id) {
          duplicate = true;
        } else {
          try {
            const published = await this.gateway.findPublishedDocument({
              task,
              fileName: pdf.fileName,
              sha256: pdf.sha256,
              publicationCorrelationId: stored.publicationCorrelationId,
            });
            if (published) {
              duplicate = true;
            } else {
              this.store.remove(pdf.sha256, task.id);
              nextStored = undefined;
              messages.push(message("previous_processing_cleared", "info", "A tarefa foi reaberta e o documento nao existe mais no Portal; o envio anterior foi liberado para nova execucao."));
            }
          } catch (error) {
            duplicate = true;
            messages.push(message("duplicate_reconciliation_failed", "error", `Nao foi possivel conferir o envio anterior no Portal: ${error instanceof Error ? error.message : String(error)}`));
          }
        }
      }
      return { task, stored: nextStored, duplicate };
    } catch (error) {
      messages.push(message("task_resolution_failed", "error", error instanceof Error ? error.message : String(error)));
      return { stored };
    }
  }
}
