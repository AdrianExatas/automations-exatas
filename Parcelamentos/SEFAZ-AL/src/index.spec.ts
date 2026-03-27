import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { PORTAL_URL } from "./portal.js";

const OUTPUT_DIR = path.resolve(process.cwd(), "output", "playwright", "smoke");

test("smoke: baixa o boleto atual de um parcelamento da SEFAZ-AL", async ({ page }) => {
  test.skip(!process.env.SEFAZ_AL_USUARIO || !process.env.SEFAZ_AL_SENHA, "Defina SEFAZ_AL_USUARIO e SEFAZ_AL_SENHA.");

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#link-acesso-parcelamento").click();
  await page.getByRole("textbox", { name: "Usuário" }).fill(process.env.SEFAZ_AL_USUARIO!);
  await page.getByRole("textbox", { name: "Senha" }).fill(process.env.SEFAZ_AL_SENHA!);
  await page.getByRole("button", { name: "Acessar" }).click();

  await expect(page.getByRole("link", { name: /Consolidações \/ Parcela/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: /Consolidações \/ Parcela/i }).click();

  const rows = page.locator("#datatable-0 tbody tr.data-table-row");
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });

  const targetConsolidacao = process.env.SEFAZ_AL_CONSOLIDACAO;
  const targetRow = targetConsolidacao
    ? rows.filter({ hasText: targetConsolidacao }).first()
    : rows.first();

  await expect(targetRow).toBeVisible({ timeout: 30_000 });
  await targetRow.locator('button[title^="Emissão de parcelas/Extrato"]').click();

  const modal = page.locator("ngb-modal-window .modal-content");
  await expect(modal).toBeVisible({ timeout: 30_000 });

  await modal.getByRole("spinbutton", { name: /Quantidade/i }).fill("1");
  await modal.getByRole("button", { name: "Calcular Parcela" }).click();
  await expect(modal.locator("table.table-parcelas tbody tr").first()).toBeVisible({ timeout: 30_000 });

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
