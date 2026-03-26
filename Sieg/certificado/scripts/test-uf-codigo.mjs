import "dotenv/config";
import { readFileSync } from "fs";

const API_KEY = process.env.SIEG_API_KEY;
const CERTIFICATE_ID = "33790-27939154000108";
const PFX_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\EXATAS CONTABILIDADE LTDA_27939154000108.pfx";
const SENHA_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\Senha.txt";

// Códigos IBGE das UFs
const UF_IBGE = {
  "AC": 12, "AL": 27, "AP": 16, "AM": 13, "BA": 29,
  "CE": 23, "DF": 53, "ES": 32, "GO": 52, "MA": 21,
  "MT": 51, "MS": 50, "MG": 31, "PA": 15, "PB": 25,
  "PR": 41, "PE": 26, "PI": 22, "RJ": 33, "RN": 24,
  "RS": 43, "RO": 11, "RR": 14, "SC": 42, "SP": 35,
  "SE": 28, "TO": 17
};

async function listarCertificado() {
  const url = `https://api.sieg.com/api/Certificado/ListarCertificados?api_key=${API_KEY}&active=true`;
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  const data = await res.json();
  return data.find(c => c.Id === CERTIFICATE_ID);
}

async function editarCertificado(ufCertificado) {
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
    TipoConsultaNfse: "Nacional",
  };

  console.log(`\n>>> Enviando UfCertificado: ${JSON.stringify(ufCertificado)} (tipo: ${typeof ufCertificado})`);

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
  console.log(`Status: ${res.status} - ${text}`);
  return res.status === 200;
}

async function testar() {
  console.log("=== TESTE: UfCertificado com código numérico IBGE ===\n");

  // Estado inicial
  console.log("--- ESTADO INICIAL ---");
  let cert = await listarCertificado();
  console.log(`UfCertificado: ${cert?.UfCertificado}`);

  // Teste 1: Enviar código numérico de SP (35)
  console.log("\n--- TESTE 1: Código numérico 35 (SP) ---");
  await editarCertificado(35);
  await new Promise(r => setTimeout(r, 2000));
  cert = await listarCertificado();
  console.log(`Resultado: UfCertificado = ${cert?.UfCertificado}`);

  // Teste 2: Enviar código numérico de SE (28)
  console.log("\n--- TESTE 2: Código numérico 28 (SE) ---");
  await editarCertificado(28);
  await new Promise(r => setTimeout(r, 2000));
  cert = await listarCertificado();
  console.log(`Resultado: UfCertificado = ${cert?.UfCertificado}`);

  // Teste 3: Enviar código como string "28"
  console.log("\n--- TESTE 3: Código como string '28' ---");
  await editarCertificado("28");
  await new Promise(r => setTimeout(r, 2000));
  cert = await listarCertificado();
  console.log(`Resultado: UfCertificado = ${cert?.UfCertificado}`);

  // Teste 4: Enviar sigla novamente para comparar
  console.log("\n--- TESTE 4: Sigla 'MA' para comparar ---");
  await editarCertificado("MA");
  await new Promise(r => setTimeout(r, 2000));
  cert = await listarCertificado();
  console.log(`Resultado: UfCertificado = ${cert?.UfCertificado}`);

  // Restaurar para SE
  console.log("\n--- RESTAURANDO para SE (código 28) ---");
  await editarCertificado(28);
  await new Promise(r => setTimeout(r, 2000));
  cert = await listarCertificado();
  console.log(`Estado final: UfCertificado = ${cert?.UfCertificado}`);
}

testar().catch(console.error);
