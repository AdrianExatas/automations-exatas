import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  chromium,
  type BrowserContext,
  type Frame,
  type Locator,
  type Page,
} from "playwright";

const SEFAZ_URL =
  "https://dte.sefaz.al.gov.br/dte/login/?redirect=/dte/client/nucleo/nova-base/public/";
const SEFAZ_LOGOUT_URL = "https://dte.sefaz.al.gov.br/dte/logout";
const WEBPKI_EXTENSION_ID = "dcngeagmmhegagicpcmpinaoklddcgon";
const CERTIFICATE_NAME = "EXATAS CONTABILIDADE LTDA";
const COMPANY_SEARCH_PLACEHOLDER = "Pesquise por empresa ou CACEAL";
const OUTPUT_DIRECTORY = path.join(process.cwd(), "output", "spreadsheets");
const CONSOLIDATED_SPREADSHEET_FILENAME = "notificacoes-consolidadas.xlsx";
const PLAYWRIGHT_OUTPUT_DIRECTORY = path.join(process.cwd(), "output", "playwright");
const DEFAULT_WEBPKI_USER_DATA_DIR = path.join(
  process.cwd(),
  "output",
  "playwright",
  "chrome-profile",
  "webpki-persistent",
);
const WEBPKI_USER_DATA_DIR_ENV = "WEBPKI_USER_DATA_DIR";
const WEBPKI_EPHEMERAL_PROFILE_ENV = "WEBPKI_EPHEMERAL_PROFILE";
const DEFAULT_CERTIFICATE_READY_TIMEOUT_MS = 60_000;
const SEFAZ_CERTIFICATE_READY_TIMEOUT_MS_ENV = "SEFAZ_CERTIFICATE_READY_TIMEOUT_MS";
const SEFAZ_TIMING_LOGS_ENV = "SEFAZ_TIMING_LOGS";
const CERTIFICATE_FAST_PATH_TIMEOUT_MS = 12_000;
const NOTIFICATIONS_POLL_INTERVAL_MS = 250;
const NO_NOTIFICATIONS_STATUS = "SEM NOTIFICACOES";

export type CompanyRef = {
  caceal: string;
  name: string;
  radioValue: string;
  role: string;
};

export type NotificationRecord = {
  companyName: string;
  date: string;
  expediente: string;
  subject: string;
  summary: string;
};

export type SpreadsheetEntry = {
  company: CompanyRef;
  notification: NotificationRecord | null;
};

type RawNotificationRecord = NotificationRecord & {
  key: string;
};

type ScrollState = {
  atEnd: boolean;
  max: number;
  position: number;
};

type PartialCompanyRef = {
  caceal: string;
  name: string;
  radioValue: string;
  role: string;
};

type BrowserProfileInfo = {
  isFirstInitialization: boolean;
  mode: "ephemeral" | "persistent";
  userDataDir: string;
};

type CertificateSelectionPhase =
  | "page_opened"
  | "login_screen_ready"
  | "widget_ready"
  | "loading_finished"
  | "option_visible"
  | "certificate_confirmed";

export type CertificateSelectionTimings = Partial<
  Record<CertificateSelectionPhase, number>
>;

type SelectCertificateOptions = {
  onLoadingFinished?: () => void;
  onOptionVisible?: () => void;
  timeoutMs?: number;
};

type TryLoginWithPreselectedCertificateOptions = {
  onLoadingFinished?: () => void;
  onWidgetReady?: () => void;
};

type LoginToCompanyPickerOptions = {
  forceFreshSession?: boolean;
};

type CertificateDiagnosticArtifacts = {
  detailsPath: string;
  htmlPath: string;
  screenshotPath: string;
};

type NotificationsContentState = "list" | "empty";
type NotificationsObservedState = NotificationsContentState | "loading";

type NotificationsDiagnosticArtifacts = {
  detailsPath: string;
  frameHtmlPath: string;
  pageHtmlPath: string;
  screenshotPath: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^(1|true|yes|on)$/i.test(value.trim());
}

function elapsedSince(startedAt: number): number {
  return Date.now() - startedAt;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function resolveCertificateReadyTimeoutMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[SEFAZ_CERTIFICATE_READY_TIMEOUT_MS_ENV]?.trim();
  if (!raw) {
    return DEFAULT_CERTIFICATE_READY_TIMEOUT_MS;
  }

  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      `${SEFAZ_CERTIFICATE_READY_TIMEOUT_MS_ENV} deve ser um inteiro positivo em milissegundos.`,
    );
  }

  return timeoutMs;
}

