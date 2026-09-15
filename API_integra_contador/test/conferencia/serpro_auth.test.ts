import { describe, test, expect } from "bun:test";
import {
  SerproAuthManager,
  SerproHttpError,
  type HttpRequest,
  type HttpResponse,
} from "../../Dominio/reinf-dctfweb-conferencia/src/serpro/auth.ts";
import { SerproClient } from "../../Dominio/reinf-dctfweb-conferencia/src/serpro/client.ts";
import { DctfwebService } from "../../Dominio/reinf-dctfweb-conferencia/src/serpro/dctfweb_service.ts";

describe("SERPRO Autenticação e Cliente de Negócio", () => {
  test("obtém tokens com sucesso e reutiliza cache dentro da validade", async () => {
    let callCount = 0;
    const mockTransport = async (req: HttpRequest): Promise<HttpResponse> => {
      callCount++;
      return {
        status: 200,
        headers: {},
        body: JSON.stringify({
          access_token: `token_${callCount}`,
          jwt_token: `jwt_${callCount}`,
          expires_in: 3600,
          token_type: "Bearer",
        }),
      };
    };

    const authManager = new SerproAuthManager(
      {
        consumerKey: "test_key",
        consumerSecret: "test_secret",
        certificatePfxPath: "mock.pfx",
        certificatePassword: "pass",
      },
      mockTransport,
    );

    // Sobrescrever loadPfx para não precisar de arquivo físico neste teste unitário
    (authManager as any).loadPfx = async () => new Uint8Array([1, 2, 3]);

    const t1 = await authManager.getTokens();
    expect(t1.access_token).toBe("token_1");
    expect(callCount).toBe(1);

    // Segunda chamada deve usar cache
    const t2 = await authManager.getTokens();
    expect(t2.access_token).toBe("token_1");
    expect(callCount).toBe(1);

    // Forçando refresh
    const t3 = await authManager.getTokens(true);
    expect(t3.access_token).toBe("token_2");
    expect(callCount).toBe(2);
  });

  test("renova token automaticamente em HTTP 401 e repete a requisição", async () => {
    let requestCount = 0;
    const mockTransport = async (req: HttpRequest): Promise<HttpResponse> => {
      requestCount++;
      if (req.url.pathname.includes("/authenticate")) {
        return {
          status: 200,
          headers: {},
          body: JSON.stringify({
            access_token: `fresh_token_${requestCount}`,
            jwt_token: `fresh_jwt_${requestCount}`,
            expires_in: 3600,
            token_type: "Bearer",
          }),
        };
      }

      // Primeira chamada de negócio responde 401 (token expirado no gateway)
      if (requestCount === 2) {
        return {
          status: 401,
          headers: { "x-response-id": "resp_401" },
          body: JSON.stringify({ mensagem: "Token inválido" }),
        };
      }

      // Segunda chamada de negócio (após renovação) responde 200 com sucesso
      return {
        status: 200,
        headers: { "x-response-id": "resp_ok" },
        body: JSON.stringify({
          status: 200,
          dados: JSON.stringify({ XMLStringBase64: "dGVzdGU=" }),
          mensagens: [],
        }),
      };
    };

    const authManager = new SerproAuthManager(
      {
        consumerKey: "k",
        consumerSecret: "s",
        certificatePfxPath: "mock.pfx",
        certificatePassword: "p",
      },
      mockTransport,
    );
    (authManager as any).loadPfx = async () => new Uint8Array([1]);

    const client = new SerproClient(authManager, "00000000000191", mockTransport);
    const service = new DctfwebService(client);

    const result = await service.consultarXmlDeclaracao({
      contribuinteCnpj: "11222333000144",
      competencia: "2026-01",
    });

    expect(result.status).toBe(200);
    expect(result.xmlBase64).toBe("dGVzdGU=");
  });

  test("classifica HTTP 504 como operação indeterminada e NÃO repete a requisição", async () => {
    let businessCalls = 0;
    const mockTransport = async (req: HttpRequest): Promise<HttpResponse> => {
      if (req.url.pathname.includes("/authenticate")) {
        return {
          status: 200,
          headers: {},
          body: JSON.stringify({
            access_token: "tok",
            jwt_token: "jwt",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        };
      }

      businessCalls++;
      return {
        status: 504,
        headers: { "responseid": "gateway_timeout_123" },
        body: JSON.stringify({ mensagem: "Gateway Timeout no backend" }),
      };
    };

    const authManager = new SerproAuthManager(
      { consumerKey: "k", consumerSecret: "s", certificatePfxPath: "m", certificatePassword: "p" },
      mockTransport,
    );
    (authManager as any).loadPfx = async () => new Uint8Array([1]);

    const client = new SerproClient(authManager, "00000000000191", mockTransport);
    const service = new DctfwebService(client);

    let caughtError: unknown;
    try {
      await service.consultarXmlDeclaracao({
        contribuinteCnpj: "11222333000144",
        competencia: "2026-01",
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(SerproHttpError);
    expect((caughtError as SerproHttpError).status).toBe(504);
    expect((caughtError as SerproHttpError).name).toBe("SerproIndeterminateOperationError");
    // Regra: NÃO repetiu
    expect(businessCalls).toBe(1);
  });
});
