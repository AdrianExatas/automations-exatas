import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { DemoCompanyResolver } from "../src/company-resolver";
import { DemoExpressDocumentsGateway } from "../src/gateway";
import { ProcessedDocumentStore } from "../src/processed-store";
import type { CompanyResolver, ExpressDocumentsGateway } from "../src/types";
import { DocumentValidator } from "../src/validation";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

async function inspect(
  text: string,
  companies: CompanyResolver = new DemoCompanyResolver(),
  gateway: ExpressDocumentsGateway = new DemoExpressDocumentsGateway(),
) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "express-identity-"));
  roots.push(root);
  const filePath = path.join(root, "999999-arquivo.pdf");
  fs.writeFileSync(filePath, "%PDF-1.4\nfixture pesquisavel");
  const validator = new DocumentValidator(companies, gateway, new ProcessedDocumentStore(path.join(root, "store.json")), async () => ({ text }));
  return (await validator.inspectMany([filePath]))[0];
}

const base = "Competencia: 08/2026\nVencimento: 18/09/2026";

describe("validacao de identidade e competencia", () => {
  it("bloqueia CNPJ ausente, invalido e multiplo", async () => {
    expect((await inspect(`EMPRESA EXEMPLO\n${base}`)).messages.map((item) => item.code)).toContain("cnpj_missing");
    expect((await inspect(`11.111.111/1111-11\n${base}`)).messages.map((item) => item.code)).toContain("cnpj_invalid");
    expect((await inspect(`12.345.678/0001-95\n45.723.174/0001-10\n${base}`)).messages.map((item) => item.code)).toContain("cnpj_ambiguous");
  });

  it("bloqueia competencias conflitantes", async () => {
    const row = await inspect(`12.345.678/0001-95\nEMPRESA EXEMPLO LTDA\nCompetencia: 08/2026\nPA:07/2026\nVencimento: 18/09/2026`);
    expect(row.messages.map((item) => item.code)).toContain("competence_conflict");
    expect(row.task).toBeUndefined();
  });

  it("mantem empresa oficial e avisa quando a razao social diverge", async () => {
    const companies: CompanyResolver = {
      status: () => ({ available: true, mode: "verified" }),
      findCompanies: async () => [{ id: "official", name: "RAZAO SOCIAL OFICIAL LTDA", cnpj: "12.345.678/0001-95" }],
      resolveCompany: async () => ({ id: "official", name: "RAZAO SOCIAL OFICIAL LTDA", cnpj: "12.345.678/0001-95" }),
    };
    const row = await inspect(`12.345.678/0001-95\nNOME DIVERGENTE LTDA\n${base}`, companies);
    expect(row.company?.id).toBe("official");
    expect(row.messages.map((item) => item.code)).toContain("company_name_mismatch");
  });

  it("ignora completamente o prefixo numerico do nome do arquivo", async () => {
    const row = await inspect(`12.345.678/0001-95\nEMPRESA EXEMPLO LTDA\n${base}`);
    expect(row.extractedCnpj).toBe("12.345.678/0001-95");
    expect(row.company?.id).toContain("12345678000195");
    expect(row.company?.id).not.toContain("999999");
  });

  it("valida a identidade, competencia e vencimento de uma guia FGTS Digital", async () => {
    const text = [
      "CPF/CNPJ do Empregador", "46.583.870", "Nome/Razao Social do Empregador", "R DA S LIMA",
      "Tag", "46583870 07/2026 MENSAL", "Pagar este documento ate", "20/08/2026",
      "Informacoes de recolhimentos do FGTS", "GFD - Guia do FGTS Digital",
    ].join("\n");
    const row = await inspect(text);
    expect(row).toMatchObject({
      documentKind: "fgts_digital", extractedIdentifierType: "cnpj_root", extractedIdentifierValue: "46583870",
      extractedCompanyName: "R DA S LIMA", competence: "2026-07", extractedDueDate: "2026-08-20",
    });
    expect(row.company?.cnpj).toBe("46.583.870/0001-31");
    expect(row.messages.map((item) => item.code)).toContain("company_resolved_by_cnpj_root");
  });

  it("mantem a empresa oficial e avisa quando uma razao social FGTS por raiz esta truncada", async () => {
    const companies: CompanyResolver = {
      status: () => ({ available: true, mode: "verified" }),
      findCompanies: async () => [{ id: "768", name: "AGILLI VEICULOS, INTERMEDIACOES, RASTREAMENTO E MONITORAMENTO LTDA", cnpj: "46.083.352/0001-59" }],
      resolveCompany: async () => ({ id: "768", name: "AGILLI VEICULOS, INTERMEDIACOES, RASTREAMENTO E MONITORAMENTO LTDA", cnpj: "46.083.352/0001-59" }),
    };
    const text = [
      "CPF/CNPJ do Empregador", "46.083.352", "Nome/Razao Social do Empregador", "AGILLI VEICULOS, INTERMEDIACOES, RASTREAMENTO E MO",
      "Tag", "46083352 07/2026 MENSAL", "Pagar este documento ate", "20/08/2026",
      "Informacoes de recolhimentos do FGTS", "GFD - Guia do FGTS Digital",
    ].join("\n");
    const row = await inspect(text, companies);
    expect(row.company?.cnpj).toBe("46.083.352/0001-59");
    expect(row.messages.map((item) => item.code)).toContain("company_resolved_by_unique_cnpj_root");
  });

  it("resolve guia FGTS identificada por CPF", async () => {
    const text = "CPF/CNPJ do Empregador\n529.982.247-25\nNome/Razao Social do Empregador\nEMPREGADOR\nTag\n529982247 07/2026 MENSAL\nPagar este documento ate\n20/08/2026\nInformacoes de recolhimentos do FGTS\nGFD - Guia do FGTS Digital";
    const row = await inspect(text);
    expect(row).toMatchObject({
      documentKind: "fgts_digital", extractedIdentifierType: "cpf", extractedIdentifierValue: "529.982.247-25",
      extractedCompanyName: "EMPREGADOR",
    });
    expect(row.company?.cpf).toBe("529.982.247-25");
    expect(row.messages.map((item) => item.code)).toContain("company_resolved_by_cpf");
    expect(row.messages.map((item) => item.code)).not.toContain("company_identifier_unsupported");
  });

  it("avisa quando o CPF casa pela raiz no documento Outro do Gestta", async () => {
    const companies: CompanyResolver = {
      status: () => ({ available: true, mode: "verified" }),
      findCompanies: async () => [{
        id: "gestta-thayanne",
        name: "THAYANNE OLIVEIRA DE MORAIS",
        code: "700",
        cpf: "004.617.563-66",
        cnpj: "00461756300119",
      }],
      resolveCompany: async () => ({
        id: "gestta-thayanne",
        name: "THAYANNE OLIVEIRA DE MORAIS",
        code: "700",
        cpf: "004.617.563-66",
        cnpj: "00461756300119",
      }),
    };
    const text = [
      "CPF/CNPJ do Empregador", "004.617.563-66", "Nome/Razao Social do Empregador", "THAYANNE OLIVEIRA DE MORAIS",
      "Tag", "004617563 08/2026 MENSAL", "Pagar este documento ate", "18/09/2026",
      "Informacoes de recolhimentos do FGTS", "GFD - Guia do FGTS Digital",
    ].join("\n");
    const row = await inspect(text, companies);
    expect(row.company?.id).toBe("gestta-thayanne");
    expect(row.messages.map((item) => item.code)).toContain("company_resolved_by_cpf_root");
  });

  it("oferece selecao quando a raiz de CNPJ encontra matriz e filial", async () => {
    const companies: CompanyResolver = {
      status: () => ({ available: true, mode: "verified" }),
      findCompanies: async () => [
        { id: "matriz", name: "EMPRESA EXEMPLO LTDA", cnpj: "12.345.678/0001-95", code: "100" },
        { id: "filial", name: "EMPRESA EXEMPLO FILIAL", cnpj: "12.345.678/0002-76", code: "101" },
      ],
      resolveCompany: async () => { throw new Error("Mais de um cliente ativo"); },
    };
    const text = [
      "CPF/CNPJ do Empregador", "12.345.678", "Nome/Razao Social do Empregador", "OUTRO NOME",
      "Tag", "12345678 07/2026 MENSAL", "Pagar este documento ate", "20/08/2026",
      "Informacoes de recolhimentos do FGTS", "GFD - Guia do FGTS Digital",
    ].join("\n");
    const row = await inspect(text, companies);
    expect(row.company).toBeUndefined();
    expect(row.companyCandidates).toHaveLength(2);
    expect(row.messages.map((item) => item.code)).toContain("company_ambiguous");
    expect(row.messages.find((item) => item.code === "company_ambiguous")?.severity).toBe("warning");
  });

  it("aplica a escolha de filial e resolve a tarefa da empresa selecionada", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "express-identity-"));
    roots.push(root);
    const filePath = path.join(root, "guia.pdf");
    fs.writeFileSync(filePath, "%PDF-1.4\nfixture pesquisavel");
    const text = [
      "CPF/CNPJ do Empregador", "12.345.678", "Nome/Razao Social do Empregador", "OUTRO NOME",
      "Tag", "12345678 07/2026 MENSAL", "Pagar este documento ate", "20/08/2026",
      "Informacoes de recolhimentos do FGTS", "GFD - Guia do FGTS Digital",
    ].join("\n");
    const companies: CompanyResolver = {
      status: () => ({ available: true, mode: "verified" }),
      findCompanies: async () => [
        { id: "matriz", name: "EMPRESA EXEMPLO LTDA", cnpj: "12.345.678/0001-95", code: "100" },
        { id: "filial", name: "EMPRESA EXEMPLO FILIAL", cnpj: "12.345.678/0002-76", code: "101" },
      ],
      resolveCompany: async (input) => ({
        id: input.preferredCompanyId || "matriz",
        name: "EMPRESA EXEMPLO FILIAL",
        cnpj: "12.345.678/0002-76",
      }),
    };
    const validator = new DocumentValidator(
      companies, new DemoExpressDocumentsGateway(), new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text }),
    );
    const row = (await validator.inspectMany([filePath]))[0];
    const selected = await validator.applySelection(row, { companyId: "filial" });
    expect(selected.company?.id).toBe("filial");
    expect(selected.task?.company.id).toBe("filial");
    expect(selected.messages.map((item) => item.code)).toContain("company_selected");
    expect(selected.messages.map((item) => item.code)).not.toContain("company_ambiguous");
  });

  it("identifica competencia e tipo de um DARF SENDA 6012 com periodo colado", async () => {
    const text = [
      "Documento de Arrecadacao de Receitas Federais",
      "12.345.678/0001-95",
      "EMPRESA EXEMPLO LTDA",
      "Periodo de ApuracaoData de VencimentoNumero do Documento",
      "Pagar este documento ate",
      "31/08/2026",
      "No Recibo Declaracao: 50000509330153",
      "junho/202631/08/2026",
      "6012CSLL - DEMAIS BAL TRIM",
      "PA:2º Trimestre/2026 Vencimento:31/08/2026",
    ].join("\n");
    const row = await inspect(text);
    expect(row).toMatchObject({
      documentKind: "darf_6012",
      competence: "2026-06",
      extractedDueDate: "2026-08-31",
      extractedCnpj: "12.345.678/0001-95",
    });
    expect(row.task?.companyDocumentName).toBe("DARF 6012");
    expect(row.messages.some((item) => item.severity === "error")).toBe(false);
  });

  it("identifica e prepara um DAE eSocial com o template exclusivo", async () => {
    const text = [
      "Documento de Arrecadacao do eSocial",
      "12.345.678/0001-95",
      "EMPRESA EXEMPLO LTDA",
      "Periodo de Apuracao",
      "agosto/2026",
      "Data de Vencimento",
      "18/09/2026",
      "Composicao do Documento de Arrecadacao",
      "1082 CONTR PREV DESCONTA SEGURADO-EMPREGADO/AVULSO",
      "07 CP SEGURADOS - EMPREGADO CONTRATADO POR MEI",
      "PA:08/2026",
    ].join("\n");
    const row = await inspect(text);
    expect(row).toMatchObject({
      documentKind: "dae_esocial",
      competence: "2026-08",
      extractedDueDate: "2026-09-18",
      extractedCnpj: "12.345.678/0001-95",
      status: "ready",
    });
    expect(row.task).toMatchObject({
      name: "DAE ESOCIAL",
      companyDocumentName: "DAE ESOCIAL",
    });
    expect(row.messages.some((item) => item.severity === "error")).toBe(false);
  });

  it("identifica mas bloqueia um DAE eSocial cuja tarefa ja esta concluida", async () => {
    const gateway = new DemoExpressDocumentsGateway();
    gateway.findTasks = async (input) => [{
      id: "task-dae-done",
      name: "DAE ESOCIAL",
      competence: input.competence,
      status: "completed",
      company: input.company,
      companyDocumentId: "document-dae",
      companyDocumentName: "DAE ESOCIAL",
    }];
    const text = [
      "Documento de Arrecadacao do eSocial",
      "12.345.678/0001-95",
      "EMPRESA EXEMPLO LTDA",
      "Periodo de Apuracao",
      "agosto/2026",
      "Data de Vencimento",
      "18/09/2026",
      "Composicao do Documento de Arrecadacao",
      "07 CP SEGURADOS - EMPREGADO CONTRATADO POR MEI",
      "PA:08/2026",
    ].join("\n");

    const row = await inspect(text, new DemoCompanyResolver(), gateway);
    expect(row).toMatchObject({ documentKind: "dae_esocial", status: "pending_review" });
    expect(row.task).toMatchObject({ id: "task-dae-done", status: "completed", name: "DAE ESOCIAL" });
    expect(row.messages).toContainEqual(expect.objectContaining({
      code: "task_completed",
      severity: "error",
      message: expect.stringContaining("documento nao sera enviado"),
    }));
  });

  it("trata divergencia de competencia DARF como aviso e mantem pronto para envio", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "express-identity-"));
    roots.push(root);
    const filePath = path.join(root, "guia.pdf");
    fs.writeFileSync(filePath, "%PDF-1.4\nfixture pesquisavel");
    const gateway = new DemoExpressDocumentsGateway();
    gateway.resolveTask = async (input) => ({
      id: "task-mensal",
      name: "GUIA DO IR E CSLL - MENSAL",
      competence: "2026-07",
      status: "open" as const,
      company: { id: "demo-company-12345678000195", name: "Empresa Demonstracao Ltda", cnpj: "12.345.678/0001-95" },
      companyDocumentId: "doc-6012",
      companyDocumentName: "DARF 6012",
    });
    const text = [
      "DOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS",
      "RECIBO DECLARACAO",
      "12.345.678/0001-95",
      "EMPRESA EXEMPLO LTDA",
      "6012CSLL - DEMAIS BAL TRIM",
      "PA:2º Trimestre/2026",
      "Vencimento: 31/08/2026",
    ].join("\n");
    const validator = new DocumentValidator(
      new DemoCompanyResolver(), gateway, new ProcessedDocumentStore(path.join(root, "store.json")),
      async () => ({ text }),
    );
    const row = (await validator.inspectMany([filePath]))[0];
    expect(row.status).toBe("ready");
    expect(row.competence).toBe("2026-06");
    expect(row.task?.competence).toBe("2026-07");
    const mismatch = row.messages.find((item) => item.code === "competence_mismatch");
    expect(mismatch?.severity).toBe("info");
  });

  it("bloqueia competencia da Tag FGTS quando outra fonte diverge", async () => {
    const text = "CPF/CNPJ do Empregador\n46.583.870\nNome/Razao Social do Empregador\nR DA S LIMA\nTag\n46583870 07/2026 MENSAL\nCompetencia: 08/2026\nPagar este documento ate\n20/08/2026\nInformacoes de recolhimentos do FGTS\nGFD - Guia do FGTS Digital";
    const row = await inspect(text);
    expect(row.messages.map((item) => item.code)).toContain("competence_conflict");
    expect(row.task).toBeUndefined();
  });
});
