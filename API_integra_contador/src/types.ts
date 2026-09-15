export const OPERATION_PATHS = [
  "Apoiar",
  "Consultar",
  "Declarar",
  "Emitir",
  "Monitorar",
] as const;

export type OperationPath = (typeof OPERATION_PATHS)[number];
export type SourceStatus = "fetched" | "stale" | "missing" | "removed";
export type IssueSeverity = "info" | "warning" | "error";

export interface SourceInfo {
  url: string;
  relatedUrls: string[];
  updatedAt: string | null;
  retrievedAt: string;
  hash: string;
  status: SourceStatus;
}

export interface DocumentationIssue {
  code: string;
  severity: IssueSeverity;
  field: string | null;
  officialValue: unknown;
  normalizedValue: unknown;
  note: string;
  sourceUrl: string;
}

export interface FieldDefinition {
  section: string;
  name: string;
  description: string | null;
  typeRaw: string | null;
  requiredRaw: string | null;
  domainRaw: string | null;
}

export interface ServiceExample {
  kind: "request" | "response" | "curl" | "other";
  official: string;
  normalized: string | null;
  validJson: boolean | null;
  sourceUrl: string;
}

export interface ReferenceLink {
  title: string;
  sourceUrl: string;
  localPath: string;
}

export interface ServiceRecord {
  key: string;
  title: string;
  summary: string | null;
  family: string;
  systemId: string;
  serviceId: string;
  version: string | null;
  operationPath: OperationPath | null;
  status: string | null;
  billable: boolean | null;
  procuration: {
    required: boolean | null;
    codes: string[];
    name: string | null;
  };
  request: FieldDefinition[];
  response: FieldDefinition[];
  examples: ServiceExample[];
  messages: ReferenceLink[];
  limits: ReferenceLink[];
  domains: ReferenceLink[];
  source: SourceInfo;
  issues: DocumentationIssue[];
}

export interface ManifestEntry {
  url: string;
  title: string;
  kind: string;
  localPath: string;
  updatedAt: string | null;
  retrievedAt: string;
  hash: string;
  status: SourceStatus;
  error?: string;
}

export interface SourceManifest {
  schemaVersion: 1;
  sourceRoot: string;
  centralHelpUrl: string;
  retrievedAt: string;
  counts: {
    discoveredPages: number;
    apiCenterPages: number;
    centralHelpPages: number;
    fetchedPages: number;
    stalePages: number;
    missingPages: number;
    removedPages: number;
    serviceContractPages: number;
    logicalServices: number;
    catalogEntries: number;
    unmappedCatalogEntries: number;
    trialScenarios: number;
    families: number;
  };
  pages: ManifestEntry[];
}

export interface ParsedTable {
  section: string;
  headers: string[];
  rows: string[][];
}

export interface ParsedPage {
  url: string;
  relativeUrl: string;
  title: string;
  summary: string | null;
  updatedAt: string | null;
  semanticText: string;
  markdown: string;
  tables: ParsedTable[];
  codeBlocks: Array<{ section: string; code: string }>;
  links: Array<{ title: string; url: string }>;
  hash: string;
}
