import { test, expect } from "@playwright/test";

import {
  isInCurrentOrPreviousMonth,
  mapRowCellsToNotification,
  parsePortalDate,
} from "./mailbox/parsing.js";

test("parsePortalDate parses portal date and time", async () => {
  const parsed = parsePortalDate("05/04/2026 02:56");

  expect(parsed).not.toBeNull();
  expect(parsed?.getFullYear()).toBe(2026);
  expect(parsed?.getMonth()).toBe(3);
  expect(parsed?.getDate()).toBe(5);
  expect(parsed?.getHours()).toBe(2);
  expect(parsed?.getMinutes()).toBe(56);
});

test("isInCurrentOrPreviousMonth keeps only current and previous month", async () => {
  const referenceDate = new Date(2026, 3, 8, 12, 0, 0);

  expect(isInCurrentOrPreviousMonth("05/04/2026 02:56", referenceDate)).toBeTruthy();
  expect(isInCurrentOrPreviousMonth("31/03/2026 23:59", referenceDate)).toBeTruthy();
  expect(isInCurrentOrPreviousMonth("28/02/2026 23:59", referenceDate)).toBeFalsy();
});

test("mapRowCellsToNotification maps the table columns in order", async () => {
  const mapped = mapRowCellsToNotification([
    "",
    "-",
    "NOTIFICACAO",
    "197859259 - NORDESTINO RESTAURANTE",
    "SIATWEB",
    "05/04/2026 02:56",
    "Divida documento n° 93104028999",
    "-",
    "-",
    "04/06/2026 00:00",
  ]);

  expect(mapped).toMatchObject({
    type: "NOTIFICACAO",
    recipientRegistration: "197859259 - NORDESTINO RESTAURANTE",
    sender: "SIATWEB",
    issuedAtText: "05/04/2026 02:56",
    subject: "Divida documento n° 93104028999",
  });
});
