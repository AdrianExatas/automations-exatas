import "dotenv/config";
import { readFileSync } from "fs";

const API_KEY = process.env.SIEG_API_KEY;
const CERTIFICATE_ID = "33790-27939154000108";
const CNPJ = "27939154000108";
const PFX_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\EXATAS CONTABILIDADE LTDA_27939154000108.pfx";
const SENHA_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\Senha.txt";

// Cookies de sessão para validar na nova API
const COOKIES = "__AntiXsrfToken=46622318f76b46cf80b207c25aeb099a; COFRE.AUTH=694c45a4-31dc-47f7-bc25-0dffeb784c78";

// Função para enviar via API antiga (api.sieg.com)
async function editarCertificado(ufCertificado, tipoConsultaNfse) {
  const pfxBuffer = readFileSync(PFX_PATH);
  const pfxBase64 = pfxBuffer.toString("base64");
  const senha = readFileSync(SENHA_PATH, "utf8").trim();

  const body = {
    CertificadoId: CERTIFICATE_ID,
    Certificado: pfxBase64,
    SenhaCertificado: senha,
    TipoCertificado: "Pfx",
    ConsultaSat: false,
    ConsultaNfe: true,
    ConsultaCte: true,
    ConsultaNfse: true,
    ConsultaNfce: true,
    BaixarCancelados: true,
    ConsultaNoturna: true,
    ExcluirTransferenciaFiliais: false,
    UfCertificado: ufCertificado,
    TipoConsultaNfse: tipoConsultaNfse,
  };

  console.log(`\n>>> ENVIANDO via api.sieg.com:`);
  console.log(`    UfCertificado: "${ufCertificado}"`);
  console.log(`    TipoConsultaNfse: "${tipoConsultaNfse}"`);

  const url = `https://api.sieg.com/api/Certificado/Editar?api_key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`    Status: ${res.status}`);
  console.log(`    Resposta: ${text}`);
  return res.status === 200;
}

// Função para validar via nova API (app.sieg.com)
async function validarCertificado() {
  const url = `https://app.sieg.com/api/v1/modules/${CNPJ}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Cookie": COOKIES,
      "Accept": "application/json",
    },
  });

  if (res.status !== 200) {
    console.log(`    Erro na validação: Status ${res.status}`);
    return null;
  }

  const data = await res.json();
  return data;
}

async function testar() {
  console.log("=== TESTE: Enviar e Validar ===\n");

  // 1. Verificar estado atual
  console.log("--- ESTADO ATUAL (via app.sieg.com) ---");
  let dados = await validarCertificado();
  if (dados) {
    console.log(`    UfCertificado: "${dados.FiscalDocsConfig?.CertificateRequest?.UfCertificado}"`);
    console.log(`    TipoConsultaNfse: "${dados.FiscalDocsConfig?.CertificateRequest?.TipoConsultaNfse}"`);
  }

  // 2. Enviar com valores corretos
  console.log("\n--- ENVIANDO: UfCertificado='SE', TipoConsultaNfse='Nacional' ---");
  await editarCertificado("SE", "Nacional");

  // Aguardar propagação
  console.log("\n    Aguardando 3 segundos para propagação...");
  await new Promise(r => setTimeout(r, 3000));

  // 3. Validar o que foi salvo
  console.log("\n--- VALIDANDO (via app.sieg.com) ---");
  dados = await validarCertificado();
  if (dados) {
    const req = dados.FiscalDocsConfig?.CertificateRequest;
    console.log(`    UfCertificado: "${req?.UfCertificado}"`);
    console.log(`    TipoConsultaNfse: "${req?.TipoConsultaNfse}"`);
    console.log(`    ConsultaNoturna: ${req?.ConsultaNoturna}`);
    console.log(`    DiasRetroativos: ${req?.DiasRetroativos}`);
  }

  console.log("\n=== FIM DO TESTE ===");
}

testar().catch(console.error);
