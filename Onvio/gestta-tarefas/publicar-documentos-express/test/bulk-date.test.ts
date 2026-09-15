import { describe, expect, it } from "vitest";

const bulkDate = require("../src/electron/bulk-date.js") as {
  apply: (confirmations: Map<string, Confirmation>, ids: string[], date: string) => Snapshot;
  buildPreview: (rows: Row[], confirmations: Map<string, Confirmation>, ids: Set<string>, date: string, today?: string) => Preview;
  editDate: (confirmation: Confirmation, date: string) => void;
  isEligible: (row: Row) => boolean;
  undo: (confirmations: Map<string, Confirmation>, snapshot: Snapshot) => void;
};

interface Confirmation {
  id: string;
  confirmedDueDate: string;
  dueDateConfirmed: boolean;
  taskConfirmed: boolean;
}

interface Row {
  id: string;
  task?: { id: string };
  messages: Array<{ code: string; severity: string }>;
}

interface Snapshot {
  appliedDate: string;
  values: Array<{ id: string; confirmedDueDate: string; dueDateConfirmed: boolean }>;
}

interface Preview {
  ids: string[];
  count: number;
  overwrittenCount: number;
  isPast: boolean;
}

function confirmations() {
  return new Map<string, Confirmation>([
    ["one", { id: "one", confirmedDueDate: "2026-08-21", dueDateConfirmed: false, taskConfirmed: true }],
    ["two", { id: "two", confirmedDueDate: "2026-08-25", dueDateConfirmed: true, taskConfirmed: false }],
  ]);
}

const rows: Row[] = [
  { id: "one", task: { id: "task-one" }, messages: [] },
  { id: "two", task: { id: "task-two" }, messages: [{ code: "past_due_date", severity: "warning" }] },
  { id: "blocked", messages: [{ code: "task_resolution_failed", severity: "error" }] },
];

describe("alteracao em lote de vencimentos", () => {
  it("aplica a mesma data somente aos documentos selecionados e preserva a confirmacao da tarefa", () => {
    const values = confirmations();
    const preview = bulkDate.buildPreview(rows, values, new Set(["one"]), "2026-09-10", "2026-08-14");
    const snapshot = bulkDate.apply(values, preview.ids, "2026-09-10");

    expect(values.get("one")).toMatchObject({ confirmedDueDate: "2026-09-10", dueDateConfirmed: true, taskConfirmed: true });
    expect(values.get("two")).toMatchObject({ confirmedDueDate: "2026-08-25", dueDateConfirmed: true, taskConfirmed: false });
    expect(snapshot.values).toHaveLength(1);
  });

  it("seleciona todas as linhas elegiveis, informa substituicoes e ignora linhas bloqueadas", () => {
    const values = confirmations();
    const preview = bulkDate.buildPreview(rows, values, new Set(["one", "two", "blocked"]), "2026-09-10", "2026-08-14");

    expect(preview.ids).toEqual(["one", "two"]);
    expect(preview.count).toBe(2);
    expect(preview.overwrittenCount).toBe(2);
    expect(bulkDate.isEligible(rows[2])).toBe(false);
    expect(values.get("one")?.confirmedDueDate).toBe("2026-08-21");
  });

  it("sinaliza data vencida para exigir confirmacao adicional na interface", () => {
    const preview = bulkDate.buildPreview(rows, confirmations(), new Set(["one"]), "2026-08-13", "2026-08-14");
    expect(preview.isPast).toBe(true);
  });

  it("desfaz a ultima aplicacao coletiva", () => {
    const values = confirmations();
    const snapshot = bulkDate.apply(values, ["one", "two"], "2026-09-10");
    bulkDate.undo(values, snapshot);

    expect(values.get("one")).toMatchObject({ confirmedDueDate: "2026-08-21", dueDateConfirmed: false });
    expect(values.get("two")).toMatchObject({ confirmedDueDate: "2026-08-25", dueDateConfirmed: true });
  });

  it("invalida apenas a confirmacao da linha editada manualmente", () => {
    const values = confirmations();
    bulkDate.apply(values, ["one", "two"], "2026-09-10");
    bulkDate.editDate(values.get("one")!, "2026-09-11");

    expect(values.get("one")).toMatchObject({ confirmedDueDate: "2026-09-11", dueDateConfirmed: false });
    expect(values.get("two")).toMatchObject({ confirmedDueDate: "2026-09-10", dueDateConfirmed: true });
  });
});