export function shouldLogCertificateSelectionTimings(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[SEFAZ_TIMING_LOGS_ENV]?.trim();
  if (!raw) {
    return true;
  }

  return !/^(0|false|no|off)$/i.test(raw);
}

export function formatCertificateSelectionTimings(
  timings: CertificateSelectionTimings,
): string {
  const orderedPhases: CertificateSelectionPhase[] = [
    "page_opened",
    "login_screen_ready",
    "widget_ready",
    "loading_finished",
    "option_visible",
    "certificate_confirmed",
  ];

  const parts = orderedPhases
    .filter((phase) => timings[phase] !== undefined)
    .map((phase) => `${phase}=${timings[phase]}ms`);

  return parts.join(", ") || "no timings recorded";
}

export function logCertificateSelectionTimings(
  timings: CertificateSelectionTimings,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!shouldLogCertificateSelectionTimings(env)) {
    return;
  }

  console.log(`[webpki] certificate timings: ${formatCertificateSelectionTimings(timings)}`);
}

export function parseDisplayedDate(value: string): number {
  const match = normalizeWhitespace(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Data invalida: ${value}`);
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Data invalida: ${value}`);
  }

  return timestamp;
}

export function sanitizeFileName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  return normalized || "empresa";
}

export function selectMostRecentNotification<T extends Pick<NotificationRecord, "date">>(
  records: T[],
): T | null {
  if (records.length === 0) {
    return null;
  }

  return records.reduce((latest, current) => {
    if (parseDisplayedDate(current.date) > parseDisplayedDate(latest.date)) {
      return current;
    }

    return latest;
  });
}

function resolveWebPkiExtensionPath(): string {
  const overridePath = process.env.WEBPKI_EXTENSION_PATH;
  if (overridePath) {
    return overridePath;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error("A variavel LOCALAPPDATA nao esta disponivel.");
  }

  const extensionRoot = path.join(
    localAppData,
    "Google",
    "Chrome",
    "User Data",
    "Default",
    "Extensions",
    WEBPKI_EXTENSION_ID,
  );

  if (!fs.existsSync(extensionRoot)) {
    throw new Error(
      `Extensao WebPKI nao encontrada em ${extensionRoot}. Instale a extensao no Chrome ou defina WEBPKI_EXTENSION_PATH.`,
    );
  }

  const versions = fs
    .readdirSync(extensionRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true, sensitivity: "base" }),
    );

  const latestVersion = versions[0];
  if (!latestVersion) {
    throw new Error(`Nenhuma versao da extensao foi encontrada em ${extensionRoot}.`);
  }

  return path.join(extensionRoot, latestVersion);
}

function resolveBrowserProfileInfo(): BrowserProfileInfo {
  const profileRoot = path.join(process.cwd(), "output", "playwright", "chrome-profile");
  fs.mkdirSync(profileRoot, { recursive: true });

  if (isTruthyEnv(process.env[WEBPKI_EPHEMERAL_PROFILE_ENV])) {
    return {
      isFirstInitialization: true,
      mode: "ephemeral",
      userDataDir: fs.mkdtempSync(path.join(profileRoot, "webpki-ephemeral-")),
    };
  }

  const configuredUserDataDir = process.env[WEBPKI_USER_DATA_DIR_ENV];
  const userDataDir = configuredUserDataDir
    ? path.resolve(configuredUserDataDir)
    : DEFAULT_WEBPKI_USER_DATA_DIR;

  const profileAlreadyExists = fs.existsSync(userDataDir);
  const hasProfileState =
    profileAlreadyExists && fs.readdirSync(userDataDir, { withFileTypes: true }).length > 0;

  fs.mkdirSync(userDataDir, { recursive: true });

  return {
    isFirstInitialization: !hasProfileState,
    mode: "persistent",
    userDataDir,
  };
}

function logBrowserProfileInfo(profileInfo: BrowserProfileInfo): void {
  console.log(`[webpki] profile mode: ${profileInfo.mode}`);
  console.log(`[webpki] userDataDir: ${profileInfo.userDataDir}`);

  if (profileInfo.mode === "ephemeral") {
    console.log(
      `[webpki] ${WEBPKI_EPHEMERAL_PROFILE_ENV}=true, usando perfil temporario de debug.`,
    );
    return;
  }

  console.log(
    `[webpki] profile state: ${
      profileInfo.isFirstInitialization ? "first initialization" : "reusing existing profile"
    }`,
  );

  if (profileInfo.isFirstInitialization) {
    console.log(
      "[webpki] primeiro uso deste perfil: confirme o alerta do WebPKI e marque 'Nao me pergunte novamente'.",
    );
  }
}

