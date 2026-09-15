import type {
  AnalyzedDteMessage,
  DteMessage,
  MessageCategory,
  MessageDeadlineStatus,
  MessagePriority,
} from "./types.js";
import { normalizeText } from "./utils.js";

interface Classification {
  category: MessageCategory;
  priority: MessagePriority;
  requiresAction: boolean;
  suggestedAction: string;
  responsibleArea: string;
  actionStatus: AnalyzedDteMessage["actionStatus"];
  classificationReason: string;
  classificationConfidence: number;
  summary: string;
}

interface DeadlineAnalysis {
  deadlineText: string;
  deadlineDate: string;
  deadlineStatus: MessageDeadlineStatus;
}

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: "•",
  gt: ">",
  hellip: "…",
  laquo: "«",
  lt: "<",
  nbsp: " ",
  quot: '"',
  raquo: "»",
};

export function analyzeMessages(messages: DteMessage[], asOf = new Date()): AnalyzedDteMessage[] {
  return messages.map((message) => analyzeMessage(message, asOf));
}

export function analyzeMessage(message: DteMessage, asOf = new Date()): AnalyzedDteMessage {
  const textPlain = htmlToPlainText(message.text);
  const classification = classifyMessage(message, textPlain);
  const science = analyzeScience(message, asOf);
  const deadline = analyzeDeadline(`${message.title}\n${textPlain}`, asOf);
  return {
    ...message,
    textPlain,
    ...classification,
    isUnread: !Boolean(message.readAt),
    ...science,
    ...deadline,
  };
}

export function htmlToPlainText(value: string): string {
  if (!value) return "";
  let text = value
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!doctype[^>]*>/gi, " ")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_all, href: string, label: string) => {
      const cleanLabel = decodeHtmlEntities(label.replace(/<[^>]+>/g, " ")).trim();
      const cleanHref = decodeHtmlEntities(href).trim();
      if (!/^https?:\/\//i.test(cleanHref)) return cleanLabel;
      return cleanLabel && cleanLabel !== cleanHref ? `${cleanLabel} (${cleanHref})` : cleanHref;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|section|article|header|footer|h[1-6]|ul|ol)>/gi, "\n")
    .replace(/<tr\b[^>]*>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text)
    .replace(/[ \t]+\|[ \t]*\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    if (code.startsWith("#")) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return ENTITY_MAP[code.toLowerCase()] ?? entity;
  });
}

function classifyMessage(message: DteMessage, textPlain: string): Classification {
  const title = normalizeText(message.title);
  const sender = normalizeText(message.sender);
  const sample = normalizeText(`${message.title} ${message.sender} ${textPlain.slice(0, 4_000)}`);

  if (
    sender.includes("processo eletronico administrativo trabalhista") ||
    /lavratura de documento fiscal|decisao procedente|decisao recorrida|recurso nao conhecido|auto de infracao/.test(sample)
  ) {
    return result(
      "processo_administrativo",
      "critica",
      true,
      "Encaminhar imediatamente ao jurídico/fiscal, consultar a íntegra do processo e confirmar o prazo aplicável.",
      "Jurídico / Fiscal",
      "Comunicação de processo administrativo, documento fiscal, decisão ou recurso.",
      0.98,
      `${message.title}. Comunicação processual que exige conferência do teor, da ciência e do prazo.`,
    );
  }

  if (sample.includes("pendencia") && sample.includes("fgts")) {
    return result(
      "fgts",
      "alta",
      true,
      "Conferir a pendência no FGTS Digital, validar recolhimentos e registrar a regularização ou justificativa.",
      "Fiscal / Departamento Pessoal",
      "Título ou conteúdo indica notificação para solução de pendência no FGTS Digital.",
      0.97,
      "O MTE comunicou possível pendência relacionada ao FGTS Digital; a situação deve ser conferida no sistema oficial.",
    );
  }

  if (sample.includes("consignado") || sample.includes("credito do trabalhador")) {
    if (/deixar de realizar|nao recolh|nao efetu|irregular|pendencia/.test(sample)) {
      return result(
        "credito_do_trabalhador",
        "alta",
        true,
        "Conferir desconto em folha, escrituração no eSocial e recolhimento da parcela no FGTS Digital.",
        "Departamento Pessoal",
        "Comunicação aponta possível ausência ou irregularidade em desconto/recolhimento de consignado.",
        0.97,
        "Foi apontada possível irregularidade no desconto ou recolhimento de empréstimo consignado de trabalhador.",
      );
    }
    return result(
      "credito_do_trabalhador",
      "operacional",
      true,
      "Consultar o arquivo de empréstimos da competência, conferir a folha/eSocial e programar o recolhimento aplicável.",
      "Departamento Pessoal",
      "Aviso recorrente de contratação de empréstimo consignado por trabalhador vinculado.",
      0.96,
      "Há comunicação de empréstimo consignado vinculado à empresa; é necessário conferir a competência na rotina de folha.",
    );
  }

  if (sample.includes("igualdade salarial") || sample.includes("transparencia salarial")) {
    const high = sample.includes("cumprimento de publicizacao");
    return result(
      "igualdade_salarial",
      high ? "alta" : "operacional",
      true,
      high
        ? "Confirmar a publicização do relatório e guardar evidência do cumprimento."
        : "Verificar o período e realizar o preenchimento, consulta ou publicação solicitada.",
      "Recursos Humanos",
      "Comunicação relacionada às obrigações de transparência e igualdade salarial.",
      0.94,
      "Mensagem sobre preenchimento, consulta ou divulgação do Relatório de Transparência Salarial.",
    );
  }

  if (title.includes("domicilio eletronico trabalhista") && title.includes("contato inicial")) {
    return result(
      "cadastro_det",
      "informativa",
      false,
      "Registrar a comunicação; revisar apenas se os contatos do estabelecimento ainda não estiverem atualizados.",
      "Administrativo",
      "Mensagem padronizada de contato inicial do DET.",
      0.98,
      "Mensagem de apresentação ou contato inicial do Domicílio Eletrônico Trabalhista.",
    );
  }

  if (/aviso de uso|consulta e download|assedio politico e eleitoral/.test(sample)) {
    return result(
      "informativo",
      "informativa",
      false,
      "Registrar para consulta; nenhuma providência específica foi identificada automaticamente.",
      "Administrativo",
      "Aviso geral ou material de orientação sem comando de ação identificado.",
      0.85,
      firstUsefulExcerpt(textPlain, message.title),
    );
  }

  if (/notificacao|intimacao|prazo|multa|recurso/.test(sample)) {
    return result(
      "outro",
      "alta",
      true,
      "Revisar manualmente o conteúdo, identificar a providência e confirmar eventual prazo.",
      "Fiscal / Jurídico",
      "Foram encontrados termos de notificação, prazo, multa ou recurso sem regra específica.",
      0.7,
      firstUsefulExcerpt(textPlain, message.title),
    );
  }

  return result(
    "outro",
    "revisar",
    false,
    "Revisar manualmente para definir se existe providência.",
    "A definir",
    "Mensagem não correspondeu a uma regra conhecida.",
    0.35,
    firstUsefulExcerpt(textPlain, message.title),
  );
}

