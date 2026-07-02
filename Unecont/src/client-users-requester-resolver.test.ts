import { describe, expect, it, vi } from "vitest";
import {
  createClientUsersRequesterResolver,
  matchClientUserBySolicitante,
  matchClientUserBySolicitantePartial,
} from "./client-users-requester-resolver";
import type { ClientUsersProvider, EmpresaBatchItem } from "./types";

describe("matchClientUserBySolicitante", () => {
  it("retorna usuario quando nome bate exatamente apos normalizacao", () => {
    const match = matchClientUserBySolicitante(
      [{ nome: "EMANUEL - FUNCIONÁRIO NOVO", id: "contact-1" }],
      "emanuel - funcionario novo",
    );

    expect(match?.id).toBe("contact-1");
  });

  it("retorna undefined quando ha multiplos usuarios com mesmo nome sem id unico", () => {
    const match = matchClientUserBySolicitante(
      [
        { nome: "Usuario A", id: "1" },
        { nome: "Usuario A", id: "2" },
      ],
      "Usuario A",
    );

    expect(match).toBeUndefined();
  });
});

describe("matchClientUserBySolicitantePartial", () => {
  it("retorna unico candidato quando nome e parcialmente contido", () => {
    const match = matchClientUserBySolicitantePartial(
      [{ nome: "EMANUEL - FUNCIONÁRIO NOVO", id: "contact-1" }],
      "EMANUEL",
    );

    expect(match?.id).toBe("contact-1");
  });

  it("retorna undefined quando ha mais de um candidato parcial", () => {
    const match = matchClientUserBySolicitantePartial(
      [
        { nome: "EMANUEL - FUNCIONÁRIO NOVO", id: "contact-1" },
        { nome: "EMANUEL - OUTRO", id: "contact-2" },
      ],
      "EMANUEL",
    );

    expect(match).toBeUndefined();
  });
});

describe("createClientUsersRequesterResolver", () => {
  it("resolve requesterId por codigo e solicitante com cache por codigo", async () => {
    const lookupUsers = vi.fn(async () => [
      { nome: "EMANUEL - FUNCIONÁRIO NOVO", id: "contact-emanuel" },
    ]);
    const provider: ClientUsersProvider = { lookupUsers };
    const resolve = createClientUsersRequesterResolver(provider);

    const row: EmpresaBatchItem = {
      cnpj: "123",
      codigo: "8",
      nome: "SUPERMERCADO DORIA BOQUIM LTDA",
      solicitante: "EMANUEL - FUNCIONÁRIO NOVO",
      departamento: "SETOR CONTÁBIL",
      assunto: "",
      descricao: "",
      arquivos: [],
    };

    const first = await resolve(row);
    const second = await resolve(row);

    expect(first?.requesterId).toBe("contact-emanuel");
    expect(second?.requesterId).toBe("contact-emanuel");
    expect(lookupUsers).toHaveBeenCalledTimes(1);
    expect(lookupUsers).toHaveBeenCalledWith({
      codigo: "8",
      cnpj: "123",
      nome: "SUPERMERCADO DORIA BOQUIM LTDA",
    });
  });

  it("retorna onvioRequesterId da planilha sem consultar provider", async () => {
    const lookupUsers = vi.fn(async () => [{ nome: "Outro", id: "other" }]);
    const resolve = createClientUsersRequesterResolver({ lookupUsers });

    const result = await resolve({
      cnpj: "123",
      codigo: "8",
      nome: "Empresa",
      solicitante: "EMANUEL - FUNCIONÁRIO NOVO",
      departamento: "",
      assunto: "",
      descricao: "",
      arquivos: [],
      onvioRequesterId: "requester-from-sheet",
    });

    expect(result?.requesterId).toBe("requester-from-sheet");
    expect(lookupUsers).not.toHaveBeenCalled();
  });

  it("emite aviso quando ha usuarios mas nenhum bate com RESPONSAVEL", async () => {
    const lookupUsers = vi.fn(async () => [
      { nome: "Outro Usuario", id: "other-id" },
      { nome: "Mais Um", id: "another-id" },
    ]);
    const resolve = createClientUsersRequesterResolver({ lookupUsers });

    const result = await resolve({
      cnpj: "123",
      codigo: "8",
      nome: "Empresa",
      solicitante: "EMANUEL - FUNCIONÁRIO NOVO",
      departamento: "",
      assunto: "",
      descricao: "",
      arquivos: [],
    });

    expect(result?.requesterId).toBeUndefined();
    expect(result?.warnings?.some((warning) => warning.includes("nenhum bate com RESPONSAVEL"))).toBe(
      true,
    );
  });

  it("resolve por match parcial quando ha unico candidato", async () => {
    const lookupUsers = vi.fn(async () => [
      { nome: "EMANUEL - FUNCIONÁRIO NOVO", id: "contact-emanuel" },
    ]);
    const resolve = createClientUsersRequesterResolver({ lookupUsers });

    const result = await resolve({
      cnpj: "123",
      codigo: "8",
      nome: "Empresa",
      solicitante: "EMANUEL",
      departamento: "",
      assunto: "",
      descricao: "",
      arquivos: [],
    });

    expect(result?.requesterId).toBe("contact-emanuel");
  });
});
