/**
 * Shared identity check so Unecont XLSX attachments are never sent to the wrong company.
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

export function extractUnecontTradeName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/i, "");
  const match = base.match(
    /(?:^|\s)-\s*UneCont\s*-\s*Tomados\s*-\s*(.+?)(?:\s*-\s*\d{2}_\d{2}_\d{4})/i,
  );
  if (match?.[1]) return match[1].trim();
  return base.replace(/^\d+\s*-\s*/i, "").trim();
}

export interface EmpresaFileIdentityMatch {
  ok: boolean;
  reason: string;
  empresaTokens: string[];
  fileTokens: string[];
  tradeName: string;
}

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
      reason: `Anexo incompativel com a empresa (arquivo="${tradeName}", empresa="${empresaNome}").`,
      empresaTokens,
      fileTokens,
      tradeName,
    };
  }

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
    reason: `Anexo incompativel com a empresa (arquivo="${tradeName}", empresa="${empresaNome}").`,
    empresaTokens: shortEmpresaTokens,
    fileTokens: shortFileTokens,
    tradeName,
  };
}
