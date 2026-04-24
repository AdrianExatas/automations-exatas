import fs from "node:fs";
import path from "node:path";
import { formatDownloadedReport } from "../../src/report-formatter";
import { writeRawWorkbook } from "./excel/raw-workbook";
import { loadServiceMap } from "./mappings/service-map";
import { resolveMunicipioDisplay } from "./mappings/municipios";
import type {
  CanonicalNfseRow,
  ConversionResult,
  ConvertNfseXmlDirectoryOptions,
  ParsedNfseDocument,
  ServiceMapLookupEntry,
} from "./types";
import {
  buildTimestampForFileName,
  formatDateToBrazilian,
  formatTaxId,
  normalizeServiceCode,
} from "./utils";
import { parseNfseDocument } from "./xml/parse-documents";

function getAppRoot(): string {
  return path.resolve(__dirname, "..");
}

function getDefaultTemplatePath(): string {
  return path.resolve(getAppRoot(), "../assets/templates/report-layout-example.xlsx");
}

function getDefaultServiceMapPath(): string {
  return path.resolve(getAppRoot(), "../assets/mappings/service-item-map.xlsx");
}

function getDefaultOutputFile(): string {
  return path.resolve(getAppRoot(), "saida", `relatorio-unecont-${buildTimestampForFileName()}.xlsx`);
}

function getDefaultErrorReportFile(outputFile: string): string {
  const extension = path.extname(outputFile);
  const basename = path.basename(outputFile, extension);
  return path.join(path.dirname(outputFile), `${basename}.json`);
}

function toCanonicalRow(
  document: ParsedNfseDocument,
  serviceMap: Map<string, ServiceMapLookupEntry>,
): CanonicalNfseRow {
  const servicoFederal = normalizeServiceCode(document.servicoFederalCodigo);
  const serviceLookup = serviceMap.get(servicoFederal);
  const warnings = [...document.warnings];

  if (!document.prestadorMunicipioCodigo) {
    warnings.push("Município do prestador ausente no XML.");
  }
  if (!document.tomadorMunicipioCodigo) {
    warnings.push("Município do tomador ausente no XML.");
  }

  let cnae = "";
  let cnaeDescricao = "";
  if (serviceLookup?.cnaeAmbiguous) {
    warnings.push(`CNAE ambíguo para o item ${servicoFederal}.`);
  } else if (serviceLookup?.cnae) {
    cnae = serviceLookup.cnae;
    cnaeDescricao = serviceLookup.cnaeDescription ?? "";
  }

  return {
    sourceFile: document.sourceFile,
    sourcePath: document.sourcePath,
    schema: document.schema,
    cnpjEmpresa: formatTaxId(document.tomadorDocumento),
    empresa: document.tomadorNome,
    municipioTomador: resolveMunicipioDisplay(document.tomadorMunicipioCodigo, document.tomadorUf),
    conferido: "Não",
    numeroNfe: document.numero,
    codigoVerificador: document.codigoVerificacao,
    dataCompetencia: formatDateToBrazilian(document.competencia),
    emissaoNfe: formatDateToBrazilian(document.emissao),
    cancelamento: "",
    prestador: document.prestadorNome,
    cnpjCpfPrestador: formatTaxId(document.prestadorDocumento),
    ccmImPrestador: document.prestadorInscricaoMunicipal,
    municipioPrestador: resolveMunicipioDisplay(
      document.prestadorMunicipioCodigo,
      document.prestadorUf,
    ),
    regimeTributario: document.regimeTributario,
    cnae,
    cnaeDescricao,
    valorNfe: document.valorNfe,
    servicoFederal,
    servicoMunicipal: document.servicoMunicipalCodigo,
    descricaoDoServico: "",
    qualServicoContrato: "",
    servicoDentroMunicipio:
      document.tomadorMunicipioCodigo &&
      document.prestadorMunicipioCodigo &&
      document.tomadorMunicipioCodigo === document.prestadorMunicipioCodigo
        ? "Dentro"
        : "Fora",
    baseCalculoIss: document.baseCalculoIss || document.valorNfe,
    valorLiquido: document.valorLiquido || document.valorNfe,
    linkParaNfse: "",
    warnings,
  };
}

