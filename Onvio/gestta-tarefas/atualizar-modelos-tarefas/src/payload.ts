import {
  FrequencyDate,
  GesttaTask,
  ManifestAction,
  TaskUpdatePayload,
} from "./types";

export function departmentIdOf(task: GesttaTask): string {
  const dept = task.company_department;
  return typeof dept === "string" ? dept : dept._id;
}

function normalizeFrequencyDate(
  fd?: Partial<FrequencyDate> | null,
): FrequencyDate {
  return {
    business_day: fd?.business_day ?? null,
    start_day: fd?.start_day ?? null,
    month_day: fd?.month_day ?? null,
    month: fd?.month ?? null,
    week_day: fd?.week_day ?? null,
  };
}

export function toUpdatePayload(
  task: GesttaTask,
  overrides: Partial<TaskUpdatePayload> = {},
): TaskUpdatePayload {
  const payload: TaskUpdatePayload = {
    name: task.name,
    company_department: departmentIdOf(task),
    subtype: task.subtype,
    competence: task.competence ?? 0,
    frequency: task.frequency,
    frequency_date: normalizeFrequencyDate(task.frequency_date),
    notify_customer: Boolean(task.notify_customer),
    accountancy: task.accountancy ?? 0,
    fine: Boolean(task.fine),
    business_day: Boolean(task.business_day),
    business_day_accountancy: Boolean(task.business_day_accountancy),
    postpone: Boolean(task.postpone),
    accounting_view: Boolean(task.accounting_view),
    tags: Array.isArray(task.tags) ? [...task.tags] : [],
    active: task.active !== false,
    link_existing_customers: false,
    ...overrides,
  };

  if (task.sphere != null && task.sphere !== "" && overrides.sphere === undefined) {
    payload.sphere = task.sphere;
  } else if (overrides.sphere != null) {
    payload.sphere = overrides.sphere;
  } else {
    delete (payload as { sphere?: string }).sphere;
  }

  if (overrides.frequency_date) {
    payload.frequency_date = normalizeFrequencyDate(overrides.frequency_date);
  }

  return payload;
}

export function payloadsEqual(
  a: TaskUpdatePayload,
  b: TaskUpdatePayload,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function applyModelOverrides(
  task: GesttaTask,
  actions: ManifestAction[],
): TaskUpdatePayload {
  let payload = toUpdatePayload(task);

  for (const action of actions) {
    if (action.op === "setActive") {
      payload = { ...payload, active: action.active };
    } else if (action.op === "rename") {
      payload = { ...payload, name: action.name };
    } else if (action.op === "setFrequencyBusinessDay") {
      payload = {
        ...payload,
        frequency: action.frequency,
        // O "Nº dia útil" fica em frequency_date.business_day.
        // O flag top-level business_day controla outro eixo (meta) e, com
        // accountancy=0 + business_day_accountancy, a API rejeita true.
        frequency_date: {
          business_day: action.businessDay,
          start_day: null,
          month_day: null,
          month: null,
          week_day: null,
        },
      };
    }
  }

  return payload;
}

export function summarizeTask(task: GesttaTask): Record<string, unknown> {
  return {
    name: task.name,
    active: task.active !== false,
    frequency: task.frequency,
    frequency_date: normalizeFrequencyDate(task.frequency_date),
    business_day: Boolean(task.business_day),
    customers: task.group_customer_count ?? null,
  };
}
