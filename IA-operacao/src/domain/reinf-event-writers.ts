import fs from "node:fs";
import path from "node:path";
import {
  buildReinfEventDrafts,
  type ReinfEventDraft,
  type ReinfEventDraftR2010,
  type ReinfEventDraftR4020,
} from "./reinf-event-draft";
import type { ConferenciaNotasItemResult, ConferenciaNotasResult } from "../types";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatMoney(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toFixed(2);
}

function isR2010(draft: ReinfEventDraft): draft is ReinfEventDraftR2010 {
  return draft.evento === "R-2010";
}

function isR4020(draft: ReinfEventDraft): draft is ReinfEventDraftR4020 {
  return draft.evento === "R-4020";
}

export interface EventosReinfArtifacts {
  eventos: ReinfEventDraft[];
  eventosJsonPath: string;
  eventosCsvPath: string;
}

/** Agrega rascunhos R-2010/R-4020 de todas as empresas do lote. */
export function collectReinfEventDrafts(items: ConferenciaNotasItemResult[]): ReinfEventDraft[] {
  const eventos: ReinfEventDraft[] = [];
  for (const item of items) {
    if (item.status !== "success") continue;
    eventos.push(
      ...buildReinfEventDrafts(
        item.empresa,
        item.notas,
        item.totais?.competenciaLabel ?? "",
      ),
    );
  }
  return eventos;
}

