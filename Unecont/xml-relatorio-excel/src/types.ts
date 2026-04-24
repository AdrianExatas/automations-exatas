export type SupportedSchema = "ABRASF-2.x" | "NFSe-Nacional-1.01";

export interface ParsedNfseDocument {
  sourceFile: string;
  sourcePath: string;
  schema: SupportedSchema;
  numero: string;
  codigoVerificacao: string;
  competencia: string;
  emissao: string;
  prestadorNome: string;
  prestadorDocumento: string;
  prestadorInscricaoMunicipal: string;
  prestadorMunicipioCodigo: string;
  prestadorUf: string;
  tomadorNome: string;
  tomadorDocumento: string;
  tomadorMunicipioCodigo: string;
  tomadorUf: string;
  regimeTributario: string;
  servicoFederalCodigo: string;
  servicoMunicipalCodigo: string;
  descricaoServicoXml: string;
  valorNfe: number;
  baseCalculoIss: number;
  valorLiquido: number;
  warnings: string[];
}

export interface CanonicalNfseRow {
  sourceFile: string;
  sourcePath: string;
  schema: SupportedSchema;
  cnpjEmpresa: string;
  empresa: string;
  municipioTomador: string;
  conferido: string;
  numeroNfe: string;
  codigoVerificador: string;
  dataCompetencia: string;
  emissaoNfe: string;
  cancelamento: string;
  prestador: string;
  cnpjCpfPrestador: string;
  ccmImPrestador: string;
  municipioPrestador: string;
  regimeTributario: string;
  cnae: string;
  cnaeDescricao: string;
  valorNfe: number;
  servicoFederal: string;
  servicoMunicipal: string;
  descricaoDoServico: string;
  qualServicoContrato: string;
  servicoDentroMunicipio: string;
  baseCalculoIss: number;
  valorLiquido: number;
  linkParaNfse: string;
  warnings: string[];
}

export interface ConversionItemResult {
  file: string;
  schema: SupportedSchema | "unknown";
  status: "converted" | "skipped";
  message?: string;
  warnings: string[];
}

export interface ConversionSummary {
  totalFiles: number;
  convertedFiles: number;
  skippedFiles: number;
  warningCount: number;
  errorCount: number;
}

export interface ConversionResult {
  outputFile: string;
  errorReportFile: string;
  summary: ConversionSummary;
  items: ConversionItemResult[];
}

export interface ConvertNfseXmlDirectoryOptions {
  inputDir: string;
  outputFile?: string;
  errorReportFile?: string;
  templatePath?: string;
  serviceMapPath?: string;
}

export interface ServiceMapLookupEntry {
  serviceDescription?: string;
  serviceDescriptionAmbiguous: boolean;
  cnae?: string;
  cnaeDescription?: string;
  cnaeAmbiguous: boolean;
}
