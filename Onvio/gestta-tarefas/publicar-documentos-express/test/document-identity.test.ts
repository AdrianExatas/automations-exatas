import { describe, expect, it } from "vitest";
import { extractCnpjs, extractCompanyName, extractFgtsCompanyIdentifier, identifyDocumentKind, isValidCnpj, isValidCpf } from "../src/document-identity";

describe("identidade do documento", () => {
  it("valida e deduplica o mesmo CNPJ", () => {
    const result = extractCnpjs("CNPJ 12.345.678/0001-95\nCNPJ 12345678000195");
    expect(result.all).toEqual(["12.345.678/0001-95"]);
    expect(result.valid).toEqual(["12.345.678/0001-95"]);
    expect(isValidCnpj("12.345.678/0001-90")).toBe(false);
  });

  it("nao confunde numero de recibo com CNPJ sem pontuacao", () => {
    const result = extractCnpjs("No Recibo Declaracao: 50000516198215\nCNPJ 12.345.678/0001-95");
    expect(result.all).toEqual(["12.345.678/0001-95"]);
  });

  it("mantem CNPJs distintos e identifica digitos invalidos", () => {
    const result = extractCnpjs("12.345.678/0001-95 e 11.111.111/1111-11");
    expect(result.all).toHaveLength(2);
    expect(result.invalid).toContain("11.111.111/1111-11");
  });

  it("extrai razao social apos o CNPJ sem usar o nome do arquivo", () => {
    expect(extractCompanyName("CNPJ\n12.345.678/0001-95\nEMPRESA EXEMPLO LTDA", "12.345.678/0001-95")).toBe("EMPRESA EXEMPLO LTDA");
  });

  it("reconhece DCTFWeb somente por marcadores fortes do conteudo", () => {
    const text = "Documento de Arrecadacao de Receitas Federais\nNo Recibo Declaracao 123\nCP DESCONTADA";
    expect(identifyDocumentKind(text)).toBe("dctfweb");
    expect(identifyDocumentKind("706 - DCTFWEB 082026.pdf")).toBeUndefined();
  });

  it("reconhece DAE eSocial somente pela combinacao de marcadores internos", () => {
    const header = "Documento de Arrecadacao do eSocial\nComposicao do Documento de Arrecadacao\n";
    expect(identifyDocumentKind(`${header}07 CP SEGURADOS - EMPREGADO CONTRATADO POR MEI`)).toBe("dae_esocial");
    expect(identifyDocumentKind(`${header}07 CP DESCONTADA SEGURADO-EMPREGADO`)).toBe("dae_esocial");
    expect(identifyDocumentKind("160 - DAE ESOCIAL 08-2026.pdf")).toBeUndefined();
    expect(identifyDocumentKind("Documento de Arrecadacao do eSocial\nCP SEGURADOS")).toBeUndefined();
    expect(identifyDocumentKind("Composicao do Documento de Arrecadacao\nCP SEGURADOS")).toBeUndefined();
    expect(identifyDocumentKind(header)).toBeUndefined();
  });

  it("reconhece FGTS Digital e extrai raiz e razao social pelos rotulos", () => {
    const text = "CPF/CNPJ do Empregador\n46.583.870\nNome/Razao Social do Empregador\nR DA S LIMA\nInformacoes de recolhimentos do FGTS\nGFD - Guia do FGTS Digital";
    expect(identifyDocumentKind(text)).toBe("fgts_digital");
    expect(extractFgtsCompanyIdentifier(text)).toEqual({
      type: "cnpj_root", value: "46583870", companyName: "R DA S LIMA",
    });
    expect(identifyDocumentKind("738 - FGTS 07-2026.pdf")).toBeUndefined();
  });

  it("distingue CPF, CAEPF e identificador invalido em guia FGTS", () => {
    expect(extractFgtsCompanyIdentifier("CPF/CNPJ do Empregador\n529.982.247-25")).toEqual({
      type: "cpf", value: "529.982.247-25",
    });
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(extractFgtsCompanyIdentifier("CPF/CNPJ do Empregador\n123.456.789-01").invalid).toBe(true);
    expect(extractFgtsCompanyIdentifier("CPF/CNPJ do Empregador\n123.456.789/012-3").unsupportedType).toBe("caepf");
    expect(extractFgtsCompanyIdentifier("CPF/CNPJ do Empregador\n12345").invalid).toBe(true);
  });

  it("distingue guia exclusiva de FGTS Consignado da guia mensal", () => {
    const base = "GFD - Guia do FGTS Digital\nCPF/CNPJ do Empregador\n12.345.678\nInformacoes de recolhimentos do FGTS\n";
    expect(identifyDocumentKind(`${base}Competencia Consignado Encargos Consignado\nTotal Consignado: 100,00`)).toBe("fgts_consignado");
    expect(identifyDocumentKind(`${base}FGTS Mensal\nTotal FGTS: 100,00\nNao ha informacoes de recolhimentos do Consignado`)).toBe("fgts_digital");
  });

  it("reconhece DARF de cota 6012, 3373 e o documento combinado", () => {
    const header = "Documento de Arrecadacao de Receitas Federais\nNo Recibo Declaracao 50000509330153\n";
    expect(identifyDocumentKind(`${header}6012CSLL - DEMAIS BAL TRIM`)).toBe("darf_6012");
    expect(identifyDocumentKind(`${header}3373IRPJ - NAO OBR LUC REAL-BAL TRIM`)).toBe("darf_3373");
    expect(identifyDocumentKind(`${header}6012CSLL - DEMAIS BAL TRIM\n3373IRPJ - NAO OBR LUC REAL-BAL TRIM`)).toBe("darf_6012_3373");
    expect(identifyDocumentKind(`${header}CP DESCONTADA\n6012CSLL`)).toBe("dctfweb");
    expect(identifyDocumentKind("CSLL 6012 2T2026 COTA 02.pdf")).toBeUndefined();
  });
});
