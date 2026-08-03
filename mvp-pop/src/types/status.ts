export const SUBMISSION_STATUSES = [
  "recebido",
  "em_processamento",
  "transcrevendo",
  "estruturando",
  "gerando_docs",
  "documentacao_gerada",
  "em_validacao",
  "ajuste_solicitado",
  "documento_atualizado",
  "aprovado",
  "vigente",
  "erro",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const DOC_TYPES = ["pop", "it", "form", "mp"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const SECTOR_CODES: Record<string, string> = {
  Atendimento: "ATE",
  Fiscal: "FIS",
  Contábil: "CON",
  Contabil: "CON",
  "Departamento Pessoal": "DP",
  Paralegal: "PAR",
  Qualidade: "QUA",
  TI: "TI",
};

export function sectorCode(setor: string): string {
  if (SECTOR_CODES[setor]) return SECTOR_CODES[setor];
  const normalized = setor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  return normalized || "GEN";
}

export function docPrefix(type: DocType): string {
  switch (type) {
    case "pop":
      return "PR";
    case "it":
      return "IN";
    case "form":
      return "FORM";
    case "mp":
      return "MP";
  }
}
