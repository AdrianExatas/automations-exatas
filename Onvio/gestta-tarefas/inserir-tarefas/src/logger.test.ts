import { describe, expect, it } from "vitest";
import { formatProgressLog } from "./logger";

describe("logger", () => {
  it("formata mensagens com tarefa, etapa e empresa", () => {
    const formatted = formatProgressLog({
      timestamp: "2026-03-18T13:10:00.000Z",
      nivel: "info",
      etapa: "adicionar-empresas",
      tarefa: "PROVISÃO",
      taskIndex: 1,
      taskTotal: 2,
      companyIndex: 12,
      companyTotal: 86,
      customerName: "EMPRESA MODELO DO NORDESTE LTDA",
      cnpj: "12345678000190",
      mensagem: "inclusao solicitada.",
    });

    expect(formatted).toContain("[tarefa 1/2]");
    expect(formatted).toContain("[adicionar-empresas]");
    expect(formatted).toContain("[empresa 12/86] EMPRESA MODELO DO NORDESTE LTDA (12345678000190)");
    expect(formatted).toContain("inclusao solicitada.");
  });
});
