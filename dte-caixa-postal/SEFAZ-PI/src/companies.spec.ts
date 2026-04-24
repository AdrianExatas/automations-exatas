import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";

import {
  formatStateRegistrationForPortal,
  normalizeDigits,
  normalizeHeader,
  readCompaniesWorkbook,
} from "./companies.js";

test("normalizeHeader removes accents and extra spaces", async () => {
  expect(normalizeHeader("INSCRIÇÃO   ESTADUAL")).toBe("INSCRICAO ESTADUAL");
});

test("formatStateRegistrationForPortal formats 9 digits for the portal", async () => {
  expect(normalizeDigits("19.785.925-9")).toBe("197859259");
  expect(formatStateRegistrationForPortal("197859259")).toBe("19.785.925-9");
});

test("readCompaniesWorkbook reads Planilha1 and required columns", async ({}, testInfo) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Planilha1");
  const workbookPath = testInfo.outputPath("empresas.xlsx");

  worksheet.addRow(["CODIGO", "EMPRESA ", "CNPJ ", "INSCRIÇÃO ESTADUAL"]);
  worksheet.addRow([587, "NORDESTINO RESTAURANTE", "43.583.925/0001-15", 197942202]);

  await workbook.xlsx.writeFile(workbookPath);

  const companies = await readCompaniesWorkbook(workbookPath);

  expect(companies).toHaveLength(1);
  expect(companies[0]).toMatchObject({
    code: "587",
    name: "NORDESTINO RESTAURANTE",
    cnpj: "43.583.925/0001-15",
    stateRegistration: "197942202",
    stateRegistrationDisplay: "19.794.220-2",
  });
});
