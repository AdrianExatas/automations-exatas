import { randomUUID } from "node:crypto";

export function generateFeedbackToken(): string {
  return randomUUID();
}

export function buildFeedbackUrl(baseUrl: string, token: string): string {
  const normalized = baseUrl.replace(/\/$/, "");
  return `${normalized}/feedback/${token}`;
}
