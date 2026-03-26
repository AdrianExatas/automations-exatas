/**
 * Cliente HTTP para a API Gestta.
 * Base URL: https://api.gestta.com.br
 * task-gen usa o mesmo host com path /task-gen/...
 */

import axios, { AxiosInstance } from "axios";

const BASE_URL = "https://api.gestta.com.br";

export function createGesttaClient(jwt: string): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
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
