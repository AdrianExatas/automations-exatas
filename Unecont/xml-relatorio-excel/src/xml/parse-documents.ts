import path from "node:path";
import type { ParsedNfseDocument, SupportedSchema } from "../types";
import { mapSimpleNationalFlag, parseDecimal } from "../utils";
import { getChild, getPath, getPathText, parseXmlFile, type XmlNode } from "./xml-tree";

function assertRequired(value: string, fieldName: string): string {
  if (!value) {
    throw new Error(`Campo obrigatório ausente: ${fieldName}`);
  }
  return value;
}

function inferSchema(root: XmlNode): SupportedSchema {
  if (root.name === "CompNfse") return "ABRASF-2.x";
  if (root.name === "GerarNfseResposta") return "ABRASF-2.x";
  if (root.name === "NFSe") return "NFSe-Nacional-1.01";
  throw new Error(`Schema de XML não suportado: ${root.name}`);
}

function parseAbrasf(root: XmlNode, filePath: string): ParsedNfseDocument {
  const compNfse =
    root.name === "CompNfse"
      ? root
      : getPath(root, ["ListaNfse", "CompNfse"]) ?? getChild(root, "CompNfse");
  const infNfse = getPath(compNfse, ["Nfse", "InfNfse"]);
  const declaracao = getPath(infNfse, ["DeclaracaoPrestacaoServico", "InfDeclaracaoPrestacaoServico"]);
  const warnings: string[] = [];

  const numero = assertRequired(getPathText(infNfse, ["Numero"]), "Numero");
  const servicoFederalCodigo = assertRequired(
    getPathText(declaracao, ["Servico", "ItemListaServico"]),
    "Servico.ItemListaServico",
  );
  const valorNfe = parseDecimal(
    assertRequired(
      getPathText(declaracao, ["Servico", "Valores", "ValorServicos"]),
      "Servico.Valores.ValorServicos",
    ),
  );
  const prestadorDocumento = assertRequired(
    getPathText(infNfse, ["PrestadorServico", "IdentificacaoPrestador", "CpfCnpj", "Cnpj"]) ||
      getPathText(infNfse, ["PrestadorServico", "IdentificacaoPrestador", "CpfCnpj", "Cpf"]),
    "PrestadorServico.IdentificacaoPrestador.CpfCnpj",
  );
  const tomadorDocumento = assertRequired(
    getPathText(declaracao, ["Tomador", "IdentificacaoTomador", "CpfCnpj", "Cnpj"]) ||
      getPathText(declaracao, ["Tomador", "IdentificacaoTomador", "CpfCnpj", "Cpf"]),
    "Tomador.IdentificacaoTomador.CpfCnpj",
  );

  const regimeTributario = mapSimpleNationalFlag(getPathText(declaracao, ["OptanteSimplesNacional"]));

  if (!getPathText(infNfse, ["CodigoVerificacao"])) {
    warnings.push("Código verificador ausente no XML ABRASF.");
  }

  return {
    sourceFile: path.basename(filePath),
    sourcePath: filePath,
    schema: "ABRASF-2.x",
    numero,
    codigoVerificacao: getPathText(infNfse, ["CodigoVerificacao"]),
    competencia: assertRequired(getPathText(declaracao, ["Competencia"]), "Competencia"),
    emissao: assertRequired(getPathText(infNfse, ["DataEmissao"]), "DataEmissao"),
    prestadorNome: assertRequired(
      getPathText(infNfse, ["PrestadorServico", "RazaoSocial"]),
      "PrestadorServico.RazaoSocial",
    ),
    prestadorDocumento,
    prestadorInscricaoMunicipal: getPathText(
      infNfse,
      ["PrestadorServico", "IdentificacaoPrestador", "InscricaoMunicipal"],
    ),
    prestadorMunicipioCodigo: getPathText(infNfse, ["PrestadorServico", "Endereco", "CodigoMunicipio"]),
    prestadorUf: getPathText(infNfse, ["PrestadorServico", "Endereco", "Uf"]),
    tomadorNome: assertRequired(getPathText(declaracao, ["Tomador", "RazaoSocial"]), "Tomador.RazaoSocial"),
    tomadorDocumento,
    tomadorMunicipioCodigo: getPathText(declaracao, ["Tomador", "Endereco", "CodigoMunicipio"]),
    tomadorUf: getPathText(declaracao, ["Tomador", "Endereco", "Uf"]),
    regimeTributario,
    servicoFederalCodigo,
    servicoMunicipalCodigo: getPathText(declaracao, ["Servico", "CodigoTributacaoMunicipio"]),
    descricaoServicoXml: getPathText(declaracao, ["Servico", "Discriminacao"]),
    valorNfe,
    baseCalculoIss: parseDecimal(getPathText(infNfse, ["ValoresNfse", "BaseCalculo"])) || valorNfe,
    valorLiquido: parseDecimal(getPathText(infNfse, ["ValoresNfse", "ValorLiquidoNfse"])) || valorNfe,
    warnings,
  };
}

