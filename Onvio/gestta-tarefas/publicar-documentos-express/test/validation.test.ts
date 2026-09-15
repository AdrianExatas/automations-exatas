import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { DemoCompanyResolver } from "../src/company-resolver";
import { DemoExpressDocumentsGateway, UnavailableExpressDocumentsGateway } from "../src/gateway";
import { ProcessedDocumentStore } from "../src/processed-store";
import { DocumentValidator } from "../src/validation";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(name = "1001-guia.pdf") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "express-docs-"));
  roots.push(root);
  const filePath = path.join(root, name);
  fs.writeFileSync(filePath, "%PDF-1.4\nfixture de teste com conteudo suficiente para validacao");
  return { root, filePath };
}

describe("validacao do lote", () => {
  it("resolve tarefa e vencimento para PDF pesquisavel", async () => {
    const { root, filePath } = fixture();
    const validator = new DocumentValidator(
      new DemoCompanyResolver(),
      new DemoExpressDocumentsGateway(),
      new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Teste Ltda\nCompetencia: 07/2026\nVencimento: 21/08/2026\nValor total 100,00", pageCount: 1 }),
    );
    const [row] = await validator.inspectMany([filePath]);
    expect(row.status).toBe("ready");
    expect(row.extractedDueDate).toBe("2026-08-21");
    expect(row.company?.name).toBe("Empresa Teste Ltda");
  });

  it("marca datas ambiguas para revisao e permite correcao pela confirmacao", async () => {
    const { root, filePath } = fixture();
    const validator = new DocumentValidator(
      new DemoCompanyResolver(),
      new DemoExpressDocumentsGateway(),
      new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Teste Ltda\nPA:07/2026\nVencimento 21/08/2026 e novo Vencimento 22/08/2026" }),
    );
    const [row] = await validator.inspectMany([filePath]);
    expect(row.messages.map((item) => item.code)).toContain("due_date_ambiguous");
    const messages = validator.validateConfirmation(row, {
      id: row.id,
      sha256: row.sha256,
      companyId: row.company!.id,
      taskId: row.task!.id,
      confirmedDueDate: "2026-08-22",
      dueDateConfirmed: true,
      companyConfirmed: true,
      taskConfirmed: true,
    });
    expect(messages.filter((item) => item.severity === "error")).toEqual([]);
  });

  it("bloqueia integracao sem contrato capturado", async () => {
    const { root, filePath } = fixture();
    const validator = new DocumentValidator(
      new DemoCompanyResolver(),
      new UnavailableExpressDocumentsGateway(),
      new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Teste Ltda\nPA:07/2026\nVencimento: 21/08/2026" }),
    );
    const [row] = await validator.inspectMany([filePath]);
    expect(row.messages.map((item) => item.code)).toContain("task_resolution_failed");
  });

  it("detecta duplicidade dentro do lote", async () => {
    const first = fixture("1001-a.pdf");
    const secondPath = path.join(first.root, "1001-b.pdf");
    fs.copyFileSync(first.filePath, secondPath);
    const validator = new DocumentValidator(
      new DemoCompanyResolver(),
      new DemoExpressDocumentsGateway(),
      new ProcessedDocumentStore(path.join(first.root, "store.json")),
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Teste Ltda\nPA:07/2026\nVencimento: 21/08/2026" }),
    );
    const rows = await validator.inspectMany([first.filePath, secondPath]);
    expect(rows[0].duplicate).toBe(false);
    expect(rows[1].duplicate).toBe(true);
  });

  it("libera novo envio quando a tarefa foi reaberta e o documento removido do Portal", async () => {
    const { root, filePath } = fixture();
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    const gateway = new DemoExpressDocumentsGateway();
    const validator = new DocumentValidator(
      new DemoCompanyResolver(), gateway, store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Teste Ltda\nPA:07/2026\nVencimento: 21/08/2026" }),
    );
    const [first] = await validator.inspectMany([filePath]);
    store.add({
      sha256: first.sha256, taskId: first.task!.id, fileName: first.fileName, stage: "due_date_applied",
      company: first.company, task: { ...first.task!, status: "completed" }, portalDocumentId: "old-document",
      portalFolderId: "old-folder", dueDate: "2026-08-21", calendarShown: true, updatedAt: new Date().toISOString(),
    });

    const [reopened] = await validator.inspectMany([filePath]);
    expect(reopened.status).toBe("ready");
    expect(reopened.duplicate).toBe(false);
    expect(reopened.messages.map((item) => item.code)).toContain("previous_processing_cleared");
    expect(store.get(first.sha256, first.task!.id)).toBeUndefined();
  });

  it("mantem o bloqueio quando o documento ainda existe no Portal", async () => {
    const { root, filePath } = fixture();
    const store = new ProcessedDocumentStore(path.join(root, "store.json"));
    const gateway = new DemoExpressDocumentsGateway();
    const validator = new DocumentValidator(
      new DemoCompanyResolver(), gateway, store,
      async () => ({ text: "CNPJ 12.345.678/0001-95\nEmpresa Teste Ltda\nPA:07/2026\nVencimento: 21/08/2026" }),
    );
    const [first] = await validator.inspectMany([filePath]);
    store.add({
      sha256: first.sha256, taskId: first.task!.id, fileName: first.fileName, stage: "due_date_applied",
      company: first.company, task: { ...first.task!, status: "completed" }, portalDocumentId: "old-document",
      portalFolderId: "old-folder", dueDate: "2026-08-21", calendarShown: true, updatedAt: new Date().toISOString(),
    });
    gateway.findPublishedDocument = async () => ({ id: "old-document", folderId: "old-folder" });

    const [blocked] = await validator.inspectMany([filePath]);
    expect(blocked.status).toBe("pending_review");
    expect(blocked.duplicate).toBe(true);
    expect(blocked.messages.map((item) => item.code)).toContain("duplicate");
    expect(store.get(first.sha256, first.task!.id)?.stage).toBe("due_date_applied");
  });
});
