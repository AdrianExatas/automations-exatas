import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPdfFileName,
  escapeRegex,
  normalizeCnpj,
  normalizeDigits,
  normalizeIePi,
  normalizeWhitespace,
} from "../src/utils.js";

test("normalizeDigits removes masks", () => {
  assert.equal(normalizeDigits("19.785.925-9"), "197859259");
});

test("normalizeIePi keeps digits only without fixed padding", () => {
  assert.equal(normalizeIePi("197859259"), "197859259");
  assert.equal(normalizeIePi("0197859259"), "0197859259");
});

test("normalizeCnpj pads to 14 digits", () => {
  assert.equal(normalizeCnpj("12.345.678/0001-90"), "12345678000190");
});

test("normalizeWhitespace collapses spaces", () => {
  assert.equal(normalizeWhitespace("  a  b\n c  "), "a b c");
});

test("escapeRegex escapes regex metacharacters", () => {
  assert.equal(escapeRegex("a(b).c"), "a\\(b\\)\\.c");
});

test("buildPdfFileName creates PI parcel file name", () => {
  assert.equal(
    buildPdfFileName("001", "4", "Empresa X", "15/04/2026"),
    "001 - PI PARCELA 4 - Empresa X - Vencimento 15-04-2026.pdf",
  );
});

test("buildPdfFileName uses SEM EMPRESA when company is missing", () => {
  assert.equal(
    buildPdfFileName("001", "4", undefined, "15/04/2026"),
    "001 - PI PARCELA 4 - SEM EMPRESA - Vencimento 15-04-2026.pdf",
  );
});