function validateDocument(document: ParsedNfseDocument): void {
  const requiredFields: Array<[string, string]> = [
    ["numero", document.numero],
    ["competencia", document.competencia],
    ["emissao", document.emissao],
    ["prestadorNome", document.prestadorNome],
    ["prestadorDocumento", document.prestadorDocumento],
    ["tomadorNome", document.tomadorNome],
    ["tomadorDocumento", document.tomadorDocumento],
    ["servicoFederalCodigo", document.servicoFederalCodigo],
  ];

  const missing = requiredFields.filter(([, value]) => !value).map(([field]) => field);
  if (missing.length > 0) {
    throw new Error(`Campos mínimos ausentes: ${missing.join(", ")}`);
  }
  if (!Number.isFinite(document.valorNfe) || document.valorNfe <= 0) {
    throw new Error("Valor do serviço ausente ou inválido.");
  }
}

function parseFormatterWarningRowNumber(warning: string): number | null {
  const match = warning.match(/Linha (\d+)/i);
  if (!match) return null;
  return Number(match[1]);
}

export async function convertNfseXmlDirectory(
  options: ConvertNfseXmlDirectoryOptions,
): Promise<ConversionResult> {
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile ?? getDefaultOutputFile());
  const errorReportFile = path.resolve(options.errorReportFile ?? getDefaultErrorReportFile(outputFile));
  const templatePath = path.resolve(options.templatePath ?? getDefaultTemplatePath());
  const serviceMapPath = path.resolve(options.serviceMapPath ?? getDefaultServiceMapPath());

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Diretório de entrada não encontrado: ${inputDir}`);
  }

  const xmlFiles = fs
    .readdirSync(inputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xml"))
    .map((entry) => path.join(inputDir, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const serviceMap = loadServiceMap(serviceMapPath);
  const items: ConversionResult["items"] = [];
  const rows: CanonicalNfseRow[] = [];

  for (const xmlFile of xmlFiles) {
    try {
      const parsed = parseNfseDocument(xmlFile);
      validateDocument(parsed);
      const canonical = toCanonicalRow(parsed, serviceMap);
      rows.push(canonical);
      items.push({
        file: canonical.sourceFile,
        schema: canonical.schema,
        status: "converted",
        warnings: [...canonical.warnings],
      });
    } catch (error) {
      items.push({
        file: path.basename(xmlFile),
        schema: "unknown",
        status: "skipped",
        message: error instanceof Error ? error.message : String(error),
        warnings: [],
      });
    }
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.mkdirSync(path.dirname(errorReportFile), { recursive: true });

  if (rows.length > 0) {
    writeRawWorkbook(outputFile, rows);
    const formatterResult = await formatDownloadedReport(outputFile, {
      modelPath: templatePath,
      serviceMapPath,
      overwrite: true,
    });

    formatterResult.warnings.forEach((warning) => {
      const rowNumber = parseFormatterWarningRowNumber(warning);
      if (rowNumber == null) return;
      const row = rows[rowNumber - 2];
      if (!row) return;
      const item = items.find(
        (current) => current.file === row.sourceFile && current.status === "converted",
      );
      if (item) {
        item.warnings.push(warning);
      }
    });
  }

  const result: ConversionResult = {
    outputFile,
    errorReportFile,
    summary: {
      totalFiles: xmlFiles.length,
      convertedFiles: items.filter((item) => item.status === "converted").length,
      skippedFiles: items.filter((item) => item.status === "skipped").length,
      warningCount: items.reduce((total, item) => total + item.warnings.length, 0),
      errorCount: items.filter((item) => item.status === "skipped").length,
    },
    items,
  };

  fs.writeFileSync(errorReportFile, JSON.stringify(result, null, 2), "utf8");
  return result;
}
