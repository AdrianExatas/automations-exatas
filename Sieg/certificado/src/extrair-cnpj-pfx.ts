/**
 * Extrai o CNPJ (14 dígitos) do certificado end-entity contido em um arquivo PFX/P12.
 * Certificados e-CNPJ brasileiros seguem padrões ICP-Brasil com CNPJ em campos específicos.
 *
 * IMPORTANTE: O PFX pode conter múltiplos certificados (cadeia de CAs).
 * Precisamos encontrar o certificado do usuário final (end-entity), não os CAs.
 */
import forge from "node-forge";
import { logger } from "./utils/logger.js";
import { validarCnpj, somenteDigitos } from "./utils/validation.js";

// Padrões para encontrar CNPJ em certificados brasileiros
const CNPJ_PATTERNS = [
  /CNPJ[:\s]*(\d{14})/i, // CNPJ:12345678901234
  /serialNumber=(\d{14})/i, // serialNumber=12345678901234
  /2\.16\.76\.1\.3\.3=(\d{14})/, // OID ICP-Brasil para CNPJ
];

// Regex para encontrar 14 dígitos (fallback)
const CNPJ_14_DIGITS = /\d{14}/g;

interface CertAttribute {
  shortName: string;
  value: string;
  type?: string;
}

interface ForgeCert {
  subject: { attributes: CertAttribute[] };
  issuer: { attributes: CertAttribute[] };
  extensions?: Array<{ name: string; cA?: boolean }>;
}

interface CertBagEntry {
  cert?: ForgeCert;
}

/** Resultado de sucesso da extração de CNPJ */
interface ExtrairCnpjSucesso {
  ok: true;
  cnpj: string;
}

/** Resultado de erro da extração de CNPJ */
interface ExtrairCnpjErro {
  ok: false;
  mensagem: string;
}

/** Tipo de retorno da extração de CNPJ */
export type ExtrairCnpjResultado = ExtrairCnpjSucesso | ExtrairCnpjErro;

/**
 * Verifica se um certificado é uma CA (Certificate Authority)
 */
function isCACertificate(cert: ForgeCert): boolean {
  // Verifica a extensão Basic Constraints
  if (cert.extensions) {
    const basicConstraints = cert.extensions.find(
      (ext) => ext.name === "basicConstraints"
    );
    if (basicConstraints && basicConstraints.cA === true) {
      return true;
    }
  }

  // Verifica se subject == issuer (auto-assinado, típico de root CAs)
  const subjectCN =
    cert.subject.attributes.find((a) => a.shortName === "CN")?.value ?? "";
  const issuerCN =
    cert.issuer.attributes.find((a) => a.shortName === "CN")?.value ?? "";
  if (subjectCN && subjectCN === issuerCN) {
    return true;
  }

  // Verifica padrões comuns de CAs brasileiras no CN
  const caPatterns = [
    /autoridade certificadora/i,
    /AC\s+(raiz|intermediaria|soluti|valid|certisign|serasa|serpro)/i,
    /ICP-Brasil/i,
    /Root CA/i,
    /Intermediate/i,
  ];
  for (const pattern of caPatterns) {
    if (pattern.test(subjectCN)) {
      return true;
    }
  }

  return false;
}

/**
 * Extrai CNPJ de um certificado específico
 */
