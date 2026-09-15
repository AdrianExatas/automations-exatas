import { describe, expect, test } from "bun:test";
import {
  buildEnvelope,
  callService,
  decodeBase64,
  SerproHttpError,
  type HttpTransport,
  type SerproTokens,
} from "../examples/typescript/integra-contador.ts";

const tokens: SerproTokens = { access_token: "access-placeholder", jwt_token: "jwt-placeholder", expires_in: 1800, token_type: "Bearer" };

describe("exemplo TypeScript", () => {
  test("serializa dados exatamente uma vez", () => {
    const envelope = buildEnvelope({
      contratante: { numero: "00000000000000", tipo: 2 },
      autorPedidoDados: { numero: "00000000000000", tipo: 2 },
      contribuinte: { numero: "00000000000000", tipo: 2 },
      idSistema: "PGDASD",
      idServico: "GERARDAS12",
      dados: { periodoApuracao: "202601" },
    });
    expect(typeof envelope.pedidoDados.dados).toBe("string");
    expect(JSON.parse(envelope.pedidoDados.dados)).toEqual({ periodoApuracao: "202601" });
  });

  test("envia headers e interpreta dados escapados", async () => {
    const envelope = buildEnvelope({
      contratante: { numero: "00000000000000", tipo: 2 },
      autorPedidoDados: { numero: "00000000000000", tipo: 2 },
      contribuinte: { numero: "00000000000000", tipo: 2 },
      idSistema: "PGDASD",
      idServico: "GERARDAS12",
      dados: { periodoApuracao: "202601" },
    });
    const transport: HttpTransport = async (request) => {
      expect(request.url.pathname).toEndWith("/Emitir");
      expect(request.headers.authorization).toBe("Bearer access-placeholder");
      expect(request.headers.jwt_token).toBe("jwt-placeholder");
      expect(request.headers["x-request-tag"]).toBe("teste-gerar-das");
      return {
        status: 200,
        headers: {},
        body: JSON.stringify({ ...envelope, status: 200, dados: JSON.stringify({ pdf: "UERG" }), mensagens: [] }),
      };
    };
    const response = await callService<{ pdf: string }>({ operationPath: "Emitir", tokens, envelope, requestTag: "teste-gerar-das" }, transport);
    expect(new TextDecoder().decode(decodeBase64(response.dadosParsed!.pdf))).toBe("PDF");
  });

  test("classifica 504 como estado indeterminado", async () => {
    const envelope = buildEnvelope({
      contratante: { numero: "00000000000000", tipo: 2 },
      autorPedidoDados: { numero: "00000000000000", tipo: 2 },
      contribuinte: { numero: "00000000000000", tipo: 2 },
      idSistema: "PGDASD",
      idServico: "GERARDAS12",
      dados: {},
    });
    const transport: HttpTransport = async () => ({ status: 504, headers: { "x-response-id": "trace-123" }, body: "{}" });
    try {
      await callService({ operationPath: "Emitir", tokens, envelope }, transport);
      throw new Error("A chamada deveria falhar");
    } catch (error) {
      expect(error).toBeInstanceOf(SerproHttpError);
      expect((error as SerproHttpError).name).toBe("SerproIndeterminateOperationError");
      expect((error as SerproHttpError).responseId).toBe("trace-123");
    }
  });
});
