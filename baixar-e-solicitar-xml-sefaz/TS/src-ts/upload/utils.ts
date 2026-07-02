import { XMLParser, XMLValidator } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export function validarXml(xmlString: string): boolean {
  return XMLValidator.validate(xmlString) === true;
}

export function validarXmlDetalhado(xmlString: string): { valido: true } | { valido: false; erro: string } {
  const result = XMLValidator.validate(xmlString);
  if (result === true) {
    return { valido: true };
  }
  const message = result.err
    ? `${result.err.msg}${result.err.line != null ? ` (linha ${result.err.line}, coluna ${result.err.col})` : ""}`
    : "XML invalido";
  return { valido: false, erro: message };
}

export function extrairChaveAcesso(xmlString: string): string | undefined {
  const direct = /<chNFe[^>]*>\s*(\d{44})\s*<\/chNFe>/i.exec(xmlString)?.[1];
  if (direct) {
    return direct;
  }
  const attr = /\bId=["']NFe(\d{44})["']/i.exec(xmlString)?.[1];
  if (attr) {
    return attr;
  }
  const any44Digits = /\b(\d{44})\b/.exec(xmlString)?.[1];
  return any44Digits;
}

function findFirstKey(value: unknown, keyName: string): unknown {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstKey(item, keyName);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  const object = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(object)) {
    if (key === keyName) {
      return child;
    }
    const found = findFirstKey(child, keyName);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

export function identificarTipoXml(xmlString: string): string | undefined {
  try {
    const parsed = parser.parse(xmlString) as Record<string, unknown>;
    const rootName = Object.keys(parsed)[0]?.toLowerCase() ?? "";
    if (rootName.includes("nfse")) {
      return "NFSe";
    }
    if (rootName.includes("cte")) {
      return "CTe";
    }
    if (rootName.includes("cfe")) {
      return "CFe";
    }
    if (rootName.includes("nfe")) {
      return obterCodigoTipoNota(xmlString) === 65 ? "NFCe" : "NFe";
    }
    const namespaceText = xmlString.slice(0, 500).toLowerCase();
    if (namespaceText.includes("portalfiscal.inf.br/nfe")) {
      return obterCodigoTipoNota(xmlString) === 65 ? "NFCe" : "NFe";
    }
    if (namespaceText.includes("portalfiscal.inf.br/cte")) {
      return "CTe";
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function obterCodigoTipoNota(xmlString: string): number | undefined {
  try {
    const parsed = parser.parse(xmlString);
    const mod = findFirstKey(parsed, "mod");
    const codigo = Number(Array.isArray(mod) ? mod[0] : mod);
    if (codigo === 55 || codigo === 65) {
      return codigo;
    }
    const match = /<mod[^>]*>\s*(55|65)\s*<\/mod>/i.exec(xmlString);
    return match?.[1] ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export function obterTipoCompletoNota(xmlString: string): string {
  const codigo = obterCodigoTipoNota(xmlString);
  if (codigo === 55) {
    return "NF-e";
  }
  if (codigo === 65) {
    return "NFC-e";
  }
  const tipo = identificarTipoXml(xmlString);
  if (tipo === "NFe") {
    return "NF-e";
  }
  if (tipo === "NFCe") {
    return "NFC-e";
  }
  return tipo ?? "Desconhecido";
}
