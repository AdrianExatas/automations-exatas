import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getLlmProvider } from "./providers";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadSkill(name: "writer" | "inspector"): string {
  const skillPath = join(__dirname, "..", "skills", `${name}.md`);
  return readFileSync(skillPath, "utf-8");
}

export function extractJsonFromResponse(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Resposta do modelo não contém JSON válido");
  }
}

export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  return getLlmProvider().complete(systemPrompt, userPrompt);
}

export async function callLlmJson<T>(
  systemPrompt: string,
  userPrompt: string,
  parse: (data: unknown) => T,
): Promise<T> {
  const raw = await callLlm(systemPrompt, userPrompt);
  const parsed = extractJsonFromResponse(raw);
  return parse(parsed);
}

/** @deprecated Use callLlmJson */
export const callGeminiJson = callLlmJson;
