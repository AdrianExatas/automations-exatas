/**
 * One-off: retry task-gen erase+generate only for ACHEI (APDATA_1 competence).
 * Does not re-apply model changes.
 */
import fs from "fs";
import path from "path";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  listarClientesDaTarefa,
  obterTarefa,
  regenerarTarefasCliente,
  customerIdOf,
  customerNameOf,
} from "../src/endpoints";

const ACHEI_ID = "64d4c7bbf8fefe0007e875c7";
const APDATA_TASK_ID = "673c9c08d2dc517895bc1b01";
const COMPETENCE = { month: 8, year: 2026 };
const MAX_ATTEMPTS = 3;
const DELAY_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main(): Promise<void> {
  const client = createGesttaClient(getJwt());
  const startedAt = new Date().toISOString();
  const reportsDir = path.resolve(__dirname, "..", "..", "relatorios");

  const task = await obterTarefa(client, APDATA_TASK_ID);
  const links = await listarClientesDaTarefa(client, APDATA_TASK_ID);
  const acheiLink = links.find((l) => customerIdOf(l) === ACHEI_ID);
  const diagnosis: Record<string, unknown> = {
    taskId: APDATA_TASK_ID,
    taskName: task.name,
    active: task.active,
    frequency: task.frequency,
    frequency_date: task.frequency_date,
    business_day: task.business_day,
    customersLinked: links.length,
    acheiLinked: Boolean(acheiLink),
    acheiName: acheiLink ? customerNameOf(acheiLink) : undefined,
    acheiLinkRaw: acheiLink ?? null,
  };

  // Probe customer tasks listing if available (best-effort)
  try {
    const probe = await client.request({
      method: "GET",
      url: `/admin/company/customer/${ACHEI_ID}`,
      validateStatus: () => true,
    });
    diagnosis.customerProbe = {
      status: probe.status,
      keys:
        probe.data && typeof probe.data === "object"
          ? Object.keys(probe.data as object).slice(0, 40)
          : typeof probe.data,
      name: (probe.data as { name?: string })?.name,
      active: (probe.data as { active?: boolean })?.active,
    };
  } catch (e) {
    diagnosis.customerProbeError =
      e instanceof Error ? e.message : String(e);
  }

  const attempts: Array<Record<string, unknown>> = [];
  let finalOk = false;

  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    console.log(`[retry ${i}/${MAX_ATTEMPTS}] ACHEI erase+generate ${COMPETENCE.month}/${COMPETENCE.year}`);
    const rg = await regenerarTarefasCliente(client, ACHEI_ID, COMPETENCE);
    attempts.push({
      attempt: i,
      at: new Date().toISOString(),
      erase: rg.erase,
      generate: rg.generate,
    });
    console.log(
      `  erase=${rg.erase.status} ok=${rg.erase.ok} generate=${rg.generate.status} ok=${rg.generate.ok}`,
    );
    if (rg.erase.ok && rg.generate.ok) {
      finalOk = true;
      break;
    }
    // If erase OK but generate failed, avoid re-erasing blindly on next try:
    // still follow same DELETE+POST contract as main script (Gestta expects pair).
    if (i < MAX_ATTEMPTS) await sleep(DELAY_MS);
  }

  const finishedAt = new Date().toISOString();
  const ts = stamp();
  const reportPath = path.join(
    reportsDir,
    `regeneracao_achei_retry_${ts}.json`,
  );
  const notePath = path.join(
    reportsDir,
    `nota_achei_regen_${ts.slice(0, 10)}.json`,
  );

  const report = {
    schemaVersion: 1,
    kind: "gestta-dp-consultivo-achei-regen-retry",
    startedAt,
    finishedAt,
    competence: COMPETENCE,
    customerId: ACHEI_ID,
    customerName: "ACHEI COMERCIO E SERVICOS LTDA",
    taskId: APDATA_TASK_ID,
    taskName: "CONFERÊNCIA APDATA_1",
    diagnosis,
    attempts,
    result: finalOk ? "success" : "failure",
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  const note = {
    schemaVersion: 1,
    kind: "gestta-dp-consultivo-achei-regen-note",
    createdAt: finishedAt,
    customerId: ACHEI_ID,
    customerName: "ACHEI COMERCIO E SERVICOS LTDA",
    taskId: APDATA_TASK_ID,
    taskName: "CONFERÊNCIA APDATA_1",
    competence: COMPETENCE,
    status: finalOk ? "fixed" : "still_broken",
    priorFailure:
      "relatorios/regeneracao_dp_consultivo_2026-08-12T18-31-44-237Z.json — DELETE 200, POST 500 x3",
    retryReport: path.relative(path.resolve(reportsDir, ".."), reportPath).replace(/\\/g, "/"),
    diagnosisSummary: {
      modelOk:
        task.frequency === "MONTHLY" &&
        (task.frequency_date as { business_day?: number })?.business_day === 15,
      acheiLinkedToApdata: Boolean(acheiLink),
      lastGenerateStatus: (attempts[attempts.length - 1] as { generate?: { status?: number } })
        ?.generate?.status,
      lastGenerateBody: (attempts[attempts.length - 1] as { generate?: { body?: unknown } })
        ?.generate?.body,
    },
    rootCause: finalOk
      ? null
      : "API Gestta POST /task-gen/admin/customer/{acheiId} continua retornando 500 Internal Server Error após DELETE 200. Modelo APDATA_1 já está correto (MONTHLY + business_day=15). Falha é do lado servidor Gestta na regeneração de instâncias do cliente ACHEI, não do apply do modelo.",
    manualWorkaround: finalOk
      ? null
      : [
          "No Gestta UI: Clientes → ACHEI COMERCIO E SERVICOS LTDA → regenerar tarefas da competência 08/2026 (ou Geração de tarefas / task-gen).",
          "Alternativa: abrir CONFERÊNCIA APDATA_1 no mês 08/2026 para ACHEI e confirmar se a instância existe; se DELETE limpou e POST falhou, pode faltar a tarefa no mês — criar/regenerar manualmente.",
          "Se a UI também falhar, abrir chamado Gestta com customerId=64d4c7bbf8fefe0007e875c7, competência 08/2026, endpoint POST /task-gen/admin/customer/{id} status 500.",
          "Não reaplicar o manifesto dp-consultivo: EXATAS já regenerou; apply de modelos/checklists já concluído.",
        ],
  };

  fs.writeFileSync(notePath, JSON.stringify(note, null, 2), "utf8");
  console.log(`[report] ${reportPath}`);
  console.log(`[note] ${notePath}`);
  console.log(`[result] ${finalOk ? "success" : "failure"}`);
  process.exit(finalOk ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
