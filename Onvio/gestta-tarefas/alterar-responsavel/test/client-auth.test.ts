import test from "node:test";
import assert from "node:assert/strict";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { createGesttaClient } from "../src/api/client";
import type { GesttaRuntimeAuth } from "../src/auth/runtime-auth";

function readAuthorization(config: InternalAxiosRequestConfig): string | undefined {
  const headers = config.headers as {
    get?: (name: string) => string | undefined;
    authorization?: string;
    Authorization?: string;
  };

  if (typeof headers.get === "function") {
    return headers.get("authorization");
  }

  return headers.authorization || headers.Authorization;
}

test("renova o token e repete a requisicao uma unica vez ao receber 401 com artefato", async () => {
  let refreshCalls = 0;
  let requestCalls = 0;
  const authorizationHistory: string[] = [];

  const auth: GesttaRuntimeAuth = {
    mode: "artifact",
    source: "artifact",
    artifactPath: "shared/onvio-auth/runtime/latest-auth.json",
    getJwt: () => "jwt-antigo",
    refreshJwt: async () => {
      refreshCalls += 1;
      return "jwt-novo";
    },
  };

  const client = createGesttaClient(auth);
  client.defaults.adapter = async (
    config: InternalAxiosRequestConfig
  ): Promise<AxiosResponse<{ ok: boolean }>> => {
    requestCalls += 1;
    authorizationHistory.push(readAuthorization(config) || "");

    if (requestCalls === 1) {
      const error = new Error("Request failed with status code 401") as Error & {
        config: InternalAxiosRequestConfig;
        response: AxiosResponse<{ ok: boolean }>;
      };
      error.config = config;
      error.response = {
        config,
        data: { ok: false },
        headers: {},
        status: 401,
        statusText: "Unauthorized",
      };
      throw error;
    }

    return {
      config,
      data: { ok: true },
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };

  const response = await client.get<{ ok: boolean }>("/admin/customer");

  assert.equal(response.status, 200);
  assert.equal(response.data.ok, true);
  assert.equal(refreshCalls, 1);
  assert.equal(requestCalls, 2);
  assert.deepEqual(authorizationHistory, ["JWT jwt-antigo", "JWT jwt-novo"]);
});

test("nao tenta refresh automatico quando a origem do token e .env", async () => {
  let refreshCalls = 0;

  const auth: GesttaRuntimeAuth = {
    mode: "env",
    source: "local-env",
    getJwt: () => "jwt-fixo",
    refreshJwt: async () => {
      refreshCalls += 1;
      return "jwt-ignorado";
    },
  };

  const client = createGesttaClient(auth);
  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const error = new Error("Request failed with status code 401") as Error & {
      config: InternalAxiosRequestConfig;
      response: AxiosResponse<{ ok: boolean }>;
    };
    error.config = config;
    error.response = {
      config,
      data: { ok: false },
      headers: {},
      status: 401,
      statusText: "Unauthorized",
    };
    throw error;
  };

  await assert.rejects(() => client.get("/admin/customer"), /401/);
  assert.equal(refreshCalls, 0);
});