function result(
  category: MessageCategory,
  priority: MessagePriority,
  requiresAction: boolean,
  suggestedAction: string,
  responsibleArea: string,
  classificationReason: string,
  classificationConfidence: number,
  summary: string,
): Classification {
  return {
    category,
    priority,
    requiresAction,
    suggestedAction,
    responsibleArea,
    actionStatus: requiresAction ? "a_confirmar" : priority === "revisar" ? "revisao_manual" : "somente_ciencia",
    classificationReason,
    classificationConfidence,
    summary,
  };
}

function analyzeScience(message: DteMessage, asOf: Date): Pick<AnalyzedDteMessage, "scienceStatus" | "scienceAt"> {
  if (message.readAt) return { scienceStatus: "leitura_manual", scienceAt: message.readAt };
  const byDeadline = parseDate(message.readByDeadlineAt);
  if (byDeadline && byDeadline.getTime() <= asOf.getTime()) {
    return { scienceStatus: "ciencia_por_decurso", scienceAt: message.readByDeadlineAt };
  }
  return { scienceStatus: "aguardando_ciencia", scienceAt: "" };
}

function analyzeDeadline(value: string, asOf: Date): DeadlineAnalysis {
  const normalized = normalizeText(value);
  const relative = normalized.match(/prazo\s+(?:de\s+)?(\d{1,3})(?:\s*\([^)]*\))?\s+dias?\s+(uteis|corridos|consecutivos)/i);
  const explicit = normalized.match(
    /(?:ate|vencimento(?:\s+em)?|data\s+limite(?:\s+em)?|prazo(?:\s+final)?(?:\s+em)?)\D{0,50}(\d{1,2}\/\d{1,2}\/\d{4})/i,
  );
  if (explicit?.[1]) {
    const date = parseBrazilianDate(explicit[1]);
    if (date) {
      const days = Math.ceil((date.getTime() - asOf.getTime()) / 86_400_000);
      return {
        deadlineText: explicit[0],
        deadlineDate: explicit[1],
        deadlineStatus: days < 0 ? "possivelmente_vencido" : days <= 7 ? "vence_em_7_dias" : "prazo_futuro",
      };
    }
  }
  if (relative?.[1] && relative[2]) {
    return {
      deadlineText: `${relative[1]} dias ${relative[2]}`,
      deadlineDate: "",
      deadlineStatus: "calculo_manual_necessario",
    };
  }
  return { deadlineText: "", deadlineDate: "", deadlineStatus: "nao_identificado" };
}

function parseBrazilianDate(value: string): Date | null {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, 15));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function firstUsefulExcerpt(text: string, fallback: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  return compact.length <= 280 ? compact : `${compact.slice(0, 277).trimEnd()}...`;
}
