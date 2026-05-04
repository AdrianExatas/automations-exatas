import test from "node:test";
import assert from "node:assert/strict";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { createGesttaClient, GesttaAuthFatalError } from "../src/api/client";
import { processarLinha } from "../src/automation";
import type { GesttaRuntimeAuth } from "../src/auth/runtime-auth";
import type { LinhaPlanilha } from "../src/types";

test("processamento da linha propaga erro fatal de auth em vez de registrar falha comum", async () => {
  let refreshCalls = 0;
  let currentJwt = "jwt-antigo";
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

  const linha: LinhaPlanilha = {
    cod: "1",
    cnpj: "12345678000190",
    responsavel: "Maria",
    mesGeracao: { month: 5, year: 2026 },
  };

  await assert.rejects(
    () => processarLinha(client, linha),
    GesttaAuthFatalError
  );
  assert.equal(refreshCalls, 1);
});
