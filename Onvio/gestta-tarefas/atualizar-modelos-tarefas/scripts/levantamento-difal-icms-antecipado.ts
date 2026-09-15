/**
 * Levantamento somente leitura de GUIA DIFERENCIAL DE ALÍQUOTAS e
 * ICMS ANTECIPADO (Normal vs Simples), no mesmo formato do relatório SPED/ICMS.
 *
 * Não altera o Gestta. Gera Excel + JSON em relatorios/.
 *
 * Executar: npx ts-node scripts/levantamento-difal-icms-antecipado.ts
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  buscarTarefasGeradasCliente,
  customerIdOf,
  customerNameOf,
  listarClientesDaTarefa,
  listarTarefasRecorrentes,
} from "../src/endpoints";
import { GesttaTask, TaskCustomerLink } from "../src/types";

const REPORTS_DIR = path.resolve(__dirname, "..", "..", "relatorios");
const PREFIX_DIFAL = "GUIA DIFERENCIAL DE ALIQUOTAS";
const PREFIX_ANTECIPADO = "ICMS ANTECIPADO";

type Family = "DIFAL" | "ANTECIPADO_NORMAL" | "ANTECIPADO_SN" | "PENDENCIA";
type Regime = "NORMAL" | "SN" | "NAO_CLASSIFICADO" | "DIFAL";

interface ModelRow {
  family: Family;
  task: GesttaTask;
  uf: string;
  regime: Regime;
  whatsapp: boolean;
  particularidade: string;
  active: boolean;
  links: TaskCustomerLink[];
  legal: number | "";
  meta: number | "";
  offset: number | "";
  postpone: string;
  businessDay: string;
  referenceName: string;
  referenceMeta: number | "";
  pendenciaMotivo: string;
}

interface GeneratedLookup {
  modelName: string;
  customerId: string;
  customerName: string;
  linkActive: string;
  taskId: string;
  family: Family;
}

const KNOWN_UFS = new Set(
  [
    "ACRE",
    "ALAGOAS",
    "AMAPA",
    "AMAZONAS",
    "BAHIA",
    "CEARA",
    "DISTRITO FEDERAL",
    "ESPIRITO SANTO",
    "GOIAS",
    "MARANHAO",
    "MATO GROSSO",
    "MATO GROSSO DO SUL",
    "MINAS GERAIS",
    "PARA",
    "PARAIBA",
    "PARANA",
    "PERNAMBUCO",
    "PIAUI",
    "RIO DE JANEIRO",
    "RIO GRANDE DO NORTE",
    "RIO GRANDE DO SUL",
    "RONDONIA",
    "RORAIMA",
    "SANTA CATARINA",
    "SAO PAULO",
    "SERGIPE",
    "TOCANTINS",
  ].map((item) => normalize(item)),
);

function normalize(value: string | undefined | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isWhatsapp(name: string): boolean {
  return normalize(name).includes("VIA WHATSAPP");
}

function extractUf(name: string): string {
  const match = name.match(/\(([^)]+)\)/);
  if (!match?.[1]) return "";
  return normalize(match[1]);
}

function extractParticularidade(name: string): string {
  const withoutWa = name.replace(/\s*-\s*VIA WHATSAPP\s*$/i, "").trim();
  const match = withoutWa.match(/\)\s*-\s*(.+)$/);
  return match?.[1]?.trim() ?? "";
}

function classifyAntecipado(name: string): {
  family: Family;
  regime: Regime;
  motivo: string;
} {
  const n = normalize(name);
  const hasNormal = /\bNORMAL\b/.test(n);
  const hasSn = /\bSN\b/.test(n) || n.includes("SIMPLES NACIONAL");
  if (hasNormal && !hasSn) {
    return { family: "ANTECIPADO_NORMAL", regime: "NORMAL", motivo: "" };
  }
  if (hasSn && !hasNormal) {
    return { family: "ANTECIPADO_SN", regime: "SN", motivo: "" };
  }
  if (hasNormal && hasSn) {
    return {
      family: "PENDENCIA",
      regime: "NAO_CLASSIFICADO",
      motivo: "Nome contém NORMAL e SN ao mesmo tempo",
    };
  }
  return {
    family: "PENDENCIA",
    regime: "NAO_CLASSIFICADO",
    motivo: "ICMS ANTECIPADO sem marcador NORMAL ou SN/SIMPLES NACIONAL",
  };
}

function dayOrEmpty(
  value: number | null | undefined,
): number | "" {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 31) {
    return "";
  }
  return Number(value);
}

function metaOf(task: GesttaTask): number | "" {
  const legal = dayOrEmpty(task.frequency_date?.month_day);
  const offset = Number(task.accountancy);
  if (legal === "" || !Number.isInteger(offset)) return "";
  return legal + offset;
}

function dateInSaoPaulo(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function stampDay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function withConcurrency<T, R>(
  values: T[],
  limit: number,
  work: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      results[index] = await work(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}

function applyTableStyle(sheet: XLSX.WorkSheet, headerRow: number): void {
  const ref = sheet["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  sheet["!autofilter"] = { ref };
  (sheet as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: headerRow,
  };
  sheet["!rows"] = Array.from({ length: range.e.r + 1 }, (_, index) =>
    index === headerRow - 1 ? { hpt: 30 } : { hpt: 18 },
  );

  const headerFill = "1F4E78";
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const address = XLSX.utils.encode_cell({ r: headerRow - 1, c: column });
    const cell = sheet[address];
    if (!cell) continue;
    (cell as XLSX.CellObject & { s?: unknown }).s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: headerFill } },
      alignment: { vertical: "center", wrapText: true },
    };
  }

  const headers = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow - 1, c: index })];
    return String(cell?.v ?? "");
  });
  sheet["!cols"] = headers.map((header, column) => {
    let maxLength = header.length;
    for (let row = headerRow; row <= range.e.r; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      maxLength = Math.max(maxLength, String(cell?.v ?? "").length);
    }
    return { wch: Math.min(Math.max(maxLength + 2, 12), 55) };
  });
}

function buildTable(
  headers: string[],
  rows: Array<Array<string | number>>,
): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...(rows.length > 0 ? rows : [headers.map(() => "")]),
  ]);
  applyTableStyle(sheet, 1);
  return sheet;
}

function findIcmsReference(
  activeIcms: GesttaTask[],
  uf: string,
  regime: Regime,
): GesttaTask | undefined {
  if (!uf || !KNOWN_UFS.has(uf)) return undefined;
  const candidates = activeIcms.filter(
    (icms) =>
      extractUf(icms.name) === uf &&
      !isWhatsapp(icms.name) &&
      !normalize(icms.name).includes("PROVEDOR"),
  );
  if (regime === "SN") {
    return (
      candidates.find((item) =>
        normalize(item.name).includes("SIMPLES NACIONAL"),
      ) ??
      candidates.find(
        (item) => !normalize(item.name).includes("SIMPLES NACIONAL"),
      )
    );
  }
  return candidates.find(
    (item) => !normalize(item.name).includes("SIMPLES NACIONAL"),
  );
}

function modelToAoA(item: ModelRow): Array<string | number> {
  return [
    item.task.name,
    item.task._id,
    item.uf || "(sem UF)",
    item.regime,
    item.whatsapp ? "sim" : "não",
    item.particularidade || "",
    item.active ? "sim" : "não",
    item.links.length,
    item.legal,
    item.meta,
    item.offset,
    item.postpone,
    item.businessDay,
    item.referenceName,
    item.referenceMeta,
  ];
}

const MODEL_HEADERS = [
  "Modelo",
  "ID do modelo",
  "UF",
  "Regime",
  "Via WhatsApp",
  "Particularidade",
  "Ativo",
  "Clientes vinculados",
  "Data legal",
  "Data meta",
  "Offset",
  "Postergar",
  "Dia útil",
  "ICMS NORMAL de referência",
  "Meta ICMS referência",
];

async function main(): Promise<void> {
  const client = createGesttaClient(getJwt());
  console.log("[difal-antecipado] carregando modelos recorrentes...");
  const allTasks = await listarTarefasRecorrentes(client);
  console.log(`[difal-antecipado] modelos recorrentes=${allTasks.length}`);

  const activeIcms = allTasks.filter(
    (task) =>
      task.active !== false && normalize(task.name).startsWith("ICMS NORMAL"),
  );

  const scoped = allTasks.filter((task) => {
    const n = normalize(task.name);
    return n.startsWith(PREFIX_DIFAL) || n.startsWith(PREFIX_ANTECIPADO);
  });
  console.log(`[difal-antecipado] no escopo=${scoped.length}`);

  const withLinks = await withConcurrency(scoped, 5, async (task) => ({
    task,
    links: await listarClientesDaTarefa(client, task._id),
  }));

  const models: ModelRow[] = withLinks.map(({ task, links }) => {
    const n = normalize(task.name);
    const uf = extractUf(task.name);
    const whatsapp = isWhatsapp(task.name);
    const particularidade = extractParticularidade(task.name);
    const active = task.active !== false;
    const legal = dayOrEmpty(task.frequency_date?.month_day);
    const offset = Number.isInteger(Number(task.accountancy))
      ? Number(task.accountancy)
      : ("" as const);
    const meta = metaOf(task);
    const postpone = task.postpone ? "sim" : "não";
    const businessDay = task.business_day ? "sim" : "não";

    let family: Family;
    let regime: Regime;
    let pendenciaMotivo = "";

    if (n.startsWith(PREFIX_DIFAL)) {
      family = "DIFAL";
      regime = "DIFAL";
    } else {
      const classified = classifyAntecipado(task.name);
      family = classified.family;
      regime = classified.regime;
      pendenciaMotivo = classified.motivo;
    }

    const ufOk = Boolean(uf) && KNOWN_UFS.has(uf);
    if (!ufOk) {
      family = "PENDENCIA";
      if (!pendenciaMotivo) {
        pendenciaMotivo = uf
          ? `UF não reconhecida ou malformada: ${uf}`
          : "UF ausente no nome do modelo";
      } else {
        pendenciaMotivo = `${pendenciaMotivo}; UF inválida/ausente`;
      }
    }

    const reference = findIcmsReference(
      activeIcms,
      uf,
      regime === "DIFAL" ? "NORMAL" : regime,
    );
    const referenceMeta = reference ? metaOf(reference) : "";

    return {
      family,
      task,
      uf,
      regime,
      whatsapp,
      particularidade,
      active,
      links,
      legal,
      meta,
      offset,
      postpone,
      businessDay,
      referenceName: reference?.name ?? "SEM REFERÊNCIA",
      referenceMeta,
      pendenciaMotivo,
    };
  });

  const difal = models.filter((item) => item.family === "DIFAL");
  const antecipadoNormal = models.filter(
    (item) => item.family === "ANTECIPADO_NORMAL",
  );
  const antecipadoSn = models.filter((item) => item.family === "ANTECIPADO_SN");

  // Pendências: UF/regime indefinidos + modelos com particularidade no nome.
  const pendenciaById = new Map<string, ModelRow>();
  for (const item of models) {
    const needsPendencia =
      item.family === "PENDENCIA" || Boolean(item.particularidade);
    if (!needsPendencia) continue;
    const motivo =
      item.pendenciaMotivo ||
      (item.particularidade
        ? `Particularidade no nome: ${item.particularidade}`
        : "Pendência de nome");
    const existing = pendenciaById.get(item.task._id);
    if (!existing) {
      pendenciaById.set(item.task._id, { ...item, pendenciaMotivo: motivo });
      continue;
    }
    if (!existing.pendenciaMotivo.includes(motivo)) {
      existing.pendenciaMotivo = `${existing.pendenciaMotivo}; ${motivo}`;
    }
  }
  const pendencias = [...pendenciaById.values()].sort((a, b) =>
    a.task.name.localeCompare(b.task.name, "pt-BR"),
  );

  const inScopeForGenerated = models.filter(
    (item) =>
      item.family === "DIFAL" ||
      item.family === "ANTECIPADO_NORMAL" ||
      item.family === "ANTECIPADO_SN" ||
      item.family === "PENDENCIA",
  );
  const linkCount = inScopeForGenerated.reduce(
    (total, item) => total + item.links.length,
    0,
  );

  const generatedTargets = new Map<string, GeneratedLookup[]>();
  for (const item of inScopeForGenerated) {
    for (const link of item.links) {
      const customerId = customerIdOf(link);
      const rows = generatedTargets.get(customerId) ?? [];
      rows.push({
        modelName: item.task.name,
        customerId,
        customerName: customerNameOf(link) ?? "",
        linkActive:
          (link as TaskCustomerLink & { active?: boolean }).active === false
            ? "não"
            : "sim",
        taskId: item.task._id,
        family: item.family,
      });
      generatedTargets.set(customerId, rows);
    }
  }

  console.log(
    `[difal-antecipado] vínculos=${linkCount}; clientes=${generatedTargets.size}; buscando geradas...`,
  );
  const generatedByCustomer = await withConcurrency(
    [...generatedTargets.entries()],
    5,
    async ([customerId, rows]) => ({
      customerId,
      rows,
      tasks: await buscarTarefasGeradasCliente(client, customerId, [
        "OPEN",
        "IMPEDIMENT",
      ]),
    }),
  );

  const generatedRows: Array<Array<string | number>> = [];
  for (const item of generatedByCustomer) {
    const expected = new Map(item.rows.map((row) => [row.modelName, row]));
    for (const task of item.tasks) {
      const target = expected.get(task.name);
      if (!target) continue;
      const raw = task as unknown as Record<string, unknown>;
      const owner = raw.owner as { name?: string } | undefined;
      generatedRows.push([
        target.customerName ||
          String((task.customer as { name?: string } | undefined)?.name ?? ""),
        target.customerId,
        target.modelName,
        target.taskId,
        target.family,
        target.linkActive,
        task.status,
        dateInSaoPaulo(task.competence_date),
        dateInSaoPaulo(task.legal_date),
        dateInSaoPaulo(task.due_date),
        owner?.name ?? "",
        task._id,
      ]);
    }
  }
  generatedRows.sort(
    (a, b) =>
      String(a[0]).localeCompare(String(b[0]), "pt-BR") ||
      String(a[7]).localeCompare(String(b[7]), "pt-BR") ||
      String(a[2]).localeCompare(String(b[2]), "pt-BR"),
  );

  const sortModels = (items: ModelRow[]) =>
    items
      .slice()
      .sort((a, b) => a.task.name.localeCompare(b.task.name, "pt-BR"));

  const day = stampDay();
  const baseName = `levantamento_difal_icms_antecipado_${day}`;
  const excelPath = path.join(REPORTS_DIR, `${baseName}.xlsx`);
  const jsonPath = path.join(REPORTS_DIR, `${baseName}.json`);

  const summaryRows: Array<Array<string | number>> = [
    ["LEVANTAMENTO DIFAL E ICMS ANTECIPADO", ""],
    ["Assunto", "Inventário atual — Guia Diferencial de Alíquotas e ICMS Antecipado (Normal / SN)"],
    [
      "Levantamento",
      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    ],
    [
      "Natureza",
      "Somente leitura. Nenhuma alteração foi executada no Gestta.",
    ],
    ["Modelos no escopo (ativos + inativos)", models.length],
    ["Guia Diferencial de Alíquotas", difal.length],
    ["ICMS Antecipado — Normal", antecipadoNormal.length],
    ["ICMS Antecipado — SN / Simples", antecipadoSn.length],
    ["Pendências de nome (UF/regime/particularidade)", pendencias.length],
    ["Vínculos de clientes no escopo", linkCount],
    ["Clientes com vínculo no escopo", generatedTargets.size],
    ["Tarefas geradas OPEN/IMPEDIMENT encontradas", generatedRows.length],
    [
      "Modelos ativos no escopo",
      models.filter((item) => item.active).length,
    ],
    [
      "Modelos inativos no escopo",
      models.filter((item) => !item.active).length,
    ],
    [
      "Ação necessária do Fiscal",
      "Validar datas legal/meta por UF e regime; revisar pendências de nome. Aplicação de datas novas fica para etapa posterior.",
    ],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 48 }, { wch: 110 }];
  summarySheet["!rows"] = summaryRows.map((_, index) => ({
    hpt: index === 0 ? 30 : 28,
  }));
  for (const address of ["A1", "B1"]) {
    const cell = summarySheet[address];
    if (cell) {
      (cell as XLSX.CellObject & { s?: unknown }).s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
        fill: { patternType: "solid", fgColor: { rgb: "1F4E78" } },
        alignment: { vertical: "center", wrapText: true },
      };
    }
  }
  for (let row = 1; row < summaryRows.length; row += 1) {
    const label = summarySheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    const value = summarySheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    if (label) {
      (label as XLSX.CellObject & { s?: unknown }).s = {
        font: { bold: true },
        alignment: { vertical: "center", wrapText: true },
      };
    }
    if (value) {
      (value as XLSX.CellObject & { s?: unknown }).s = {
        alignment: { vertical: "center", wrapText: true },
      };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(MODEL_HEADERS, sortModels(difal).map(modelToAoA)),
    "Guia Diferencial",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(MODEL_HEADERS, sortModels(antecipadoNormal).map(modelToAoA)),
    "ICMS Antecipado Normal",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(MODEL_HEADERS, sortModels(antecipadoSn).map(modelToAoA)),
    "ICMS Antecipado SN",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(
      [
        ...MODEL_HEADERS,
        "Motivo da pendência",
        "Encaminhamento ao Fiscal",
      ],
      pendencias.map((item) => [
        ...modelToAoA(item),
        item.pendenciaMotivo,
        "Revisar nome do modelo (UF/regime/particularidade) antes de qualquer alteração de datas.",
      ]),
    ),
    "Pendências de nome",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(
      [
        "Cliente",
        "ID do cliente",
        "Modelo",
        "ID do modelo",
        "Família",
        "Vínculo ativo",
        "Status",
        "Competência",
        "Data legal",
        "Data meta",
        "Responsável",
        "ID da instância",
      ],
      generatedRows.length > 0
        ? generatedRows
        : [
            [
              "Nenhuma tarefa não finalizada encontrada",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ],
          ],
    ),
    "Tarefas geradas",
  );

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  XLSX.writeFile(workbook, excelPath, { compression: true });

  const jsonPayload = {
    schemaVersion: 1,
    kind: "levantamento-difal-icms-antecipado",
    createdAt: new Date().toISOString(),
    summary: {
      totalModels: models.length,
      difal: difal.length,
      antecipadoNormal: antecipadoNormal.length,
      antecipadoSn: antecipadoSn.length,
      pendencias: pendencias.length,
      linkCount,
      customers: generatedTargets.size,
      generatedOpenOrImpediment: generatedRows.length,
      active: models.filter((item) => item.active).length,
      inactive: models.filter((item) => !item.active).length,
    },
    models: models.map((item) => ({
      id: item.task._id,
      name: item.task.name,
      family: item.family,
      uf: item.uf,
      regime: item.regime,
      whatsapp: item.whatsapp,
      particularidade: item.particularidade,
      active: item.active,
      customers: item.links.length,
      legal: item.legal,
      meta: item.meta,
      offset: item.offset,
      postpone: item.postpone,
      businessDay: item.businessDay,
      referenceName: item.referenceName,
      referenceMeta: item.referenceMeta,
      pendenciaMotivo: item.pendenciaMotivo,
    })),
    pendencias: pendencias.map((item) => ({
      id: item.task._id,
      name: item.task.name,
      motivo: item.pendenciaMotivo,
      family: item.family,
      particularidade: item.particularidade,
    })),
    excelPath,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), "utf8");

  console.log(`[difal-antecipado] Excel: ${excelPath}`);
  console.log(`[difal-antecipado] JSON: ${jsonPath}`);
  console.log(
    `[difal-antecipado] difal=${difal.length} normal=${antecipadoNormal.length} sn=${antecipadoSn.length} pendencias=${pendencias.length} geradas=${generatedRows.length}`,
  );
}

main().catch((error) => {
  console.error("[difal-antecipado] falha", error);
  process.exitCode = 1;
});
