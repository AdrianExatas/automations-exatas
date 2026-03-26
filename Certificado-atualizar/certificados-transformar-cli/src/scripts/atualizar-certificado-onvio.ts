import "dotenv/config";

import { log } from "../shared/logger";
import {
  validateRequiredEnv,
  readPfxFile,
  extractErrorMessage,
  isOnvioTokenInvalidError,
  normalizarCnpj,
} from "../utils/helpers";
import { OnvioManifestoService } from "../services/onvio-manifesto-service";

async function resolveOnvioToken(): Promise<string> {
  if (process.env.ONVIO_UDS_LONG_TOKEN) return process.env.ONVIO_UDS_LONG_TOKEN;
  try {
    const { getCredential } = await import("@automation-hub/credentials");
    const fromRedis = await getCredential("onvio", "ONVIO_UDS_TOKEN");
    if (fromRedis) return fromRedis;
  } catch {
    // credentials package not available or Redis down
  }
  throw new Error(
    "Token Onvio não encontrado. Execute a ação 'tokens' do Onvio primeiro, ou defina ONVIO_UDS_LONG_TOKEN.",
  );
}

async function main(): Promise<void> {
  const clientCode = (process.env.ONVIO_CLIENT_CODE || "").trim();
  const cnpjInformado = (process.env.ONVIO_CNPJ || "").trim() || undefined;
  const pfxPath = process.env.CERTIFICADO_PFX_PATH;
  const certSenha = process.env.CERTIFICADO_SENHA;
  const importNfeSince = (process.env.ONVIO_IMPORT_NFE_SINCE || "").trim() || undefined;
  const companyId = process.env.ONVIO_COMPANY_ID;

  validateRequiredEnv({
    ONVIO_CLIENT_CODE: clientCode || undefined,
    CERTIFICADO_PFX_PATH: pfxPath,
    CERTIFICADO_SENHA: certSenha,
  });

  const token = await resolveOnvioToken();
  const { buffer: pfxBuffer, filename: pfxNome } = readPfxFile(pfxPath!);

  const service = new OnvioManifestoService(token, companyId);

  try {
    const { clientId, nationalIdentity } = await service.findClientIdByCode(clientCode);

    if (nationalIdentity != null && nationalIdentity !== "" && cnpjInformado) {
      const cnpjApi = normalizarCnpj(nationalIdentity);
      const cnpjForm = normalizarCnpj(cnpjInformado);
      if (cnpjApi !== cnpjForm) {
        throw new Error(
          `CNPJ do cliente Onvio (${nationalIdentity}) não confere com o CNPJ informado (${cnpjInformado}).`,
        );
      }
    }

    await service.disableClient(clientId);
    await service.enableClient(clientId, pfxBuffer, pfxNome, certSenha!, importNfeSince);
    process.exit(0);
  } catch (err) {
    const msg = extractErrorMessage(err);
    log("Erro: " + msg);
    if (isOnvioTokenInvalidError(err)) {
      log("AUTOMATION_HUB:ONVIO_TOKEN_EXPIRED");
    }
    process.exit(1);
  }
}

main();
