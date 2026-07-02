import { getConfig } from "../../config";
import type { LlmProvider } from "./types";

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export class OllamaProvider implements LlmProvider {
  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const { OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_MS } = getConfig();
    const url = `${OLLAMA_BASE_URL.replace(/\/$/, "")}/api/chat`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          stream: false,
          format: "json",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama retornou ${response.status}: ${body}`);
      }

      const data = (await response.json()) as OllamaChatResponse;

      if (data.error) {
        throw new Error(`Ollama: ${data.error}`);
      }

      const text = data.message?.content?.trim();
      if (!text) {
        throw new Error("Resposta vazia do Ollama");
      }

      return text;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `Timeout ao aguardar Ollama (${OLLAMA_TIMEOUT_MS / 1000}s). Modelo local pode estar lento.`,
        );
      }
      if (
        err instanceof Error &&
        (err.message.includes("ECONNREFUSED") ||
          err.message.includes("fetch failed") ||
          err.cause instanceof Error)
      ) {
        throw new Error(
          "Ollama indisponível. Instale em https://ollama.com, execute 'ollama serve' e 'ollama pull " +
            OLLAMA_MODEL +
            "'",
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function checkOllamaReachable(): Promise<boolean> {
  const { OLLAMA_BASE_URL } = getConfig();
  const url = `${OLLAMA_BASE_URL.replace(/\/$/, "")}/api/tags`;
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkOllamaConnection(): Promise<{
  ok: boolean;
  models: string[];
  error?: string;
}> {
  const { OLLAMA_BASE_URL, OLLAMA_MODEL } = getConfig();
  const url = `${OLLAMA_BASE_URL.replace(/\/$/, "")}/api/tags`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        ok: false,
        models: [],
        error: `Ollama retornou ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      models?: { name: string }[];
    };
    const models = data.models?.map((m) => m.name) ?? [];
    const hasModel = models.some(
      (name) => name === OLLAMA_MODEL || name.startsWith(`${OLLAMA_MODEL}:`),
    );

    if (!hasModel) {
      return {
        ok: false,
        models,
        error:
          models.length > 0
            ? `Modelo '${OLLAMA_MODEL}' não encontrado. Execute: ollama pull ${OLLAMA_MODEL}`
            : `Nenhum modelo instalado. Execute: ollama pull ${OLLAMA_MODEL}`,
      };
    }

    return { ok: true, models };
  } catch (err) {
    return {
      ok: false,
      models: [],
      error:
        err instanceof Error
          ? err.message
          : "Não foi possível conectar ao Ollama",
    };
  }
}
