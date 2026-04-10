import fs from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { PORTAL_URL, calculateParcelaWithRetry, waitForConsolidacoesState } from "./portal.js";

const OUTPUT_DIR = path.resolve(process.cwd(), "output", "playwright", "smoke");

test("smoke: baixa o boleto atual de um parcelamento da SEFAZ-AL", async ({ page }) => {
  test.skip(!process.env.SEFAZ_AL_USUARIO || !process.env.SEFAZ_AL_SENHA, "Defina SEFAZ_AL_USUARIO e SEFAZ_AL_SENHA.");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#link-acesso-parcelamento").click();

  const loginModal = page.locator("ngb-modal-window");
  await loginModal.locator("#username").waitFor({ state: "visible", timeout: 30_000 });
  await loginModal.locator("#username").fill(process.env.SEFAZ_AL_USUARIO!);
  await loginModal.locator("#password").fill(process.env.SEFAZ_AL_SENHA!);
  await loginModal.getByRole("button", { name: /Acessar/i }).click();

  const consolidacoesLink = page.locator('a.btn.btn-sq-lg.btn-primary[href="#/consolidacao"]').first();
  await expect(consolidacoesLink).toBeVisible({ timeout: 30_000 });
  await consolidacoesLink.click();

  const rows = page.locator("table.data-table tbody tr.data-table-row");
  const listingState = await waitForConsolidacoesState(page);
  test.skip(listingState === "empty", "Portal sem consolidacoes para a situacao selecionada.");

  const targetConsolidacao = process.env.SEFAZ_AL_CONSOLIDACAO;
  const targetRow = targetConsolidacao ? rows.filter({ hasText: targetConsolidacao }).first() : rows.first();

  await expect(targetRow).toBeVisible({ timeout: 30_000 });
  await targetRow.locator('td.column-opcoes button[title*="parcelas/Extrato"]').first().click();

  const modal = page.locator("ngb-modal-window .modal-content");
  await expect(modal.locator("#quantidade")).toBeVisible({ timeout: 30_000 });

  const calculationState = await calculateParcelaWithRetry(modal);
  if (calculationState.status === "alert") {
    throw new Error(calculationState.message);
  }

  if (calculationState.status === "timeout") {
    throw new Error("O calculo da parcela nao retornou apos 2 tentativas.");
  }

  const downloadPromise = page.waitForEvent("download");
  await modal.locator("table.table-parcelas tbody tr button.btn.btn-primary").first().click();
  const download = await downloadPromise;
  const downloadPath = path.join(OUTPUT_DIR, download.suggestedFilename());
  await download.saveAs(downloadPath);

  await expect
    .poll(async () => {
      try {
        await fs.access(downloadPath);
        return true;
      } catch {
        return false;
      }
    })
    .toBe(true);
});
