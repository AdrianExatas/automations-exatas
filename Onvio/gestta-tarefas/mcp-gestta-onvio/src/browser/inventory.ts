import { chromium } from "playwright";
import { CAPABILITIES, CATALOG_VERSIONS } from "../catalog/definitions.js";
import { isBlockedBusinessMutation } from "./fallback.js";

export interface InventoryResult {
  capturedAt: string;
  pages: Array<{
    url: string;
    title: string;
    navigation: string[];
    apiRequests: Array<{ method: string; path: string; status?: number }>;
    blockedMutations: Array<{ method: string; path: string }>;
  }>;
  coverage: {
    catalogVersions: typeof CATALOG_VERSIONS;
    total: number;
    byStatus: Record<string, number>;
    unexplained: string[];
  };
}

export async function inventoryFrontend(storageStatePath: string): Promise<InventoryResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: storageStatePath, locale: "pt-BR" });
    const pages = [] as InventoryResult["pages"];
    for (const url of ["https://app.gestta.com.br/admin/", "https://onvio.com.br/staff/", "https://onvio.com.br/br-portal-do-cliente/"]) {
      const page = await context.newPage();
      const requests: InventoryResult["pages"][number]["apiRequests"] = [];
      const blockedMutations: InventoryResult["pages"][number]["blockedMutations"] = [];
      await page.route("**/*", async (route) => {
        const request = route.request();
        if (isBlockedBusinessMutation(request.method(), request.url())) {
          const parsed = new URL(request.url());
          blockedMutations.push({ method: request.method(), path: `${parsed.pathname}${parsed.search}` });
          await route.abort("blockedbyclient");
          return;
        }
        await route.continue();
      });
      page.on("response", (response) => {
        const request = response.request();
        try {
          const parsed = new URL(request.url());
          if (parsed.hostname.endsWith("gestta.com.br") || (parsed.hostname === "onvio.com.br" && parsed.pathname.startsWith("/api/"))) {
            requests.push({ method: request.method(), path: `${parsed.pathname}${parsed.search}`, status: response.status() });
          }
        } catch {
          // Ignora URLs não HTTP.
        }
      });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const navigation = await page.locator("nav, [role=menu], [role=navigation]").allTextContents();
      pages.push({ url: page.url(), title: await page.title(), navigation: navigation.map((item) => item.trim()).filter(Boolean), apiRequests: requests, blockedMutations });
      await page.close();
    }
    const byStatus = Object.fromEntries(
      ["verified", "unavailable", "policy_blocked", "drifted"].map((status) => [status, CAPABILITIES.filter((item) => item.status === status).length]),
    );
    const unexplained = CAPABILITIES
      .filter((item) => !item.evidence.source || (item.status !== "verified" && !item.unavailableReason))
      .map((item) => item.operationId);
    return {
      capturedAt: new Date().toISOString(),
      pages,
      coverage: { catalogVersions: CATALOG_VERSIONS, total: CAPABILITIES.length, byStatus, unexplained },
    };
  } finally {
    await browser.close();
  }
}
