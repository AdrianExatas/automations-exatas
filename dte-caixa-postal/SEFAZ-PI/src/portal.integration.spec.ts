import { test, expect } from "@playwright/test";

import { chromium } from "playwright";

import { LOGIN_URL, loginWithCertificate, MAIN_SEARCHBOX_PATTERN } from "./portal.js";

test.skip(
  process.env.RUN_SEFAZ_PI_INTEGRATION !== "1",
  "Teste manual do portal real. Execute apenas quando houver selecao manual de certificado disponivel.",
);

test("login manual por certificado avanca ate a tela principal", async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
    await loginWithCertificate(page);

    await expect(page.getByRole("textbox", { name: MAIN_SEARCHBOX_PATTERN })).toBeVisible();
  } finally {
    await context.close();
    await browser.close();
  }
});
