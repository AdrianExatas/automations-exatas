/**
 * Identity checks so Unecont reports are never attributed to the wrong company.
 * Matching uses distinctive name tokens in the Unecont filename segment, not the
 * planilha CODIGO prefix (which can be stamped onto a stale download).
 */

const STOP_WORDS = new Set([
  "ltda",
  "me",
  "epp",
  "eireli",
  "sa",
  "ss",
  "unecont",
  "tomados",
  "tomado",
  "servicos",
  "servico",
  "comercio",
  "industria",
  "empresarial",
  "empresa",
  "relatorio",
  "excel",
  "xlsx",
  "pdf",
]);

export function normalizeIdentityText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function identityTokens(value: string, minLength = 4): string[] {
  return normalizeIdentityText(value)
    .split(" ")
    .filter((token) => token.length >= minLength && !STOP_WORDS.has(token));
}

/** Extracts the Unecont trade-name segment from a download filename. */
export function extractUnecontTradeName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/i, "");
  const match = base.match(
    /(?:^|\s)-\s*UneCont\s*-\s*Tomados\s*-\s*(.+?)(?:\s*-\s*\d{2}_\d{2}_\d{4})/i,
  );
  if (match?.[1]) return match[1].trim();

  // Fallback: strip leading "CODIGO -" if present
  return base.replace(/^\d+\s*-\s*/i, "").trim();
}

export function digitsOnly(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeEmpresaCodigo(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return /^\d+$/.test(trimmed) ? String(parseInt(trimmed, 10)) : trimmed;
}

export interface EmpresaFileIdentityMatch {
  ok: boolean;
  reason: string;
  empresaTokens: string[];
  fileTokens: string[];
  tradeName: string;
}

/**
 * Returns true when the Unecont filename trade-name shares identity with the
 * expected company name (token overlap, truncated Unecont prefix, or short names).
 */
export function matchEmpresaFileIdentity(
  fileName: string,
  empresaNome: string,
): EmpresaFileIdentityMatch {
  const tradeName = extractUnecontTradeName(fileName);
  const empresaTokens = identityTokens(empresaNome);
  const fileTokens = identityTokens(tradeName);
  const tradeNorm = normalizeIdentityText(tradeName);
  const empresaNorm = normalizeIdentityText(empresaNome);

  if (!tradeNorm || !empresaNorm) {
    return {
      ok: false,
      reason: "Empresa ou arquivo sem nome utilizavel; recusa por seguranca.",
      empresaTokens,
      fileTokens,
      tradeName,
    };
  }

  if (tradeNorm === empresaNorm) {
    return {
      ok: true,
      reason: "Nome do arquivo identico ao da empresa.",
      empresaTokens,
      fileTokens,
      tradeName,
    };
  }

  // Unecont frequentemente trunca a razao social no nome do arquivo.
  if (tradeNorm.length >= 8 && empresaNorm.startsWith(tradeNorm)) {
    return {
      ok: true,
      reason: `Arquivo com razao social truncada do Unecont ("${tradeName}").`,
      empresaTokens,
      fileTokens,
      tradeName,
    };
  }

  if (empresaTokens.length > 0) {
    const fileTokenSet = new Set(fileTokens);
    const overlap = empresaTokens.filter(
      (token) => fileTokenSet.has(token) || tradeNorm.includes(token),
    );

    if (overlap.length > 0) {
      return {
        ok: true,
        reason: `Tokens em comum: ${overlap.join(", ")}`,
        empresaTokens,
        fileTokens,
        tradeName,
      };
    }

    return {
      ok: false,
      reason: `Anexo incompatível com a empresa (arquivo="${tradeName}", empresa="${empresaNome}").`,
      empresaTokens,
      fileTokens,
      tradeName,
    };
  }

  // Nomes curtos (ex.: "VS SERVICOS LTDA", "LDA LTDA"): tokens < 4 apos stop-words.
  const shortEmpresaTokens = identityTokens(empresaNome, 2);
  const shortFileTokens = identityTokens(tradeName, 2);
  if (shortEmpresaTokens.length === 0) {
    return {
      ok: false,
      reason: "Empresa sem tokens distintivos no nome; recusa por seguranca.",
      empresaTokens: shortEmpresaTokens,
      fileTokens: shortFileTokens,
      tradeName,
    };
  }

  const shortFileSet = new Set(shortFileTokens);
  const shortOverlap = shortEmpresaTokens.filter(
    (token) => shortFileSet.has(token) || tradeNorm.includes(token),
  );
  if (shortOverlap.length > 0) {
    return {
      ok: true,
      reason: `Tokens curtos em comum: ${shortOverlap.join(", ")}`,
      empresaTokens: shortEmpresaTokens,
      fileTokens: shortFileTokens,
      tradeName,
    };
  }

  return {
    ok: false,
    reason: `Anexo incompatível com a empresa (arquivo="${tradeName}", empresa="${empresaNome}").`,
    empresaTokens: shortEmpresaTokens,
    fileTokens: shortFileTokens,
    tradeName,
  };
}

export function assertEmpresaFileIdentity(fileName: string, empresaNome: string): void {
  const result = matchEmpresaFileIdentity(fileName, empresaNome);
  if (!result.ok) {
    throw new Error(result.reason);
  }
}

export interface ParsedUnecontEmpresaHeader {
  codigo: string;
  cnpj: string;
  nome: string;
}

/**
 * Parses UI text like: "Empresa: 0040 - 13.431.786/0001-43 - LOTERICA ..."
 */
export function parseUnecontEmpresaHeader(text: string): ParsedUnecontEmpresaHeader | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const match = normalized.match(
    /Empresa:\s*(\d+)\s*-\s*([\d./\-]+)\s*-\s*(.+?)(?:\n|$|Munic[ií]pio)/i,
  );
  if (!match) return null;
  return {
    codigo: normalizeEmpresaCodigo(match[1]),
    cnpj: digitsOnly(match[2]),
    nome: match[3].trim(),
  };
}

export interface EmpresaUiIdentityExpectation {
  cnpj: string;
  codigo?: string;
}

export function matchEmpresaUiIdentity(
  headerText: string,
  expected: EmpresaUiIdentityExpectation,
): { ok: boolean; reason: string; parsed: ParsedUnecontEmpresaHeader | null } {
  const parsed = parseUnecontEmpresaHeader(headerText);
  if (!parsed) {
    return {
      ok: false,
      reason: "Nao foi possivel ler a empresa selecionada na tela do Unecont.",
      parsed: null,
    };
  }

  const expectedCnpj = digitsOnly(expected.cnpj);
  if (!expectedCnpj || parsed.cnpj !== expectedCnpj) {
    return {
      ok: false,
      reason: `Empresa selecionada no Unecont diverge do esperado (UI CNPJ=${parsed.cnpj || "?"}, esperado=${expectedCnpj || "?"}).`,
      parsed,
    };
  }

  if (expected.codigo) {
    const expectedCodigo = normalizeEmpresaCodigo(expected.codigo);
    if (expectedCodigo && parsed.codigo && parsed.codigo !== expectedCodigo) {
      return {
        ok: false,
        reason: `Codigo da empresa na UI diverge do esperado (UI=${parsed.codigo}, esperado=${expectedCodigo}).`,
        parsed,
      };
    }
  }

  return { ok: true, reason: "CNPJ da UI confere.", parsed };
}
