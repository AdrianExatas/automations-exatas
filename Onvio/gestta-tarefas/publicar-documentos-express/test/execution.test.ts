import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoCompanyResolver } from "../src/company-resolver";
import { BatchExecutor } from "../src/execution";
import { DemoExpressDocumentsGateway } from "../src/gateway";
import { ProcessedDocumentStore } from "../src/processed-store";
import type { DocumentConfirmation, DocumentInspection } from "../src/types";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "express-exec-"));
  roots.push(root);
  const filePath = path.join(root, "1001-guia.pdf");
  const bytes = Buffer.from("%PDF-1.4\nfixture de execucao com conteudo pesquisavel e vencimento");
  fs.writeFileSync(filePath, bytes);
  const sha256 = require("crypto").createHash("sha256").update(bytes).digest("hex");
  const task = {
    id: `demo-task-${sha256.slice(0, 12)}`,
    name: "Publicar guia de tributo",
    competence: "2026-07",
    status: "open" as const,
    company: { id: "demo-company-12345678000195", code: "1001", name: "Empresa Demonstracao Ltda", cnpj: "12.345.678/0001-95" },
  };
  const row: DocumentInspection = {
    id: "row-1", filePath, fileName: path.basename(filePath), size: bytes.length, sha256, textLength: 80,
    extractedDueDate: "2026-08-21", dueDateCandidates: ["2026-08-21"], competence: "2026-07",
    competenceSources: ["Competência"], extractedCnpj: "12.345.678/0001-95", cnpjCandidates: ["12.345.678/0001-95"], company: task.company,
    task, status: "ready", messages: [], duplicate: false,
  };
  const confirmation: DocumentConfirmation = {
    id: row.id, sha256, companyId: task.company.id, taskId: task.id, confirmedDueDate: "2026-08-21", dueDateConfirmed: true, companyConfirmed: true, taskConfirmed: true,
  };
  return { root, row, confirmation };
}