function extrairCnpjDoCert(cert: ForgeCert): string | null {
  const subjectStr = cert.subject.attributes
    .map((attr) => `${attr.shortName}=${attr.value}`)
    .join(", ");

  // Estratégia 1: Tentar padrões específicos de CNPJ
  for (const pattern of CNPJ_PATTERNS) {
    const match = subjectStr.match(pattern);
    if (match && match[1] && validarCnpj(match[1])) {
      return match[1];
    }
  }

  // Estratégia 2: Buscar no CN após ":" (formato: "EMPRESA LTDA:12345678901234")
  const cnAttr = cert.subject.attributes.find(
    (attr) => attr.shortName === "CN" || attr.shortName === "commonName"
  );
  if (cnAttr) {
    const cnValue = cnAttr.value;
    const colonIndex = cnValue.lastIndexOf(":");
    if (colonIndex !== -1) {
      const afterColon = somenteDigitos(cnValue.slice(colonIndex + 1));
      if (afterColon.length >= 14) {
        const possibleCnpj = afterColon.slice(0, 14);
        if (validarCnpj(possibleCnpj)) {
          return possibleCnpj;
        }
      }
    }
  }

  // Estratégia 3: Buscar todos os números de 14 dígitos e validar
  const allMatches = subjectStr.match(CNPJ_14_DIGITS);
  if (allMatches) {
    for (const candidate of allMatches) {
      if (validarCnpj(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Extrai o CNPJ do certificado end-entity encontrado no PFX.
 * @param pfxBuffer - Conteúdo binário do arquivo .pfx/.p12
 * @param senha - Senha do PFX
 * @returns CNPJ (14 dígitos) ou mensagem de erro
 */
export function extrairCnpjDoPfx(
  pfxBuffer: Buffer,
  senha: string
): ExtrairCnpjResultado {
  try {
    const binary = pfxBuffer.toString("binary");
    const asn1 = forge.asn1.fromDer(binary);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha, false);

    // ESTRATÉGIA PRINCIPAL: Encontrar o certificado com chave privada
    // Este é SEMPRE o certificado end-entity (da empresa), não os CAs
    // OID para pkcs8ShroudedKeyBag: 1.2.840.113549.1.12.10.1.2
    const PKCS8_KEY_BAG_OID = "1.2.840.113549.1.12.10.1.2";
    const keyBags = p12.getBags({ bagType: PKCS8_KEY_BAG_OID });
    const keyBag = (keyBags[PKCS8_KEY_BAG_OID] ?? []) as unknown[];

    // Também tenta friendlyName/localKeyId para associar cert com key
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag] as
      | CertBagEntry[]
      | undefined;

    if (!certBag || certBag.length === 0) {
      return {
        ok: false,
        mensagem: "Nenhum certificado encontrado no arquivo PFX.",
      };
    }

    logger.debug(
      `[Extração CNPJ] Total de certificados no PFX: ${certBag.length}`
    );
    logger.debug(
      `[Extração CNPJ] Chaves privadas encontradas: ${keyBag?.length ?? 0}`
    );

    // Coleta todos os CNPJs de todos os certificados
    const todosCerts: {
      cnpj: string | null;
      isCA: boolean;
      subject: string;
      hasKey: boolean;
    }[] = [];

    for (let i = 0; i < certBag.length; i++) {
      const entry = certBag[i];
      const cert = entry.cert;
      if (!cert || !cert.subject) continue;

      const subjectStr = cert.subject.attributes
        .map((attr: CertAttribute) => `${attr.shortName}=${attr.value}`)
        .join(", ");

      // Verifica se este certificado tem uma chave privada associada
      // Certificados com chave privada são end-entity (não CAs)
      const localKeyId = (entry as Record<string, unknown>).localKeyId as
        | string
        | undefined;
      const friendlyName = (entry as Record<string, unknown>).friendlyName as
        | string
        | undefined;

      // Checa se há key bag com mesmo localKeyId
      let hasKey = false;
      if (keyBag && keyBag.length > 0) {
        hasKey = keyBag.some((kb) => {
          const kbObj = kb as Record<string, unknown>;
          const kbLocalKeyId = kbObj.localKeyId as string | undefined;
          return localKeyId && kbLocalKeyId && localKeyId === kbLocalKeyId;
        });
        // Se não encontrou por localKeyId, assume que o primeiro cert com chave é o end-entity
        if (!hasKey && i === 0 && keyBag.length > 0) {
          hasKey = true;
        }
      }

      const isCA = isCACertificate(cert);
      const cnpj = extrairCnpjDoCert(cert);

      logger.debug(
        `[Extração CNPJ] Cert ${i + 1}: hasKey=${hasKey}, isCA=${isCA}, CNPJ=${cnpj ?? "não encontrado"}`
      );
      logger.debug(`[Extração CNPJ] Subject: ${subjectStr.slice(0, 200)}`);
      if (friendlyName) {
        logger.debug(`[Extração CNPJ] FriendlyName: ${friendlyName}`);
      }

      todosCerts.push({ cnpj, isCA, subject: subjectStr, hasKey });
    }

    // PRIORIDADE 1: Certificado com chave privada (definitivamente end-entity)
    const certComChave = todosCerts.find((c) => c.hasKey && c.cnpj);
    if (certComChave && certComChave.cnpj) {
      logger.debug(
        `[Extração CNPJ] ✓ Usando certificado COM CHAVE PRIVADA: ${certComChave.cnpj}`
      );
      return { ok: true, cnpj: certComChave.cnpj };
    }

    // PRIORIDADE 2: Certificado não-CA com CNPJ
    const certNaoCA = todosCerts.find((c) => !c.isCA && c.cnpj);
    if (certNaoCA && certNaoCA.cnpj) {
      logger.debug(
        `[Extração CNPJ] ✓ Usando certificado NÃO-CA: ${certNaoCA.cnpj}`
      );
      return { ok: true, cnpj: certNaoCA.cnpj };
    }

    // PRIORIDADE 3: Último certificado com CNPJ (geralmente end-entity vem por último)
    const certsComCnpj = todosCerts.filter((c) => c.cnpj);
    if (certsComCnpj.length > 0) {
      const ultimo = certsComCnpj[certsComCnpj.length - 1];
      logger.debug(
        `[Extração CNPJ] ✓ Usando ÚLTIMO certificado com CNPJ: ${ultimo.cnpj}`
      );
      return { ok: true, cnpj: ultimo.cnpj! };
    }

    return {
      ok: false,
      mensagem: "CNPJ válido não encontrado em nenhum certificado do PFX.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Mac verify error|bad decrypt|wrong password/i.test(msg)) {
      return { ok: false, mensagem: "Senha do certificado incorreta." };
    }
    return { ok: false, mensagem: "Erro ao ler o PFX: " + msg };
  }
}
