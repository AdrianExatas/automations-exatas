const SENSITIVE_KEY = /(?:authorization|cookie|token|jwt|password|senha|secret|client_secret|private.?key|pfx|certificate.?content|longtoken|seamlessauthenticationtoken)/i;

export function redact<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value
      .replace(/\bJWT\s+[A-Za-z0-9._~-]+/gi, "JWT <redacted>")
      .replace(/\bUDSLongToken\s+[A-Za-z0-9._~-]+/gi, "UDSLongToken <redacted>") as T;
  }
  if (typeof value !== "object") return value;
  if (seen.has(value as object)) return "<circular>" as T;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen)) as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SENSITIVE_KEY.test(key) ? "<redacted>" : redact(item, seen);
  }
  return output as T;
}

export function safeError(error: unknown): string {
  if (error instanceof Error) return String(redact(error.message));
  return String(redact(error));
}
