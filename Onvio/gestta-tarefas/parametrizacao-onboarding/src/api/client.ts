import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import { GesttaRuntimeAuth } from "../auth/runtime-auth";

const BASE_URL = "https://api.gestta.com.br";
const DEFAULT_TIMEOUT_MS = 60000;

function isAuthError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return false;
  return error.response.status === 401 || error.response.status === 403;
}

export function createGesttaClient(
  auth: GesttaRuntimeAuth,
  options?: { timeoutMs?: number },
): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "pt-BR,pt;q=0.9",
      "content-type": "application/json;charset=UTF-8",
      origin: "https://app.gestta.com.br",
      referer: "https://app.gestta.com.br/",
    },
  });

  client.interceptors.request.use((config) => {
    config.headers = config.headers ?? {};
    config.headers.authorization = `JWT ${auth.getJwt()}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as (AxiosRequestConfig & { __retriedAuth?: boolean }) | undefined;
      if (!config || config.__retriedAuth || !isAuthError(error) || auth.mode !== "artifact") {
        throw error;
      }

      config.__retriedAuth = true;
      await auth.refreshJwt();
      config.headers = config.headers ?? {};
      config.headers.authorization = `JWT ${auth.getJwt()}`;
      return client.request(config);
    },
  );

  return client;
}
