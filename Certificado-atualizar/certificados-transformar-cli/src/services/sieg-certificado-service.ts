import type { AxiosInstance } from "axios";
import { log } from "../shared/logger";
import { normalizarCnpj, extractErrorMessage } from "../utils/helpers";

interface CertificadoItem {
  Id?: number;
  id?: number;
  CnpjCpf?: string;
  cnpjCpf?: string;
  Cnpj?: string;
  cnpj?: string;
}

export class SiegCertificadoService {
  private client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  async listarCertificados(): Promise<CertificadoItem[]> {
    log("Listando certificados...");
    const res = await this.client.get("/api/Certificado/ListarCertificados", {
      params: { active: true, pagina: 0 },
    });
    if (res.status !== 200) {
      throw new Error(extractErrorMessage({ response: res }));
    }
    const rawData = res.data;
    return Array.isArray(rawData)
      ? rawData
      : ((rawData as { items?: CertificadoItem[] })?.items ??
          (rawData as { data?: CertificadoItem[] })?.data ??
          []);
  }

  async atualizarOuRegistrar(
    cnpj: string,
    certificadoBase64: string,
    pfxNome: string,
    certSenha: string,
  ): Promise<void> {
    const cnpjNorm = normalizarCnpj(cnpj);
    const lista = await this.listarCertificados();

    const existente = lista.find((item) => {
      const cnpjItem = normalizarCnpj(item.CnpjCpf ?? item.cnpjCpf ?? item.Cnpj ?? item.cnpj ?? "");
      return cnpjItem === cnpjNorm;
    });

    const certificadoId = existente?.Id ?? existente?.id;

    if (certificadoId) {
      log("Atualizando certificado existente...");
      const editBody = {
        CertificadoId: certificadoId,
        CnpjCpf: cnpjNorm,
        SenhaCertificado: certSenha,
        TipoCertificado: "Pfx",
        Certificado: certificadoBase64,
      };
      const editRes = await this.client.post("/api/Certificado/Editar", editBody);
      if (editRes.status < 200 || editRes.status >= 300) {
        throw new Error(extractErrorMessage({ response: editRes }));
      }
      log("Certificado SIEG atualizado com sucesso.");
    } else {
      log("Registrando novo certificado...");
      const registrarBody = {
        Nome: pfxNome.replace(/\.pfx$/i, "") || cnpjNorm,
        CnpjCpf: cnpjNorm,
        SenhaCertificado: certSenha,
        TipoCertificado: "Pfx",
        Certificado: certificadoBase64,
      };
      const regRes = await this.client.post("/api/Certificado/Registrar", registrarBody);
      if (regRes.status < 200 || regRes.status >= 300) {
        throw new Error(extractErrorMessage({ response: regRes }));
      }
      log("Certificado SIEG registrado com sucesso.");
    }
  }
}
