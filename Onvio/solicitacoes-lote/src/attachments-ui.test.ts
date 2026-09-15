import { describe, expect, it } from "vitest";
import { mergeUiAttachments } from "./attachments-ui";
import type { ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";

function row(codigo: string): ServiceRequestRow {
  return {
    cnpj: "12",
    codigo,
    nome: "Empresa",
    solicitante: "Fulano",
    departamento: "Fiscal",
    assunto: "A",
    descricao: "B",
    arquivos: [],
  };
}

describe("mergeUiAttachments", () => {
  it("separa anexos por linha e anexos comuns", () => {
    const result = mergeUiAttachments(
      [row("1"), row("2")],
      {
        0: [{ filePath: "C:/a/contrato.pdf", fileName: "contrato.pdf" }],
      },
      [{ filePath: "C:/comum/circular.pdf", fileName: "circular.pdf" }],
    );

    expect(result.rows[0]?.arquivos).toEqual(["C:/a/contrato.pdf"]);
    expect(result.rows[1]?.arquivos).toEqual([]);
    expect(result.extraAttachmentPaths).toEqual(["C:/comum/circular.pdf"]);
  });
});
