import {
  AdicionalDp,
  AreaParametrizacao,
  ConfiguracaoDp,
  GrupoFolha,
  ParametrizacaoInput,
  PerfilDp,
  RegimeFiscal,
} from "./types";
import { normalizarCnpj } from "./utils";

const AREAS_VALIDAS: AreaParametrizacao[] = [
  "dp",
  "fiscal",
  "financeiro",
  "contabil",
  "sucesso_cliente",
];

const REGIMES_VALIDOS: RegimeFiscal[] = ["simples_nacional", "fiscal_normal"];
const PERFIS_DP_VALIDOS: PerfilDp[] = ["normal", "sem_movimento"];
const ADICIONAIS_DP_VALIDOS: AdicionalDp[] = ["particularidade", "normal_domestica", "normal_mei", "exatas"];
const GRUPOS_FOLHA_VALIDOS: GrupoFolha[] = ["grupo_1", "grupo_2"];

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Campo ${field} deve ser uma lista de textos.`);
  }
  return value;
}

function validarConfiguracaoDp(value: unknown, dpSelecionado: boolean): ConfiguracaoDp | undefined {
  if (!dpSelecionado) return undefined;
  if (!value || typeof value !== "object") throw new Error("Selecione o perfil do DP.");

  const data = value as Record<string, unknown>;
  const perfil = String(data.perfil ?? "") as PerfilDp;
  if (!PERFIS_DP_VALIDOS.includes(perfil)) {
    throw new Error("Selecione o perfil do DP: Normal ou Sem movimento.");
  }

  const adicionais = assertStringArray(data.adicionais ?? [], "dp.adicionais") as AdicionalDp[];
  for (const adicional of adicionais) {
    if (!ADICIONAIS_DP_VALIDOS.includes(adicional)) {
      throw new Error(`Adicional DP invalido: ${adicional}.`);
    }
  }

  const grupoFolha = data.grupoFolha == null ? undefined : String(data.grupoFolha) as GrupoFolha;
  if (perfil === "normal" && !grupoFolha) {
    throw new Error("Selecione o grupo da folha: Grupo 1 ou Grupo 2.");
  }
  if (grupoFolha && !GRUPOS_FOLHA_VALIDOS.includes(grupoFolha)) {
    throw new Error(`Grupo da folha invalido: ${grupoFolha}.`);
  }

  return {
    perfil,
    adicionais: [...new Set(adicionais)],
    grupoFolha: perfil === "normal" ? grupoFolha : undefined,
  };
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

  const dp = validarConfiguracaoDp(data.dp, areas.includes("dp"));

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
    dp,
    incluirAnuais: true,
    planoPremium: Boolean(data.planoPremium),
    supervisor: Boolean(data.supervisor),
    adicionarAnaliseParcelamentos,
    uf: uf || undefined,
  };
}
