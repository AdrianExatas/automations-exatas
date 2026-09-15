/**
 * Configuração central e leitura segura de variáveis de ambiente
 */
import { resolve } from "node:path";

export interface AppConfig {
  serproConsumerKey: string;
  serproConsumerSecret: string;
  serproCertPfxPath: string;
  serproCertPassword: string;
  serproContratanteCnpj: string;
  dominioOdbcDsn: string;
  dominioUser: string;
  dominioPassword: string;
  sqliteDbPath: string;
  port: number;
}

export function loadConfig(): AppConfig {
  const rootDir = process.cwd();
  return {
    serproConsumerKey: process.env.SERPRO_CONSUMER_KEY || process.env.CONSUMER_KEY || "",
    serproConsumerSecret: process.env.SERPRO_CONSUMER_SECRET || process.env.CONSUMER_SECRET || "",
    serproCertPfxPath: process.env.SERPRO_CERT_PFX_PATH || process.env.SERPRO_CERT_PATH || process.env.CERT_PFX_PATH || "",
    serproCertPassword: process.env.SERPRO_CERT_PASSWORD || process.env.SERPRO_CERT_PASS || process.env.CERT_PASSWORD || "",
    serproContratanteCnpj: cleanDigits(process.env.SERPRO_CONTRATANTE_CNPJ || process.env.CONTRATANTE_CNPJ || ""),
    dominioOdbcDsn: process.env.DOMINIO_ODBC_DSN || "Contabil Oficial",
    dominioUser: process.env.DOMINIO_USER || "EXTERNO",
    dominioPassword: process.env.DOMINIO_PASSWORD || "",
    sqliteDbPath: process.env.SQLITE_DB_PATH || resolve(rootDir, "conferencia_historico.db"),
    port: parseInt(process.env.PORT || "3000", 10),
  };
}

export function cleanDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskCnpj(cnpj: string): string {
  const digits = cleanDigits(cnpj);
  if (digits.length !== 14) return "***";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function sanitizeConfig(config: AppConfig): Record<string, string | number> {
  return {
    serproConsumerKey: config.serproConsumerKey ? `${config.serproConsumerKey.slice(0, 4)}****` : "(não configurado)",
    serproConsumerSecret: config.serproConsumerSecret ? "****" : "(não configurado)",
    serproCertPfxPath: config.serproCertPfxPath || "(não configurado)",
    serproCertPassword: config.serproCertPassword ? "****" : "(não configurado)",
    serproContratanteCnpj: config.serproContratanteCnpj ? maskCnpj(config.serproContratanteCnpj) : "(não configurado)",
    dominioOdbcDsn: config.dominioOdbcDsn,
    dominioUser: config.dominioUser,
    dominioPassword: config.dominioPassword ? "****" : "(não configurado)",
    sqliteDbPath: config.sqliteDbPath,
    port: config.port,
  };
}
