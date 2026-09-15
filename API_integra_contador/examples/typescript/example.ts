import { authenticateSerpro, buildEnvelope, callService, decodeBase64 } from "./integra-contador.ts";
import { writeFile } from "node:fs/promises";

// Exemplo ilustrativo: exige contrato e credenciais válidas do SERPRO.
const tokens = await authenticateSerpro({
  consumerKey: process.env.SERPRO_CONSUMER_KEY!,
  consumerSecret: process.env.SERPRO_CONSUMER_SECRET!,
  certificatePfxPath: process.env.SERPRO_CERT_PFX_PATH!,
  certificatePassword: process.env.SERPRO_CERT_PASSWORD!,
});

const cnpj = process.env.SERPRO_CONTRATANTE_CNPJ!;
const envelope = buildEnvelope({
  contratante: { numero: cnpj, tipo: 2 },
  autorPedidoDados: { numero: cnpj, tipo: 2 },
  contribuinte: { numero: process.env.SERPRO_CONTRIBUINTE_CNPJ!, tipo: 2 },
  idSistema: "PGDASD",
  idServico: "GERARDAS12",
  dados: { periodoApuracao: "202601" },
});

const response = await callService<{ pdf?: string }>({
  operationPath: "Emitir",
  tokens,
  envelope,
  requestTag: "exemplo-pgdasd-gerar-das",
});

if (response.dadosParsed?.pdf) {
  await writeFile("das.pdf", decodeBase64(response.dadosParsed.pdf));
}
