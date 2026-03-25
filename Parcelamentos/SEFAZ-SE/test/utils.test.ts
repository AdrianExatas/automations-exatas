import test from "node:test";
import assert from "node:assert/strict";
import {
  buildParcelLabel,
  buildPdfFileName,
  extractPdfNumber,
  normalizeCpf,
  normalizeDigits,
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
