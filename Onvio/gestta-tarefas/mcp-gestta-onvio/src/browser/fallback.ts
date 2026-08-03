import fs from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { AppConfig } from "../config.js";
import { CATALOG_VERSIONS } from "../catalog/definitions.js";
import { redact } from "../security/redact.js";

export interface BrowserFlow {
  operationId: string;
  product: "gestta" | "onvio";
  url: string;
  expectedTitle: RegExp;
  prepare(page: Page, input: Record<string, unknown>): Promise<unknown>;
  commit(page: Page, input: Record<string, unknown>): Promise<unknown>;
}

export function isBlockedBusinessMutation(method: string, url: string): boolean {
  const normalized = method.toUpperCase();
  const readLikePost = /\/search(?:\?|$)|\/jwt\/sessions(?:\?|$)|\/initial-data-load(?:\?|$)/.test(url);
  return ["POST", "PUT", "PATCH", "DELETE"].includes(normalized) && !readLikePost;
}

export class BrowserFallback {
  private readonly flows = new Map<string, BrowserFlow>();

  constructor(private readonly config: AppConfig) {}

  register(flow: BrowserFlow): void {
    this.flows.set(flow.operationId, flow);
  }

  async prepare(operationId: string, input: Record<string, unknown>, storageStatePath: string): Promise<unknown> {
    return this.run(operationId, input, storageStatePath, true);
  }

  async commit(operationId: string, input: Record<string, unknown>, storageStatePath: string): Promise<unknown> {
    return this.run(operationId, input, storageStatePath, false);
  }

  private async run(
    operationId: string,
    input: Record<string, unknown>,
    storageStatePath: string,
    prepareOnly: boolean,
  ): Promise<unknown> {
    if (!this.config.allowBrowserFallback) throw new Error("Fallback de navegador desabilitado.");
    if (!fs.existsSync(storageStatePath)) throw new Error("Storage state do Onvio não encontrado.");
    const flow = this.flows.get(operationId);
    if (!flow) throw new Error(`Fluxo UI não versionado para ${operationId}.`);

    const browser = await chromium.launch({ headless: this.config.browserHeadless });
    try {
      const context = await browser.newContext({ storageState: storageStatePath, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
      if (prepareOnly) await this.blockBusinessMutations(context);
      const page = await context.newPage();
      await page.goto(flow.url, { waitUntil: "domcontentloaded" });
      if (!flow.expectedTitle.test(await page.title())) throw new Error("Título inesperado; possível drift do front-end.");
      return redact(prepareOnly ? await flow.prepare(page, input) : await flow.commit(page, input));
    } finally {
      await browser.close();
    }
  }

  private async blockBusinessMutations(context: BrowserContext): Promise<void> {
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (isBlockedBusinessMutation(request.method(), request.url())) {
        await route.abort("blockedbyclient");
        return;
      }
      await route.continue();
    });
  }

  versions(): typeof CATALOG_VERSIONS {
    return CATALOG_VERSIONS;
  }
}
