import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { normalizarCnpj, extractErrorMessage, validateRequiredEnv, readPfxFile } from "./helpers";

describe("helpers", () => {
  describe("normalizarCnpj", () => {
    it("remove máscara do CNPJ", () => {
      expect(normalizarCnpj("27.939.154/0001-08")).toBe("27939154000108");
    });

    it("retorna dígitos de CNPJ sem máscara", () => {
      expect(normalizarCnpj("27939154000108")).toBe("27939154000108");
    });

    it("retorna string vazia para input vazio", () => {
      expect(normalizarCnpj("")).toBe("");
    });
  });

  describe("extractErrorMessage", () => {
    it("extrai message do response.data", () => {
      const err = { response: { data: { message: "Erro na API" } } };
      expect(extractErrorMessage(err)).toBe("Erro na API");
    });

    it("extrai Mensagem do response.data", () => {
      const err = { response: { data: { Mensagem: "Erro PT" } } };
      expect(extractErrorMessage(err)).toBe("Erro PT");
    });

    it("retorna data string diretamente", () => {
      const err = { response: { data: "Erro string" } };
      expect(extractErrorMessage(err)).toBe("Erro string");
    });

    it("retorna message do erro quando sem response", () => {
      const err = { message: "Network error" };
      expect(extractErrorMessage(err)).toBe("Network error");
    });

    it("retorna fallback para erro desconhecido", () => {
      expect(extractErrorMessage({})).toBe("Erro desconhecido");
    });
  });

  describe("validateRequiredEnv", () => {
    it("não lança quando todas as vars estão definidas", () => {
      expect(() => validateRequiredEnv({ VAR1: "a", VAR2: "b" })).not.toThrow();
    });

    it("lança com nome da var faltante", () => {
      expect(() => validateRequiredEnv({ VAR1: "a", VAR2: undefined })).toThrow("VAR2");
    });

    it("lança listando múltiplas vars faltantes", () => {
      expect(() => validateRequiredEnv({ A: undefined, B: undefined, C: "ok" })).toThrow("A, B");
    });
  });

  describe("readPfxFile", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cert-pfx-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("lê arquivo existente e retorna buffer + nome", () => {
      const filePath = path.join(tmpDir, "cert.pfx");
      fs.writeFileSync(filePath, "fake-pfx-content");
      const result = readPfxFile(filePath);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toBe("cert.pfx");
    });

    it("lança erro para arquivo inexistente", () => {
      expect(() => readPfxFile(path.join(tmpDir, "nao-existe.pfx"))).toThrow("não encontrado");
    });
  });
});
