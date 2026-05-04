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

export class GesttaAuthFatalError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "GesttaAuthFatalError";
  }
}

export function isGesttaAuthFatalError(error: unknown): error is GesttaAuthFatalError {
  return error instanceof GesttaAuthFatalError;
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
  let authRefreshFailedPermanently = false;

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

  client.interceptors.request.use((config) => {
    setRequestAuthorization(config, auth.getJwt());
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const config = error.config as RetriableAxiosRequestConfig | undefined;
      const authStatus = status === 401 || status === 403;

      if (
        auth.mode !== "artifact" ||
        !authStatus ||
        !config
      ) {
        return Promise.reject(error);
      }

      if (authRefreshFailedPermanently || config._gesttaAuthRetried) {
        authRefreshFailedPermanently = true;
        return Promise.reject(
          new GesttaAuthFatalError(
            `Token do Gestta renovado, mas a API continuou retornando ${status}. Verifique login, MFA e permissoes da conta no Gestta.`,
            error
          )
        );
      }

      config._gesttaAuthRetried = true;

      try {
        const refreshedJwt = await auth.refreshJwt();
        setClientAuthorization(client, refreshedJwt);
        setRequestAuthorization(config, refreshedJwt);
        console.log("[auth] Token renovado. Repetindo requisicao autenticada uma vez.");
        return client.request(config);
      } catch (refreshError: unknown) {
        const refreshMessage =
          refreshError instanceof Error ? refreshError.message : String(refreshError);
        return Promise.reject(
          new GesttaAuthFatalError(
            `Falha ao renovar token automaticamente apos ${status}: ${refreshMessage}`,
            refreshError
          )
        );
      }
    }
  );

  return client;
}
