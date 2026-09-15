import crypto from "crypto";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { extractCompetences, extractFgtsCompositionCompetences, extractFgtsTagCompetences, extractLabeledDueDates } from "./date";
import { extractCnpjs, extractCompanyName, extractFgtsCompanyIdentifier, identifyDocumentKind, type DocumentKind } from "./document-identity";

export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export interface ExtractedPdf {
  text: string;
  pageCount?: number;
}

export interface PdfFileData extends ExtractedPdf {
  filePath: string;
  fileName: string;
  size: number;
  sha256: string;
  id: string;
  dueDateCandidates: string[];
  competence?: string;
  competenceCandidates: Array<{ value: string; source: string }>;
  cnpjCandidates: string[];
  validCnpjs: string[];
  invalidCnpjs: string[];
  extractedCompanyName?: string;
  extractedIdentifierType?: "cnpj" | "cnpj_root" | "cpf";
  extractedIdentifierValue?: string;
  unsupportedIdentifierType?: "caepf";
  invalidCompanyIdentifier?: boolean;
  documentKind?: DocumentKind;
}

export type PdfTextExtractor = (buffer: Buffer) => Promise<ExtractedPdf>;

export async function defaultPdfTextExtractor(buffer: Buffer): Promise<ExtractedPdf> {
  const parsed = await pdfParse(buffer);
  return { text: parsed.text || "", pageCount: parsed.numpages };
}

function ensurePdfHeader(buffer: Buffer): void {
  if (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("O arquivo nao possui uma estrutura PDF valida.");
  }
}

export async function readPdfFile(
  rawPath: string,
  extractText: PdfTextExtractor = defaultPdfTextExtractor,
): Promise<PdfFileData> {
  const filePath = path.resolve(rawPath);
  if (path.extname(filePath).toLowerCase() !== ".pdf") {
    throw new Error("Somente arquivos PDF sao aceitos.");
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error("O caminho selecionado nao e um arquivo.");
  if (stat.size === 0) throw new Error("O PDF esta vazio.");
  if (stat.size > MAX_PDF_BYTES) throw new Error("O PDF excede o limite de 25 MB.");

  const buffer = fs.readFileSync(filePath);
  ensurePdfHeader(buffer);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const id = crypto.createHash("sha256").update(`${sha256}\0${filePath.toLowerCase()}`).digest("hex").slice(0, 24);
  let extracted: ExtractedPdf;
  try {
    extracted = await extractText(buffer);
  } catch {
    throw new Error("Nao foi possivel ler o conteudo do PDF. O arquivo pode estar corrompido ou protegido.");
  }
  const text = extracted.text.replace(/\u0000/g, "").trim();
  if (text.length < 20) {
    throw new Error("O PDF nao possui texto pesquisavel suficiente. Revise o documento manualmente.");
  }
  const documentKind = identifyDocumentKind(text);
  const cnpjs = extractCnpjs(text);
  const isFgts = documentKind === "fgts_digital" || documentKind === "fgts_consignado";
  const fgtsIdentifier = isFgts ? extractFgtsCompanyIdentifier(text) : undefined;
  const competenceCandidates = [
    ...extractCompetences(text),
    ...(isFgts ? extractFgtsTagCompetences(text) : []),
    ...(isFgts ? extractFgtsCompositionCompetences(text) : []),
  ];
  const competenceValues = [...new Set(competenceCandidates.map((item) => item.value))];
  const fullCnpj = cnpjs.valid.length === 1 ? cnpjs.valid[0] : undefined;
  return {
    filePath,
    fileName: path.basename(filePath),
    size: stat.size,
    sha256,
    id,
    text,
    pageCount: extracted.pageCount,
    dueDateCandidates: extractLabeledDueDates(text),
    competence: competenceValues.length === 1 ? competenceValues[0] : undefined,
    competenceCandidates,
    cnpjCandidates: cnpjs.all,
    validCnpjs: cnpjs.valid,
    invalidCnpjs: cnpjs.invalid,
    extractedCompanyName: fgtsIdentifier?.companyName || extractCompanyName(text, fullCnpj),
    extractedIdentifierType: fgtsIdentifier?.type || (fullCnpj ? "cnpj" : undefined),
    extractedIdentifierValue: fgtsIdentifier?.value || fullCnpj,
    unsupportedIdentifierType: fgtsIdentifier?.unsupportedType,
    invalidCompanyIdentifier: fgtsIdentifier?.invalid,
    documentKind,
  };
}
