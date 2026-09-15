/**
 * Smoke test: cria 1 solicitacao (INOVAR / codigo 358) com PDF e tenta apagar.
 *
 * Uso (a partir de Onvio/solicitacoes-lote):
 *   bun run build
 *   bun run scripts/smoke-one-company.cjs
 *
 * Env opcional: ONVIO_UDS_TOKEN, SMOKE_CODIGO (default 358), SMOKE_SKIP_DELETE=1
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  deleteTicket,
  loadServiceRequestsFromExcel,
  sendServiceRequestsBatch,
} = require("@exatas/onvio-solicitacoes-servico");
const { buildBackupFromBatchResult } = require("../dist/backup");
const { buildIdentifierSupport } = require("../dist/onvio/load-identifiers");
const { writeRollbackReport } = require("../dist/report");
const { DEFAULT_ONVIO_FIRM_COMPANY_ID } = require("../dist/types");

function resolveDataDir() {
  return path.resolve(__dirname, "../data");
}

function resolveToken() {
  const fromEnv = process.env.ONVIO_UDS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const artifactCandidates = [
    path.resolve(__dirname, "../../../shared/onvio-auth/runtime/latest-auth.json"),
    path.resolve(process.cwd(), "../../shared/onvio-auth/runtime/latest-auth.json"),
  ];
  for (const artifactPath of artifactCandidates) {
    if (!fs.existsSync(artifactPath)) continue;
    const raw = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const fromOnvio = raw.onvio?.udsLongToken?.trim();
    if (fromOnvio) return fromOnvio;
    const cookie = raw.session?.storageState?.cookies?.find((item) => item.name === "UDSLongToken");
    if (cookie?.value?.trim()) return cookie.value.trim();
  }
  throw new Error("Token Onvio ausente. Defina ONVIO_UDS_TOKEN ou capture latest-auth.json.");
}

function findWorkbook(dataDir) {
  const preferred = path.join(dataDir, "PLANILHA DISPARO ONVIO_PROVEDORES.xlsx");
  if (fs.existsSync(preferred)) return preferred;
  const hit = fs
    .readdirSync(dataDir)
    .find((name) => name.toLowerCase().endsWith(".xlsx") && !name.startsWith("~$"));
  if (!hit) throw new Error(`Nenhuma planilha .xlsx em ${dataDir}`);
  return path.join(dataDir, hit);
}

function findPdf(dataDir) {
  const preferredNames = ["OPERAÇÃO COMODATO.pdf", "OPERACAO COMODATO.pdf"];
  for (const name of preferredNames) {
    const candidate = path.join(dataDir, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  const hit = fs.readdirSync(dataDir).find((name) => name.toLowerCase().endsWith(".pdf"));
  if (!hit) throw new Error(`Nenhum PDF em ${dataDir}`);
  return path.join(dataDir, hit);
}

async function main() {
  const dataDir = resolveDataDir();
  const codigo = String(process.env.SMOKE_CODIGO || "358").trim();
  const skipDelete = process.env.SMOKE_SKIP_DELETE === "1";
  const token = resolveToken();
  const workbook = findWorkbook(dataDir);
  const pdfPath = findPdf(dataDir);

  const allRows = loadServiceRequestsFromExcel(workbook);
  const row = allRows.find((item) => item.codigo === codigo);
  if (!row) {
    throw new Error(`Empresa codigo ${codigo} nao encontrada na planilha (${allRows.length} linhas).`);
  }

  console.log(`Empresa: ${row.codigo} - ${row.nome}`);
  console.log(`Assunto: ${row.assunto}`);
  console.log(`Anexo: ${path.basename(pdfPath)}`);
  console.log(`ClientId planilha: ${row.onvioClientId || "(resolver via API)"}`);
  console.log(`RequesterId planilha: ${row.onvioRequesterId || "(resolver via API)"}`);

  const identifiers = await buildIdentifierSupport(
    {
      token,
      firmCompanyId: process.env.ONVIO_FIRM_COMPANY_ID || DEFAULT_ONVIO_FIRM_COMPANY_ID,
      cookie: `UDSLongToken=${token}`,
    },
    [row],
  );

  const result = await sendServiceRequestsBatch({
    token,
    input: { serviceRequests: [row] },
    mode: "optional-attachments",
    attachmentStrategy: "explicit",
    validateAttachmentIdentity: false,
    extraAttachmentPaths: [pdfPath],
    identifierProvider: identifiers.identifierProvider,
    resolveRequesterId: identifiers.resolveRequesterId,
    defaults: {
      departmentName: row.departamento || undefined,
    },
    onProgress: (event) => {
      if (event.type === "item_done") {
        console.log(
          `Envio: ${event.outcome}${event.ticketId ? ` ticket=${event.ticketId}` : ""}${
            event.message ? ` (${event.message})` : ""
          }`,
        );
      }
    },
  });

  const item = result.items[0];
  if (!item || item.status !== "success" || !item.ticketId) {
    console.error("Falha no envio:", JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }

  const reportsDir = path.join(os.tmpdir(), "solicitacoes-lote-smoke");
  fs.mkdirSync(reportsDir, { recursive: true });
  const backup = buildBackupFromBatchResult(result, {
    planilhaPath: workbook,
    defaultDepartmentName: row.departamento,
  });
  const backupPath = path.join(reportsDir, `backup_smoke_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`Backup: ${backupPath}`);
  console.log(`Ticket criado: ${item.ticketId} (anexos=${item.attachmentCount ?? 0})`);

  if (skipDelete) {
    console.log("SMOKE_SKIP_DELETE=1 — exclusao nao executada.");
    return;
  }

  console.log("Tentando apagar ticket...");
  try {
    await deleteTicket(token, item.ticketId);
    const paths = writeRollbackReport(reportsDir, backupPath, backup, [
      {
        ticketId: item.ticketId,
        sucesso: true,
        mensagem: "Solicitacao apagada.",
        codigo: row.codigo,
        nome: row.nome,
      },
    ]);
    console.log(`DELETE OK. Relatorio: ${paths.xlsxPath}`);
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    writeRollbackReport(reportsDir, backupPath, backup, [
      {
        ticketId: item.ticketId,
        sucesso: false,
        mensagem,
        codigo: row.codigo,
        nome: row.nome,
      },
    ]);
    console.error(`DELETE FALHOU: ${mensagem}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
