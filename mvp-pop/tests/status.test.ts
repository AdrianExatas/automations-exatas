import { describe, expect, test } from "bun:test";
import { SUBMISSION_STATUSES } from "../src/types/status";

describe("status machine", () => {
  test("contém fluxo completo Fase 1+2", () => {
    for (const s of [
      "recebido",
      "em_processamento",
      "transcrevendo",
      "estruturando",
      "gerando_docs",
      "documentacao_gerada",
      "em_validacao",
      "ajuste_solicitado",
      "documento_atualizado",
      "aprovado",
      "vigente",
    ]) {
      expect(SUBMISSION_STATUSES).toContain(s);
    }
  });
});
