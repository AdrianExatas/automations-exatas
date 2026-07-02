import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export interface PathsConfig {
  baseDir: string;
  projectRoot: string;
  downloadsDir: string;
  checkpointsDir: string;
  checkpointsBackupDir: string;
  logsDir: string;
  lockDir: string;
}

function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function createPathsConfig(): PathsConfig {
  const currentFile = fileURLToPath(import.meta.url);
  const tsProjectRoot = resolve(dirname(currentFile), "..", "..");
  const projectRoot = dirname(tsProjectRoot);
  const baseDir = homedir();
  const localDir = join(projectRoot, "_local");
  const paths: PathsConfig = {
    baseDir,
    projectRoot,
    downloadsDir: join(baseDir, "Downloads", "XML SEFAZ"),
    checkpointsDir: join(localDir, "checkpoints"),
    checkpointsBackupDir: join(localDir, "checkpoints", "backups"),
    logsDir: join(localDir, "logs"),
    lockDir: join(localDir, "lock"),
  };

  for (const dir of [
    paths.downloadsDir,
    paths.checkpointsDir,
    paths.checkpointsBackupDir,
    paths.logsDir,
    paths.lockDir,
  ]) {
    ensureDirectory(dir);
  }

  return paths;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value === "") {
    return defaultValue;
  }
  return ["true", "1", "yes", "sim"].includes(value.toLowerCase());
}

function parseInteger(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseFloatEnv(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const PATHS = createPathsConfig();

dotenv.config({ path: join(PATHS.projectRoot, ".env") });

export const USUARIO_SEFAZ = process.env.USUARIO_SEFAZ ?? "";
export const SENHA_SEFAZ = process.env.SENHA_SEFAZ ?? "";
export const SIEG_API_KEY = process.env.SIEG_API_KEY ?? "";
export const UPLOAD_NUM_WORKERS = parseInteger(process.env.UPLOAD_NUM_WORKERS, 3);
export const UPLOAD_DELAY_SECONDS = parseFloatEnv(process.env.UPLOAD_DELAY_SECONDS, 0.1);
export const SEFAZ_HTTP_TIMEOUT_MS = parseInteger(process.env.SEFAZ_HTTP_TIMEOUT_MS, 120_000);
export const SEFAZ_HTTP_RETRY_ATTEMPTS = parseInteger(process.env.SEFAZ_HTTP_RETRY_ATTEMPTS, 3);
export const LIMPEZA_AUTOMATICA_XMLS_PRESOS = parseBoolean(
  process.env.LIMPEZA_AUTOMATICA_XMLS_PRESOS,
  true,
);

export function validarConfiguracoes(): [boolean, string] {
  const erros: string[] = [];
  if (!USUARIO_SEFAZ) {
    erros.push("USUARIO_SEFAZ nao configurado no .env");
  }
  if (!SENHA_SEFAZ) {
    erros.push("SENHA_SEFAZ nao configurado no .env");
  }
  return erros.length ? [false, erros.join("; ")] : [true, "Configuracoes validas"];
}

export function validarConfiguracaoCompleta(): [boolean, string[]] {
  const erros: string[] = [];
  const [sucesso, mensagem] = validarConfiguracoes();
  if (!sucesso) {
    erros.push(mensagem);
  }
  if (!existsSync(PATHS.checkpointsDir)) {
    erros.push(`Diretorio de checkpoints nao existe: ${PATHS.checkpointsDir}`);
  }
  return [erros.length === 0, erros];
}
