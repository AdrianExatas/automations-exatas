/**
 * Testa o fluxo de atualização: extrair CNPJ → listar → editar.
 * Uso: node scripts/test-atualizar.mjs [porta]
 * Requer servidor rodando (npm run server).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = parseInt(process.argv[2] ?? process.env.PORT ?? "3000", 10);
const BASE = `http://localhost:${PORT}`;

const PFX_PATH = join(ROOT, "EXATAS CONTABILIDADE LTDA_27939154000108.pfx");
const SENHA_PATH = join(ROOT, "Senha.txt");

async function main() {
  if (!existsSync(PFX_PATH)) {
    console.error("Arquivo PFX não encontrado:", PFX_PATH);
    process.exit(1);
  }
  if (!existsSync(SENHA_PATH)) {
    console.error("Arquivo Senha.txt não encontrado:", SENHA_PATH);
    process.exit(1);
  }

  const pfxBuffer = readFileSync(PFX_PATH);
  const senha = readFileSync(SENHA_PATH, "utf-8").trim();

  console.log("1. Extrair CNPJ do certificado...");
  const formExtrair = new FormData();
  formExtrair.append("certificado", new Blob([pfxBuffer], { type: "application/x-pkcs12" }), "cert.pfx");
  formExtrair.append("senha", senha);

  let res = await fetch(`${BASE}/api/certificado/extrair-cnpj`, { method: "POST", body: formExtrair });
  let data = await res.json();
  if (!data.success) {
    console.error("Extrair CNPJ falhou:", data.error || data.mensagem || res.status);
    process.exit(1);
  }
  const cnpj = data.data?.cnpj;
  if (!cnpj) {
    console.error("Extrair CNPJ: CNPJ não retornado.");
    process.exit(1);
  }
  console.log("   CNPJ extraído:", cnpj);

  console.log("2. Listar certificados na SIEG (por CNPJ)...");
  res = await fetch(`${BASE}/api/certificado/listar?cnpj=${encodeURIComponent(cnpj)}`);
  data = await res.json();
  if (!data.success) {
    console.error("Listar falhou:", data.message || data.mensagem);
    process.exit(1);
  }
  const lista = Array.isArray(data.data) ? data.data : [];
  const cert = lista.find((c) => (c.CnpjCpf || "").replace(/\D/g, "") === cnpj.replace(/\D/g, ""));
  if (!cert) {
    console.error("Certificado não encontrado na SIEG para CNPJ:", cnpj);
    process.exit(1);
  }
  const certificadoId = cert.Id || cert.CertificadoId;
  console.log("   ID na SIEG:", certificadoId, "-", cert.Nome);

  console.log("3. Atualizar certificado (Editar) com UF Sergipe (SE)...");
  const formEditar = new FormData();
  formEditar.append("certificadoId", certificadoId);
  formEditar.append("certificado", new Blob([pfxBuffer], { type: "application/x-pkcs12" }), "cert.pfx");
  formEditar.append("senha", senha);
  formEditar.append("uf", "SE");

  res = await fetch(`${BASE}/api/certificado/editar`, { method: "POST", body: formEditar });
  data = await res.json();
  if (data.success) {
    console.log("   Sucesso:", data.message || data.mensagem);
  } else {
    console.error("   Erro:", data.message || data.mensagem);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
