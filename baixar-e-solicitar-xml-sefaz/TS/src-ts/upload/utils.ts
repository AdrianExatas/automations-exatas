import { XMLParser, XMLValidator } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export type XmlCategoriaSieg = "documento" | "evento" | "inutilizacao" | "desconhecido";

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

function firstMatch(xmlString: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(xmlString)?.[1];
    if (match) {
      return match;
    }
  }
  return undefined;
}

export function obterRaizXml(xmlString: string): string | undefined {
  const root = /<\?xml[^>]*>\s*<([A-Za-z_][\w:.-]*)/i.exec(xmlString)?.[1] ?? /<([A-Za-z_][\w:.-]*)/i.exec(xmlString)?.[1];
  return root?.split(":").pop();
}

export function classificarXmlSieg(xmlString: string): XmlCategoriaSieg {
  const rootName = obterRaizXml(xmlString)?.toLowerCase() ?? "";
  if (rootName.includes("procevento") || rootName === "evento") {
    return "evento";
  }
  if (rootName.includes("procinut") || rootName === "inutnfe") {
    return "inutilizacao";
  }
  if (
    rootName.includes("nfeproc") ||
    rootName === "nfe" ||
    rootName.includes("cteproc") ||
    rootName === "cte" ||
    rootName.includes("nfse") ||
    rootName.includes("cfe")
  ) {
    return "documento";
  }
  return "desconhecido";
}

export function extrairChaveAcesso(xmlString: string): string | undefined {
  if (classificarXmlSieg(xmlString) === "inutilizacao") {
    return undefined;
  }

  const direct = firstMatch(xmlString, [
    /<chNFe[^>]*>\s*(\d{44})\s*<\/chNFe>/i,
    /<chCTe[^>]*>\s*(\d{44})\s*<\/chCTe>/i,
    /\bId=["']NFe(\d{44})["']/i,
    /\bId=["']CTe(\d{44})["']/i,
    /[?&]chNFe=(\d{44})\b/i,
    /[?&]chCTe=(\d{44})\b/i,
  ]);
  if (direct) {
    return direct;
  }
  const any44Digits = /\b(\d{44})\b/.exec(xmlString)?.[1];
  return any44Digits;
}

export function extrairTipoEvento(xmlString: string): number | undefined {
  const tipoEvento = /<tpEvento[^>]*>\s*(\d+)\s*<\/tpEvento>/i.exec(xmlString)?.[1];
  return tipoEvento ? Number(tipoEvento) : undefined;
}

export function obterModeloChaveAcesso(chaveAcesso: string | undefined): number | undefined {
  if (!chaveAcesso || !/^\d{44}$/.test(chaveAcesso)) {
    return undefined;
  }
  const modelo = Number(chaveAcesso.slice(20, 22));
  return Number.isFinite(modelo) ? modelo : undefined;
}

export function obterXmlTypeSiegPorChave(chaveAcesso: string | undefined): number | undefined {
  const modelo = obterModeloChaveAcesso(chaveAcesso);
  if (modelo === 55) {
    return 1;
  }
  if (modelo === 57) {
    return 2;
  }
  if (modelo === 65) {
    return 4;
  }
  if (modelo === 59) {
    return 5;
  }
  return undefined;
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
    const xmlTypePorChave = obterXmlTypeSiegPorChave(extrairChaveAcesso(xmlString));
    if (xmlTypePorChave === 1) {
      return "NFe";
    }
    if (xmlTypePorChave === 2) {
      return "CTe";
    }
    if (xmlTypePorChave === 4) {
      return "NFCe";
    }
    if (xmlTypePorChave === 5) {
      return "CFe";
    }
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
    if (match?.[1]) {
      return Number(match[1]);
    }
    const modelo = obterModeloChaveAcesso(extrairChaveAcesso(xmlString));
    return modelo === 55 || modelo === 65 ? modelo : undefined;
  } catch {
    return undefined;
  }
}

export function obterTipoCompletoNota(xmlString: string): string {
  const categoria = classificarXmlSieg(xmlString);
  const codigo = obterCodigoTipoNota(xmlString);
  let tipo: string | undefined;
  if (codigo === 55) {
    tipo = "NF-e";
  } else if (codigo === 65) {
    tipo = "NFC-e";
  } else {
    const tipoIdentificado = identificarTipoXml(xmlString);
    if (tipoIdentificado === "NFe") {
      tipo = "NF-e";
    } else if (tipoIdentificado === "NFCe") {
      tipo = "NFC-e";
    } else {
      tipo = tipoIdentificado;
    }
  }

  if (!tipo) {
    return categoria === "desconhecido" ? "Desconhecido" : categoria;
  }

  if (categoria === "evento") {
    return `Evento ${tipo}`;
  }
  if (categoria === "inutilizacao") {
    return `Inutilizacao ${tipo}`;
  }
  return tipo;
}

export function obterXmlTypeSieg(xmlString: string): number {
  const xmlTypePorChave = obterXmlTypeSiegPorChave(extrairChaveAcesso(xmlString));
  if (xmlTypePorChave) {
    return xmlTypePorChave;
  }

  const codigo = obterCodigoTipoNota(xmlString);
  if (codigo === 55) {
    return 1;
  }
  if (codigo === 65) {
    return 4;
  }

  const tipo = identificarTipoXml(xmlString);
  if (tipo === "NFe") {
    return 1;
  }
  if (tipo === "CTe") {
    return 2;
  }
  if (tipo === "NFSe") {
    return 3;
  }
  if (tipo === "NFCe") {
    return 4;
  }
  if (tipo === "CFe") {
    return 5;
  }

  return 1;
}
