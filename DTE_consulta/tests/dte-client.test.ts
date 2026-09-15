import { describe, expect, test } from "bun:test";

import {
  DteClient,
  DteRequestError,
  type DteTransport,
  type HttpResponseLike,
} from "../src/dte-client.js";
import { DteTokenStore } from "../src/dte-auth.js";

const TOKEN_1 = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature1";
const TOKEN_2 = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyIn0.signature2";
const TARGET = {
  cnpj: "11222333000181",
  corporateName: "Empresa Teste",
  rawStatus: "ATIVA",
  status: "active" as const,
};

class QueueTransport implements DteTransport {
  readonly calls: Array<{ url: string; headers: Record<string, string> }> = [];

  constructor(private readonly responses: Array<HttpResponseLike | Error>) {}

  async get(url: string, headers: Record<string, string>): Promise<HttpResponseLike> {
    this.calls.push({ url, headers });
    const response = this.responses.shift();
    if (!response) throw new Error("fixture sem resposta");
    if (response instanceof Error) throw response;
    return response;
  }
}

function response(status: number, body: unknown, headers: Record<string, string> = {}): HttpResponseLike {
  return { status, headers, text: typeof body === "string" ? body : JSON.stringify(body) };
}

function createClient(transport: DteTransport, reauthenticate = async () => TOKEN_2) {
  const tokenStore = new DteTokenStore();
  tokenStore.set(TOKEN_1);
  return {
    client: new DteClient({
      transport,
      tokenStore,
      procuratorCnpj: "04252011000110",
      reauthenticate,
      sleep: async () => undefined,
    }),
    tokenStore,
  };
}

describe("DTE client", () => {
  test("valida DET0003 e usa o token rotacionado na chamada seguinte", async () => {
    const transport = new QueueTransport([
      response(200, true, { "set-token": TOKEN_2 }),
      response(200, [{ codigo: "DET0003" }]),
      response(200, true),
    ]);
    const { client, tokenStore } = createClient(transport);

    expect(await client.checkDetPermission(TARGET.cnpj)).toBe(true);
    expect(tokenStore.get()).toBe(TOKEN_2);
    expect(transport.calls[0]?.headers.authorization).toBe(`Bearer ${TOKEN_1}`);
    expect(transport.calls[1]?.headers.authorization).toBe(`Bearer ${TOKEN_2}`);
    expect(transport.calls.every((call) => call.headers.PerfilProcuracao === "3")).toBe(true);
  });

  test("considera nao autorizado quando DET0003 nao esta na lista", async () => {
    const transport = new QueueTransport([response(200, true), response(200, [{ codigo: "OUTRO" }])]);
    const { client } = createClient(transport);
    expect(await client.checkDetPermission(TARGET.cnpj)).toBe(false);
    expect(transport.calls).toHaveLength(2);
  });

  test("reautentica uma vez apos 401", async () => {
    let reauthCount = 0;
    const transport = new QueueTransport([response(401, {}), response(200, false)]);
    const { client } = createClient(transport, async () => {
      reauthCount += 1;
      return TOKEN_2;
    });
    expect(await client.checkDetPermission(TARGET.cnpj)).toBe(false);
    expect(reauthCount).toBe(1);
    expect(transport.calls[1]?.headers.authorization).toBe(`Bearer ${TOKEN_2}`);
  });

  test("repete 429 e erros de rede", async () => {
    const transport = new QueueTransport([
      response(429, {}),
      new Error("conexao reiniciada"),
      response(200, false),
    ]);
    const { client } = createClient(transport);
    expect(await client.checkDetPermission(TARGET.cnpj)).toBe(false);
    expect(transport.calls).toHaveLength(3);
  });

  test("mapeia e deduplica mensagens pelo UID", async () => {
    const rawMessage = {
      uid: "msg-1",
      titulo: "Aviso",
      texto: "Conteudo",
      remetente: "MTE",
      tipo: 2,
      situacao: 1,
      arquivada: false,
      dataHoraCriacao: "2026-09-15T08:00:00",
      dataHoraLeitura: null,
      dataHoraLeituraDecursoPrazo: null,
      sistemaOrigem: "DET",
    };
    const transport = new QueueTransport([response(200, 1), response(200, [rawMessage, rawMessage])]);
    const { client } = createClient(transport);
    const mailbox = await client.getMailbox(TARGET);
    expect(mailbox.unreadMessages).toBe(1);
    expect(mailbox.messages).toHaveLength(1);
    expect(mailbox.messages[0]?.type).toBe("2");
  });

  test("rejeita resposta JSON malformada", async () => {
    const transport = new QueueTransport([response(200, "{invalido")]);
    const { client } = createClient(transport);
    await expect(client.checkDetPermission(TARGET.cnpj)).rejects.toBeInstanceOf(DteRequestError);
  });
});
