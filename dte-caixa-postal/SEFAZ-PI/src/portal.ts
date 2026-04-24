import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";

import { tryLoadPfxCertificateForBrowser } from "./certificate/load-pfx.js";
import type { Company } from "./companies.js";
import { CERT_ORIGIN, LOGIN_URL, MAIN_URL } from "./config/siatweb-urls.js";
import {
  buildNotificationSignature,
  isInCurrentOrPreviousMonth,
  mapRowCellsToNotification,
  normalizeComparableText,
} from "./mailbox/parsing.js";
import { buildCompanyMailboxFailure } from "./mailbox/results.js";
import type { CompanyMailboxResult, MailboxNotification } from "./mailbox/types.js";

export { LOGIN_URL, MAIN_URL, CERT_ORIGIN } from "./config/siatweb-urls.js";
export {
  isInCurrentOrPreviousMonth,
  mapRowCellsToNotification,
  parsePortalDate,
} from "./mailbox/parsing.js";
export type { CompanyMailboxResult, MailboxNotification } from "./mailbox/types.js";

export const MAILBOX_HEADING_PATTERN = /Caixa de Entrada do Domic.lio Eletr.nico/i;
export const MAIN_SEARCHBOX_PATTERN = /Inscri.*Estadual/i;
export const MANUAL_LOGIN_TIMEOUT_MS = 180_000;
export const AUTO_LOGIN_TIMEOUT_MS = 60_000;
const DEFAULT_WAIT_TIMEOUT_MS = 60_000;

type PortalSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

async function launchPortalSession(): Promise<PortalSession> {
  const certConfig = tryLoadPfxCertificateForBrowser();

  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
  });

  const context = await browser.newContext({
    viewport: null,
    clientCertificates: certConfig
      ? [{ origin: CERT_ORIGIN, pfxPath: certConfig.pfxPath, passphrase: certConfig.passphrase }]
      : [],
  });

  const page = await context.newPage();

  return { browser, context, page };
}

async function closePortalSession(session: Partial<PortalSession>): Promise<void> {
  await session.context?.close().catch(() => undefined);
  await session.browser?.close().catch(() => undefined);
}

async function waitForSearchPage(page: Page, timeout = MANUAL_LOGIN_TIMEOUT_MS): Promise<void> {
  await page.getByRole("textbox", { name: MAIN_SEARCHBOX_PATTERN }).waitFor({ timeout });
}

async function waitForMailboxPage(page: Page): Promise<void> {
  await page.getByText(MAILBOX_HEADING_PATTERN).waitFor({ timeout: DEFAULT_WAIT_TIMEOUT_MS });
}

async function ensureSearchPage(page: Page): Promise<void> {
  const alreadyVisible = await page
    .getByRole("textbox", { name: MAIN_SEARCHBOX_PATTERN })
    .isVisible()
    .catch(() => false);

  if (alreadyVisible) {
    return;
  }

  await page.goto(MAIN_URL, { waitUntil: "domcontentloaded" });
  await waitForSearchPage(page, DEFAULT_WAIT_TIMEOUT_MS);
}

async function readSelectOptions(select: Locator): Promise<Array<{ value: string; text: string }>> {
  return select.evaluate((element) => {
    const htmlSelect = element as HTMLSelectElement;

    return Array.from(htmlSelect.options).map((option) => ({
      value: option.value,
      text: option.textContent?.replace(/\s+/g, " ").trim() ?? "",
    }));
  });
}

async function selectFirstMatchingOption(page: Page, optionTexts: string[]): Promise<boolean> {
  const selects = page.locator("select");
  const selectCount = await selects.count();

  for (let index = 0; index < selectCount; index += 1) {
    const select = selects.nth(index);
    const options = await readSelectOptions(select);

    const matchingOption = options.find((option) => {
      const optionText = normalizeComparableText(option.text);
      return optionTexts.some((candidate) =>
        optionText.includes(normalizeComparableText(candidate)),
      );
    });

    if (!matchingOption) {
      continue;
    }

    await select.selectOption(matchingOption.value);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    return true;
  }

  return false;
}

async function ensureMailboxSorting(page: Page): Promise<void> {
  await selectFirstMatchingOption(page, ["Data de Emissao (decrescente)"]);
  await selectFirstMatchingOption(page, ["Todas", "Todos", "Lidas e Nao Lidas"]);
  await selectFirstMatchingOption(page, ["500", "200", "100", "50"]);
}

async function extractCurrentTableRows(page: Page): Promise<MailboxNotification[]> {
  const tableRows = page.locator("table tbody tr");
  const rowCount = await tableRows.count();
  const notifications: MailboxNotification[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const row = tableRows.nth(index);
    const cells = await row.locator("td").evaluateAll((elements) =>
      elements.map((element) => (element.textContent ?? "").replace(/\s+/g, " ").trim()),
    );

    const notification = mapRowCellsToNotification(cells);
    if (notification) {
      notifications.push(notification);
    }
  }

  return notifications;
}

async function findNextPageControl(page: Page): Promise<Locator | null> {
  const candidates = [
    page.getByRole("link", { name: /Pr.ximo/i }).first(),
    page.getByRole("button", { name: /Pr.ximo/i }).first(),
    page.locator('a[title*="Pr"], button[title*="Pr"]').first(),
    page.locator('a[aria-label*="Pr"], button[aria-label*="Pr"]').first(),
    page.locator("li.next:not(.disabled) a, li.next:not(.disabled) button").first(),
    page.locator(".pagination .next:not(.disabled) a, .pagination .next:not(.disabled) button").first(),
  ];

  for (const candidate of candidates) {
    if (!(await candidate.count().catch(() => 0))) {
      continue;
    }

    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    const isDisabled = await candidate.evaluate((element) => {
      const htmlElement = element as HTMLElement;
      const ariaDisabled = htmlElement.getAttribute("aria-disabled");

      return (
        ariaDisabled === "true" ||
        htmlElement.hasAttribute("disabled") ||
        htmlElement.classList.contains("disabled") ||
        htmlElement.parentElement?.classList.contains("disabled") === true
      );
    });

    if (!isDisabled) {
      return candidate;
    }
  }

  return null;
}

