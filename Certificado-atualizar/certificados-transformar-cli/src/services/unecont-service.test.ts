import { describe, it, expect } from "vitest";
import { extractToken } from "./unecont-service";

describe("UnecontCertificadoService", () => {
  describe("extractToken", () => {
    it("extrai inputTokenCSRF do HTML", () => {
      const html = '<input name="inputTokenCSRF" value="abc123" />';
      expect(extractToken(html)).toBe("abc123");
    });

    it("extrai __RequestVerificationToken do HTML", () => {
      const html = '<input name="__RequestVerificationToken" value="xyz789" />';
      expect(extractToken(html)).toBe("xyz789");
    });

    it("lança erro quando token não encontrado", () => {
      expect(() => extractToken("<html><body>sem token</body></html>")).toThrow(
        "Token anti-CSRF não encontrado",
      );
    });

    it("aceita variações de ordem dos atributos", () => {
      const html = '<input value="tok456" name="inputTokenCSRF" />';
      expect(extractToken(html)).toBe("tok456");
    });

    it("aceita atributo id ao invés de name", () => {
      const html = '<input id="inputTokenCSRF" value="id-tok" />';
      expect(extractToken(html)).toBe("id-tok");
    });
  });
});
