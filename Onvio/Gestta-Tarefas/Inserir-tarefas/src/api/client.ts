import axios, { AxiosInstance } from "axios";

const BASE_URL = "https://api.gestta.com.br";
const DEFAULT_TIMEOUT_MS = 60000;

export function createGesttaClient(
  jwt: string,
  options?: { timeoutMs?: number },
): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "pt-BR,pt;q=0.9",
      authorization: `JWT ${jwt}`,
      "content-type": "application/json;charset=UTF-8",
      origin: "https://app.gestta.com.br",
      referer: "https://app.gestta.com.br/",
    },
  });
}