describe("execucao do lote", () => {
  it("conclui, publica, aplica vencimento e registra idempotencia", async () => {
    const { root, row, confirmation } = setup();
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    const executor = new BatchExecutor(
      new DemoCompanyResolver(),
      new DemoExpressDocumentsGateway(), store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.totals.completed).toBe(1);
    expect(report.items[0].portalDocumentId).toBeTruthy();
    expect(store.has(row.sha256, row.task!.id)).toBe(true);
  });

  it("mantem documento publicado como pendencia quando o vencimento falha", async () => {
    const { root, row, confirmation } = setup();
    const gateway = new DemoExpressDocumentsGateway();
    gateway.setDocumentDueDate = async () => { throw new Error("Documento ja visualizado."); };
    const executor = new BatchExecutor(
      new DemoCompanyResolver(),
      gateway, new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.items[0].status).toBe("pending_review");
    expect(report.items[0].portalDocumentId).toBeTruthy();
    expect(storeState(root, row.sha256, row.task!.id)).toBe(true);
  });

  it("nao repete a conclusao quando a publicacao ainda nao foi localizada", async () => {
    const { root, row, confirmation } = setup();
    const gateway = new DemoExpressDocumentsGateway();
    gateway.waitForPublishedDocument = async () => { throw new Error("Tempo esgotado aguardando o Portal."); };
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    const executor = new BatchExecutor(
      new DemoCompanyResolver(),
      gateway, store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.items[0].status).toBe("pending_review");
    expect(store.has(row.sha256, row.task!.id)).toBe(true);
  });

  it("retoma do documento publicado aplicando apenas o vencimento", async () => {
    const { root, row, confirmation } = setup();
    const gateway = new DemoExpressDocumentsGateway();
    const complete = vi.spyOn(gateway, "completeTaskWithDocument");
    const wait = vi.spyOn(gateway, "waitForPublishedDocument");
    const due = vi.spyOn(gateway, "setDocumentDueDate");
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    store.add({
      sha256: row.sha256, taskId: row.task!.id, fileName: row.fileName, stage: "document_published",
      company: row.company, task: row.task, attachmentId: "attachment-saved", publicationCorrelationId: "correlation-saved",
      portalDocumentId: "portal-saved", portalFolderId: "folder-saved", updatedAt: new Date().toISOString(),
    });
    const executor = new BatchExecutor(
      new DemoCompanyResolver(), gateway, store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.items[0].status).toBe("completed");
    expect(complete).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
    expect(due).toHaveBeenCalledOnce();
    expect(store.get(row.sha256, row.task!.id)?.stage).toBe("due_date_applied");
  });

  it("reenvia quando o registro local existe mas o slot remoto esta vazio", async () => {
    const { root, row, confirmation } = setup();
    const gateway = new DemoExpressDocumentsGateway();
    gateway.taskDocumentAttachment = { present: false };
    const complete = vi.spyOn(gateway, "completeTaskWithDocument");
    const wait = vi.spyOn(gateway, "waitForPublishedDocument");
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    store.add({
      sha256: row.sha256, taskId: row.task!.id, fileName: row.fileName, stage: "task_completed",
      company: row.company, task: row.task, attachmentId: "stale-attachment", publicationCorrelationId: "stale-correlation",
      lastError: "incerto", updatedAt: new Date().toISOString(),
    });
    const executor = new BatchExecutor(
      new DemoCompanyResolver(), gateway, store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.items[0].status).toBe("completed");
    expect(complete).toHaveBeenCalledOnce();
    expect(wait).toHaveBeenCalledOnce();
    expect(store.get(row.sha256, row.task!.id)?.stage).toBe("due_date_applied");
  });

  it("nao confirma de novo quando o slot remoto ainda tem arquivo", async () => {
    const { root, row, confirmation } = setup();
    const gateway = new DemoExpressDocumentsGateway();
    gateway.taskDocumentAttachment = { present: true, fileName: row.fileName };
    const complete = vi.spyOn(gateway, "completeTaskWithDocument");
    const wait = vi.spyOn(gateway, "waitForPublishedDocument");
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    store.add({
      sha256: row.sha256, taskId: row.task!.id, fileName: row.fileName, stage: "task_completed",
      company: row.company, task: row.task, attachmentId: "attachment-saved", publicationCorrelationId: "correlation-saved",
      updatedAt: new Date().toISOString(),
    });
    const executor = new BatchExecutor(
      new DemoCompanyResolver(), gateway, store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.items[0].status).toBe("completed");
    expect(complete).not.toHaveBeenCalled();
    expect(wait).toHaveBeenCalledOnce();
    expect(store.get(row.sha256, row.task!.id)?.stage).toBe("due_date_applied");
  });

  it("nao repete uma conclusao incerta quando o anexo remoto ainda existe", async () => {
    const { root, row, confirmation } = setup();
    const gateway = new DemoExpressDocumentsGateway();
    gateway.taskDocumentAttachment = { present: true, fileName: row.fileName };
    const complete = vi.spyOn(gateway, "completeTaskWithDocument");
    const wait = vi.spyOn(gateway, "waitForPublishedDocument");
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    store.add({
      sha256: row.sha256, taskId: row.task!.id, fileName: row.fileName, stage: "completion_started",
      company: row.company, task: row.task, updatedAt: new Date().toISOString(), lastError: "timeout",
    });
    const executor = new BatchExecutor(
      new DemoCompanyResolver(), gateway, store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.items[0].status).toBe("completed");
    expect(complete).not.toHaveBeenCalled();
    expect(wait).toHaveBeenCalledOnce();
  });

  it("cancela itens ainda nao iniciados", async () => {
    const { root, row, confirmation } = setup();
    const executor = new BatchExecutor(
      new DemoCompanyResolver(),
      new DemoExpressDocumentsGateway(), new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => true });
    expect(report.items[0].status).toBe("canceled");
  });

  it("confirma os dois anexos da mesma tarefa antes de esperar o Portal", async () => {
    const { root, row: firstRow, confirmation: firstConfirmation } = setup();
    const secondPath = path.join(root, "1001-irpj.pdf");
    const secondBytes = Buffer.from("%PDF-1.4\nsegundo fixture pesquisavel com vencimento e documento irpj");
    fs.writeFileSync(secondPath, secondBytes);
    const secondSha = require("crypto").createHash("sha256").update(secondBytes).digest("hex");
    const sharedTask = {
      id: "task-ir-csll",
      name: "GUIA DO IR E CSLL",
      competence: "2026-07",
      status: "open" as const,
      company: firstRow.company!,
    };
    const row6012: DocumentInspection = {
      ...firstRow,
      documentKind: "darf_6012",
      task: { ...sharedTask, companyDocumentId: "doc-6012", companyDocumentName: "DARF 6012" },
    };
    const row3373: DocumentInspection = {
      ...firstRow,
      id: "row-2",
      filePath: secondPath,
      fileName: path.basename(secondPath),
      size: secondBytes.length,
      sha256: secondSha,
      documentKind: "darf_3373",
      task: { ...sharedTask, companyDocumentId: "doc-3373", companyDocumentName: "DARF 3373" },
    };
    const confirmation6012: DocumentConfirmation = { ...firstConfirmation, taskId: sharedTask.id };
    const confirmation3373: DocumentConfirmation = {
      ...firstConfirmation, id: row3373.id, sha256: secondSha, taskId: sharedTask.id,
    };
    const gateway = new DemoExpressDocumentsGateway();
    gateway.taskDocumentSlots = [
      { id: "doc-6012", name: "DARF 6012", present: false },
      { id: "doc-3373", name: "DARF 3373", present: false },
    ];
    gateway.resolveTask = async (input) => ({
      id: sharedTask.id,
      name: sharedTask.name,
      competence: input.competence,
      status: "open",
      company: input.company,
      companyDocumentId: input.documentKind === "darf_3373" ? "doc-3373" : "doc-6012",
      companyDocumentName: input.documentKind === "darf_3373" ? "DARF 3373" : "DARF 6012",
    });
    const order: string[] = [];
    const originalComplete = gateway.completeTaskWithDocument.bind(gateway);
    const originalWait = gateway.waitForPublishedDocument.bind(gateway);
    gateway.completeTaskWithDocument = async (input) => {
      order.push(`complete:${input.task.companyDocumentId}`);
      return originalComplete(input);
    };
    gateway.waitForPublishedDocument = async (input) => {
      order.push(`wait:${input.fileName}`);
      return originalWait(input);
    };
    const executor = new BatchExecutor(
      new DemoCompanyResolver(), gateway, new ProcessedDocumentStore(path.join(root, "store.json")),
      async (buffer) => ({
        text: buffer.includes("irpj")
          ? "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nDOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS\nRECIBO DECLARACAO\n3373IRPJ\nCompetencia: 07/2026\nVencimento: 21/08/2026"
          : "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nDOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS\nRECIBO DECLARACAO\n6012CSLL\nCompetencia: 07/2026\nVencimento: 21/08/2026",
      }),
    );
    const report = await executor.run([row6012, row3373], [confirmation6012, confirmation3373], { isCancellationRequested: () => false });
    expect(report.totals.completed).toBe(2);
    expect(order.slice(0, 2)).toEqual(["complete:doc-6012", "complete:doc-3373"]);
    expect(order.slice(2)).toEqual(["wait:1001-guia.pdf", "wait:1001-irpj.pdf"]);
  });

  it("nao espera o Portal quando a tarefa ainda tem outro slot vazio", async () => {
    const { root, row, confirmation } = setup();
    const gateway = new DemoExpressDocumentsGateway();
    gateway.taskDocumentSlots = [
      { id: "demo-document-type", name: "DARF 6012", present: false },
      { id: "doc-3373", name: "DARF 3373", present: false },
    ];
    const wait = vi.spyOn(gateway, "waitForPublishedDocument");
    const executor = new BatchExecutor(
      new DemoCompanyResolver(), gateway, new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Demonstracao Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026" }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.items[0].status).toBe("pending_review");
    expect(report.items[0].message).toContain("DARF 3373");
    expect(wait).not.toHaveBeenCalled();
  });

  it("honra a filial escolhida quando a raiz de CNPJ tem mais de um cadastro", async () => {
    const { root, row, confirmation } = setup();
    const matriz = { id: "matriz", name: "EMPRESA MATRIZ LTDA", cnpj: "12.345.678/0001-95", onvioId: "onvio-1" };
    const filial = { id: "filial", name: "EMPRESA FILIAL LTDA", cnpj: "12.345.678/0002-76", onvioId: "onvio-2" };
    row.extractedIdentifierType = "cnpj_root";
    row.extractedIdentifierValue = "12345678";
    row.company = filial;
    row.companyCandidates = [matriz, filial];
    row.task = { ...row.task!, company: filial };
    confirmation.companyId = filial.id;
    confirmation.taskId = row.task.id;
    const companies = {
      status: () => ({ available: true, mode: "verified" as const }),
      findCompanies: async () => [matriz, filial],
      resolveCompany: async () => { throw new Error("Mais de um cliente ativo"); },
    };
    const executor = new BatchExecutor(
      companies,
      new DemoExpressDocumentsGateway(),
      new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({
        text: "CPF/CNPJ do Empregador\n12.345.678\nNome/Razao Social do Empregador\nEMPRESA FILIAL LTDA\nInformacoes de recolhimentos do FGTS\nGFD - Guia do FGTS Digital\nCompetencia: 07/2026\nPagar este documento ate\n21/08/2026",
      }),
    );
    const report = await executor.run([row], [confirmation], { isCancellationRequested: () => false });
    expect(report.totals.completed).toBe(1);
    expect(report.items[0].company?.id).toBe("filial");
  });
});

function storeState(root: string, sha256: string, taskId: string): boolean {
  return new ProcessedDocumentStore(path.join(root, "store.json")).has(sha256, taskId);
}
