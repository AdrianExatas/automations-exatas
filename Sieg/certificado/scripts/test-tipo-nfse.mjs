import "dotenv/config";
import { readFileSync } from "fs";

const API_KEY = process.env.SIEG_API_KEY;
const CERTIFICATE_ID = "33790-27939154000108";
const PFX_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\EXATAS CONTABILIDADE LTDA_27939154000108.pfx";
const SENHA_PATH = "c:\\Users\\Exatas\\Documents\\GitHub\\SIEG\\SIEG_Certificado\\Senha.txt";

async function testarTipoConsultaNfse() {
  console.log("=== Teste TipoConsultaNfse ===\n");

  // Ler certificado e senha
  const pfxBuffer = readFileSync(PFX_PATH);
  const pfxBase64 = pfxBuffer.toString("base64");
  const senha = readFileSync(SENHA_PATH, "utf8").trim();
  
  console.log(`API Key: ${API_KEY}`);
  console.log(`Certificado: ${PFX_PATH}`);
  console.log(`PFX Base64 Length: ${pfxBase64.length}`);
  console.log(`Senha: ${senha}`);

  // Montar o body
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
    TipoConsultaNfse: "Nacional",  // <-- Testando aqui
    UfCertificado: "SE",
  };

  // Log do body (sem certificado para não poluir)
  const bodyLog = { ...body, Certificado: `[${pfxBase64.length} bytes em base64]` };
  console.log("\n=== Body a ser enviado ===");
  console.log(JSON.stringify(bodyLog, null, 2));

  // Enviar para API
  console.log("\n=== Enviando para API SIEG ===");
  const url = `https://api.sieg.com/api/Certificado/Editar?api_key=${API_KEY}`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });

    console.log(`Status: ${res.status}`);
    const text = await res.text();
    console.log(`Resposta: ${text}`);
    
    // Agora listar para ver como ficou
    console.log("\n=== Verificando resultado via ListarCertificados ===");
    const listUrl = `https://api.sieg.com/api/Certificado/ListarCertificados?api_key=${API_KEY}&active=true`;
    const listRes = await fetch(listUrl, {
      headers: { "X-API-Key": API_KEY },
    });
    
    const listData = await listRes.json();
    if (Array.isArray(listData)) {
      const cert = listData.find(c => c.Id === CERTIFICATE_ID || c.CnpjCpf === "27939154000108");
      if (cert) {
        console.log("\nCertificado encontrado:");
        console.log(JSON.stringify(cert, null, 2));
        console.log(`\n>>> TipoConsultaNfse retornado: "${cert.TipoConsultaNfse}"`);
      } else {
        console.log("Certificado não encontrado na listagem");
        console.log("Primeiros 3 certificados:", JSON.stringify(listData.slice(0, 3), null, 2));
      }
    } else {
      console.log("Resposta inesperada:", listData);
    }
    
  } catch (err) {
    console.error("Erro:", err.message);
  }
}

testarTipoConsultaNfse();
