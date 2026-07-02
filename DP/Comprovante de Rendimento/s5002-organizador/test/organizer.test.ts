import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { zipSync } from "fflate";
import * as XLSX from "xlsx";
import { outputXmlName, sanitizePathPart } from "../src/paths";
import { runS5002Organizer } from "../src/organizer";
import { isSupportedEventXmlEntry, parseEventMetadata } from "../src/xml";

const encoder = new TextEncoder();

describe("xml eSocial", () => {
  test("filtra apenas XMLs S-5002 e S-2501", () => {
    expect(isSupportedEventXmlEntry("ID002.S-5002.xml")).toBe(true);
    expect(isSupportedEventXmlEntry("sub/PREFIXO.S-5002.XML")).toBe(true);
    expect(isSupportedEventXmlEntry("ID2501.S-2501.xml")).toBe(true);
    expect(isSupportedEventXmlEntry("ID001.S-5001.xml")).toBe(false);
    expect(isSupportedEventXmlEntry("ID012.S-5012.xml")).toBe(false);
    expect(isSupportedEventXmlEntry("ID107.S-1200.xml")).toBe(false);
    expect(isSupportedEventXmlEntry("ID002.S-5002.txt")).toBe(false);
  });

  test("extrai CPF e periodo do S-5002 com namespaces do eSocial", () => {
    expect(parseEventMetadata(s5002Xml("08424015550", "2025-10"), "S-5002")).toEqual({
      eventType: "S-5002",
      cpf: "08424015550",
      period: "2025-10",
    });
  });

  test("extrai CPF e periodo de pagamento do S-2501", () => {
    expect(parseEventMetadata(s2501Xml(["08424015550"], "2025-12"), "S-2501")).toEqual({
      eventType: "S-2501",
      cpf: "08424015550",
      period: "2025-12",
    });
  });

  test("extrai CPF e periodo do S-2501 com layout evtPgtos", () => {
    expect(parseEventMetadata(s2501EvtPgtosXml("22233344455", "2025-12"), "S-2501")).toEqual({
      eventType: "S-2501",
      cpf: "22233344455",
      period: "2025-12",
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
      expect(result.eventXmlCount).toBe(5);
      expect(result.eventCounts).toEqual({ s5002: 5, s2501: 0 });
      expect(result.ignoredCount).toBe(2);
      expect(result.successCount).toBe(5);
      expect(result.errorCount).toBe(0);
      expect(result.entries).toHaveLength(5);

      const cpfDir = path.join(outputDir, "S-5002", "08424015550");
      const files = await readdir(cpfDir);
      expect(files.sort()).toEqual(["2025-10-ID0020001.S-5002 (2).xml", "2025-10-ID0020001.S-5002.xml"]);
      const cpfEntries = result.entries.filter((entry) => entry.cpf === "08424015550");
      const uniqueOutputPaths = new Set(cpfEntries.map((entry) => entry.outputPath));
      expect(cpfEntries).toHaveLength(4);
      expect(uniqueOutputPaths.size).toBe(2);
      expect(await readFile(path.join(outputDir, "S-5002", "11122233344", "2025-11-ID0020002.S-5002.xml"), "utf8")).toContain("11122233344");

      const workbook = XLSX.readFile(result.excelPath);
      expect(workbook.SheetNames).toEqual(["Resumo", "Detalhes"]);
      const jsonReport = JSON.parse(await readFile(result.jsonPath, "utf8"));
      expect(jsonReport.successCount).toBe(5);
      expect(jsonReport.eventCounts).toEqual({ s5002: 5, s2501: 0 });
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  test("organiza S-5002 e S-2501 no mesmo ZIP e registra tipo no relatorio", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s5002-s2501-organizador-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID0020001.S-5002.xml": s5002Xml("08424015550", "2025-10"),
        "ID25010001.S-2501.xml": s2501Xml(["11122233344"], "2025-12"),
        "ID107.S-1200.xml": "<xml />",
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.eventXmlCount).toBe(2);
      expect(result.eventCounts).toEqual({ s5002: 1, s2501: 1 });
      expect(result.ignoredCount).toBe(1);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.entries.map((entry) => entry.eventType).sort()).toEqual(["S-2501", "S-5002"]);
      expect(await readFile(path.join(outputDir, "S-2501", "11122233344", "2025-12-ID25010001.S-2501.xml"), "utf8")).toContain("11122233344");

      const jsonReport = JSON.parse(await readFile(result.jsonPath, "utf8"));
      expect(jsonReport.eventXmlCount).toBe(2);
      expect(jsonReport.entries[1].eventType).toBe("S-2501");

      const workbook = XLSX.readFile(result.excelPath);
      const detailRows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Detalhes"]!);
      expect(detailRows.map((row) => row.Evento).sort()).toEqual(["S-2501", "S-5002"]);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  test("organiza S-2501 com layout evtPgtos usando cpfBenef e perApur", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s2501-evtpgtos-organizador-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID1074799980000002025111817441600021.S-2501.xml": s2501EvtPgtosXml("22233344455", "2025-12"),
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.entries[0]?.eventType).toBe("S-2501");
      expect(result.entries[0]?.cpf).toBe("22233344455");
      expect(result.entries[0]?.perApur).toBe("2025-12");
      expect(
        await readFile(
          path.join(outputDir, "S-2501", "22233344455", "2025-12-ID1074799980000002025111817441600021.S-2501.xml"),
          "utf8",
        ),
      ).toContain("22233344455");

      const jsonReport = JSON.parse(await readFile(result.jsonPath, "utf8"));
      expect(jsonReport.entries[0].eventType).toBe("S-2501");
      expect(jsonReport.entries[0].cpf).toBe("22233344455");
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

  test("registra erro quando XML S-2501 nao tem CPF", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s2501-organizador-cpf-erro-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID25010001.S-2501.xml": s2501Xml([], "2025-12"),
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.entries[0]?.eventType).toBe("S-2501");
      expect(result.entries[0]?.errorCode).toBe("cpf_ausente");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  test("registra erro quando XML S-2501 nao tem periodo de pagamento", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s2501-organizador-periodo-erro-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID25010001.S-2501.xml": s2501Xml(["08424015550"], undefined),
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.entries[0]?.errorCode).toBe("periodo_ausente");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  test("registra erro quando XML S-2501 tem multiplos CPFs distintos", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s2501-organizador-multiplos-cpfs-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID25010001.S-2501.xml": s2501Xml(["08424015550", "11122233344"], "2025-12"),
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.entries[0]?.errorCode).toBe("multiplos_cpfs");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  test("aceita XML S-2501 com CPF repetido igual", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "s2501-organizador-cpf-repetido-"));
    const inputDir = path.join(temp, "entrada");
    const outputDir = path.join(temp, "saida");

    try {
      await mkdir(inputDir, { recursive: true });
      await writeZip(path.join(inputDir, "eventos.zip"), {
        "ID25010001.S-2501.xml": s2501Xml(["08424015550", "08424015550"], "2025-12"),
      });

      const result = await runS5002Organizer({ inputDir, outputDir });

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.entries[0]?.cpf).toBe("08424015550");
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

function s2501Xml(cpfs: string[], perApurPgto: string | undefined, marker = "original"): string {
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/download/retornoProcessamento/v1_0_0">
    <retornoProcessamentoDownload>
      <evento>
        <eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtContProc/v_S_01_03_00">
          <evtContProc Id="ID2501">
            <marcador>${marker}</marcador>
            <ideProc>
              <nrProcTrab>0000000-00.2025.5.00.0000</nrProcTrab>
              ${perApurPgto === undefined ? "" : `<perApurPgto>${perApurPgto}</perApurPgto>`}
            </ideProc>
            ${cpfs.map((cpf) => `<ideTrab><cpfTrab>${cpf}</cpfTrab><calcTrib><perRef>2025-11</perRef></calcTrib></ideTrab>`).join("")}
          </evtContProc>
        </eSocial>
      </evento>
    </retornoProcessamentoDownload>
  </eSocial>`;
}

function s2501EvtPgtosXml(cpf: string, perApur: string | undefined, marker = "original"): string {
  return `<eSocial xmlns="http://www.esocial.gov.br/schema/download/retornoProcessamento/v1_0_0">
    <retornoProcessamentoDownload>
      <evento>
        <eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtPgtos/v_S_01_03_00">
          <evtPgtos Id="ID2501">
            <marcador>${marker}</marcador>
            <ideEvento>
              <indRetif>1</indRetif>
              ${perApur === undefined ? "" : `<perApur>${perApur}</perApur>`}
            </ideEvento>
            <ideBenef>
              <cpfBenef>${cpf}</cpfBenef>
              <infoPgto>
                <dtPgto>2025-12-20</dtPgto>
                <perRef>2025-11</perRef>
              </infoPgto>
            </ideBenef>
          </evtPgtos>
        </eSocial>
      </evento>
    </retornoProcessamentoDownload>
  </eSocial>`;
}
