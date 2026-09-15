import { describe, expect, test } from "bun:test";

import { analyzeMessage, htmlToPlainText } from "../src/message-analysis.js";
import type { DteMessage } from "../src/types.js";

const BASE: DteMessage = {
  cnpj: "11222333000181",
  corporateName: "Empresa Teste",
  uid: "uid-1",
  title: "Mensagem",
  text: "Conteúdo",
  sender: "Secretaria de Inspeção do Trabalho",
  type: "2",
  situation: "0",
  archived: false,
  createdAt: "2026-09-15T08:00:00-03:00",
  readAt: "",
  readByDeadlineAt: "",
  sourceSystem: "DET",
};

describe("análise de mensagens", () => {
  test("converte HTML em texto legível sem executar conteúdo", () => {
    const text = htmlToPlainText(
      '<!DOCTYPE html><style>body{color:red}</style><p>Orientação &amp; prazo</p><ul><li>Ação 1</li></ul><table><tr><th>Processo</th><th>Valor</th></tr><tr><td>123</td><td>R$ 10</td></tr></table><script>alert(1)</script>',
    );
    expect(text).toContain("Orientação & prazo");
    expect(text).toContain("• Ação 1");
    expect(text).toContain("Processo | Valor");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("alert(1)");
  });

  test("prioriza comunicação processual e extrai prazo relativo", () => {
    const analyzed = analyzeMessage(
      {
        ...BASE,
        title: "Notificação Eletrônica - Decisão Procedente",
        sender: "Processo Eletrônico Administrativo Trabalhista",
        text: "Prazo de 10 (dez) dias consecutivos a contar do recebimento.",
        readByDeadlineAt: "2026-09-01T08:00:00-03:00",
      },
      new Date("2026-09-15T12:00:00Z"),
    );
    expect(analyzed.priority).toBe("critica");
    expect(analyzed.category).toBe("processo_administrativo");
    expect(analyzed.requiresAction).toBe(true);
    expect(analyzed.deadlineText).toBe("10 dias consecutivos");
    expect(analyzed.deadlineStatus).toBe("calculo_manual_necessario");
    expect(analyzed.scienceStatus).toBe("ciencia_por_decurso");
  });

  test("distingue leitura manual, ciência por decurso e espera", () => {
    const asOf = new Date("2026-09-15T12:00:00Z");
    const manual = analyzeMessage({ ...BASE, readAt: "2026-09-10T08:00:00-03:00", readByDeadlineAt: "2026-09-12T08:00:00-03:00" }, asOf);
    const waiting = analyzeMessage(BASE, asOf);
    expect(manual.isUnread).toBe(false);
    expect(manual.scienceStatus).toBe("leitura_manual");
    expect(waiting.isUnread).toBe(true);
    expect(waiting.scienceStatus).toBe("aguardando_ciencia");
  });

  test("classifica contato inicial como informativo", () => {
    const analyzed = analyzeMessage({ ...BASE, title: "Domicílio Eletrônico Trabalhista - DET - Contato Inicial" });
    expect(analyzed.priority).toBe("informativa");
    expect(analyzed.requiresAction).toBe(false);
    expect(analyzed.actionStatus).toBe("somente_ciencia");
  });

  test("classifica pendência de FGTS como alta", () => {
    const analyzed = analyzeMessage({ ...BASE, title: "Notificação para Solução de Pendências – FGTS Digital" });
    expect(analyzed.priority).toBe("alta");
    expect(analyzed.category).toBe("fgts");
    expect(analyzed.responsibleArea).toContain("Fiscal");
  });
});
