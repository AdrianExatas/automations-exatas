import { describe, expect, it } from "vitest";
import { extractUdsLongTokenFromCookies, parseJwtFromAuthorizationHeader } from "./token-utils";

describe("token utils", () => {
  it("extrai JWT do header Authorization", () => {
    expect(parseJwtFromAuthorizationHeader("JWT abc.def")).toBe("abc.def");
    expect(parseJwtFromAuthorizationHeader("Bearer abc")).toBeNull();
  });

  it("extrai UDSLongToken dos cookies", () => {
    const token = extractUdsLongTokenFromCookies([
      {
        name: "UDSLongToken",
        value: "TOKEN123",
        domain: ".onvio.com.br",
        path: "/",
        expires: 1_800_000_000,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ]);

    expect(token).toEqual({
      value: "TOKEN123",
      expiresAt: new Date(1_800_000_000 * 1000).toISOString(),
    });
  });
});
