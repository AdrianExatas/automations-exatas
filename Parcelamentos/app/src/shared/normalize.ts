export function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D+/g, "");
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function splitPastedLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const key = digitsOnly(line) || line.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(line);
  }

  return unique;
}

export function parseDelimitedLine(line: string): string[] {
  if (line.includes("|")) {
    return line.split("|").map((part) => part.trim());
  }

  if (line.includes(";")) {
    return line.split(";").map((part) => part.trim());
  }

  if (line.includes("\t")) {
    return line.split("\t").map((part) => part.trim());
  }

  return [line.trim()];
}