async function waitForLoginScreen(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Entrar com certificado/i }).waitFor({
    timeout: 60_000,
  });
}

export async function waitForCertificateWidgetReady(
  page: Page,
  timeoutMs = resolveCertificateReadyTimeoutMs(),
): Promise<void> {
  await page.locator(".audora-select").first().waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
}

async function waitForCertificateLoadingToFinish(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const select = page.locator(".audora-select").first();
  const deadline = Date.now() + timeoutMs;

  await select.waitFor({ state: "visible", timeout: timeoutMs });

  while (Date.now() < deadline) {
    const isReady = await select
      .evaluate((element) => {
        const isLoading = element.classList.contains("audora-select-loading");
        const hasSpinner = Boolean(element.querySelector(".audora-select-arrow-loading"));
        return !isLoading && !hasSpinner;
      })
      .catch(() => false);

    if (isReady) {
      return;
    }

    await page.waitForTimeout(NOTIFICATIONS_POLL_INTERVAL_MS);
  }

  throw new Error(
    `O widget do certificado permaneceu em carregamento por mais de ${timeoutMs}ms.`,
  );
}

export async function getSelectedCertificateName(page: Page): Promise<string | null> {
  const selectedCertificate = page.locator(".audora-select-selection-item").first();
  if ((await selectedCertificate.count().catch(() => 0)) === 0) {
    return null;
  }

  const selectedText = normalizeWhitespace(
    (await selectedCertificate.textContent({ timeout: 1_000 }).catch(() => "")) ?? "",
  );

  return selectedText || null;
}

async function waitForCertificateConfirmation(
  page: Page,
  certificateName: string,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const selectedName = await getSelectedCertificateName(page);
    if (selectedName?.includes(certificateName)) {
      return selectedName;
    }

    await page.waitForTimeout(NOTIFICATIONS_POLL_INTERVAL_MS);
  }

  const selectedName = await getSelectedCertificateName(page);
  if (!selectedName?.includes(certificateName)) {
    throw new Error(`Nao foi possivel confirmar o certificado ${certificateName}.`);
  }

  return selectedName;
}

async function closeCertificateDropdown(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(150);
}

function logPreselectedCertificateFastPath(env: NodeJS.ProcessEnv = process.env): void {
  if (!shouldLogCertificateSelectionTimings(env)) {
    return;
  }

  console.log("[webpki] fast path: using preselected certificate on the login screen.");
}

function logSkippedLoginNavigation(env: NodeJS.ProcessEnv = process.env): void {
  if (!shouldLogCertificateSelectionTimings(env)) {
    return;
  }

  console.log("[webpki] login screen already open; skipping page.goto.");
}

export async function selectCertificateByName(
  page: Page,
  certificateName: string,
  options: SelectCertificateOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? resolveCertificateReadyTimeoutMs();
  const selector = page.locator(".audora-select-selector").first();
  const desiredCertificate = page
    .locator(".audora-select-item-option")
    .filter({ hasText: new RegExp(`^${escapeRegExp(certificateName)}:`) })
    .first();
  const optionTimeoutMs = Math.min(timeoutMs, 15_000);
  let optionVisibleLogged = false;
  let lastError: unknown;

  await waitForCertificateLoadingToFinish(page, timeoutMs);
  options.onLoadingFinished?.();

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await selector.click();

    try {
      await desiredCertificate.waitFor({
        state: "visible",
        timeout: optionTimeoutMs,
      });

      if (!optionVisibleLogged) {
        options.onOptionVisible?.();
        optionVisibleLogged = true;
      }

      await desiredCertificate.click();
      return await waitForCertificateConfirmation(page, certificateName, timeoutMs);
    } catch (error) {
      lastError = error;

      if (attempt >= 2) {
        break;
      }

      await closeCertificateDropdown(page);
    }
  }

  throw new Error(
    `O certificado ${certificateName} nao ficou visivel para selecao apos uma nova tentativa.`,
    { cause: lastError },
  );
}

