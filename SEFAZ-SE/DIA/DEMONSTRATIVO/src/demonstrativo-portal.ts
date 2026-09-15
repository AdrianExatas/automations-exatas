import { DemonstrativoPlaywrightSession } from "./playwright-fallback";
import { DemonstrativoMtlsHttpClient, LEGACY_MTLS_PROBE_TIMEOUT_MS } from "./sefaz-demonstrativo-mtls";
import type { Company, Competencia, DownloadResult, ReportFormat, RunConfig } from "./types";

export type PortalTransport = "auto" | "http" | "playwright";

export type PortalSessionLog = (message: string) => void;

/**
 * Browser-first: login e downloads via Playwright + certificado A1.
 * transport "http" ainda tenta portal legado mTLS (raro neste ambiente).
 */
export class DemonstrativoPortalSession {
  private http: DemonstrativoMtlsHttpClient;
  private playwright?: DemonstrativoPlaywrightSession;
  private httpFormReady = false;

  private constructor(
    private readonly config: RunConfig,
    private readonly transport: PortalTransport,
    private readonly log: PortalSessionLog,
  ) {
    this.http = new DemonstrativoMtlsHttpClient(config.timeoutMs);
  }

  static async start(
    config: RunConfig,
    options: { transport?: PortalTransport; onLog?: PortalSessionLog } = {},
  ): Promise<DemonstrativoPortalSession> {
    const session = new DemonstrativoPortalSession(
      config,
      options.transport ?? "playwright",
      options.onLog ?? (() => undefined),
    );
    await session.open();
    return session;
  }

  async listCompanies(): Promise<Company[]> {
    if (this.transport === "http" && this.httpFormReady) {
      return this.http.listCompanies();
    }
    const pw = await this.ensurePlaywright();
    return pw.listCompanies();
  }

  async download(company: Company, competencia: Competencia, format: ReportFormat): Promise<DownloadResult> {
    if (this.transport === "http") {
      const result = await this.http.download(company, competencia, format);
      return { ...result, via: "http" };
    }

    // Playwright: API (context.request) ou UI #servico — nunca o cliente mTLS legado.
    const pw = await this.ensurePlaywright();
    return pw.download(company, competencia, format);
  }

  async close(): Promise<void> {
    await this.playwright?.close().catch(() => undefined);
    this.playwright = undefined;
  }

  private async open(): Promise<void> {
    const certificate = this.config.certificate;
    if (!certificate) {
      throw new Error("Certificado digital A1 e obrigatorio.");
    }

    if (this.transport === "http") {
      this.log("Tentando login mTLS HTTP (portal legado)...");
      await this.http.loginComCertificado(certificate.pfxPath, certificate.passphrase, {
        timeoutMs: LEGACY_MTLS_PROBE_TIMEOUT_MS,
      });
      await this.http.openDemonstrativoForm();
      this.httpFormReady = true;
      this.log("Sessao HTTP mTLS pronta (portal legado + certificado A1, sem browser).");
      return;
    }

    // auto | playwright: so browser (sem probe legado, sem adotar sessao no mTLS).
    this.log("Login por certificado A1 via Playwright; listagem/download via browser.");
    await this.ensurePlaywright();
    this.httpFormReady = false;
    this.log("Sessao pronta: Playwright (certificado A1).");
  }

  private async ensurePlaywright(): Promise<DemonstrativoPlaywrightSession> {
    if (!this.playwright) {
      this.playwright = await DemonstrativoPlaywrightSession.start(this.config);
    }
    return this.playwright;
  }
}
