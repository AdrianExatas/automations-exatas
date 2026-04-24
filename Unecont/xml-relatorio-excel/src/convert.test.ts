import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { convertNfseXmlDirectory } from "./convert";
import { parseNfseDocument } from "./xml/parse-documents";

const TEMPLATE_PATH = path.resolve(__dirname, "../../assets/templates/report-layout-example.xlsx");
const SERVICE_MAP_PATH = path.resolve(__dirname, "../../assets/mappings/service-item-map.xlsx");
const FIXTURE_DIR = path.resolve(__dirname, "__fixtures__");

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "xml-relatorio-excel-"));
}

describe("parseNfseDocument", () => {
  it("interpreta XML ABRASF com UTF-8 preservado", () => {
    const parsed = parseNfseDocument(path.join(FIXTURE_DIR, "abrasf.xml"));
    expect(parsed.schema).toBe("ABRASF-2.x");
    expect(parsed.numero).toBe("12");
    expect(parsed.tomadorNome).toBe("FASITEC DESENVOLVIMENTO E TECNOLOGIA LTDA");
    expect(parsed.descricaoServicoXml).toContain("Prestação de Serviços");
  });

  it("interpreta XML NFSe Nacional", () => {
    const parsed = parseNfseDocument(path.join(FIXTURE_DIR, "nacional.xml"));
    expect(parsed.schema).toBe("NFSe-Nacional-1.01");
    expect(parsed.numero).toBe("30");
    expect(parsed.servicoFederalCodigo).toBe("170202");
    expect(parsed.descricaoServicoXml).toContain("competência de março de 2026");
  });
});

describe("convertNfseXmlDirectory", () => {
  it("gera planilha consolidada para lote misto e relatório parcial de erro", async () => {
    const tempDir = makeTempDir();
    const inputDir = path.join(tempDir, "input");
    fs.mkdirSync(inputDir, { recursive: true });

    fs.copyFileSync(path.join(FIXTURE_DIR, "abrasf.xml"), path.join(inputDir, "abrasf.xml"));
    fs.copyFileSync(path.join(FIXTURE_DIR, "nacional.xml"), path.join(inputDir, "nacional.xml"));
    fs.copyFileSync(path.join(FIXTURE_DIR, "invalid.xml"), path.join(inputDir, "invalid.xml"));

    const outputFile = path.join(tempDir, "saida", "relatorio.xlsx");
    const errorReportFile = path.join(tempDir, "saida", "relatorio.json");

    const result = await convertNfseXmlDirectory({
      inputDir,
      outputFile,
      errorReportFile,
      templatePath: TEMPLATE_PATH,
      serviceMapPath: SERVICE_MAP_PATH,
    });

    expect(result.summary.totalFiles).toBe(3);
    expect(result.summary.convertedFiles).toBe(2);
    expect(result.summary.skippedFiles).toBe(1);
    expect(result.summary.errorCount).toBe(1);
    expect(fs.existsSync(outputFile)).toBe(true);
    expect(fs.existsSync(errorReportFile)).toBe(true);

    const report = JSON.parse(fs.readFileSync(errorReportFile, "utf8"));
    expect(report.summary.convertedFiles).toBe(2);
    expect(
      report.items.some(
        (item: { file: string; status: string }) =>
          item.file === "invalid.xml" && item.status === "skipped",
      ),
    ).toBe(true);

    const workbook = XLSX.readFile(outputFile, { raw: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as Array<
      Record<string, string>
    >;

    expect(rows).toHaveLength(2);
    expect(rows[0]["Cnpj Empresa"]).toBe("00.483.195/0001-78");
    expect(rows[0]["DESCRIÇÃO DO SERVIÇO"]).toContain("Propaganda e publicidade");
    expect(rows[0]["Serviço Federal"]).toBe("17.06");
    expect(rows[0]["Município Prestador"]).toBe("Três Lagoas - MS");

    expect(rows[1]["Cnpj Empresa"]).toBe("00.483.195/0001-78");
    expect(rows[1]["DESCRIÇÃO DO SERVIÇO"]).toContain("Datilografia, digitação");
    expect(rows[1]["Serviço Federal"]).toBe("17.02");
    expect(rows[1]["Município Prestador"]).toBe("Aracaju - SE");
  });
});