async function extractAllTableRows(page: Page): Promise<MailboxNotification[]> {
  const notifications: MailboxNotification[] = [];
  const seenPageSignatures = new Set<string>();

  while (true) {
    const currentPageRows = await extractCurrentTableRows(page);
    const currentPageSignature = currentPageRows.map(buildNotificationSignature).join("\n");

    if (!currentPageSignature || seenPageSignatures.has(currentPageSignature)) {
      break;
    }

    seenPageSignatures.add(currentPageSignature);
    notifications.push(...currentPageRows);

    const nextPageControl = await findNextPageControl(page);
    if (!nextPageControl) {
      break;
    }

    const firstRowSignature = currentPageRows[0]
      ? buildNotificationSignature(currentPageRows[0])
      : "__EMPTY__";

    await nextPageControl.click();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page
      .waitForFunction(
        (previousSignature) => {
          const firstRow = document.querySelector("table tbody tr");
          const firstRowText = (firstRow?.textContent ?? "").replace(/\s+/g, " ").trim();
          return !firstRowText || firstRowText !== previousSignature;
        },
        firstRowSignature,
        { timeout: 5_000 },
      )
      .catch(() => undefined);
  }

  return notifications;
}

async function clickCompanySelection(page: Page): Promise<void> {
  await page.getByTitle("selecionar", { exact: true }).click();
}

async function openAgeat(page: Page): Promise<Page> {
  const popupPromise = page.context().waitForEvent("page", { timeout: 5_000 }).catch(() => null);
  await page.getByRole("link", { name: /e-AGEAT ATIVO/i }).click();

  const popup = await popupPromise;
  if (popup) {
    await popup.waitForLoadState("domcontentloaded");
    return popup;
  }

  await page.waitForLoadState("domcontentloaded");
  return page;
}

async function ensureMailboxOpen(page: Page): Promise<void> {
  const alreadyVisible = await page.getByText(MAILBOX_HEADING_PATTERN).isVisible().catch(() => false);
  if (alreadyVisible) {
    return;
  }

  const mailboxLink = page.getByRole("link", {
    name: /Caixa de Entrada do Domic.lio Eletr.nico/i,
  });

  if (await mailboxLink.isVisible().catch(() => false)) {
    await mailboxLink.click();
  }

  await waitForMailboxPage(page);
}

async function collectNotificationsForCompanyPage(page: Page): Promise<MailboxNotification[]> {
  await ensureMailboxOpen(page);
  await ensureMailboxSorting(page);
  await waitForMailboxPage(page);

  const notifications = await extractAllTableRows(page);
  return notifications.filter((notification) => isInCurrentOrPreviousMonth(notification.issuedAtText));
}

async function searchCompany(page: Page, company: Company): Promise<void> {
  const searchBox = page.getByRole("textbox", { name: MAIN_SEARCHBOX_PATTERN });
  await searchBox.click();
  await searchBox.fill(company.stateRegistrationDisplay);
  await page.getByRole("button", { name: /Consultar/i }).click();
  await clickCompanySelection(page);
}

export async function loginWithCertificate(page: Page): Promise<void> {
  const isAutomatic = Boolean(process.env.SEFAZ_PI_CERT_CODE?.trim());

  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /CERTIFICADO DIGITAL/i }).click({ noWaitAfter: true });

  if (isAutomatic) {
    console.log("[SEFAZ-PI] Autenticando com certificado automaticamente...");
    await waitForSearchPage(page, AUTO_LOGIN_TIMEOUT_MS);
  } else {
    console.log(
      "[SEFAZ-PI] Selecione o certificado manualmente no Chrome e aguarde a abertura da tela principal.",
    );
    await waitForSearchPage(page, MANUAL_LOGIN_TIMEOUT_MS);
  }
}

export async function collectCompanyMailbox(
  page: Page,
  company: Company,
): Promise<CompanyMailboxResult> {
  try {
    await ensureSearchPage(page);
    await searchCompany(page, company);

    const ageatPage = await openAgeat(page);
    const notifications = await collectNotificationsForCompanyPage(ageatPage);

    if (ageatPage !== page) {
      await ageatPage.close();
    }

    return {
      company,
      result:
        notifications.length === 0
          ? "SEM_NOTIFICACOES_NO_PERIODO"
          : "NOTIFICACOES_ENCONTRADAS",
      notifications,
    };
  } catch (error) {
    return buildCompanyMailboxFailure(company, error);
  }
}

export async function collectMailboxForCompanies(
  companies: Company[],
): Promise<CompanyMailboxResult[]> {
  const results: CompanyMailboxResult[] = [];
  let session: Partial<PortalSession> = {};

  try {
    session = await launchPortalSession();
    await loginWithCertificate(session.page!);

    for (const company of companies) {
      console.log(
        `[SEFAZ-PI] Consultando empresa ${company.code} - ${company.name} (${company.stateRegistrationDisplay})`,
      );
      results.push(await collectCompanyMailbox(session.page!, company));
    }
  } catch (error) {
    for (const company of companies) {
      if (!results.some((result) => result.company.code === company.code)) {
        results.push(buildCompanyMailboxFailure(company, error));
      }
    }
  } finally {
    await closePortalSession(session);
  }

  return results;
}
