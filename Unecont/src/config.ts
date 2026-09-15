export const DEFAULT_UNECONT_LOGIN_URL = "https://app.unecont.com/_login/Login.aspx";
export const DEFAULT_UNECONT_SERVICOS_TOMADOS_URL =
  "https://app.unecont.com/Contador/ServicosTomados/Default.aspx";
export const DEFAULT_UNECONT_EMPRESAS_URL =
  "https://app.unecont.com/Contador/Empresas/Default.aspx";
export const DEFAULT_BD_API_BASE_URL = "http://localhost:3000/api";
export const DEFAULT_ONVIO_BASE_URL = "https://onvio.com.br";
export const DEFAULT_ONVIO_FIRM_COMPANY_ID = "DA26DD8B76C04A7B9A5EE3D029347E4D";

export interface Config {
  unecontEmail: string;
  unecontSenha: string;
  headless: boolean;
  defaultTimeout: number;
  shortTimeout: number;
  longTimeout: number;
  loginUrl: string;
  servicosTomadosUrl: string;
  empresasUrl: string;
}

export interface EnvConfig extends Config {
  empresasExcelPath: string;
  onvioUdsToken: string;
  onvioDepartmentName: string;
  onvioDepartmentId: string;
  onvioRequesterId: string;
  onvioClientId: string;
  onvioSkipAttachments: boolean;
  onvioDryRun: boolean;
  bdApiBaseUrl: string;
  unecontUploadDir: string;
  onvioUploadCheckpointPath: string;
  /** Caminho opcional de vídeo anexado a cada solicitação Onvio (relatório NFS). */
  unecontOnvioNfsVideoPath: string;
  /** Em 401, executa login via shared/onvio-auth (requer ONVIO_EMAIL e ONVIO_PASSWORD). */
  onvioAutoRefreshToken: boolean;
  onvioEmail: string;
  onvioPassword: string;
  onvioBaseUrl: string;
  onvioFirmCompanyId: string;
  onvioCookie: string;
  unecontEmpresasReportName: string;
  bitrixCompetenciasUrl: string;
  bitrixAccountingUrl: string;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  return value.trim().toLowerCase() === "true";
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  return {
    unecontEmail: env.UNECONT_EMAIL ?? env.UNECONT_LOGIN ?? "",
    unecontSenha: env.UNECONT_SENHA ?? "",
    headless: parseBoolean(env.HEADLESS, true),
    defaultTimeout: parseNumber(env.DEFAULT_TIMEOUT, 10),
    shortTimeout: parseNumber(env.SHORT_TIMEOUT, 3),
    longTimeout: parseNumber(env.LONG_TIMEOUT, 20),
    loginUrl: env.UNECONT_LOGIN_URL ?? DEFAULT_UNECONT_LOGIN_URL,
    servicosTomadosUrl: env.UNECONT_SERVICOS_TOMADOS_URL ?? DEFAULT_UNECONT_SERVICOS_TOMADOS_URL,
    empresasUrl: env.UNECONT_EMPRESAS_URL ?? DEFAULT_UNECONT_EMPRESAS_URL,
    empresasExcelPath: env.EMPRESAS_EXCEL_PATH ?? "assets/templates/empresas-template.xlsx",
    onvioUdsToken: env.ONVIO_UDS_TOKEN ?? "",
    onvioDepartmentName: env.ONVIO_DEPARTMENT_NAME ?? "SETOR FISCAL",
    onvioDepartmentId: env.ONVIO_DEPARTMENT_ID ?? "",
    onvioRequesterId: env.ONVIO_REQUESTER_ID ?? "",
    onvioClientId: env.ONVIO_CLIENT_ID ?? "",
    onvioSkipAttachments: parseBoolean(env.ONVIO_SKIP_ATTACHMENTS, false),
    onvioDryRun: parseBoolean(env.ONVIO_DRY_RUN, false),
    bdApiBaseUrl: env.BD_API_BASE_URL ?? DEFAULT_BD_API_BASE_URL,
    unecontUploadDir: env.UNECONT_UPLOAD_DIR ?? "",
    onvioUploadCheckpointPath: env.ONVIO_UPLOAD_CHECKPOINT_PATH ?? "",
    unecontOnvioNfsVideoPath: env.UNECONT_ONVIO_NFS_VIDEO_PATH ?? "",
    onvioAutoRefreshToken: parseBoolean(env.ONVIO_AUTO_REFRESH_TOKEN, false),
    onvioEmail: env.ONVIO_EMAIL ?? "",
    onvioPassword: env.ONVIO_PASSWORD ?? "",
    onvioBaseUrl: env.ONVIO_BASE_URL ?? DEFAULT_ONVIO_BASE_URL,
    onvioFirmCompanyId:
      env.ONVIO_FIRM_COMPANY_ID ?? env.ONVIO_COMPANY_ID ?? DEFAULT_ONVIO_FIRM_COMPANY_ID,
    onvioCookie: env.ONVIO_COOKIE ?? "",
    unecontEmpresasReportName: env.UNECONT_EMPRESAS_REPORT_NAME ?? "",
    bitrixCompetenciasUrl: env.BITRIX_COMPETENCIAS_URL ?? "",
    bitrixAccountingUrl: env.BITRIX_CONTABIL_URL ?? "",
  };
}

export function validateConfig(config: Pick<Config, "unecontEmail" | "unecontSenha">): void {
  if (!config.unecontEmail.trim()) {
    throw new Error("UNECONT_EMAIL e obrigatorio (UNECONT_LOGIN e alias legado)");
  }
  if (!config.unecontSenha.trim()) {
    throw new Error("UNECONT_SENHA e obrigatorio");
  }
}
