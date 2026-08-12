/**
 * Workaround: ACHEI Aug/2026 POST /task-gen 500 when APDATA uses Nth business day.
 * Generate ACHEI with temporary calendar day (= 15º DU de ago/2026 = 21),
 * restore APDATA to MONTHLY/business_day=15, re-regen EXATAS only.
 */
import fs from "fs";
import path from "path";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  atualizarModeloTarefa,
  obterTarefa,
  regenerarTarefasCliente,
} from "../src/endpoints";
import { toUpdatePayload } from "../src/payload";

const APDATA = "673c9c08d2dc517895bc1b01";
const ACHEI = "64d4c7bbf8fefe0007e875c7";
const EXATAS = "60b6797d9fda5800070dbe7c";
const AUG = { month: 8, year: 2026 };
/** 15º dia útil de agosto/2026 (calendário BR sem feriados nacionais extras no cálculo simples). */
const AUG_15TH_BUSINESS_DAY_AS_MONTH_DAY = 21;

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main(): Promise<void> {
  const client = createGesttaClient(getJwt());
  const startedAt = new Date().toISOString();
  const reportsDir = path.resolve(__dirname, "..", "..", "relatorios");

  const task = await obterTarefa(client, APDATA);
  const restore = toUpdatePayload(task);

  if (
    restore.frequency !== "MONTHLY" ||
    restore.frequency_date.business_day !== 15
  ) {
    throw new Error(
      `APDATA nao esta no estado esperado MONTHLY/15DU: ${JSON.stringify(restore.frequency_date)}`,
    );
  }

  const temp = toUpdatePayload(task, {
    frequency_date: {
      business_day: null,
      start_day: null,
      month_day: AUG_15TH_BUSINESS_DAY_AS_MONTH_DAY,
      month: null,
      week_day: null,
    },
    business_day: false,
    business_day_accountancy: false,
  });

  const steps: Array<Record<string, unknown>> = [];

  try {
    const updated = await atualizarModeloTarefa(client, APDATA, temp);
    steps.push({
      step: "temp_apdata_month_day",
      ok: true,
      frequency_date: updated.frequency_date,
      business_day_accountancy: updated.business_day_accountancy,
    });

    const achei = await regenerarTarefasCliente(client, ACHEI, AUG);
    steps.push({
      step: "achei_regen_with_temp",
      erase: achei.erase,
      generate: achei.generate,
      ok: achei.generate.ok,
    });
    if (!achei.generate.ok) {
      throw new Error("ACHEI generate failed even with temp month_day model");
    }

    const restored = await atualizarModeloTarefa(client, APDATA, restore);
    steps.push({
      step: "restore_apdata_15du",
      ok: true,
      frequency_date: restored.frequency_date,
      business_day: restored.business_day,
      business_day_accountancy: restored.business_day_accountancy,
    });

    const exatas = await regenerarTarefasCliente(client, EXATAS, AUG);
    steps.push({
      step: "exatas_regen_with_restored",
      erase: exatas.erase,
      generate: exatas.generate,
      ok: exatas.erase.ok && exatas.generate.ok,
    });
    if (!exatas.generate.ok) {
      throw new Error("EXATAS regenerate failed after APDATA restore");
    }

    // Confirm ACHEI still has Aug tasks: DELETE returns 200 only if tasks exist;
    // we probe with POST which returns customer_task.not.found when already generated.
    const probe = await client.request({
      method: "POST",
      url: `/task-gen/admin/customer/${ACHEI}`,
      data: AUG,
      validateStatus: () => true,
    });
    steps.push({
      step: "achei_aug_probe_post_without_delete",
      status: probe.status,
      body: probe.data,
      interpretedAsAlreadyGenerated:
        probe.status === 404 &&
        typeof probe.data === "object" &&
        probe.data &&
        (probe.data as { code?: string }).code === "customer_task.not.found",
    });

    const finishedAt = new Date().toISOString();
    const ts = stamp();
    const reportPath = path.join(
      reportsDir,
      `regeneracao_achei_workaround_${ts}.json`,
    );
    const notePath = path.join(reportsDir, `nota_achei_regen_2026-08-12.json`);

    const report = {
      schemaVersion: 1,
      kind: "gestta-dp-consultivo-achei-aug-workaround",
      startedAt,
      finishedAt,
      competence: AUG,
      rootCause:
        "POST /task-gen/admin/customer/ACHEI retorna 500 para 08/2026 quando o modelo CONFERÊNCIA APDATA_1 está com frequency_date.business_day=15 (Nº dia útil). O mesmo modelo regenera EXATAS com sucesso. Com APDATA temporariamente em month_day=21 (equivalente ao 15º DU de ago/2026), a geração do ACHEI funciona.",
      workaround:
        "Gerar ACHEI 08/2026 com APDATA em dia calendário 21; restaurar APDATA para MONTHLY/15º DU; regenerar só EXATAS com o modelo restaurado; NÃO apagar de novo as instâncias do ACHEI em 08/2026.",
      steps,
      result: "success",
    };

    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

    const note = {
      schemaVersion: 1,
      kind: "gestta-dp-consultivo-achei-regen-note",
      createdAt: finishedAt,
      customerId: ACHEI,
      customerName: "ACHEI COMERCIO E SERVICOS LTDA",
      taskId: APDATA,
      taskName: "CONFERÊNCIA APDATA_1",
      competence: AUG,
      status: "fixed",
      priorFailure:
        "relatorios/regeneracao_dp_consultivo_2026-08-12T18-31-44-237Z.json — DELETE 200, POST 500 x3",
      retryFailure:
        "relatorios/regeneracao_achei_retry_2026-08-12T18-33-51-053Z.json — DELETE 404 (já apagado), POST 500 x3",
      workaroundReport: path
        .relative(path.resolve(reportsDir, ".."), reportPath)
        .replace(/\\/g, "/"),
      modelAfterFix: {
        frequency: "MONTHLY",
        frequency_date_business_day: 15,
        business_day: false,
        business_day_accountancy: true,
        note: "Modelo global restaurado ao contrato consultivo (15º dia útil).",
      },
      acheiAugustInstances:
        "Regeneradas com due date baseada em month_day=21 durante o workaround; em ago/2026 o 15º dia útil coincide com o dia 21, então a data operacional fica alinhada. Não reexecutar DELETE+POST do ACHEI em 08/2026 enquanto o bug Gestta persistir.",
      rootCause:
        "Bug/instabilidade no gerador Gestta (POST /task-gen) para o cliente ACHEI na competência 08/2026 quando CONFERÊNCIA APDATA_1 usa Nº dia útil (frequency_date.business_day=15). EXATAS com o mesmo modelo gera OK. Julho/2026 no ACHEI também regenera OK com o modelo 15º DU.",
      manualWorkaroundIfNeededAgain: [
        "1) PUT APDATA temporariamente para frequency=MONTHLY, frequency_date.month_day=<15º DU do mês alvo>, business_day=false, business_day_accountancy=false.",
        "2) POST /task-gen/admin/customer/64d4c7bbf8fefe0007e875c7 com {month,year} (DELETE só se ainda houver instâncias).",
        "3) Restaurar APDATA para frequency_date.business_day=15 + business_day_accountancy=true + business_day=false.",
        "4) Regenerar EXATAS (e demais clientes OK) com o modelo restaurado.",
        "5) Alternativa UI: Gerar tarefas do ACHEI na competência; se a UI também falhar, abrir chamado Gestta com x-request-id do 500 e customerId ACHEI.",
      ],
      exatasStatus: "re-regenerated_ok_after_model_restore",
    };

    fs.writeFileSync(notePath, JSON.stringify(note, null, 2), "utf8");

    // Update resumo pointer
    const resumoPath = path.join(reportsDir, "resumo_dp_consultivo_2026-08-12.json");
    if (fs.existsSync(resumoPath)) {
      const resumo = JSON.parse(fs.readFileSync(resumoPath, "utf8"));
      resumo.regeneration = {
        ...(resumo.regeneration || {}),
        "EXATAS CONTABILIDADE LTDA": "success",
        "ACHEI COMERCIO E SERVICOS LTDA": "success_via_workaround",
        acheiDetail:
          "POST 500 com APDATA em 15º DU; corrigido gerando 08/2026 com month_day=21 (equiv. 15º DU ago/2026) e restaurando o modelo. Ver nota_achei_regen_2026-08-12.json.",
        acheiNote: "relatorios/nota_achei_regen_2026-08-12.json",
        acheiWorkaroundReport: path
          .relative(path.resolve(reportsDir, ".."), reportPath)
          .replace(/\\/g, "/"),
      };
      resumo.updatedAt = finishedAt;
      fs.writeFileSync(resumoPath, JSON.stringify(resumo, null, 2), "utf8");
    }

    console.log(`[report] ${reportPath}`);
    console.log(`[note] ${notePath}`);
    console.log("[result] success");
  } catch (e: unknown) {
    // Always try to restore APDATA
    try {
      await atualizarModeloTarefa(client, APDATA, restore);
      console.log("[restore] APDATA restored after failure");
    } catch (e2: unknown) {
      console.error("[restore] FAILED", e2);
    }
    throw e;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
