import { GoogleGenerativeAI } from "@google/generative-ai";
import { getConfig } from "../../config";
import type { LlmProvider } from "./types";

export class GeminiProvider implements LlmProvider {
  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const { GEMINI_API_KEY, GEMINI_MODEL } = getConfig();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    if (!text) throw new Error("Resposta vazia do Gemini");
    return text;
  }
}
