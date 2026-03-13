import "dotenv/config";

import axios from "axios";
import { log } from "../shared/logger";
import { validateRequiredEnv, readPfxFile, extractErrorMessage } from "../utils/helpers";
import { UnecontCertificadoService } from "../services/unecont-service";

async function main(): Promise<void> {
  const email = process.env.UNECONT_EMAIL;
  const senha = process.env.UNECONT_SENHA;
  const empresa = process.env.UNECONT_EMPRESA;
  const pfxPath = process.env.CERTIFICADO_PFX_PATH;
  const certSenha = process.env.CERTIFICADO_SENHA;
  const substituir = /^1|true$/i.test(process.env.SUBSTITUIR || "");

  validateRequiredEnv({
    UNECONT_EMAIL: email,
    UNECONT_SENHA: senha,
    UNECONT_EMPRESA: empresa,
    CERTIFICADO_PFX_PATH: pfxPath,
    CERTIFICADO_SENHA: certSenha,
  });

  const { buffer: pfxBuffer, filename: pfxNome } = readPfxFile(pfxPath!);

  const client = axios.create({
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/json, text/html",
    },
  });

  const service = new UnecontCertificadoService(client);

  try {
    await service.login(email!, senha!);

    const { parceiroEmpresa, folder: rawFolder, documento } = await service.buscarEmpresa(empresa!);

    let folder = rawFolder;
    if (!folder) {
      const hex = "0123456789abcdef";
      const rnd = () =>
        Array.from({ length: 4 }, () => hex[Math.floor(Math.random() * 16)]).join("");
      folder = `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
    }

    if (substituir && documento) {
      folder = await service.excluirCertificado(parceiroEmpresa, documento, folder);
    }

    await service.uploadCertificado(parceiroEmpresa, pfxBuffer, pfxNome, certSenha!, folder);
    process.exit(0);
  } catch (err) {
    log("Erro: " + extractErrorMessage(err));
    process.exit(1);
  }
}

main();
