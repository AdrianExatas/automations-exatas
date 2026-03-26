import { describe, expect, it } from "vitest";
import type { EmpresaBatchItem } from "../../types";
import {
  UploadResolutionError,
  buildUploadDescription,
  buildUploadSubject,
  filenameHasExactCodeToken,
  resolveAttachmentsForEmpresa,
  resolveUploadIdentifiers,
  type UploadAttachmentFile,
} from "./upload-onvio-helpers";

function makeEmpresa(overrides: Partial<EmpresaBatchItem> = {}): EmpresaBatchItem {
  return {
    cnpj: "12.345.678/0001-90",
    codigo: "543",
    nome: "Link Informatica",
    solicitante: "",
    departamento: "",
    assunto: "",
    descricao: "",
    qtdArquivos: undefined,
    arquivos: [],
    ...overrides,
  };
}

function makeFiles(): UploadAttachmentFile[] {
  return [
    {
      filePath: "C:/tmp/Empresa 543 - LINK INFORMATICA.pdf",
      fileName: "Empresa 543 - LINK INFORMATICA.pdf",
      extension: ".pdf",
    },
    {
      filePath: "C:/tmp/Empresa 543 - LINK INFORMATICA 2.xlsx",
      fileName: "Empresa 543 - LINK INFORMATICA 2.xlsx",
      extension: ".xlsx",
    },
    {
      filePath: "C:/tmp/Empresa 13 - OUTRA.pdf",
      fileName: "Empresa 13 - OUTRA.pdf",
      extension: ".pdf",
    },
  ];
}

describe("upload-onvio helpers", () => {
  it("detecta codigo como token numerico exato no nome do arquivo", () => {
    expect(filenameHasExactCodeToken("Empresa 543 - LINK INFORMATICA.pdf", "543")).toBe(true);
    expect(filenameHasExactCodeToken("543 - Relatorio.xlsx", "543")).toBe(true);
    expect(filenameHasExactCodeToken("Empresa 1543 - LINK INFORMATICA.pdf", "543")).toBe(false);
  });

  it("resolve anexos pela lista explicita da planilha", () => {
    const empresa = makeEmpresa({
      arquivos: ["Empresa 543 - LINK INFORMATICA.pdf", "Empresa 543 - LINK INFORMATICA 2.xlsx"],
    });

    const attachments = resolveAttachmentsForEmpresa(empresa, makeFiles());
    expect(attachments).toHaveLength(2);
  });

  it("faz fallback para matching por codigo quando a planilha nao lista arquivos", () => {
    const attachments = resolveAttachmentsForEmpresa(makeEmpresa(), makeFiles());
    expect(attachments).toHaveLength(2);
  });

  it("falha quando arquivo listado na planilha nao existe", () => {
    const empresa = makeEmpresa({ arquivos: ["Inexistente.pdf"] });
    expect(() => resolveAttachmentsForEmpresa(empresa, makeFiles())).toThrow(UploadResolutionError);
  });

  it("falha quando a planilha lista uma extensao nao suportada", () => {
    const empresa = makeEmpresa({ arquivos: ["Empresa 543 - LINK INFORMATICA.docx"] });
    expect(() => resolveAttachmentsForEmpresa(empresa, makeFiles())).toThrow(
      "Extensao nao suportada para upload",
    );
  });

  it("prioriza override por linha ao resolver ids do upload", () => {
    const result = resolveUploadIdentifiers(
      makeEmpresa({
        onvioClientId: "client-line",
        onvioRequesterId: "requester-line",
        onvioDepartmentId: "department-line",
      }),
      {
        clientIdByCode: new Map([["543", "client-map"]]),
        requesterIdByName: new Map([["FULANO", "requester-map"]]),
        departmentIdByName: new Map([["FISCAL", "department-map"]]),
      },
      {
        clientId: "client-default",
        requesterId: "requester-default",
        departmentId: "department-default",
      },
    );

    expect(result).toMatchObject({
      clientId: "client-line",
      requesterId: "requester-line",
      departmentId: "department-line",
    });
  });

  it("usa API do BD antes do fallback global", () => {
    const result = resolveUploadIdentifiers(
      makeEmpresa({ solicitante: "Fulano", departamento: "Fiscal" }),
      {
        clientIdByCode: new Map([["543", "client-map"]]),
        requesterIdByName: new Map([["FULANO", "requester-map"]]),
        departmentIdByName: new Map([["FISCAL", "department-map"]]),
      },
      {
        clientId: "client-default",
        requesterId: "requester-default",
        departmentId: "department-default",
      },
    );

    expect(result).toMatchObject({
      clientId: "client-map",
      requesterId: "requester-map",
      departmentId: "department-map",
    });
    expect(result.warnings).toEqual([]);
  });

  it("cai no fallback global quando a API do BD nao resolve", () => {
    const result = resolveUploadIdentifiers(
      makeEmpresa({ solicitante: "Beltrano", departamento: "Inexistente" }),
      {
        clientIdByCode: new Map(),
        requesterIdByName: new Map(),
        departmentIdByName: new Map([["PADRAO", "department-by-name"]]),
      },
      {
        clientId: "client-default",
        requesterId: "requester-default",
        departmentName: "Padrao",
      },
    );

    expect(result).toMatchObject({
      clientId: "client-default",
      requesterId: "requester-default",
      departmentId: "department-by-name",
    });
    expect(result.warnings).toHaveLength(3);
  });

  it("falha quando clientId ou departmentId nao podem ser resolvidos", () => {
    expect(() =>
      resolveUploadIdentifiers(
        makeEmpresa(),
        {
          clientIdByCode: new Map(),
          requesterIdByName: new Map(),
          departmentIdByName: new Map(),
        },
        {},
      ),
    ).toThrow("ClientId nao resolvido");

    expect(() =>
      resolveUploadIdentifiers(
        makeEmpresa({ onvioClientId: "client-ok" }),
        {
          clientIdByCode: new Map(),
          requesterIdByName: new Map(),
          departmentIdByName: new Map(),
        },
        {},
      ),
    ).toThrow("Departamento nao resolvido");
  });

  it("gera assunto e descricao padrao para upload multi-anexo", () => {
    const empresa = makeEmpresa();
    expect(buildUploadSubject(empresa)).toBe("Relatorio Servicos Tomados - Link Informatica");
    expect(buildUploadDescription(empresa, 2)).toBe(
      "Upload automatico do relatorio Unecont para Link Informatica com 2 arquivo(s).",
    );
  });
});
