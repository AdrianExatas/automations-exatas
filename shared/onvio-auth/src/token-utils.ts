import type { AuthCookie } from "./types";

export function parseJwtFromAuthorizationHeader(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const match = headerValue.trim().match(/^JWT\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function extractUdsLongTokenFromCookies(
  cookies: AuthCookie[],
): { value: string; expiresAt?: string } | null {
  const cookie = cookies.find((item) => item.name === "UDSLongToken" && item.value.trim());
  if (!cookie) return null;

  return {
    value: cookie.value,
    expiresAt:
      Number.isFinite(cookie.expires) && cookie.expires > 0
        ? new Date(cookie.expires * 1000).toISOString()
        : undefined,
  };
}
