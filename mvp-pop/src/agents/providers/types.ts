export interface LlmProvider {
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

export type LlmProviderName = "ollama" | "gemini" | "mock";
