import { SIEG_API_KEY } from "../core/config.js";
import { sleep } from "../utils/retry.js";

const API_URL_BASE = "https://up.sieg.com/EnviarXml";
const API_URL_VERIFICAR = "https://api.sieg.com/BaixarXml?xmlType=1";
const RETRY_MAX_TENTATIVAS = 5;
const RETRY_ERROS_RECUPERAVEIS = new Set([500, 502, 503, 504, 429]);
const TIMEOUT_ENVIO_MS = 60_000;
const TIMEOUT_VERIFICACAO_MS = 15_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseText(response: Response): Promise<string> {
  try {
    const json = await response.clone().json();
    return JSON.stringify(json);
  } catch {
    return response.text();
  }
}

export async function verificarXmlExiste(chaveAcesso: string, apiKey = SIEG_API_KEY): Promise<boolean> {
  if (!chaveAcesso || chaveAcesso.length !== 44 || !apiKey) {
    return false;
  }
  try {
    const url = `${API_URL_VERIFICAR}&api_key=${encodeURIComponent(apiKey)}`;
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: chaveAcesso,
      },
      TIMEOUT_VERIFICACAO_MS,
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

export async function enviarXml(
  xmlContent: string,
  apiKey = SIEG_API_KEY,
  retryCount = RETRY_MAX_TENTATIVAS,
  silencioso = false,
): Promise<[boolean, string, boolean]> {
  if (!apiKey) {
    return [false, "API Key nao configurada", false];
  }

  const url = `${API_URL_BASE}?api_key=${encodeURIComponent(apiKey)}`;
  const xmlBase64 = Buffer.from(xmlContent, "utf8").toString("base64");
  const payload = JSON.stringify({ Xml: xmlBase64 });
  let ultimoCodigo = 0;

  for (let tentativa = 0; tentativa < retryCount; tentativa += 1) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: payload,
        },
        TIMEOUT_ENVIO_MS,
      );
      ultimoCodigo = response.status;

      if (response.status === 200) {
        return [true, `Enviado: ${await responseText(response)}`, false];
      }

      if (RETRY_ERROS_RECUPERAVEIS.has(response.status)) {
        const waitTime = 2 ** tentativa + tentativa * 0.5;
        if (tentativa < retryCount - 1) {
          if (!silencioso) {
            console.log(`    Retry em ${waitTime.toFixed(1)}s apos erro ${response.status}...`);
          }
          await sleep(waitTime * 1000);
          continue;
        }
        return [false, `Erro HTTP ${response.status}: ${await responseText(response)}`, true];
      }

      if (response.status === 401) {
        return [false, "Erro de autenticacao. Verifique a API Key", false];
      }
      if (response.status === 404) {
        return [false, "Endpoint nao encontrado (404)", false];
      }
      if (response.status === 400) {
        return [false, `Erro na requisicao: ${await responseText(response)}`, false];
      }
      return [false, `Erro HTTP ${response.status}: ${await responseText(response)}`, false];
    } catch (error) {
      if (tentativa < retryCount - 1) {
        await sleep((2 ** tentativa + 1) * 1000);
        continue;
      }
      return [false, `Erro na requisicao: ${error instanceof Error ? error.message : String(error)}`, true];
    }
  }

  return [false, `Falha apos ${retryCount} tentativas (ultimo codigo: ${ultimoCodigo})`, true];
}
