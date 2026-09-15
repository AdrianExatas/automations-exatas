import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { resolveAttachmentsForServiceRequest } from "./resolver";

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(),
    statSync: vi.fn(),
  },
}));

const existsSync = fs.existsSync as unknown as ReturnType<typeof vi.fn>;
const statSync = fs.statSync as unknown as ReturnType<typeof vi.fn>;

function row(overrides: Record<string, unknown> = {}) {
  return {
    cnpj: "12",
    codigo: "10",
    nome: "Empresa Teste",
    solicitante: "",
    departamento: "Fiscal",
    assunto: "A",
    descricao: "B",
    arquivos: [] as string[],
    ...overrides,
  };
}

describe("resolveAttachmentsForServiceRequest", () => {
  it("retorna vazio no modo opcional sem arquivos", () => {
    const resolved = resolveAttachmentsForServiceRequest(row(), [], "explicit", {
      allowMissing: true,
    });
    expect(resolved).toEqual([]);
  });

  it("aceita caminho absoluto sem ser da pasta", () => {
    existsSync.mockReturnValue(true);
    statSync.mockReturnValue({ isFile: () => true });

    const filePath = path.resolve("C:/docs/manual.pdf");
    const resolved = resolveAttachmentsForServiceRequest(
      row({ arquivos: [filePath] }),
      [],
      "explicit",
      { validateIdentity: false },
    );

    expect(resolved).toEqual([
      expect.objectContaining({
        fileName: "manual.pdf",
        extension: ".pdf",
      }),
    ]);
  });

  it("nao valida identidade Unecont quando a flag esta desligada", () => {
    existsSync.mockReturnValue(true);
    statSync.mockReturnValue({ isFile: () => true });

    const filePath = path.resolve("C:/docs/qualquer.xlsx");
    const resolved = resolveAttachmentsForServiceRequest(
      row({ arquivos: [filePath], nome: "Outra Empresa" }),
      [],
      "explicit",
      { validateIdentity: false },
    );

    expect(resolved[0]?.fileName).toBe("qualquer.xlsx");
  });
});
