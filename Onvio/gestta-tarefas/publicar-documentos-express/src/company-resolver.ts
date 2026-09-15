import { loadRuntimeAuthArtifact } from "./auth-artifact";
import { cnpjDigits, formatCnpj, formatCpf, isValidCnpj } from "./document-identity";
import type { CompanyReference, CompanyResolutionInput, CompanyResolver, IntegrationStatus } from "./types";

type FetchLike = typeof fetch;
type RecordValue = Record<string, unknown>;

function records(value: unknown): RecordValue[] {
  if (Array.isArray(value)) return value.filter((item): item is RecordValue => Boolean(item && typeof item === "object"));
  if (!value || typeof value !== "object") return [];
  const record = value as RecordValue;
  for (const key of ["docs", "data", "items", "results"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return records(nested);
    if (nested && typeof nested === "object") {
      const nestedItems = (nested as RecordValue).items;
      if (Array.isArray(nestedItems)) return records(nestedItems);
    }
  }
  return [];
}

async function responseJson(response: Response, operation: string): Promise<unknown> {
  if (!response.ok) throw new Error(`${operation} falhou (HTTP ${response.status}). Atualize o login e tente novamente.`);
  return response.json();
}

function customerDocumentDigits(item: RecordValue): string {
  return cnpjDigits(String(item.cnpj || item.cpf || ""));
}

/** Os 9 primeiros digitos do CPF identificam a pessoa; o Gestta pode guardar "Outro" com essa raiz. */
function cpfRoot(value: string): string {
  const digits = cnpjDigits(value);
  return digits.length >= 9 ? digits.slice(0, 9) : digits;
}

function identifierLabel(input: CompanyResolutionInput, target: string): string {
  if (input.identifierType === "cnpj_root") return `a raiz de CNPJ ${target}`;
  if (input.identifierType === "cpf") return `o CPF ${formatCpf(target)}`;
  return `o CNPJ ${formatCnpj(target)}`;
}

function matchesCpfDocument(official: string, cpfDigits: string): boolean {
  if (!official || cpfDigits.length !== 11) return false;
  if (official === cpfDigits) return true;
  return official.startsWith(cpfRoot(cpfDigits));
}

function documentsShareCpfRoot(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  const leftRoot = cpfRoot(left);
  const rightRoot = cpfRoot(right);
  return leftRoot.length === 9 && leftRoot === rightRoot;
}

function matchesIdentifier(item: RecordValue, input: CompanyResolutionInput, target: string): boolean {
  const official = customerDocumentDigits(item);
  if (input.identifierType === "cpf") return matchesCpfDocument(official, target);
  if (!isValidCnpj(official)) return false;
  if (input.identifierType === "cnpj_root") return official.startsWith(target);
  return official === target;
}

function toCompanyFields(gestta: RecordValue, onvio?: RecordValue, matchedCpf?: string): CompanyReference {
  const official = customerDocumentDigits(gestta);
  const cpfFromMatch = matchedCpf && cnpjDigits(matchedCpf).length === 11 ? formatCpf(matchedCpf) : undefined;
  return {
    id: String(gestta._id || ""),
    onvioId: String(gestta.external_id || "") || undefined,
    name: String(gestta.name || onvio?.name || ""),
    code: String(gestta.code || onvio?.code || "") || undefined,
    cnpj: official.length === 14 && isValidCnpj(official)
      ? formatCnpj(official)
      : official.length > 11
        ? official
        : undefined,
    cpf: official.length === 11 ? formatCpf(official) : cpfFromMatch,
  };
}

const READ_CAPABILITIES = {
  companyLookup: true,
  taskLookup: true,
  taskCompletion: false,
  portalPublication: false,
  dueDateUpdate: false,
};

export class AuthenticatedCompanyResolver implements CompanyResolver {
  constructor(private readonly artifactPath: string, private readonly fetcher: FetchLike = fetch) {}

  status(): IntegrationStatus {
    return { available: true, mode: "verified", contractVersion: "company-lookup-v1", capabilities: READ_CAPABILITIES };
  }

  async findCompanies(input: CompanyResolutionInput): Promise<CompanyReference[]> {
    const matches = await this.findGesttaMatches(input);
    if (!matches.length) return [];
    const firmId = await this.firmId();
    const matchedCpf = input.identifierType === "cpf" ? cnpjDigits(input.identifierValue) : undefined;
    const companies: CompanyReference[] = [];
    for (const gestta of matches) {
      try {
        companies.push(await this.toCompanyReference(gestta, firmId, matchedCpf));
      } catch {
        // Filiais sem vinculo Onvio nao entram como opcao enviavel.
      }
    }
    return companies;
  }

  async resolveCompany(input: CompanyResolutionInput): Promise<CompanyReference> {
    if (input.preferredCompanyId) {
      const preferred = (await this.findCompanies(input)).find((item) => item.id === input.preferredCompanyId);
      if (!preferred) throw new Error("A empresa selecionada nao corresponde mais ao identificador do PDF.");
      return preferred;
    }
    const matches = await this.findGesttaMatches(input);
    const target = cnpjDigits(input.identifierValue);
    if (matches.length === 0) throw new Error(`Nenhum cliente ativo foi encontrado no Gestta para ${identifierLabel(input, target)}.`);
    if (matches.length > 1) throw new Error(`Mais de um cliente ativo foi encontrado no Gestta para ${identifierLabel(input, target)}.`);
    const matchedCpf = input.identifierType === "cpf" ? target : undefined;
    return this.toCompanyReference(matches[0], await this.firmId(), matchedCpf);
  }

  private async findGesttaMatches(input: CompanyResolutionInput): Promise<RecordValue[]> {
    const artifact = loadRuntimeAuthArtifact(this.artifactPath);
    if (!artifact) throw new Error("Login nao encontrado. Autentique novamente.");
    const target = cnpjDigits(input.identifierValue);
    if (input.identifierType === "cnpj_root" && target.length !== 8) {
      throw new Error("A raiz do CNPJ identificada no PDF e invalida.");
    }
    if (input.identifierType === "cpf" && target.length !== 11) {
      throw new Error("O CPF identificado no PDF e invalido.");
    }
    const gesttaMatches: RecordValue[] = [];
    let page = 1;
    let pages = 1;

    do {
      const url = new URL("https://api.gestta.com.br/admin/customer");
      url.search = new URLSearchParams({ active: "true", limit: "500", page: String(page), search: "" }).toString();
      const response = await this.fetcher(url, {
        headers: { Authorization: `JWT ${artifact.gestta.jwt}`, Origin: "https://app.gestta.com.br", Referer: "https://app.gestta.com.br/" },
        signal: AbortSignal.timeout(30_000),
      });
      const payload = await responseJson(response, "Consulta de empresa no Gestta") as RecordValue;
      gesttaMatches.push(...records(payload).filter((item) => matchesIdentifier(item, input, target)));
      pages = Number(payload.pages || 1);
      page += 1;
    } while (page <= pages);

    return gesttaMatches;
  }

  private async firmId(): Promise<string> {
    const artifact = loadRuntimeAuthArtifact(this.artifactPath);
    if (!artifact) throw new Error("Login nao encontrado. Autentique novamente.");
    const accountsResponse = await this.fetcher("https://onvio.com.br/api/profiles/v1/accounts?active=true&hideNonOnvio=true", {
      headers: { Authorization: `UDSLongToken ${artifact.onvio.udsLongToken}`, Referer: "https://onvio.com.br/staff/" },
      signal: AbortSignal.timeout(30_000),
    });
    const accounts = await responseJson(accountsResponse, "Consulta do escritorio no Onvio");
    const firmIds = records(accounts).map((item) => String(item.companyId || "")).filter(Boolean);
    if (firmIds.length !== 1) throw new Error("Nao foi possivel identificar de forma unica o escritorio Onvio.");
    return firmIds[0];
  }

  private async toCompanyReference(gestta: RecordValue, firmId: string, matchedCpf?: string): Promise<CompanyReference> {
    const artifact = loadRuntimeAuthArtifact(this.artifactPath);
    if (!artifact) throw new Error("Login nao encontrado. Autentique novamente.");
    const official = customerDocumentDigits(gestta);
    const gesttaId = String(gestta._id || "");
    const onvioId = String(gestta.external_id || "");
    if (!gesttaId) throw new Error("O cliente encontrado no Gestta nao possui identificador oficial.");
    if (!onvioId) throw new Error("A empresa foi encontrada no Gestta, mas nao possui vinculo com o Onvio.");

    const onvioResponse = await this.fetcher(`https://onvio.com.br/api/core/v3/companies/${encodeURIComponent(firmId)}/clients/search`, {
      method: "POST",
      headers: {
        Authorization: `UDSLongToken ${artifact.onvio.udsLongToken}`,
        Referer: "https://onvio.com.br/staff/",
        "Content-Type": "application/json",
        "x-company-id": firmId,
      },
      body: JSON.stringify({
        filterSearchSort: { orderBy: "name asc", search: String(gestta.name || ""), searchBy: null, filter: null },
        pagingDataRequest: { startIndex: null, pageIndex: 1, itemsPerPage: 100 },
        expand: "primaryContactExpanded",
        frp: "Onvio.StaffStorage",
        excludeCount: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const onvioMatches = records(await responseJson(onvioResponse, "Consulta do vinculo no Onvio"))
      .filter((item) => String(item.id || "") === onvioId);
    if (onvioMatches.length !== 1) throw new Error("O vinculo Gestta/Onvio nao foi encontrado de forma unica.");
    const onvio = onvioMatches[0];
    const onvioDocument = cnpjDigits(String(onvio.taxIdentification || onvio.cnpj || onvio.cpf || ""));
    if (onvioDocument && onvioDocument !== official) {
      const linkedByCpfRoot = Boolean(matchedCpf)
        && matchesCpfDocument(official, matchedCpf!)
        && (matchesCpfDocument(onvioDocument, matchedCpf!) || documentsShareCpfRoot(official, onvioDocument));
      if (!linkedByCpfRoot) {
        throw new Error("O vinculo Gestta/Onvio aponta para um CNPJ diferente.");
      }
    }

    return toCompanyFields(gestta, onvio, matchedCpf);
  }
}

function demoCompany(input: CompanyResolutionInput): CompanyReference {
  const digits = cnpjDigits(input.identifierValue);
  if (input.identifierType === "cpf") {
    return {
      id: `demo-company-${digits}`,
      onvioId: "demo-onvio",
      name: input.extractedCompanyName || "Empregador Demonstracao",
      code: "1001",
      cpf: formatCpf(digits),
    };
  }
  const cnpj = input.identifierType === "cnpj_root" ? `${digits}000131` : digits;
  return {
    id: `demo-company-${digits}`,
    onvioId: "demo-onvio",
    name: input.extractedCompanyName || "Empresa Demonstracao Ltda",
    code: "1001",
    cnpj: formatCnpj(cnpj),
  };
}

export class DemoCompanyResolver implements CompanyResolver {
  status(): IntegrationStatus {
    return { available: true, mode: "demo", contractVersion: "demo-v2", capabilities: {
      companyLookup: true, taskLookup: true, taskCompletion: true, portalPublication: true, dueDateUpdate: true,
    } };
  }

  async findCompanies(input: CompanyResolutionInput): Promise<CompanyReference[]> {
    return [demoCompany(input)];
  }

  async resolveCompany(input: CompanyResolutionInput): Promise<CompanyReference> {
    const matches = await this.findCompanies(input);
    if (input.preferredCompanyId) {
      const preferred = matches.find((item) => item.id === input.preferredCompanyId);
      if (!preferred) throw new Error("A empresa selecionada nao corresponde mais ao identificador do PDF.");
      return preferred;
    }
    return matches[0];
  }
}

export class UnavailableCompanyResolver implements CompanyResolver {
  status(): IntegrationStatus {
    return { available: false, mode: "unavailable", reason: "Login ou contrato de consulta de empresa indisponivel." };
  }
  async findCompanies(): Promise<CompanyReference[]> {
    throw new Error(this.status().reason);
  }
  async resolveCompany(): Promise<CompanyReference> {
    throw new Error(this.status().reason);
  }
}

export function createCompanyResolver(artifactPath?: string): CompanyResolver {
  if (process.env.EXPRESS_DOCUMENTS_DEMO === "1") return new DemoCompanyResolver();
  return artifactPath ? new AuthenticatedCompanyResolver(artifactPath) : new UnavailableCompanyResolver();
}
