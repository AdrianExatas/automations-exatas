import "dotenv/config";
import { readFileSync } from "fs";

const API_KEY = process.env.SIEG_API_KEY;
const CERTIFICATE_ID = "33790-27939154000108";
const PFX_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\EXATAS CONTABILIDADE LTDA_27939154000108.pfx";
const SENHA_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\Senha.txt";

async function listarCertificado() {
  const url = `https://api.sieg.com/api/Certificado/ListarCertificados?api_key=${API_KEY}&active=true`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  const data = await res.json();
  return data.find(c => c.Id === CERTIFICATE_ID);
}

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

  console.log(`\n>>> Enviando: UfCertificado="${ufCertificado}", TipoConsultaNfse="${tipoConsultaNfse}"`);

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
  console.log(`Status: ${res.status}`);
  console.log(`Resposta: ${text}`);
  return text;
}

async function testar() {
  console.log("=== TESTE: Verificar alteração de UfCertificado e TipoConsultaNfse ===\n");

  // 1. Estado inicial
  console.log("--- ESTADO INICIAL ---");
  let cert = await listarCertificado();
  console.log("UfCertificado:", cert?.UfCertificado);
  console.log("TipoConsultaNfse:", cert?.TipoConsultaNfse);
  console.log("Certificado completo:", JSON.stringify(cert, null, 2));

  // 2. Alterar para SP e Municipal
  console.log("\n--- TESTE 1: Alterar para SP + Municipal ---");
  await editarCertificado("SP", "Municipal");
  
  // Aguardar um pouco
  await new Promise(r => setTimeout(r, 2000));
  
  cert = await listarCertificado();
  console.log("Após alteração:");
  console.log("  UfCertificado:", cert?.UfCertificado);
  console.log("  TipoConsultaNfse:", cert?.TipoConsultaNfse);

  // 3. Alterar para SE e Nacional
  console.log("\n--- TESTE 2: Alterar para SE + Nacional ---");
  await editarCertificado("SE", "Nacional");
  
  await new Promise(r => setTimeout(r, 2000));
  
  cert = await listarCertificado();
  console.log("Após alteração:");
  console.log("  UfCertificado:", cert?.UfCertificado);
  console.log("  TipoConsultaNfse:", cert?.TipoConsultaNfse);

  // 4. Alterar para MA
  console.log("\n--- TESTE 3: Alterar para MA ---");
  await editarCertificado("MA", "Nacional");
  
  await new Promise(r => setTimeout(r, 2000));
  
  cert = await listarCertificado();
  console.log("Após alteração:");
  console.log("  UfCertificado:", cert?.UfCertificado);
  console.log("  TipoConsultaNfse:", cert?.TipoConsultaNfse);

  // 5. Voltar para SE (estado do certificado real)
  console.log("\n--- RESTAURANDO: Voltar para SE + Nacional ---");
  await editarCertificado("SE", "Nacional");
  
  await new Promise(r => setTimeout(r, 2000));
  
  cert = await listarCertificado();
  console.log("Estado final:");
  console.log("  UfCertificado:", cert?.UfCertificado);
  console.log("  TipoConsultaNfse:", cert?.TipoConsultaNfse);
  console.log("\nCertificado completo:", JSON.stringify(cert, null, 2));
}

testar().catch(console.error);
