import axios from "axios";
import FormData from "form-data";
import { log } from "../shared/logger";
import { extractErrorMessage } from "../utils/helpers";

export interface FindClientByCodeResult {
  clientId: string;
  nationalIdentity?: string;
}

const BASE_URL = "https://onvio.com.br/api/manifesto/v1/clients";
const CORE_SEARCH_URL = "https://onvio.com.br/api/core/v3/companies";
const DEFAULT_COMPANY_ID = "DA26DD8B76C04A7B9A5EE3D029347E4D";

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10);
}

export class OnvioManifestoService {
  private token: string;
  private companyId: string;

  constructor(token: string, companyId?: string) {
    this.token = token;
    this.companyId = companyId ?? DEFAULT_COMPANY_ID;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Accept: "application/json, text/plain, */*",
      Authorization: `UDSLongToken ${this.token}`,
      Origin: "https://onvio.com.br",
      Referer: "https://onvio.com.br/br-portal-do-cliente/manifesto/nfe-import",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    };
  }

  /**
   * Busca o client ID pelo código da empresa (short code) na API Core.
   * Filtro: status ACTIVE e code EQ ao valor informado.
   * Retorna clientId e, se a API devolver, nationalIdentity para confronto com CNPJ.
   */
  async findClientIdByCode(code: string): Promise<FindClientByCodeResult> {
    const codeTrim = (code || "").trim();
    if (!codeTrim) {
      throw new Error("Código da empresa Onvio é obrigatório.");
    }
    const url = `${CORE_SEARCH_URL}/${this.companyId}/clients/search`;
    const filter = {
      useOr: false,
      items: [
        { by: "clientMainExpanded.status.id", op: "EQ", value: "ACTIVE" },
        { by: "code", op: "EQ", value: codeTrim },
      ],
    };
    const body = {
      filterSearchSort: {
        orderBy: "name asc",
        search: null,
        searchBy: null,
        filter: JSON.stringify(filter),
      },
      pagingDataRequest: {
        startIndex: null,
        pageIndex: 1,
        itemsPerPage: 10,
      },
      expand: "primaryContactExpanded",
      frp: "Onvio.StaffStorage",
      excludeCount: true,
    };
    log(`Buscando cliente Onvio por código ${codeTrim}...`);
    type ClientItem = { id?: string; nationalIdentity?: string; [key: string]: unknown };
    const res = await axios.post<{ data?: ClientItem[]; items?: ClientItem[] }>(url, body, {
      headers: { ...this.authHeaders, "Content-Type": "application/json" },
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (res.status !== 200) {
      throw new Error(`Busca cliente: ${res.status} - ${extractErrorMessage({ response: res })}`);
    }
    const clients = res.data?.data ?? res.data?.items ?? [];
    const first = Array.isArray(clients) ? clients[0] : null;
    if (!first?.id) {
      throw new Error(`Nenhum cliente Onvio encontrado para o código ${codeTrim}.`);
    }
    log(`Cliente encontrado: ${first.id}`);
    return {
      clientId: first.id,
      ...(first.nationalIdentity != null &&
        first.nationalIdentity !== "" && { nationalIdentity: String(first.nationalIdentity) }),
    };
  }

  async disableClient(clientId: string): Promise<void> {
    const url = `${BASE_URL}/${clientId}/disable`;
    log("Desativando cliente (disable)...");

    try {
      const res = await axios.put(
        url,
        {},
        {
          headers: { ...this.authHeaders, "Content-Type": "application/json" },
          validateStatus: (status) => status >= 200 && status < 500,
        },
      );

      if (res.status === 200) {
        log("Disable OK.");
        return;
      }

      const msg = extractErrorMessage({ response: res });
      const msgLower = msg.toLowerCase();
      const alreadyDisabled =
        msgLower.includes("desabilitado") ||
        msgLower.includes("disabled") ||
        msgLower.includes("already") ||
        msgLower.includes("já");

      if (alreadyDisabled || res.status === 400 || res.status === 409) {
        log(`Disable retornou ${res.status} (possivelmente já desabilitado): ${msg}`);
        return;
      }

      throw new Error(`Disable: ${res.status} - ${msg}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Disable:")) throw err;
      log(`Disable falhou: ${extractErrorMessage(err)}`);
      log("Prosseguindo para enable.");
    }
  }

  async enableClient(
    clientId: string,
    pfxBuffer: Buffer,
    pfxNome: string,
    certSenha: string,
    importNfeSince?: string,
  ): Promise<void> {
    const url = `${BASE_URL}/${clientId}/enable`;
    const queryBody = {
      companyId: this.companyId,
      certificateExpanded: { pin: certSenha },
      importNfeSince: importNfeSince ?? todayYYYYMMDD(),
    };

    const form = new FormData();
    form.append("query", Buffer.from(JSON.stringify(queryBody), "utf8"), {
      filename: "blob",
      contentType: "application/json",
    });
    form.append("file[]", pfxBuffer, {
      filename: pfxNome,
      contentType: "application/x-pkcs12",
    });

    log("Enviando certificado (enable)...");
    const res = await axios.put(url, form, {
      headers: { ...this.authHeaders, ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (status) => status >= 200 && status < 500,
    });

    if (res.status !== 200) {
      const msg = extractErrorMessage({ response: res });
      throw new Error(`Enable: ${res.status} - ${msg}`);
    }
    log("Certificado Onvio atualizado com sucesso.");
  }
}
