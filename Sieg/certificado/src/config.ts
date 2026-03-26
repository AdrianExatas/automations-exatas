/**
 * Configurações para integração com a API SIEG - Certificado Digital.
 * Variáveis podem ser sobrescritas via .env
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });

export const API_BASE_URL = (process.env.SIEG_API_BASE_URL ?? "https://api.sieg.com").replace(
  /\/+$/,
  ""
);
export const SIEG_API_KEY = (process.env.SIEG_API_KEY ?? "").trim();
/** Base path dos endpoints de Certificado (ex.: https://api.sieg.com/api/Certificado/ListarCertificados) */
export const CERTIFICADO_BASE = (
  process.env.SIEG_CERTIFICADO_BASE ?? "api/Certificado"
).replace(/^\/+|\/+$/g, "");
export const REQUEST_TIMEOUT = parseInt(
  process.env.SIEG_REQUEST_TIMEOUT ?? "30",
  10
);