async function captureCertificateDiagnosticArtifacts(
  page: Page,
  phase: CertificateSelectionPhase,
  timings: CertificateSelectionTimings,
  elapsedMs: number,
  reason: string,
): Promise<CertificateDiagnosticArtifacts> {
  fs.mkdirSync(PLAYWRIGHT_OUTPUT_DIRECTORY, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePrefix = `certificate-${phase}-${timestamp}`;
  const htmlPath = path.join(PLAYWRIGHT_OUTPUT_DIRECTORY, `${filePrefix}.html`);
  const screenshotPath = path.join(PLAYWRIGHT_OUTPUT_DIRECTORY, `${filePrefix}.png`);
  const detailsPath = path.join(PLAYWRIGHT_OUTPUT_DIRECTORY, `${filePrefix}.txt`);
  const details = [
    `phase=${phase}`,
    `elapsed_ms=${elapsedMs}`,
    `url=${page.url()}`,
    `timings=${formatCertificateSelectionTimings(timings)}`,
    `reason=${reason}`,
  ].join("\n");

  fs.writeFileSync(detailsPath, details);

  try {
    fs.writeFileSync(htmlPath, await page.content());
  } catch (error) {
    fs.writeFileSync(htmlPath, `Nao foi possivel capturar o HTML: ${describeError(error)}\n`);
  }

  try {
    await page.screenshot({ fullPage: true, path: screenshotPath });
  } catch (error) {
    fs.writeFileSync(
      screenshotPath.replace(/\.png$/i, ".error.txt"),
      `Nao foi possivel capturar o screenshot: ${describeError(error)}\n`,
    );
  }

  return {
    detailsPath,
    htmlPath,
    screenshotPath,
  };
}

async function ensureCertificateSelected(
  page: Page,
  timings: CertificateSelectionTimings,
  startedAt: number,
): Promise<void> {
  let phase: CertificateSelectionPhase = "widget_ready";

  try {
    const timeoutMs = resolveCertificateReadyTimeoutMs();

    await waitForCertificateWidgetReady(page, timeoutMs);
    timings.widget_ready ??= elapsedSince(startedAt);

    const selectedText = await getSelectedCertificateName(page);
    if (selectedText?.includes(CERTIFICATE_NAME)) {
      phase = "loading_finished";
      await waitForCertificateLoadingToFinish(page, timeoutMs);
      timings.loading_finished ??= elapsedSince(startedAt);
      timings.certificate_confirmed = elapsedSince(startedAt);
      logCertificateSelectionTimings(timings);
      return;
    }

    phase = "loading_finished";
    await selectCertificateByName(page, CERTIFICATE_NAME, {
      timeoutMs,
      onLoadingFinished: () => {
        timings.loading_finished ??= elapsedSince(startedAt);
        phase = "option_visible";
      },
      onOptionVisible: () => {
        timings.option_visible = elapsedSince(startedAt);
        phase = "certificate_confirmed";
      },
    });

    timings.certificate_confirmed = elapsedSince(startedAt);
    logCertificateSelectionTimings(timings);
  } catch (error) {
    const elapsedMs = elapsedSince(startedAt);
    timings[phase] ??= elapsedMs;
    logCertificateSelectionTimings(timings);

    const reason = `Falha na etapa ${phase} apos ${elapsedMs}ms: ${describeError(error)}`;
    const artifacts = await captureCertificateDiagnosticArtifacts(
      page,
      phase,
      timings,
      elapsedMs,
      reason,
    );

    throw new Error(
      `${reason}. Artefatos salvos em ${artifacts.detailsPath}, ${artifacts.htmlPath} e ${artifacts.screenshotPath}.`,
      { cause: error },
    );
  }
}

async function waitForCompanyPicker(page: Page, timeoutMs = 60_000): Promise<void> {
  await Promise.all([
    page.getByText("Selecione um perfil", { exact: true }).waitFor({
      timeout: timeoutMs,
    }),
    page.getByRole("button", { name: /Selecionar/i }).waitFor({
      timeout: timeoutMs,
    }),
    page
      .locator("#form-contrato_idContratoHonorario label.audora-radio-wrapper")
      .first()
      .waitFor({
        timeout: timeoutMs,
      }),
  ]);
}

export async function tryLoginWithPreselectedCertificate(
  page: Page,
  certificateName: string,
  timeoutMs = CERTIFICATE_FAST_PATH_TIMEOUT_MS,
): Promise<boolean> {
  return tryLoginWithPreselectedCertificateInternal(page, certificateName, timeoutMs);
}

async function tryLoginWithPreselectedCertificateInternal(
  page: Page,
  certificateName: string,
  timeoutMs: number,
  options: TryLoginWithPreselectedCertificateOptions = {},
): Promise<boolean> {
  await waitForCertificateWidgetReady(page, timeoutMs);
  options.onWidgetReady?.();

  await waitForCertificateLoadingToFinish(page, timeoutMs);
  options.onLoadingFinished?.();

  const selectedText = await getSelectedCertificateName(page);
  if (!selectedText?.includes(certificateName)) {
    return false;
  }

  logPreselectedCertificateFastPath();
  await page.getByRole("button", { name: /Entrar com certificado/i }).click();

  try {
    await waitForCompanyPicker(page, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

async function ensureLoginScreenReady(
  page: Page,
  timings: CertificateSelectionTimings,
  startedAt: number,
  options: LoginToCompanyPickerOptions = {},
): Promise<void> {
  if (options.forceFreshSession) {
    await page.goto(SEFAZ_LOGOUT_URL, { waitUntil: "domcontentloaded" });
    timings.page_opened = elapsedSince(startedAt);

    const loginButtonAfterLogout = page.getByRole("button", { name: /Entrar com certificado/i });
    const isLoginScreenVisibleAfterLogout = await loginButtonAfterLogout
      .isVisible()
      .catch(() => false);

    if (!isLoginScreenVisibleAfterLogout) {
      await page.goto(SEFAZ_URL, { waitUntil: "domcontentloaded" });
      timings.page_opened = elapsedSince(startedAt);
    }

    await waitForLoginScreen(page);
    timings.login_screen_ready = elapsedSince(startedAt);
    return;
  }

  const loginButton = page.getByRole("button", { name: /Entrar com certificado/i });
  const isLoginScreenVisible = await loginButton.isVisible().catch(() => false);

  if (isLoginScreenVisible) {
    logSkippedLoginNavigation();
    timings.login_screen_ready = elapsedSince(startedAt);
    return;
  }

  await page.goto(SEFAZ_URL, { waitUntil: "domcontentloaded" });
  timings.page_opened = elapsedSince(startedAt);

  await waitForLoginScreen(page);
  timings.login_screen_ready = elapsedSince(startedAt);
}

export async function loginToCompanyPicker(
  page: Page,
  options: LoginToCompanyPickerOptions = {},
): Promise<void> {
  const startedAt = Date.now();
  const timings: CertificateSelectionTimings = {};
  const certificateTimeoutMs = resolveCertificateReadyTimeoutMs();

  await ensureLoginScreenReady(page, timings, startedAt, options);

  if (
    await tryLoginWithPreselectedCertificateInternal(page, CERTIFICATE_NAME, certificateTimeoutMs, {
      onWidgetReady: () => {
        timings.widget_ready ??= elapsedSince(startedAt);
      },
      onLoadingFinished: () => {
        timings.loading_finished ??= elapsedSince(startedAt);
      },
    })
  ) {
    timings.certificate_confirmed = elapsedSince(startedAt);
    logCertificateSelectionTimings(timings);
    return;
  }

  await ensureCertificateSelected(page, timings, startedAt);
  await page.getByRole("button", { name: /Entrar com certificado/i }).click();
  await waitForCompanyPicker(page);
}

async function scrollScrollableAncestor(locator: Locator): Promise<ScrollState> {
  return locator.evaluate((element) => {
    let current: HTMLElement | null = element.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const isScrollable = /(auto|scroll)/.test(style.overflowY);
      const max = Math.max(current.scrollHeight - current.clientHeight, 0);

      if (isScrollable && max > 0) {
        const previousTop = current.scrollTop;
        const nextTop = Math.min(max, previousTop + Math.max(current.clientHeight * 0.85, 200));
        current.scrollTop = nextTop;

        return {
          atEnd: nextTop >= max - 4,
          max,
          position: nextTop,
        };
      }

      current = current.parentElement;
    }

    return {
      atEnd: true,
      max: 0,
      position: 0,
    };
  });
}

async function resetScrollableAncestor(locator: Locator): Promise<void> {
  await locator.evaluate((element) => {
    let current: HTMLElement | null = element.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const isScrollable = /(auto|scroll)/.test(style.overflowY);
      const max = Math.max(current.scrollHeight - current.clientHeight, 0);

      if (isScrollable && max > 0) {
        current.scrollTop = 0;
        return;
      }

      current = current.parentElement;
    }
  });
}

async function readVisibleCompanies(page: Page): Promise<PartialCompanyRef[]> {
  return page
    .locator("#form-contrato_idContratoHonorario label.audora-radio-wrapper")
    .evaluateAll((labels) =>
      labels
        .map((label) => {
          const input = label.querySelector("input[type='radio']");
          const text = Array.from(
            label.querySelectorAll(":scope > span:last-child > span span"),
          )
            .map((span) => (span.textContent ?? "").trim())
            .filter(Boolean);

          if (!input || text.length < 3) {
            return null;
          }

          return {
            caceal: text[1] ?? "",
            name: text[0] ?? "",
            radioValue: input.getAttribute("value") ?? "",
            role: text[2] ?? "",
          };
        })
        .filter((company): company is PartialCompanyRef => {
          return Boolean(company?.name && company.radioValue);
        }),
    );
}

async function collectCompanies(page: Page): Promise<CompanyRef[]> {
  const companyGroup = page.locator("#form-contrato_idContratoHonorario");
  await companyGroup.waitFor({ timeout: 60_000 });

  const companies = new Map<string, CompanyRef>();
  let endPasses = 0;

  while (endPasses < 2) {
    const visibleCompanies = await readVisibleCompanies(page);
    for (const company of visibleCompanies) {
      companies.set(company.radioValue, company);
    }

    const scrollState = await scrollScrollableAncestor(companyGroup);
    if (scrollState.atEnd) {
      endPasses += 1;
    } else {
      endPasses = 0;
    }

    await page.waitForTimeout(500);
  }

  await resetScrollableAncestor(companyGroup);

  return Array.from(companies.values());
}

async function selectCompanyProfile(page: Page, company: CompanyRef): Promise<void> {
  const searchBox = page.getByPlaceholder(COMPANY_SEARCH_PLACEHOLDER);
  await searchBox.fill(company.caceal || company.name);

  const radioInput = page.locator(
    `#form-contrato_idContratoHonorario input[type="radio"][value="${company.radioValue}"]`,
  );

  await radioInput.waitFor({ timeout: 30_000 });
  await radioInput.check({ force: true });
  await page.getByRole("button", { name: /Selecionar/i }).click();

  await page.locator(".Audora__User").waitFor({ timeout: 60_000 });
  await page.locator('iframe[src*="expedientes"]').waitFor({ timeout: 60_000 });
}

async function getNotificationsFrame(page: Page): Promise<Frame> {
  const iframe = page.locator('iframe[src*="expedientes"]').first();
  await iframe.waitFor({ timeout: 60_000 });

  const iframeHandle = await iframe.elementHandle();
  const frame = await iframeHandle?.contentFrame();
  if (!frame) {
    throw new Error("Nao foi possivel acessar o iframe de notificacoes.");
  }

  await frame.locator("#__appContainer__").waitFor({ timeout: 60_000 });
  await frame.getByText("Entrada", { exact: true }).waitFor({ timeout: 60_000 });
  return frame;
}

export async function waitForNotificationsContent(
  frame: Frame,
  timeoutMs = 60_000,
): Promise<NotificationsContentState> {
  const deadline = Date.now() + timeoutMs;
  let lastObservedState: NotificationsObservedState = "loading";

  while (Date.now() < deadline) {
    const hasList = await frame
      .locator('div[role="list"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (hasList) {
      return "list";
    }

    const hasEmptyState = await frame
      .getByText("Sem Expedientes", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    if (hasEmptyState) {
      return "empty";
    }

    const hasLoadingText = await frame
      .getByText("Carregando...", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    const hasLoadingControls = await frame
      .locator(
        [
          "button.loading",
          ".ui.basic.icon.loading.button",
          ".spinner.loading.icon",
          ".ui.loader",
          ".root__loader",
          ".ui.disabled.header",
        ].join(", "),
      )
      .first()
      .isVisible()
      .catch(() => false);

    lastObservedState = hasLoadingText || hasLoadingControls ? "loading" : "loading";
    await frame.waitForTimeout(NOTIFICATIONS_POLL_INTERVAL_MS);
  }

  throw new Error(
    `A area de notificacoes nao concluiu o carregamento dentro de ${timeoutMs}ms. Ultimo estado observado: ${lastObservedState}.`,
  );
}

export async function hasNoNotifications(frame: Frame): Promise<boolean> {
  return frame
    .getByText("Sem Expedientes", { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
}

async function captureNotificationsDiagnosticArtifacts(
  frame: Frame,
  reason: string,
): Promise<NotificationsDiagnosticArtifacts> {
  fs.mkdirSync(PLAYWRIGHT_OUTPUT_DIRECTORY, { recursive: true });

  const page = frame.page();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePrefix = `notifications-${timestamp}`;
  const frameHtmlPath = path.join(PLAYWRIGHT_OUTPUT_DIRECTORY, `${filePrefix}-frame.html`);
  const pageHtmlPath = path.join(PLAYWRIGHT_OUTPUT_DIRECTORY, `${filePrefix}-page.html`);
  const screenshotPath = path.join(PLAYWRIGHT_OUTPUT_DIRECTORY, `${filePrefix}.png`);
  const detailsPath = path.join(PLAYWRIGHT_OUTPUT_DIRECTORY, `${filePrefix}.txt`);
  const details = [`url=${page.url()}`, `reason=${reason}`].join("\n");

  fs.writeFileSync(detailsPath, details);

  try {
    fs.writeFileSync(frameHtmlPath, await frame.content());
  } catch (error) {
    fs.writeFileSync(
      frameHtmlPath,
      `Nao foi possivel capturar o HTML do iframe: ${describeError(error)}\n`,
    );
  }

  try {
    fs.writeFileSync(pageHtmlPath, await page.content());
  } catch (error) {
    fs.writeFileSync(
      pageHtmlPath,
      `Nao foi possivel capturar o HTML da pagina: ${describeError(error)}\n`,
    );
  }

  try {
    await page.screenshot({ fullPage: true, path: screenshotPath });
  } catch (error) {
    fs.writeFileSync(
      screenshotPath.replace(/\.png$/i, ".error.txt"),
      `Nao foi possivel capturar o screenshot: ${describeError(error)}\n`,
    );
  }

  return {
    detailsPath,
    frameHtmlPath,
    pageHtmlPath,
    screenshotPath,
  };
}

async function readVisibleNotifications(frame: Frame, companyName: string): Promise<RawNotificationRecord[]> {
  const list = frame.locator('div[role="list"]').first();
  return list.evaluate((listElement, currentCompanyName) => {
    const cards = Array.from(listElement.querySelectorAll(":scope > div[role='listitem']"));

    return cards
      .map((card) => {
        const normalizeText = (value: string): string => value.replace(/\s+/g, " ").trim();
        const subject = normalizeText(card.querySelector(".header")?.textContent ?? "");
        const summary = normalizeText(card.querySelector(".description")?.textContent ?? "");
        const meta = (card.querySelector(".meta")?.textContent ?? "").trim();
        const expedienteRaw = (card.querySelector(".ui.top.right.attached.label")?.textContent ?? "").trim();
        const dateMatch = meta.match(/em\s+(\d{2}\/\d{2}\/\d{4})/i);
        const expedienteMatch = expedienteRaw.match(/Expediente\s*N(?:º|o)\s*(.+)$/i);
        const date = dateMatch?.[1]?.trim() ?? "";
        const expediente = expedienteMatch?.[1]?.trim() ?? expedienteRaw;

        if (!subject || !date || !expediente) {
          return null;
        }

        return {
          companyName: currentCompanyName,
          date,
          expediente,
          key: `${expediente}|${subject}|${summary}|${date}`,
          subject,
          summary,
        };
      })
      .filter((record): record is RawNotificationRecord => Boolean(record));
  }, companyName);
}

export async function collectNotificationCandidates(
  frame: Frame,
  companyName: string,
): Promise<RawNotificationRecord[]> {
  try {
    const contentState = await waitForNotificationsContent(frame);
    if (contentState === "empty" || (await hasNoNotifications(frame))) {
      return [];
    }
  } catch (error) {
    const reason =
      "A area de notificacoes nao entrou em um estado conhecido (lista ou 'Sem Expedientes').";
    const detailedReason = `${reason} ${describeError(error)}`.trim();
    const artifacts = await captureNotificationsDiagnosticArtifacts(
      frame,
      detailedReason,
    );

    throw new Error(
      `${detailedReason} Artefatos salvos em ${artifacts.detailsPath}, ${artifacts.frameHtmlPath}, ${artifacts.pageHtmlPath} e ${artifacts.screenshotPath}.`,
      { cause: error },
    );
  }

  const list = frame.locator('div[role="list"]').first();
  await list.waitFor({ timeout: 5_000 });

  const records = new Map<string, RawNotificationRecord>();
  let stagnantPasses = 0;
  let endPasses = 0;

  while (stagnantPasses < 3 || endPasses < 2) {
    const countBeforeRead = records.size;
    const visibleRecords = await readVisibleNotifications(frame, companyName);

    for (const record of visibleRecords) {
      records.set(record.key, record);
    }

    stagnantPasses = records.size === countBeforeRead ? stagnantPasses + 1 : 0;

    const scrollState = await scrollScrollableAncestor(list);
    if (scrollState.atEnd) {
      endPasses += 1;
    } else {
      endPasses = 0;
    }

    await frame.waitForTimeout(scrollState.atEnd ? 300 : 700);
  }

  await resetScrollableAncestor(list);

  return Array.from(records.values());
}

export async function collectLatestNotificationFromFrame(
  frame: Frame,
  companyName: string,
): Promise<NotificationRecord | null> {
  const candidates = await collectNotificationCandidates(frame, companyName);
  return selectMostRecentNotification(candidates);
}

async function collectLatestNotificationForCompany(
  page: Page,
  company: CompanyRef,
): Promise<NotificationRecord | null> {
  const frame = await getNotificationsFrame(page);
  return collectLatestNotificationFromFrame(frame, company.name);
}

function buildOutputPath(): string {
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  return path.join(OUTPUT_DIRECTORY, CONSOLIDATED_SPREADSHEET_FILENAME);
}

export async function writeSpreadsheet(entries: SpreadsheetEntry[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Notificacoes");

  worksheet.columns = [
    { header: "EMPRESA", key: "companyName", width: 60 },
    { header: "STATUS", key: "status", width: 22 },
    { header: "DATA_NOTIFICACAO", key: "date", width: 20 },
    { header: "EXPEDIENTE", key: "expediente", width: 26 },
    { header: "ASSUNTO", key: "subject", width: 90 },
    { header: "RESUMO", key: "summary", width: 120 },
  ];

  for (const entry of entries) {
    worksheet.addRow({
      companyName: entry.company.name,
      status: entry.notification ? "" : NO_NOTIFICATIONS_STATUS,
      date: entry.notification?.date ?? "",
      expediente: entry.notification?.expediente ?? "",
      subject: entry.notification?.subject ?? "",
      summary: entry.notification?.summary ?? "",
    });
  }

  worksheet.getRow(1).font = { bold: true };
  await workbook.xlsx.writeFile(buildOutputPath());
}

async function logoutToLoginPage(page: Page): Promise<void> {
  const userToggle = page.locator(".Audora__User").first();

  try {
    if (await userToggle.isVisible({ timeout: 5_000 })) {
      await userToggle.click();
      await page.locator(".Audora__UserMenu li").filter({ hasText: /^Sair$/ }).click();
      await waitForLoginScreen(page);
      return;
    }
  } catch {
    // Fallback below.
  }

  await page.goto(SEFAZ_LOGOUT_URL, { waitUntil: "domcontentloaded" });
  await waitForLoginScreen(page);
}

async function createContext(): Promise<BrowserContext> {
  const extensionPath = resolveWebPkiExtensionPath();
  const profileInfo = resolveBrowserProfileInfo();

  logBrowserProfileInfo(profileInfo);

  return chromium.launchPersistentContext(profileInfo.userDataDir, {
    channel: "chromium",
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
}

export async function collectLatestNotificationsForAllCompanies(): Promise<void> {
  const context = await createContext();

  try {
    const page = await context.newPage();
    await loginToCompanyPicker(page, { forceFreshSession: true });

    const companies = (await collectCompanies(page)).filter(
      (company) => company.name !== CERTIFICATE_NAME,
    );
    const spreadsheetEntries: SpreadsheetEntry[] = [];

    console.log(`Empresas encontradas: ${companies.length}`);

    for (const [index, company] of companies.entries()) {
      console.log(`[${index + 1}/${companies.length}] Processando ${company.name}`);

      if (index > 0) {
        await loginToCompanyPicker(page);
      }

      await selectCompanyProfile(page, company);
      const latestNotification = await collectLatestNotificationForCompany(page, company);
      spreadsheetEntries.push({
        company,
        notification: latestNotification,
      });
      await writeSpreadsheet(spreadsheetEntries);
      await logoutToLoginPage(page);
    }
  } finally {
    await context.close();
  }
}
