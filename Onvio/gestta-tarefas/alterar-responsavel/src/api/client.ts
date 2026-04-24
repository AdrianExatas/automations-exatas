/**
 * Cliente HTTP para a API Gestta.
 * Base URL: https://api.gestta.com.br
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { GesttaRuntimeAuth } from "../auth/runtime-auth";

const BASE_URL = "https://api.gestta.com.br";

interface RetriableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _gesttaAuthRetried?: boolean;
}

function getAuthorizationHeader(jwt: string): string {
  return `JWT ${jwt}`;
}

function setRequestAuthorization(
  config: { headers?: unknown },
  jwt: string
): void {
  const authorization = getAuthorizationHeader(jwt);
  if (!config.headers) {
    config.headers = { authorization };
    return;
  }

  const headers = config.headers as {
    set?: (name: string, value: string) => void;
    authorization?: string;
    Authorization?: string;
    [key: string]: unknown;
  };
  if (typeof headers.set === "function") {
    headers.set("authorization", authorization);
    return;
  }

  headers.authorization = authorization;
  headers.Authorization = authorization;
}

function setClientAuthorization(client: AxiosInstance, jwt: string): void {
  const authorization = getAuthorizationHeader(jwt);
  client.defaults.headers.common.authorization = authorization;
  client.defaults.headers.common.Authorization = authorization;
}

export function createGesttaClient(auth: GesttaRuntimeAuth): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "pt-BR,pt;q=0.9",
      authorization: getAuthorizationHeader(auth.getJwt()),
      "content-type": "application/json;charset=UTF-8",
      origin: "https://app.gestta.com.br",
      referer: "https://app.gestta.com.br/",
    },
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const config = error.config as RetriableAxiosRequestConfig | undefined;

      if (
        auth.mode !== "artifact" ||
        (status !== 401 && status !== 403) ||
        !config ||
        config._gesttaAuthRetried
      ) {
        return Promise.reject(error);
      }

      config._gesttaAuthRetried = true;

      try {
        const refreshedJwt = await auth.refreshJwt();
        setClientAuthorization(client, refreshedJwt);
        setRequestAuthorization(config, refreshedJwt);
        return client.request(config);
      } catch (refreshError: unknown) {
        const refreshMessage =
          refreshError instanceof Error ? refreshError.message : String(refreshError);
        return Promise.reject(
          new Error(
            `Falha ao renovar token automaticamente apos ${status}: ${refreshMessage}`
          )
        );
      }
    }
  );

  return client;
}
