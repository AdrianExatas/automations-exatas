import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthenticatedCompanyResolver } from "../src/company-resolver";
import { AuthenticatedExpressDocumentsGateway } from "../src/gateway";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function authFile(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "express-auth-"));
  roots.push(root);
  const filePath = path.join(root, "auth.json");
  fs.writeFileSync(filePath, JSON.stringify({ gestta: { jwt: "jwt-test" }, onvio: { udsLongToken: "onvio-test" } }));
  return filePath;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

describe("contratos autenticados de leitura", () => {
  it("resolve empresa por CNPJ exato e confirma o vinculo Onvio", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.gestta.com.br/admin/customer")) return json({ docs: [{ _id: "gestta-1", external_id: "onvio-1", name: "EMPRESA EXEMPLO LTDA", code: "1001", cnpj: "12.345.678/0001-95" }], pages: 1 });
      if (url.includes("/api/profiles/v1/accounts")) return json([{ companyId: "firm-1" }]);
      return json({ items: [{ id: "onvio-1", name: "EMPRESA EXEMPLO LTDA", code: "1001", taxIdentification: "12.345.678/0001-95" }] });
    });
    const resolver = new AuthenticatedCompanyResolver(authFile(), fetcher as typeof fetch);
    const company = await resolver.resolveCompany({ identifierType: "cnpj", identifierValue: "12.345.678/0001-95" });
    expect(company).toMatchObject({ id: "gestta-1", onvioId: "onvio-1", code: "1001", cnpj: "12.345.678/0001-95" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("resolve empresa por raiz de CNPJ unica mesmo com razao social abreviada", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.gestta.com.br/admin/customer")) return json({ docs: [
        { _id: "gestta-1", external_id: "onvio-1", name: "EMPRESA EXEMPLO LTDA", code: "738", cnpj: "12.345.678/0001-95" },
      ], pages: 1 });
      if (url.includes("/api/profiles/v1/accounts")) return json([{ companyId: "firm-1" }]);
      return json({ items: [{ id: "onvio-1", name: "EMPRESA EXEMPLO LTDA", code: "738", taxIdentification: "12.345.678/0001-95" }] });
    });
    const resolver = new AuthenticatedCompanyResolver(authFile(), fetcher as typeof fetch);
    const company = await resolver.resolveCompany({
      identifierType: "cnpj_root", identifierValue: "12345678", extractedCompanyName: "EMPRESA EXEM",
    });
    expect(company).toMatchObject({ id: "gestta-1", code: "738", cnpj: "12.345.678/0001-95" });
  });

  it("lista matriz e filial para a mesma raiz de CNPJ", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.gestta.com.br/admin/customer")) return json({ docs: [
        { _id: "gestta-1", external_id: "onvio-1", name: "EMPRESA MATRIZ LTDA", code: "100", cnpj: "12.345.678/0001-95" },
        { _id: "gestta-2", external_id: "onvio-2", name: "EMPRESA FILIAL LTDA", code: "101", cnpj: "12.345.678/0002-76" },
      ], pages: 1 });
      if (url.includes("/api/profiles/v1/accounts")) return json([{ companyId: "firm-1" }]);
      return json({ items: [
        { id: "onvio-1", name: "EMPRESA MATRIZ LTDA", code: "100", taxIdentification: "12.345.678/0001-95" },
        { id: "onvio-2", name: "EMPRESA FILIAL LTDA", code: "101", taxIdentification: "12.345.678/0002-76" },
      ] });
    });
    const resolver = new AuthenticatedCompanyResolver(authFile(), fetcher as typeof fetch);
    const companies = await resolver.findCompanies({ identifierType: "cnpj_root", identifierValue: "12345678" });
    expect(companies).toEqual([
      expect.objectContaining({ id: "gestta-1", cnpj: "12.345.678/0001-95", code: "100" }),
      expect.objectContaining({ id: "gestta-2", cnpj: "12.345.678/0002-76", code: "101" }),
    ]);
  });

  it("resolve empregador pessoa fisica pelo CPF no Gestta", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.gestta.com.br/admin/customer")) return json({ docs: [
        { _id: "gestta-cpf", external_id: "onvio-cpf", name: "JOAO DA SILVA", code: "880", cpf: "529.982.247-25" },
      ], pages: 1 });
      if (url.includes("/api/profiles/v1/accounts")) return json([{ companyId: "firm-1" }]);
      return json({ items: [{ id: "onvio-cpf", name: "JOAO DA SILVA", code: "880", taxIdentification: "529.982.247-25" }] });
    });
    const resolver = new AuthenticatedCompanyResolver(authFile(), fetcher as typeof fetch);
    const company = await resolver.resolveCompany({ identifierType: "cpf", identifierValue: "529.982.247-25" });
    expect(company).toMatchObject({ id: "gestta-cpf", cpf: "529.982.247-25", code: "880" });
  });

  it("resolve CPF quando o Gestta cadastrou a raiz em documento Outro", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("api.gestta.com.br/admin/customer")) return json({ docs: [
        {
          _id: "gestta-thayanne",
          external_id: "onvio-thayanne",
          name: "THAYANNE OLIVEIRA DE MORAIS",
          code: "700",
          cnpj: "00461756300119",
        },
      ], pages: 1 });
      if (url.includes("/api/profiles/v1/accounts")) return json([{ companyId: "firm-1" }]);
      return json({ items: [{
        id: "onvio-thayanne",
        name: "THAYANNE OLIVEIRA DE MORAIS",
        code: "700",
        taxIdentification: "004.617.563-66",
      }] });
    });
    const resolver = new AuthenticatedCompanyResolver(authFile(), fetcher as typeof fetch);
    const company = await resolver.resolveCompany({
      identifierType: "cpf",
      identifierValue: "004.617.563-66",
      extractedCompanyName: "THAYANNE OLIVEIRA DE MORAIS",
    });
    expect(company).toMatchObject({
      id: "gestta-thayanne",
      name: "THAYANNE OLIVEIRA DE MORAIS",
      code: "700",
      cpf: "004.617.563-66",
      cnpj: "00461756300119",
    });
  });

  it("bloqueia raiz de CNPJ com mais de um cadastro ativo correspondente", async () => {
    const customers = [
      { _id: "gestta-1", external_id: "onvio-1", name: "EMPRESA REPETIDA LTDA", cnpj: "12.345.678/0001-95" },
      { _id: "gestta-2", external_id: "onvio-2", name: "EMPRESA REPETIDA LTDA", cnpj: "12.345.678/0002-76" },
    ];
    const fetcher = vi.fn(async () => json({ docs: customers, pages: 1 }));
    const resolver = new AuthenticatedCompanyResolver(authFile(), fetcher as typeof fetch);
    await expect(resolver.resolveCompany({
      identifierType: "cnpj_root", identifierValue: "12345678", extractedCompanyName: "NOME DIVERGENTE LTDA",
    })).rejects.toThrow("Mais de um cliente ativo");
  });

  it("resolve somente uma tarefa DCTFWeb aberta da mesma empresa e competencia", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/task/task-ok") ? json({
      _id: "task-ok", status: "OPEN", competence_date: "2026-08-01T03:00:00.000Z", customer: { _id: "gestta-1" },
      company_documents: [{ _id: "document-type-1", name: "DARF DCTFWEB" }],
    }) : json({ docs: [
      { _id: "task-ok", name: "DCTFWEB - SETOR PESSOAL", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-08-01T03:00:00.000Z" },
      { _id: "task-other", name: "DAS", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-08-01T03:00:00.000Z" },
    ] }));
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const company = { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" };
    const task = await gateway.resolveTask({ filePath: "x.pdf", fileName: "x.pdf", sha256: "abc", company, competence: "2026-08", documentKind: "dctfweb", extractedText: "" });
    expect(task).toMatchObject({ id: "task-ok", companyDocumentId: "document-type-1" });
    expect(gateway.status().capabilities?.taskCompletion).toBe(true);
  });

  it("bloqueia tarefa ausente sem escolher outra tarefa aberta", async () => {
    const fetcher = vi.fn(async () => json({ docs: [
      { _id: "wrong", name: "DAS", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-08-01T03:00:00.000Z" },
    ] }));
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    await expect(gateway.resolveTask({
      filePath: "706 - DCTFWEB 082026.pdf", fileName: "706 - DCTFWEB 082026.pdf", sha256: "abc",
      company: { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" }, competence: "2026-08", documentKind: "dctfweb", extractedText: "",
    })).rejects.toThrow("Nenhuma tarefa DCTFWEB em aberto");
  });

  it("resolve FGTS Digital pelo documento configurado e aceita variante de entrega", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/task/task-email")) return json({
        _id: "task-email", status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z", customer: { _id: "gestta-1" },
        company_documents: [{ _id: "fgts-document", name: "FGTS DIGITAL" }],
      });
      if (url.endsWith("/task/task-consignado")) return json({
        _id: "task-consignado", status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z", customer: { _id: "gestta-1" },
        company_documents: [{ _id: "consignado-document", name: "FGTS DIGITAL CONSIGNADO" }],
      });
      return json({ docs: [
        { _id: "task-email", name: "FGTS DIGITAL - VIA E-MAIL", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z" },
        { _id: "task-consignado", name: "FGTS CONSIGNADO", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z" },
      ] });
    });
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const task = await gateway.resolveTask({
      filePath: "guia.pdf", fileName: "guia.pdf", sha256: "abc", company: { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" },
      competence: "2026-07", documentKind: "fgts_digital", extractedText: "",
    });
    expect(task).toMatchObject({ id: "task-email", companyDocumentId: "fgts-document", companyDocumentName: "FGTS DIGITAL" });
  });

  it("bloqueia FGTS quando mais de uma tarefa usa o documento oficial", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/task/task-email") || url.endsWith("/task/task-whatsapp")) return json({
        status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z", customer: { _id: "gestta-1" },
        company_documents: [{ _id: `document-${url.split("/").pop()}`, name: "FGTS DIGITAL" }],
      });
      return json({ docs: ["task-email", "task-whatsapp"].map((_id) => ({
        _id, name: `FGTS DIGITAL - ${_id}`, customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z",
      })) });
    });
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const input = {
      filePath: "guia.pdf", fileName: "guia.pdf", sha256: "abc", company: { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" },
      competence: "2026-07" as const, documentKind: "fgts_digital" as const, extractedText: "",
    };
    await expect(gateway.resolveTask(input)).rejects.toThrow("Mais de uma tarefa FGTS Digital compativel");
    const tasks = await gateway.findTasks(input);
    expect(tasks.map((item) => item.id)).toEqual(["task-email", "task-whatsapp"]);
    await expect(gateway.resolveTask({ ...input, preferredTaskId: "task-whatsapp" })).resolves.toMatchObject({
      id: "task-whatsapp", companyDocumentName: "FGTS DIGITAL",
    });
  });

  it("resolve FGTS Consignado somente pelo documento consignado configurado", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/task/task-fgts")) return json({
        company_documents: [{ _id: "fgts-document", name: "FGTS DIGITAL" }],
      });
      if (url.endsWith("/task/task-consignado")) return json({
        company_documents: [{ _id: "consignado-document", name: "FGTS DIGITAL CONSIGNADO" }],
      });
      return json({ docs: [
        { _id: "task-fgts", name: "FGTS DIGITAL", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z" },
        { _id: "task-consignado", name: "FGTS DIGITAL CONSIGNADO", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-07-01T03:00:00.000Z" },
      ] });
    });
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const task = await gateway.resolveTask({
      filePath: "consignado.pdf", fileName: "consignado.pdf", sha256: "abc", company: { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" },
      competence: "2026-07", documentKind: "fgts_consignado", extractedText: "",
    });
    expect(task).toMatchObject({ id: "task-consignado", companyDocumentId: "consignado-document", companyDocumentName: "FGTS DIGITAL CONSIGNADO" });
  });

  it("resolve cota unificada pelo documento COTA IRPJ E CSLL", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/task/task-cota") ? json({
      _id: "task-cota", status: "OPEN", competence_date: "2026-06-01T03:00:00.000Z", customer: { _id: "gestta-1" },
      company_documents: [{ _id: "cota-document", name: "COTA IRPJ E CSLL" }],
    }) : json({ docs: [
      { _id: "task-cota", name: "IRPJ e CSLL EM COTAS - VIA WHATSAPP", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-06-01T03:00:00.000Z" },
      { _id: "task-other", name: "DAS", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-06-01T03:00:00.000Z" },
    ] }));
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const task = await gateway.resolveTask({
      filePath: "csll.pdf", fileName: "csll.pdf", sha256: "abc", company: { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" },
      competence: "2026-06", documentKind: "darf_6012", extractedText: "",
    });
    expect(task).toMatchObject({ id: "task-cota", companyDocumentId: "cota-document", companyDocumentName: "COTA IRPJ E CSLL" });
  });

  it("escolhe DARF 6012 ou DARF 3373 quando a tarefa tem os dois templates", async () => {
    const documents = [
      { _id: "doc-6012", name: "DARF 6012" },
      { _id: "doc-3373", name: "DARF 3373" },
    ];
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/task/task-split") ? json({
      _id: "task-split", status: "OPEN", competence_date: "2026-06-01T03:00:00.000Z", customer: { _id: "gestta-1" },
      company_documents: documents,
    }) : json({ docs: [
      { _id: "task-split", name: "IRPJ e CSLL EM COTAS", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-06-01T03:00:00.000Z" },
    ] }));
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const company = { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" };
    await expect(gateway.resolveTask({
      filePath: "csll.pdf", fileName: "csll.pdf", sha256: "abc", company, competence: "2026-06", documentKind: "darf_6012", extractedText: "",
    })).resolves.toMatchObject({ companyDocumentId: "doc-6012", companyDocumentName: "DARF 6012" });
    await expect(gateway.resolveTask({
      filePath: "irpj.pdf", fileName: "irpj.pdf", sha256: "def", company, competence: "2026-06", documentKind: "darf_3373", extractedText: "",
    })).resolves.toMatchObject({ companyDocumentId: "doc-3373", companyDocumentName: "DARF 3373" });
    await expect(gateway.resolveTask({
      filePath: "combo.pdf", fileName: "combo.pdf", sha256: "ghi", company, competence: "2026-06", documentKind: "darf_6012_3373", extractedText: "",
    })).rejects.toThrow("Nenhuma tarefa IRPJ e CSLL em cotas em aberto");
  });

  it("interpreta competencia Gestta no fuso de Sao Paulo quando o UTC cai no mes seguinte", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/task/task-mensal") ? json({
      _id: "task-mensal", status: "OPEN", competence_date: "2026-07-01T02:59:59.999Z", customer: { _id: "gestta-1" },
      company_documents: [
        { _id: "doc-6012", name: "DARF 6012" },
        { _id: "doc-3373", name: "DARF 3373" },
      ],
    }) : json({ docs: [
      {
        _id: "task-mensal",
        name: "GUIA DO IR E CSLL - MENSAL - GRUPO FASITEC",
        customer: { _id: "gestta-1" },
        status: "OPEN",
        competence_date: "2026-07-01T02:59:59.999Z",
      },
    ] }));
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const task = await gateway.resolveTask({
      filePath: "csll.pdf", fileName: "csll.pdf", sha256: "abc",
      company: { id: "gestta-1", name: "FASITEC DESENVOLVIMENTO E TECNOLOGIA LTDA" },
      competence: "2026-06", documentKind: "darf_6012", extractedText: "",
    });
    expect(task).toMatchObject({
      id: "task-mensal",
      name: "GUIA DO IR E CSLL - MENSAL - GRUPO FASITEC",
      competence: "2026-06",
      companyDocumentId: "doc-6012",
      companyDocumentName: "DARF 6012",
    });
  });

  it("resolve DARF com competencia do PDF diferente e template DARF 6012 e 3373", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/task/task-mensal") ? json({
      _id: "task-mensal",
      status: "OPEN",
      competence_date: "2026-07-15T15:00:00.000Z",
      legal_date: "2026-09-01T02:59:59.999Z",
      customer: { _id: "gestta-1" },
      company_documents: [{ _id: "doc-unificado", name: "DARF 6012 e 3373" }],
    }) : json({ docs: [
      {
        _id: "task-mensal",
        name: "GUIA DO IR E CSLL - MENSAL",
        customer: { _id: "gestta-1" },
        status: "OPEN",
        competence_date: "2026-07-15T15:00:00.000Z",
        legal_date: "2026-09-01T02:59:59.999Z",
      },
    ] }));
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const task = await gateway.resolveTask({
      filePath: "guia.pdf", fileName: "guia.pdf", sha256: "abc",
      company: { id: "gestta-1", name: "INDUSTRIA ALAGOANA DE COLCHOES E ESPUMA LTDA" },
      competence: "2026-06",
      dueDate: "2026-08-31",
      documentKind: "darf_6012",
      extractedText: "",
    });
    expect(task).toMatchObject({
      id: "task-mensal",
      competence: "2026-07",
      companyDocumentId: "doc-unificado",
      companyDocumentName: "DARF 6012 e 3373",
    });
  });

  it("desambigua tarefas DARF abertas pela data legal igual ao vencimento do PDF", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/task/task-jul")) return json({
        _id: "task-jul",
        status: "OPEN",
        competence_date: "2026-06-15T15:00:00.000Z",
        legal_date: "2026-08-01T02:59:59.999Z",
        customer: { _id: "gestta-1" },
        company_documents: [{ _id: "doc-jul", name: "DARF 6012" }],
      });
      if (url.endsWith("/task/task-ago")) return json({
        _id: "task-ago",
        status: "OPEN",
        competence_date: "2026-07-15T15:00:00.000Z",
        legal_date: "2026-09-01T02:59:59.999Z",
        customer: { _id: "gestta-1" },
        company_documents: [{ _id: "doc-ago", name: "DARF 6012" }],
      });
      return json({ docs: [
        { _id: "task-jul", name: "GUIA DO IR E CSLL - MENSAL", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-06-15T15:00:00.000Z" },
        { _id: "task-ago", name: "GUIA DO IR E CSLL - MENSAL", customer: { _id: "gestta-1" }, status: "OPEN", competence_date: "2026-07-15T15:00:00.000Z" },
      ] });
    });
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const company = { id: "gestta-1", name: "EMPRESA EXEMPLO LTDA" };
    await expect(gateway.resolveTask({
      filePath: "csll.pdf", fileName: "csll.pdf", sha256: "abc", company,
      competence: "2026-06", dueDate: "2026-08-31", documentKind: "darf_6012", extractedText: "",
    })).resolves.toMatchObject({ id: "task-ago", companyDocumentId: "doc-ago", competence: "2026-07" });
    await expect(gateway.resolveTask({
      filePath: "csll.pdf", fileName: "csll.pdf", sha256: "abc", company,
      competence: "2026-06", dueDate: "2026-07-31", documentKind: "darf_6012", extractedText: "",
    })).resolves.toMatchObject({ id: "task-jul", companyDocumentId: "doc-jul", competence: "2026-06" });
  });

  it("detecta slot vazio e nome do anexo no company_document da tarefa", async () => {
    const file = "https://gestta-prod.s3.us-east-1.amazonaws.com/company/x/task/y/document/z?response-content-disposition=filename%3D%22IRPJ%203373%202T2026%20COTA%2002.pdf%22";
    const details = {
      _id: "task-mensal",
      status: "OPEN",
      competence_date: "2026-07-01T02:59:59.999Z",
      customer: { _id: "gestta-1" },
      company_documents: [
        { _id: "doc-6012", name: "DARF 6012" },
        { _id: "doc-3373", name: "DARF 3373", file },
      ],
    };
    const fetcher = vi.fn(async () => json(details));
    const gateway = new AuthenticatedExpressDocumentsGateway(authFile(), fetcher as typeof fetch);
    const emptySlot = {
      id: "task-mensal",
      name: "GUIA DO IR E CSLL - MENSAL - GRUPO FASITEC",
      competence: "2026-06",
      status: "open" as const,
      company: { id: "gestta-1", name: "FASITEC DESENVOLVIMENTO E TECNOLOGIA LTDA" },
      companyDocumentId: "doc-6012",
      companyDocumentName: "DARF 6012",
    };
    const filledSlot = { ...emptySlot, companyDocumentId: "doc-3373", companyDocumentName: "DARF 3373" };
    await expect(gateway.getTaskDocumentAttachment(emptySlot)).resolves.toEqual({ present: false, fileName: undefined });
    await expect(gateway.getTaskDocumentAttachment(filledSlot)).resolves.toEqual({
      present: true,
      fileName: "IRPJ 3373 2T2026 COTA 02.pdf",
    });
    await expect(gateway.listTaskDocumentSlots(emptySlot)).resolves.toEqual([
      { id: "doc-6012", name: "DARF 6012", present: false },
      { id: "doc-3373", name: "DARF 3373", present: true },
    ]);
  });
});
