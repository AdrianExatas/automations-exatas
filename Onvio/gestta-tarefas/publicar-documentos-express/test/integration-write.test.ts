import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticatedExpressDocumentsGateway, GatewayOperationError } from "../src/gateway";
import type { TaskReference } from "../src/types";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "express-write-"));
  roots.push(root);
  const auth = path.join(root, "auth.json");
  const pdf = path.join(root, "document.pdf");
  fs.writeFileSync(auth, JSON.stringify({ gestta: { jwt: "jwt-test" }, onvio: { udsLongToken: "onvio-test" } }));
  fs.writeFileSync(pdf, "%PDF-1.4 fixture");
  const task: TaskReference = {
    id: "task-id", name: "DCTFWEB - SETOR PESSOAL", competence: "2026-08", status: "open",
    company: { id: "company-id", onvioId: "client-id", name: "EMPRESA EXEMPLO LTDA" },
    companyDocumentId: "document-type-id", companyDocumentName: "DARF DCTFWEB",
  };
  return { auth, pdf, task };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

function taskDetails(status = "OPEN") {
  return {
    _id: "task-id", status, competence_date: "2026-08-01T03:00:00.000Z", customer: { _id: "company-id" },
    company_documents: [{ _id: "document-type-id", name: "DARF DCTFWEB" }],
  };
}

describe("contratos autenticados de escrita", () => {
  it("anexa o multipart observado e confirma a tarefa uma unica vez", async () => {
    const { auth, pdf, task } = setup();
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/core/customer/task/task-id")) return json(taskDetails());
      if (url.includes("/api/storage/v1/projects")) return json({ data: [{ id: "project-id" }] });
      if (url.includes("/api/storage/v2/search/documents")) return json({ data: { items: [] } });
      if (url.endsWith("/es/file/upload/automatic")) {
        const form = init?.body as FormData;
        expect(form.get("customer_task")).toBe("task-id");
        expect(form.get("company_document")).toBe("document-type-id");
        expect(form.get("file")).toBeInstanceOf(Blob);
        return json({ _id: "attachment-id", customer_task: { _id: "task-id" }, company_document: { _id: "document-type-id" } });
      }
      if (url.endsWith("/es/file/attachment-id/confirm")) {
        expect(JSON.parse(String(init?.body))).toEqual({ company_document: "document-type-id", customer_task: "task-id" });
        return new Response("OK");
      }
      throw new Error(`URL inesperada: ${url}`);
    });
    const gateway = new AuthenticatedExpressDocumentsGateway(auth, fetcher as typeof fetch);
    await expect(gateway.completeTaskWithDocument({ task, filePath: pdf, sha256: "abc" }))
      .resolves.toEqual({ attachmentId: "attachment-id", publicationCorrelationId: "attachment-id" });
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("/confirm"))).toHaveLength(1);
  });

  it("localiza a publicacao pela empresa e pelo nome exato", async () => {
    const { auth, task } = setup();
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/api/storage/v1/projects")) return json({ data: [{ id: "project-id" }] });
      return json({ data: { items: [{
        guid: "portal-document-id", isObjectNotFound: false, itemMetadata: { name: "document.pdf" },
        containers: [{ containerId: "folder-id", containerPath: [{ containerId: "project-id", containerType: "projects", primaryAssociationId: "client-id" }] }],
      }] } });
    });
    const gateway = new AuthenticatedExpressDocumentsGateway(auth, fetcher as typeof fetch);
    await expect(gateway.findPublishedDocument({ task, fileName: "document.pdf", sha256: "abc" }))
      .resolves.toEqual({ id: "portal-document-id", folderId: "folder-id", projectId: "project-id" });
  });

  it("aplica vencimento e confirma a tag do calendario", async () => {
    const { auth, task } = setup();
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/profiles/v1/accounts")) return json([{ companyId: "firm-id" }]);
      if (url.includes("/metadata")) return json({ data: {
        id: "portal-document-id", name: "document.pdf", containerId: "folder-id", primaryAssociationClientId: "client-id",
        userTags: [], customFields: { clientId: "client-id" },
      } });
      const body = JSON.parse(String(init?.body));
      expect(body.customFields.dueDate).toBe("2026-09-18T00:00:00");
      expect(body.addUserTags).toEqual(["TAX_DOCUMENT"]);
      return json({ data: { ...body, userTags: ["TAX_DOCUMENT"], customFields: { ...body.customFields, dueDate: "2026-09-18T00:00:00Z" } } });
    });
    const gateway = new AuthenticatedExpressDocumentsGateway(auth, fetcher as typeof fetch);
    await expect(gateway.setDocumentDueDate({
      company: task.company, document: { id: "portal-document-id", folderId: "folder-id" }, dueDate: "2026-09-18", showInTaxCalendar: true,
    })).resolves.toEqual({ documentId: "portal-document-id", dueDate: "2026-09-18", shownInTaxCalendar: true });
  });

  it("estrutura a expiracao de sessao sem tentar escrever", async () => {
    const { auth, pdf, task } = setup();
    const gateway = new AuthenticatedExpressDocumentsGateway(auth, vi.fn(async () => new Response("", { status: 401 })) as typeof fetch);
    const error = await gateway.completeTaskWithDocument({ task, filePath: pdf, sha256: "abc" }).catch((caught) => caught);
    expect(error).toBeInstanceOf(GatewayOperationError);
    expect(error).toMatchObject({ code: "SESSION_EXPIRED", stage: "task_revalidation" });
  });
});
