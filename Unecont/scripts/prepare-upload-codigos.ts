import ExcelJS from "exceljs";
import fs from "node:fs";

async function main() {
  const dir = "runtime/normalized/Unecont_2026-09-02_09-24-55";
  const codes = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~"))
    .map((f) => {
      const m = f.match(/^(\d+)\s*-/);
      return m ? String(parseInt(m[1], 10)) : null;
    })
    .filter(Boolean) as string[];
  console.log("file_codes", codes.length);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(
    "assets/planilha/planilha-operacional-agosto-atualizada-corrigida.xlsx",
  );
  const ws = wb.worksheets[0]!;
  const header = (ws.getRow(1).values as unknown[]).slice(1).map(String);
  const codeIdx =
    header.findIndex((h) => /^c[oó]digo$/i.test(h.trim()) || /codigo/i.test(h)) + 1;
  const deptIdx = header.findIndex((h) => /departamento/i.test(h)) + 1;
  const clientIdx = header.findIndex((h) => /onvio_client_id/i.test(h)) + 1;
  const nomeIdx =
    header.findIndex((h) => /nome|raz[aã]o|empresa/i.test(h)) + 1;
  console.log({ codeIdx, deptIdx, clientIdx, nomeIdx });

  const byCode = new Map<string, { dept: string; client: string; nome: string }>();
  for (let n = 2; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    const codigo = String(row.getCell(codeIdx).value ?? "").trim();
    if (!codigo) continue;
    const norm = /^\d+$/.test(codigo) ? String(parseInt(codigo, 10)) : codigo;
    byCode.set(norm, {
      dept: String(row.getCell(deptIdx).value ?? ""),
      client: String(row.getCell(clientIdx).value ?? ""),
      nome: String(row.getCell(nomeIdx).value ?? ""),
    });
  }

  let fiscal = "";
  let contabil = "";
  for (const code of codes) {
    const info = byCode.get(code);
    if (!info) continue;
    const deptNorm = info.dept
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    if (!fiscal && deptNorm.includes("FISCAL")) fiscal = code;
    if (!contabil && deptNorm.includes("CONTABIL")) contabil = code;
    if (fiscal && contabil) break;
  }

  console.log(
    JSON.stringify(
      {
        sampleFiscal: fiscal,
        sampleContabil: contabil,
        fiscalInfo: byCode.get(fiscal),
        contabilInfo: byCode.get(contabil),
      },
      null,
      2,
    ),
  );
  fs.mkdirSync("runtime", { recursive: true });
  fs.writeFileSync("runtime/codigos-upload-agosto.txt", codes.join(","));
  console.log("wrote runtime/codigos-upload-agosto.txt");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
