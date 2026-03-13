/**
 * Teste: GET /admin/customer/:customerId/company/task
 * Mostra a estrutura da resposta para ver se contém ids de group_customer.
 */
require("dotenv").config();
require("dotenv").config({ path: require("path").resolve(__dirname, "..", "..", ".env") });
const axios = require("axios");

const JWT = process.env.JWT_GESTTA || process.env.GESTTA_JWT_TOKEN;
const CUSTOMER_ID = process.argv[2] || "60b678f9d7f461000622b98b";

if (!JWT) {
  console.error("Defina JWT_GESTTA ou GESTTA_JWT_TOKEN no .env");
  process.exit(1);
}

const client = axios.create({
  baseURL: "https://api.gestta.com.br",
  headers: {
    accept: "application/json, text/plain, */*",
    "accept-language": "pt-BR,pt;q=0.9",
    authorization: `JWT ${JWT}`,
    origin: "https://app.gestta.com.br",
    referer: "https://app.gestta.com.br/",
  },
});

async function main() {
  console.log("GET /admin/customer/" + CUSTOMER_ID + "/company/task\n");
  try {
    const { data, status } = await client.get(
      `/admin/customer/${CUSTOMER_ID}/company/task`
    );
    console.log("Status:", status);
    console.log("Tipo da resposta:", Array.isArray(data) ? "array" : typeof data);
    if (Array.isArray(data)) {
      console.log("Quantidade de itens:", data.length);
      if (data.length > 0) {
        console.log("\nChaves do primeiro item:", Object.keys(data[0]).sort().join(", "));
        console.log("\nPrimeiro item (amostra):");
        console.log(JSON.stringify(data[0], null, 2));
        if (data.length > 1) {
          console.log("\nSegundo item (amostra):");
          console.log(JSON.stringify(data[1], null, 2));
        }
      }
    } else {
      console.log("Resposta (amostra):", JSON.stringify(data, null, 2).slice(0, 2000));
    }
  } catch (err) {
    console.error("Erro:", err.response?.status, err.response?.data || err.message);
    process.exit(1);
  }
}

main();
