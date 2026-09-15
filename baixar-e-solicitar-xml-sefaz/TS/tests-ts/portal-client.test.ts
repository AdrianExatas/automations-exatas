import { describe, expect, it } from "bun:test";
import {
  SefazHttpError,
  SefazPortalBusinessError,
  SefazPortalIncompatibleError,
} from "../src-ts/sefaz-http/client.js";
import { isPortalIncompatible, SefazPortalClient } from "../src-ts/portal/client.js";

describe("classificacao de fallback do Portal Fazendario", () => {
  it("permite fallback apenas para incompatibilidade tecnica", () => {
    expect(isPortalIncompatible(new SefazPortalIncompatibleError("rota alterada"))).toBe(true);
    expect(isPortalIncompatible(new SefazPortalBusinessError("periodo bloqueado"))).toBe(false);
    expect(isPortalIncompatible(new SefazHttpError("timeout"))).toBe(false);
  });
});

describe("SefazPortalClient fallback", () => {
  it("lista empresas pelo Playwright quando o HTTP e incompativel", async () => {
    const client = new SefazPortalClient("auto");
    const internals = client as unknown as {
      http: { listarEmpresas: () => Promise<Array<{ inscricao: string; nome: string }>> };
      browser?: { listarEmpresas: () => Promise<Array<{ inscricao: string; nome: string }>> };
      loginComPlaywright: () => Promise<void>;
    };

    internals.http.listarEmpresas = async () => {
      throw new SefazPortalIncompatibleError("parser da listagem mudou");
    };
    internals.loginComPlaywright = async () => {
      internals.browser = {
        listarEmpresas: async () => [{ inscricao: "123", nome: "Empresa Teste" }],
      };
    };

    await expect(client.listarEmpresas()).resolves.toEqual([{ inscricao: "123", nome: "Empresa Teste" }]);
  });

  it("faz preflight pelo Playwright quando o HTTP e incompativel", async () => {
    const client = new SefazPortalClient("auto");
    const internals = client as unknown as {
      http: { preflightSolicitacao: (inscricao: string) => Promise<boolean> };
      browser?: { preflightSolicitacao: (inscricao: string) => Promise<boolean> };
      loginComPlaywright: () => Promise<void>;
    };

    internals.http.preflightSolicitacao = async () => {
      throw new SefazPortalIncompatibleError("formulario mudou");
    };
    internals.loginComPlaywright = async () => {
      internals.browser = {
        preflightSolicitacao: async (inscricao: string) => inscricao === "123",
      };
    };

    await expect(client.preflightSolicitacao("123")).resolves.toBe(true);
  });
});
