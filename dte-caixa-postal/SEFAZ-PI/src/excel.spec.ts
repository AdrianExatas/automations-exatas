import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";

import { writeNotificationsWorkbook } from "./excel.js";

test("writeNotificationsWorkbook writes notification rows and result rows", async ({}, testInfo) => {
  const outputPath = testInfo.outputPath("relatorio.xlsx");

  await writeNotificationsWorkbook(
    [
      {
        company: {
          code: "587",
          name: "NORDESTINO RESTAURANTE",
          cnpj: "43.583.925/0001-15",
          stateRegistration: "197942202",
          stateRegistrationDisplay: "19.794.220-2",
        },
        result: "NOTIFICACOES_ENCONTRADAS",
        notifications: [
          {
            status: "",
            scienceSituation: "-",
            type: "NOTIFICACAO",
            recipientRegistration: "197942202 - NORDESTINO RESTAURANTE",
            sender: "SIATWEB",
            issuedAtText: "05/04/2026 02:56",
            subject: "Divida documento",
            readAtText: "-",
            scienceAtText: "-",
            viewableUntilText: "04/06/2026 00:00",
          },
        ],
      },
      {
        company: {
          code: "591",
          name: "NORDESTINO RESTAURANTE FILIAL",
          cnpj: "43.583.925/0002-04",
          stateRegistration: "197859259",
          stateRegistrationDisplay: "19.785.925-9",
        },
        result: "SEM_NOTIFICACOES_NO_PERIODO",
        notifications: [],
      },
    ],
    outputPath,
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(outputPath);

  const worksheet = workbook.getWorksheet("Notificacoes");
  expect(worksheet).toBeDefined();
  expect(worksheet?.rowCount).toBe(3);
  expect(worksheet?.getRow(2).getCell(2).value).toBe("NORDESTINO RESTAURANTE");
  expect(worksheet?.getRow(2).getCell(5).value).toBe("NOTIFICACOES_ENCONTRADAS");
  expect(worksheet?.getRow(3).getCell(5).value).toBe("SEM_NOTIFICACOES_NO_PERIODO");
});
