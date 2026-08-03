import test from "node:test";
import assert from "node:assert/strict";
import {
  buildParcelLabel,
  buildPdfFileName,
  buildSolicitationMonthFolder,
  classifyDueDate,
  extractPdfNumber,
  formatToastMessage,
  normalizeCpf,
  normalizeDigits,
  resolveParcelLabel,
  shouldEmitParcelByDueStatus,
} from "../src/utils.js";

test("normalizeDigits removes masks", () => {
  assert.equal(normalizeDigits("27.121.985-8"), "271219858");
  assert.equal(normalizeDigits("026.103.645-98"), "02610364598");
});

test("normalizeCpf restores leading zeros from Excel values", () => {
  assert.equal(normalizeCpf("2610364598"), "02610364598");
});

test("buildParcelLabel uses paid and overdue installments", () => {
  assert.equal(buildParcelLabel(7, 3, 1), "04-07");
  assert.equal(buildParcelLabel(7, 3, 0), "04-07");
  assert.equal(buildParcelLabel(7, 3, 2), "05-07");
});

test("classifyDueDate identifies overdue, current month and future installments", () => {
  const referenceDate = new Date(2026, 6, 8);

  assert.equal(classifyDueDate("07/07/2026", referenceDate), "vencida");
  assert.equal(classifyDueDate("08/07/2026", referenceDate), "mes_atual");
  assert.equal(classifyDueDate("31/07/2026", referenceDate), "mes_atual");
  assert.equal(classifyDueDate("01/08/2026", referenceDate), "futura");
});

test("shouldEmitParcelByDueStatus emits overdue and current month installments only", () => {
  assert.equal(shouldEmitParcelByDueStatus("vencida"), true);
  assert.equal(shouldEmitParcelByDueStatus("mes_atual"), true);
  assert.equal(shouldEmitParcelByDueStatus("futura"), false);
});

test("resolveParcelLabel uses explicit portal installment when available", () => {
  const result = resolveParcelLabel(
    {
      "Qtde de parcelas": "7",
      "Parcelas pagas": "3",
      "Parcelas atrasadas": "2",
      Parcela: "04/07",
    },
    7,
    3,
    2,
  );

  assert.deepEqual(result, {
    parcelLabel: "04-07",
    criterioRotulo: "tela",
  });
});

test("resolveParcelLabel accepts portal installment number without explicit total", () => {
  const result = resolveParcelLabel(
    {
      "Nº da parcela": "4",
    },
    7,
    3,
    2,
  );

  assert.deepEqual(result, {
    parcelLabel: "04-07",
    criterioRotulo: "tela",
  });
});

test("resolveParcelLabel falls back to paid and overdue counters", () => {
  const result = resolveParcelLabel(
    {
      "Qtde de parcelas": "7",
      "Parcelas pagas": "3",
      "Parcelas atrasadas": "2",
    },
    7,
    3,
    2,
  );

  assert.deepEqual(result, {
    parcelLabel: "05-07",
    criterioRotulo: "fallback",
  });
});

test("extractPdfNumber removes DAE prefix and extension", () => {
  assert.equal(extractPdfNumber("DAE_20260310396010.pdf"), "20260310396010");
});

test("buildPdfFileName creates expected parcel file name", () => {
  assert.equal(
    buildPdfFileName("8", "04-13", "SUPERMERCADO DORIA BOQUIM", "20/03/2026"),
    "8 - PARCELA 04-13 - SUPERMERCADO DORIA BOQUIM - Vencimento 20-03-2026.pdf",
  );
});

test("buildPdfFileName uses SEM EMPRESA when company is missing", () => {
  assert.equal(
    buildPdfFileName("8", "04-13", undefined, "20/03/2026"),
    "8 - PARCELA 04-13 - SEM EMPRESA - Vencimento 20-03-2026.pdf",
  );
});

test("buildPdfFileName sanitizes invalid company characters", () => {
  assert.equal(
    buildPdfFileName("8", "04-13", "SUPERMERCADO: DORIA/BOQUIM", "20/03/2026"),
    "8 - PARCELA 04-13 - SUPERMERCADO DORIA BOQUIM - Vencimento 20-03-2026.pdf",
  );
});

test("buildPdfFileName keeps a safe fallback for invalid due dates", () => {
  assert.equal(
    buildPdfFileName("8", "04-13", "SUPERMERCADO DORIA BOQUIM", ""),
    "8 - PARCELA 04-13 - SUPERMERCADO DORIA BOQUIM - Vencimento.pdf",
  );
});

test("buildSolicitationMonthFolder formats execution month folder", () => {
  assert.equal(buildSolicitationMonthFolder(new Date(2026, 6, 8)), "07-2026");
});

test("formatToastMessage combines title and message", () => {
  assert.equal(
    formatToastMessage("Ooops... Ocorreu um erro!", "Socio/Solicitante nao esta apto a fazer o pagamento"),
    "Ooops... Ocorreu um erro!: Socio/Solicitante nao esta apto a fazer o pagamento",
  );
});

test("formatToastMessage returns only the message when title is missing", () => {
  assert.equal(
    formatToastMessage("", "Socio/Solicitante nao esta apto a fazer o pagamento"),
    "Socio/Solicitante nao esta apto a fazer o pagamento",
  );
});

test("formatToastMessage normalizes whitespace", () => {
  assert.equal(
    formatToastMessage("  Ooops...\n Ocorreu um erro!  ", "  Socio/Solicitante   nao esta apto   "),
    "Ooops... Ocorreu um erro!: Socio/Solicitante nao esta apto",
  );
});
