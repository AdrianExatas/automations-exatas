import { getConfig } from "../../config";
import type { LlmProvider, LlmProviderName } from "./types";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";

let cachedProvider: LlmProvider | null = null;

export function getLlmProviderName(): LlmProviderName {
  return getConfig().LLM_PROVIDER;
}

export function getLlmProvider(): LlmProvider {
  if (!cachedProvider) {
    cachedProvider =
      getConfig().LLM_PROVIDER === "gemini"
        ? new GeminiProvider()
        : new OllamaProvider();
  }
  return cachedProvider;
}

export function resetLlmProviderForTests() {
  cachedProvider = null;
}

export { checkOllamaConnection, checkOllamaReachable } from "./ollama";
