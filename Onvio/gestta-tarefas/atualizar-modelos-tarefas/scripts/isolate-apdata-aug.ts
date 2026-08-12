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

async function main(): Promise<void> {
  const client = createGesttaClient(getJwt());
  const task = await obterTarefa(client, APDATA);
  const restore = toUpdatePayload(task);
  console.log(
    "before",
    JSON.stringify(restore.frequency_date),
    "bd",
    restore.business_day,
    "bda",
    restore.business_day_accountancy,
  );

  const temp = toUpdatePayload(task, {
    frequency_date: {
      business_day: null,
      start_day: null,
      month_day: 21,
      month: null,
      week_day: null,
    },
    business_day: false,
    business_day_accountancy: false,
  });

  try {
    const updated = await atualizarModeloTarefa(client, APDATA, temp);
    console.log(
      "temp applied",
      JSON.stringify(updated.frequency_date),
      "bda",
      updated.business_day_accountancy,
    );

    const rg = await regenerarTarefasCliente(client, ACHEI, AUG);
    console.log("ACHEI Aug with temp model", JSON.stringify(rg));

    const restored = await atualizarModeloTarefa(client, APDATA, restore);
    console.log(
      "restored",
      JSON.stringify(restored.frequency_date),
      "bd",
      restored.business_day,
      "bda",
      restored.business_day_accountancy,
    );

    const ex = await regenerarTarefasCliente(client, EXATAS, AUG);
    console.log("EXATAS re-regen", JSON.stringify(ex));

    const ac = await regenerarTarefasCliente(client, ACHEI, AUG);
    console.log("ACHEI Aug with restored model", JSON.stringify(ac));
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: unknown }; message?: string };
    console.error("ERROR", err.response?.status, err.response?.data || err.message);
    try {
      await atualizarModeloTarefa(client, APDATA, restore);
      console.log("restored after error");
    } catch (e2: unknown) {
      const err2 = e2 as { response?: { data?: unknown }; message?: string };
      console.error("RESTORE FAILED", err2.response?.data || err2.message);
    }
    process.exit(1);
  }
}

main();