export function writeEventosReinfJson(
  filePath: string,
  runId: string,
  eventos: ReinfEventDraft[],
): void {
  const payload = {
    runId,
    geradoEm: new Date().toISOString(),
    status: "rascunho",
    totalEventos: eventos.length,
    totalR2010: eventos.filter((e) => e.evento === "R-2010").length,
    totalR4020: eventos.filter((e) => e.evento === "R-4020").length,
    eventos,
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export function writeEventosReinfCsv(filePath: string, eventos: ReinfEventDraft[]): void {
  const header = [
    "EVENTO",
    "IND_RETIF",
    "PER_APUR",
    "CNPJ_CONTRIBUINTE",
    "CNPJ_PRESTADOR",
    "NOME_PRESTADOR",
    "NUM_DOCTO",
    "VLR_BRUTO",
    "VLR_BASE_RET",
    "VLR_RETENCAO",
    "VLR_IR",
    "VLR_CSLL",
    "VLR_COFINS",
    "VLR_PIS",
    "VLR_CSRF_TOTAL",
    "OBSERVACAO",
    "ORIGEM_UNECONT_ID",
    "STATUS_RASCUNHO",
  ].join(",");

  const lines = [header];
  for (const ev of eventos) {
    lines.push(
      [
        ev.evento,
        String(ev.indRetif),
        ev.perApur,
        ev.cnpjContribuinte,
        ev.cnpjPrestador,
        ev.nomePrestador ?? "",
        ev.numDocto,
        formatMoney(ev.vlrBruto),
        isR2010(ev) ? formatMoney(ev.vlrBaseRet) : "",
        isR2010(ev) ? formatMoney(ev.vlrRetencao) : "",
        isR4020(ev) ? formatMoney(ev.vlrIr) : "",
        isR4020(ev) ? formatMoney(ev.vlrCsll) : "",
        isR4020(ev) ? formatMoney(ev.vlrCofins) : "",
        isR4020(ev) ? formatMoney(ev.vlrPis) : "",
        isR4020(ev) ? formatMoney(ev.vlrCsrfTotal) : "",
        isR4020(ev) ? ev.observacao ?? "" : "",
        ev.origemUnecontId ?? "",
        ev.statusRascunho,
      ]
        .map((value) => csvEscape(String(value ?? "")))
        .join(","),
    );
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}

function formatValoresChecklist(ev: ReinfEventDraft): string {
  if (isR2010(ev)) {
    return `bruto ${formatMoney(ev.vlrBruto)} | base ${formatMoney(ev.vlrBaseRet)} | INSS ${formatMoney(ev.vlrRetencao)}`;
  }
  const parts = [`bruto ${formatMoney(ev.vlrBruto)}`, `IR ${formatMoney(ev.vlrIr)}`];
  if (ev.vlrCsrfTotal != null && ev.vlrCsrfTotal > 0) {
    parts.push(`CSRF ${formatMoney(ev.vlrCsrfTotal)}`);
  }
  if (ev.observacao) parts.push(ev.observacao);
  return parts.join(" | ");
}

export function writeChecklistMd(
  filePath: string,
  items: ConferenciaNotasItemResult[],
  summary: ConferenciaNotasResult["summary"],
  eventos: ReinfEventDraft[],
): void {
  const lines: string[] = [
    "# Checklist EFD-Reinf (triagem Unecont)",
    "",
    `Gerado automaticamente. **Nao** responde Sim/Nao nem confere notas no Unecont.`,
    `Rascunhos de eventos em \`eventos-reinf.json\` / \`eventos-reinf.csv\` (sem transmissao).`,
    "",
    `## Resumo do lote`,
    "",
    `- Empresas OK: ${summary.success}`,
    `- Total notas: ${summary.totalNotas}`,
    `- Nao Conferidos: ${summary.naoConferidos}`,
    `- Canceladas (Nao Conferidos): ${summary.canceladas}`,
    `- Bloqueadas por interacao: ${summary.bloqueadasInteracao}`,
    `- Candidatos R-2010: ${summary.candidatosR2010}`,
    `- Candidatos R-4020: ${summary.candidatosR4020}`,
    `- Eventos rascunho gerados: ${eventos.length}`,
    "",
  ];

  for (const item of items) {
    if (item.status !== "success") continue;
    const cnpj = item.empresa.cnpj;
    const competencia = item.totais?.competenciaLabel || "__/____";
    const stats = item.stats;
    const cnpjNorm = cnpj.replace(/\D/g, "");
    const eventosEmpresa = eventos.filter((e) => e.cnpjContribuinte === cnpjNorm);

    lines.push(`## ${item.empresa.codigo} — ${item.empresa.nome}`);
    lines.push("");
    lines.push("```");
    lines.push(`COMPETÊNCIA ${competencia} — CNPJ ${cnpj}`);
    lines.push("");
    lines.push("[ ] R-1000 do ano OK (último envio __/__/__)");
    lines.push("[ ] R-1070 com processos eventuais");
    lines.push(
      `[ ] R-2010 (tomador): ${stats?.candidatosR2010 ?? 0} NFs candidatas (INSS/cessão MO)`,
    );
    lines.push("[ ] R-2020 (prestador): N/A lado tomador");
    lines.push("[ ] R-2050/R-2055: K eventos rurais (se aplicável)");
    lines.push("[ ] R-4010: P pagamentos a PF com IRRF");
    lines.push(
      `[ ] R-4020: ${stats?.candidatosR4020 ?? 0} NFs candidatas (IRRF/CSRF)`,
    );
    lines.push(`[ ] Bloqueios Unecont (interação): ${stats?.bloqueadasInteracao ?? 0}`);
    lines.push(`[ ] Canceladas sem fato: ${stats?.canceladas ?? 0}`);
    lines.push("[ ] R-2099 (fechamento periódicos) — recibo: __");
    lines.push("[ ] R-4099 (fechamento R-4000) — recibo: __");
    lines.push("");
    lines.push(
      "DCTFWeb gerada: NÃO avaliar até responder interações + conferir ativas + fechar R-2099/R-4099.",
    );
    lines.push("```");
    lines.push("");

    if (eventosEmpresa.length) {
      lines.push("### Eventos rascunho gerados");
      lines.push("");
      lines.push("| NF | Prestador | Tipo | Valores |");
      lines.push("| --- | --- | --- | --- |");
      for (const ev of eventosEmpresa) {
        const prestador = (ev.nomePrestador || ev.cnpjPrestador || "").replace(/\|/g, "/");
        lines.push(
          `| ${ev.numDocto} | ${prestador} | ${ev.evento} | ${formatValoresChecklist(ev)} |`,
        );
      }
      lines.push("");
    }

    const naoConf = item.notas.filter((n) => n.statusConferencia === "nao_conferido");
    if (naoConf.length) {
      lines.push("### Nao Conferidos");
      lines.push("");
      for (const n of naoConf) {
        const perguntas = n.detalhe?.perguntasPendentes?.length
          ? ` — perguntas: ${n.detalhe.perguntasPendentes.length}`
          : "";
        lines.push(
          `- NF **${n.numeroNfe}** (${n.prestador}) — ${n.cancelada ? "cancelada" : "ativa"} — \`${n.classificacao || "?"}\`${perguntas}`,
        );
      }
      lines.push("");
    }
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8");
}

/** Gera JSON + CSV de eventos Reinf no outputDir. */
export function writeEventosReinfArtifacts(
  outputDir: string,
  runId: string,
  items: ConferenciaNotasItemResult[],
): EventosReinfArtifacts {
  const eventos = collectReinfEventDrafts(items);
  const eventosJsonPath = path.join(outputDir, "eventos-reinf.json");
  const eventosCsvPath = path.join(outputDir, "eventos-reinf.csv");
  writeEventosReinfJson(eventosJsonPath, runId, eventos);
  writeEventosReinfCsv(eventosCsvPath, eventos);
  return { eventos, eventosJsonPath, eventosCsvPath };
}
