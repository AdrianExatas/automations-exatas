import "dotenv/config";

import axios from "axios";
import { log } from "../shared/logger";
import {
  validateRequiredEnv,
  readPfxFile,
  normalizarCnpj,
  extractErrorMessage,
} from "../utils/helpers";
import { SiegCertificadoService } from "../services/sieg-certificado-service";

async function main(): Promise<void> {
  const apiKey = process.env.SIEG_API_KEY;
  const cnpjEnv = (process.env.SIEG_CNPJ || "").trim();
  const pfxPath = process.env.CERTIFICADO_PFX_PATH;
  const certSenha = process.env.CERTIFICADO_SENHA;

  validateRequiredEnv({
    SIEG_API_KEY: apiKey,
    SIEG_CNPJ: cnpjEnv || undefined,
    CERTIFICADO_PFX_PATH: pfxPath,
    CERTIFICADO_SENHA: certSenha,
  });

  const cnpjNorm = normalizarCnpj(cnpjEnv);
  if (cnpjNorm.length < 14) {
    log("Erro: SIEG_CNPJ deve conter 14 dígitos");
    process.exit(1);
  }

  const { buffer: pfxBuffer, filename: pfxNome } = readPfxFile(pfxPath!);
  const certificadoBase64 = pfxBuffer.toString("base64");

  const client = axios.create({
    baseURL: "https://api.sieg.com",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Authorization-Token": apiKey!,
    },
    validateStatus: (status) => status >= 200 && status < 500,
  });

  const service = new SiegCertificadoService(client);

  try {
    await service.atualizarOuRegistrar(cnpjEnv, certificadoBase64, pfxNome, certSenha!);
    process.exit(0);
  } catch (err) {
    log("Erro: " + extractErrorMessage(err));
    process.exit(1);
  }
}

main();
