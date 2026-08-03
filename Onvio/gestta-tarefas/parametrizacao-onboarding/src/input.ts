import { AreaParametrizacao, ParametrizacaoInput, RegimeFiscal } from "./types";
import { normalizarCnpj } from "./utils";

const AREAS_VALIDAS: AreaParametrizacao[] = [
  "dp",
  "fiscal",
  "financeiro",
  "contabil",
  "sucesso_cliente",
];

const REGIMES_VALIDOS: RegimeFiscal[] = ["simples_nacional", "fiscal_normal"];

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Campo ${field} deve ser uma lista de textos.`);
  }
  return value;
}

export function validarInput(raw: unknown): ParametrizacaoInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Input JSON deve conter um objeto.");
  }

  const data = raw as Record<string, unknown>;
  const cnpj = normalizarCnpj(data.cnpj);
  if (cnpj.length !== 14) throw new Error("Campo cnpj deve conter 14 digitos.");

  const adicionarAnaliseParcelamentos = Boolean(data.adicionarAnaliseParcelamentos);
  const areas = assertStringArray(data.areas, "areas") as AreaParametrizacao[];
  if (areas.length === 0 && !adicionarAnaliseParcelamentos) {
    throw new Error("Informe ao menos uma area ou marque a analise de parcelamentos.");
  }
  for (const area of areas) {
    if (!AREAS_VALIDAS.includes(area)) throw new Error(`Area invalida: ${area}.`);
  }

  const regimeFiscal = String(data.regimeFiscal ?? "") as RegimeFiscal;
  if (!REGIMES_VALIDOS.includes(regimeFiscal)) {
    throw new Error(`Regime fiscal invalido: ${regimeFiscal}.`);
  }

  const uf = String(data.uf ?? "").trim().toUpperCase();
  if (uf && !/^[A-Z]{2}$/.test(uf)) {
    throw new Error("Campo uf deve ser vazio ou conter a sigla com 2 letras.");
  }

  return {
    cnpj,
    areas: [...new Set(areas)],
    regimeFiscal,
    incluirAnuais: Boolean(data.incluirAnuais),
    planoPremium: Boolean(data.planoPremium),
    supervisor: Boolean(data.supervisor),
    adicionarAnaliseParcelamentos,
    uf: uf || undefined,
  };
}