function parseNacional(root: XmlNode, filePath: string): ParsedNfseDocument {
  const infNfse = getChild(root, "infNFSe");
  const dps = getChild(infNfse, "DPS");
  const infDps = getChild(dps, "infDPS");
  const warnings: string[] = ["Código verificador ausente no XML NFSe Nacional."];

  const numero = assertRequired(getPathText(infNfse, ["nNFSe"]), "nNFSe");
  const servicoFederalCodigo = assertRequired(
    getPathText(infDps, ["serv", "cServ", "cTribNac"]),
    "serv.cServ.cTribNac",
  );
  const valorNfe = parseDecimal(
    assertRequired(
      getPathText(infDps, ["valores", "vServPrest", "vServ"]),
      "valores.vServPrest.vServ",
    ),
  );
  const prestadorDocumento = assertRequired(
    getPathText(infNfse, ["emit", "CNPJ"]) || getPathText(infNfse, ["emit", "CPF"]),
    "emit.CNPJ/CPF",
  );
  const tomadorDocumento = assertRequired(
    getPathText(infDps, ["toma", "CNPJ"]) || getPathText(infDps, ["toma", "CPF"]),
    "toma.CNPJ/CPF",
  );

  return {
    sourceFile: path.basename(filePath),
    sourcePath: filePath,
    schema: "NFSe-Nacional-1.01",
    numero,
    codigoVerificacao: "",
    competencia: assertRequired(getPathText(infDps, ["dCompet"]), "dCompet"),
    emissao: assertRequired(getPathText(infDps, ["dhEmi"]), "dhEmi"),
    prestadorNome: assertRequired(getPathText(infNfse, ["emit", "xNome"]), "emit.xNome"),
    prestadorDocumento,
    prestadorInscricaoMunicipal: getPathText(infNfse, ["emit", "IM"]),
    prestadorMunicipioCodigo: getPathText(infNfse, ["emit", "enderNac", "cMun"]),
    prestadorUf: getPathText(infNfse, ["emit", "enderNac", "UF"]),
    tomadorNome: assertRequired(getPathText(infDps, ["toma", "xNome"]), "toma.xNome"),
    tomadorDocumento,
    tomadorMunicipioCodigo: getPathText(infDps, ["toma", "end", "endNac", "cMun"]),
    tomadorUf: getPathText(infDps, ["toma", "end", "endNac", "UF"]),
    regimeTributario: mapSimpleNationalFlag(getPathText(infDps, ["prest", "regTrib", "opSimpNac"])),
    servicoFederalCodigo,
    servicoMunicipalCodigo: "",
    descricaoServicoXml: getPathText(infDps, ["serv", "cServ", "xDescServ"]),
    valorNfe,
    baseCalculoIss: valorNfe,
    valorLiquido: parseDecimal(getPathText(infNfse, ["valores", "vLiq"])) || valorNfe,
    warnings,
  };
}

export function parseNfseDocument(filePath: string): ParsedNfseDocument {
  const { root } = parseXmlFile(filePath);
  const schema = inferSchema(root);

  if (schema === "ABRASF-2.x") {
    return parseAbrasf(root, filePath);
  }

  return parseNacional(root, filePath);
}
