import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { zipSync } from "fflate";
import * as XLSX from "xlsx";
import { outputXmlName, sanitizePathPart } from "../src/paths";
import { runS5002Organizer } from "../src/organizer";
import { isS5002XmlEntry, parseS5002Metadata } from "../src/xml";

const encoder = new TextEncoder();

describe("xml S-5002", () => {
  test("filtra apenas XMLs S-5002", () => {
    expect(isS5002XmlEntry("ID002.S-5002.xml")).toBe(true);
    expect(isS5002XmlEntry("sub/PREFIXO.S-5002.XML")).toBe(true);
    expect(isS5002XmlEntry("ID001.S-5001.xml")).toBe(false);
    expect(isS5002XmlEntry("ID012.S-5012.xml")).toBe(false);
    expect(isS5002XmlEntry("ID107.S-1200.xml")).toBe(false);
    expect(isS5002XmlEntry("ID002.S-5002.txt")).toBe(false);
  });

  test("extrai CPF e periodo com namespaces do eSocial", () => {
    expect(parseS5002Metadata(s5002Xml("08424015550", "2025-10"))).toEqual({
      cpfBenef: "08424015550",
      perApur: "2025-10",
    });
  });

  test("sanitiza nomes de caminhos Windows", () => {
    expect(sanitizePathPart('A/B:C*D?E"F<G>H| LTDA.')).toBe("A - B - C - D - E - F - G - H - LTDA");
  });

  test("prefixa nome do XML com competencia", () => {
    expect(outputXmlName("pasta/ID0020001.S-5002.xml", "2024-12")).toBe("2024-12-ID0020001.S-5002.xml");
  });
});

describe("organizador", () => {
  test("organiza XMLs por CPF com periodo no nome, sobrescreve copias exatas e preserva conflitos", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s5002-organizador-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID001.S-5001.xml": "<xml />",
        "pasta/ID0020001.S-5002.xml": s5002Xml("08424015550", "2025-10"),
        "outra/ID0020001.S-5002.xml": s5002Xml("08424015550", "2025-10"),
        "outro-nome/ID0029999.S-5002.xml": s5002Xml("08424015550", "2025-10"),
        "conflito/ID0020001.S-5002.xml": s5002Xml("08424015550", "2025-10", "conflito"),
        "ID0020002.S-5002.xml": s5002Xml("11122233344", "2025-11"),
        "ID012.S-5012.xml": "<xml />",
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.zipCount).toBe(1);
      expect(result.s5002Count).toBe(5);
      expect(result.ignoredCount).toBe(2);
      expect(result.successCount).toBe(5);
      expect(result.errorCount).toBe(0);
      expect(result.entries).toHaveLength(5);

      const cpfDir = path.join(outputDir, "08424015550");
      const files = await readdir(cpfDir);
      expect(files.sort()).toEqual(["2025-10-ID0020001.S-5002 (2).xml", "2025-10-ID0020001.S-5002.xml"]);
      const cpfEntries = result.entries.filter((entry) => entry.cpf === "08424015550");
      const uniqueOutputPaths = new Set(cpfEntries.map((entry) => entry.outputPath));
      expect(cpfEntries).toHaveLength(4);
      expect(uniqueOutputPaths.size).toBe(2);
      expect(await readFile(path.join(outputDir, "11122233344", "2025-11-ID0020002.S-5002.xml"), "utf8")).toContain("11122233344");

      const workbook = XLSX.readFile(result.excelPath);
      expect(workbook.SheetNames).toEqual(["Resumo", "Detalhes"]);
      expect(JSON.parse(await readFile(result.jsonPath, "utf8")).successCount).toBe(5);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  test("registra erro quando XML S-5002 nao tem CPF", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s5002-organizador-erro-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID0020001.S-5002.xml": s5002Xml("", "2025-10"),
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.entries[0]?.errorCode).toBe("cpf_ausente");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});

async function writeZip(filePath: string, files: Record<string, string>): Promise<void> {
  const zipped = zipSync(
    Object.fromEntries(Object.entries(files).map(([name, content]) => [name, encoder.encode(content)])),
    { level: 1 },
  );
  await Bun.write(filePath, zipped);
}

function s5002Xml(cpf: string, perApur: string, marker = "original"): string {
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/download/retornoProcessamento/v1_0_0">
    <retornoProcessamentoDownload>
      <evento>
        <eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtIrrfBenef/v_S_01_03_00">
          <evtIrrfBenef Id="ID002">
            <marcador>${marker}</marcador>
            <ideEvento>
              <nrRecArqBase>1.1.0000000000000001</nrRecArqBase>
              <perApur>${perApur}</perApur>
            </ideEvento>
            <ideTrabalhador>
              <cpfBenef>${cpf}</cpfBenef>
            </ideTrabalhador>
          </evtIrrfBenef>
        </eSocial>
      </evento>
    </retornoProcessamentoDownload>
  </eSocial>`;
}
