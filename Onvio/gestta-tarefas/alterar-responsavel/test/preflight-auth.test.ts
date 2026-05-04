import test from "node:test";
import assert from "node:assert/strict";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { createGesttaClient } from "../src/api/client";
import { preflightGesttaAuth } from "../src/automation";
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

test("preflight renova token de artefato ao receber 403 e repete uma vez", async () => {
  let refreshCalls = 0;
  let requestCalls = 0;
  let currentJwt = "jwt-antigo";
  const authorizationHistory: string[] = [];

  const auth: GesttaRuntimeAuth = {
    mode: "artifact",
    source: "artifact",
    artifactPath: "shared/onvio-auth/runtime/latest-auth.json",
    getJwt: () => currentJwt,
    refreshJwt: async () => {
      refreshCalls += 1;
      currentJwt = "jwt-novo";
      return currentJwt;
    },
  };

  const client = createGesttaClient(auth);
  client.defaults.adapter = async (
    config: InternalAxiosRequestConfig
  ): Promise<AxiosResponse<unknown>> => {
    requestCalls += 1;
    authorizationHistory.push(readAuthorization(config) || "");

    if (requestCalls === 1) {
      const error = new Error("Request failed with status code 403") as Error & {
        config: InternalAxiosRequestConfig;
        response: AxiosResponse<{ ok: boolean }>;
      };
      error.config = config;
      error.response = {
        config,
        data: { ok: false },
        headers: {},
        status: 403,
        statusText: "Forbidden",
      };
      throw error;
    }

    return {
      config,
      data: [{ _id: "user-1", name: "Usuario" }],
      headers: {},
      status: 200,
      statusText: "OK",
    };
  };

  await preflightGesttaAuth(client);

  assert.equal(refreshCalls, 1);
  assert.equal(requestCalls, 2);
  assert.deepEqual(authorizationHistory, ["JWT jwt-antigo", "JWT jwt-novo"]);
});
