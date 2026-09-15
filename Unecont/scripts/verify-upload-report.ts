import * as XLSX from "xlsx";

const reportPath =
  "runtime/normalized/Unecont_2026-09-02_09-24-55/_meta/relatorio-upload.xlsx";
const wb = XLSX.readFile(reportPath);

console.log("=== Resumo ===");
console.log(XLSX.utils.sheet_to_json(wb.Sheets.Resumo!, { defval: "" }));

const items = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets.Itens!, {
  defval: "",
});
const byStatus = new Map<string, number>();
const byDept = new Map<string, number>();
let withTicket = 0;
let withoutRequester = 0;
for (const row of items) {
  const status = String(row.STATUS ?? "");
  byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  const dept = String(row.DEPARTAMENTO ?? "");
  byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
  if (String(row.TICKET_ID ?? "").trim()) withTicket += 1;
  if (!String(row.ONVIO_REQUESTER_ID_RESOLVIDO ?? "").trim() && String(row.SOLICITANTE ?? "").trim()) {
    withoutRequester += 1;
  }
}

console.log("\n=== Contagens ===");
console.log({
  total: items.length,
  byStatus: Object.fromEntries(byStatus),
  byDept: Object.fromEntries(byDept),
  withTicket,
  withoutRequester,
});

const samples = items.filter((row) =>
  ["107", "108"].includes(String(row.CODIGO ?? "").replace(/^0+/, "")),
);
console.log("\n=== Amostra 107/108 ===");
console.log(
  samples.map((row) => ({
    codigo: row.CODIGO,
    dept: row.DEPARTAMENTO,
    ticket: row.TICKET_ID,
    requester: row.ONVIO_REQUESTER_ID_RESOLVIDO,
    anexos: row.QTD_ANEXOS,
    avisos: row.AVISOS,
  })),
);
