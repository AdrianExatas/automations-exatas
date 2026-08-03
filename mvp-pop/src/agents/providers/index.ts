import { getConfig } from "../../config";
import type { LlmProvider, LlmProviderName } from "./types";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { MockProvider } from "./mock";

let cachedProvider: LlmProvider | null = null;

export function getLlmProviderName(): LlmProviderName {
  return getConfig().LLM_PROVIDER;
}

export function getLlmProvider(): LlmProvider {
  if (!cachedProvider) {
    const name = getConfig().LLM_PROVIDER;
    cachedProvider =
      name === "gemini"
        ? new GeminiProvider()
        : name === "mock"
          ? new MockProvider()
          : new OllamaProvider();
  }
  return cachedProvider;
}

export function resetLlmProviderForTests() {
  cachedProvider = null;
}

export { checkOllamaConnection, checkOllamaReachable } from "./ollama";
