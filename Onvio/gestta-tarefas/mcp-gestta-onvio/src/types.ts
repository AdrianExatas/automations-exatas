export type Product = "gestta" | "onvio_gestao" | "onvio_portal" | "onvio_messenger" | "external";
export type CapabilityKind = "read" | "write";
export type CapabilityStatus = "verified" | "unavailable" | "policy_blocked" | "drifted";
export type CapabilityRisk = "read" | "write" | "destructive" | "financial" | "secret";
export type CapabilityTransport = "api" | "browser" | "informational";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface JsonSchema {
  type?: string;
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  enum?: Array<string | number | boolean | null>;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  format?: string;
  oneOf?: JsonSchema[];
}

export interface RequestDefinition {
  provider: "gestta" | "onvio";
  method: HttpMethod;
  path: string;
  readLike?: boolean;
  bodyMode?: "input" | "search" | "none";
  responseMode?: "json" | "binary";
  defaultInput?: Record<string, unknown>;
}

export interface CapabilityDefinition {
  operationId: string;
  title: string;
  description: string;
  product: Product;
  domain: string;
  kind: CapabilityKind;
  status: CapabilityStatus;
  risk: CapabilityRisk;
  idempotent: boolean;
  transport: CapabilityTransport;
  requiredPermissions?: string[];
  requiredLicenses?: string[];
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  request?: RequestDefinition;
  preflightOperationId?: string;
  unavailableReason?: string;
  evidence: {
    source: string;
    versions?: string[];
    verifiedAt: string;
  };
}

export interface RuntimeCapability extends CapabilityDefinition {
  available: boolean;
  availabilityReason?: string;
}

export interface CustomerRef {
  cnpj?: string;
  code?: string;
  gesttaId?: string;
  onvioId?: string;
}

export interface ResolvedCustomer {
  gesttaId?: string;
  onvioId?: string;
  cnpj?: string;
  code?: string;
  name?: string;
}

export interface PreparedChange {
  planId: string;
  confirmationToken: string;
  operationId: string;
  input: Record<string, unknown>;
  inputDigest: string;
  createdAt: string;
  expiresAt: string;
  summary: string;
  before?: unknown;
  beforeDigest?: string;
  after?: unknown;
  warnings: string[];
  used: boolean;
  idempotencyKey?: string;
}

export interface OperationResult {
  operationId: string;
  success: boolean;
  data?: unknown;
  summary: string;
  resourceLinks?: Array<{ uri: string; name: string; mimeType?: string }>;
}

export interface JobRecord {
  jobId: string;
  operationId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  progress: number;
  total?: number;
  result?: unknown;
  error?: string;
}

export interface Entitlements {
  gesttaPermissions: Set<string>;
  onvioLicenses: Set<string>;
  messengerActive: boolean;
  authenticated: boolean;
  loadError?: string;
}
