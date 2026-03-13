/**
 * Teste da nova API SIEG v1
 * Endpoint: https://app.sieg.com/api/v1/modules/{cnpj}
 */

import "dotenv/config";

const API_KEY = process.env.SIEG_API_KEY;
const CNPJ = "27939154000108";
const CERTIFICATE_ID = "33790-27939154000108";

// Body conforme novo formato da API
const body = {
  DigitalCertificateId: CERTIFICATE_ID,
  FiscalDocsConfig: {
    CertificateRequest: {
      ContainsIntegracaoEstadual: false,
      RemoveIntegracaoEstadual: false,
      IsEdit: false,
      Nome: "EXATAS CONTABILIDADE LTDA",
      ConsultaSat: false,
      ConsultaNfe: true,
      ConsultaCte: true,
      ConsultaNfse: true,
      ConsultaNfce: false,
      BaixarCancelados: true,
      ConsultaNoturna: true,
      ExcluirTransferenciaFiliais: false,
      UfCertificado: "SE",
      SenhaCertificado: "JPwGi4RO816On7eSIKNbxA==",
      TipoCertificado: "Pfx",
      TipoConsultaNfse: "Nacional",
      ConsultaRegiaoHorario: false,
      ServicoPrestador: false,
      ServicoTomador: false,
      DiasRetroativos: 30,
    },
  },
};

async function testarNovaApi() {
  console.log("=== Teste Completo SIEG APIs ===");
  console.log(`API Key: ${API_KEY}`);
  
  // 1. Verificar Swagger/documentação em diferentes locais
  console.log("\n=== Buscando documentação/Swagger ===");
  const swaggerUrls = [
    "https://app.sieg.com/swagger/ui/index",
    "https://app.sieg.com/swagger/v1/swagger.json",
    "https://app.sieg.com/api/swagger.json",
    "https://api.sieg.com/swagger/ui/index",
    "https://api.sieg.com/swagger/ui/index#!/Certificado",
  ];
  
  for (const url of swaggerUrls) {
    try {
      const res = await fetch(url);
      console.log(`[${url.split(".com")[1]}] ${res.status}`);
    } catch (err) {
      console.log(`[${url}] Erro`);
    }
  }
  
  // 2. Testar API antiga (que funciona)
  console.log("\n=== API Antiga (api.sieg.com) ===");
  console.log("Usando: api_key como query param + Authorization header");
  try {
    // URL correta: api_key como query parameter (conforme o cliente TypeScript faz)
    const url = `https://api.sieg.com/api/Certificado/ListarCertificados?api_key=${API_KEY}&active=true`;
    const res = await fetch(url, {
      headers: { 
        Authorization: API_KEY,
        "X-API-Key": API_KEY,
        Accept: "application/json",
      },
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.ok && Array.isArray(data)) {
      console.log(`✓ Encontrados ${data.length} certificado(s)`);
      data.slice(0, 3).forEach(c => console.log(`  - ID: ${c.Id}, Nome: ${c.Nome}`));
      if (data.length > 3) console.log(`  ... e mais ${data.length - 3}`);
    } else {
      console.log(`Resposta: ${JSON.stringify(data).slice(0, 200)}`);
    }
  } catch (err) {
    console.log(`Erro: ${err.message}`);
  }
  
  // 3. Testar nova API v1 com X-API-Key (conforme doc oficial)
  // Ref: https://integracoes.sieg.com/sistema-externo/docs/api-key
  console.log("\n=== Nova API com X-API-Key (conforme documentação) ===");
  const urlModules = "https://app.sieg.com/api/v1/modules";
  
  // Teste GET com CNPJ usando X-API-Key
  console.log("\n--- GET app.sieg.com/api/v1/modules/{cnpj} (X-API-Key) ---");
  try {
    const res = await fetch(`${urlModules}/${CNPJ}`, {
      headers: { "X-API-Key": API_KEY },
    });
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${(await res.text()).slice(0, 300)}`);
  } catch (err) {
    console.log(`Erro: ${err.message}`);
  }
  
  // Teste POST usando X-API-Key em app.sieg.com
  console.log("\n--- POST app.sieg.com/api/v1/modules (X-API-Key) ---");
  try {
    const res = await fetch(urlModules, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${(await res.text()).slice(0, 300)}`);
  } catch (err) {
    console.log(`Erro: ${err.message}`);
  }
  
  // Teste em api.sieg.com (base URL da documentação oficial)
  console.log("\n--- POST api.sieg.com/api/v1/modules (X-API-Key) ---");
  try {
    const res = await fetch("https://api.sieg.com/api/v1/modules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${(await res.text()).slice(0, 300)}`);
  } catch (err) {
    console.log(`Erro: ${err.message}`);
  }
  
  // Teste GET em api.sieg.com/api/v1/modules
  console.log("\n--- GET api.sieg.com/api/v1/modules/{cnpj} (X-API-Key) ---");
  try {
    const res = await fetch(`https://api.sieg.com/api/v1/modules/${CNPJ}`, {
      headers: { "X-API-Key": API_KEY },
    });
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${(await res.text()).slice(0, 300)}`);
  } catch (err) {
    console.log(`Erro: ${err.message}`);
  }
}

testarNovaApi();
