import { test } from "@playwright/test";
import { collectLatestNotificationsForAllCompanies } from "./app.js";

test("coleta a ultima notificacao de cada empresa e gera as planilhas", async () => {
  test.setTimeout(30 * 60_000);
  await collectLatestNotificationsForAllCompanies();
});
