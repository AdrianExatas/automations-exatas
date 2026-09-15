import { describe, expect, it } from "vitest";

const batchSelection = require("../src/electron/batch-selection.js") as {
  applyConfirmation: (confirmations: Map<string, Confirmation>, ids: string[]) => void;
  buildConfirmationPreview: (rows: Row[], confirmations: Map<string, Confirmation>, ids: Set<string>, today: string) => Preview;
  removePaths: (paths: string[], selected: Set<string>) => string[];
  removeRows: (rows: Row[], selected: Set<string>) => Row[];
};

interface Confirmation {
  confirmedDueDate: string;
  companyConfirmed: boolean;
  taskConfirmed: boolean;
  dueDateConfirmed: boolean;
}

interface Row {
  id: string;
  company?: { name: string };
  task?: { name: string };
  messages: Array<{ code: string; severity: string }>;
}

interface Preview {
  ids: string[];
  count: number;
  selectedCount: number;
  skippedCount: number;
  pastCount: number;
}

const rows: Row[] = [
  { id: "ready", company: { name: "EMPRESA A" }, task: { name: "FGTS DIGITAL" }, messages: [] },
  { id: "past", company: { name: "EMPRESA B" }, task: { name: "FGTS DIGITAL" }, messages: [{ code: "past_due_date", severity: "warning" }] },
  { id: "blocked", company: { name: "EMPRESA C" }, messages: [{ code: "task_resolution_failed", severity: "error" }] },
];

function confirmations() {
  return new Map<string, Confirmation>([
    ["ready", { confirmedDueDate: "2026-08-20", companyConfirmed: false, taskConfirmed: false, dueDateConfirmed: false }],
    ["past", { confirmedDueDate: "2026-08-13", companyConfirmed: false, taskConfirmed: false, dueDateConfirmed: false }],
    ["blocked", { confirmedDueDate: "2026-08-20", companyConfirmed: false, taskConfirmed: false, dueDateConfirmed: false }],
  ]);
}

describe("acoes coletivas de validacao", () => {
  it("confirma somente linhas elegiveis e informa linhas ignoradas e datas vencidas", () => {
    const values = confirmations();
    const preview: Preview = batchSelection.buildConfirmationPreview(rows, values, new Set(["ready", "past", "blocked"]), "2026-08-14");
    expect(preview).toMatchObject({ ids: ["ready", "past"], count: 2, selectedCount: 3, skippedCount: 1, pastCount: 1 });
    batchSelection.applyConfirmation(values, preview.ids);
    expect(values.get("ready")).toMatchObject({ companyConfirmed: true, taskConfirmed: true, dueDateConfirmed: true });
    expect(values.get("blocked")?.companyConfirmed).toBe(false);
  });

  it("remove guias apenas do lote em memoria", () => {
    expect(batchSelection.removePaths(["C:\\Guias\\A.pdf", "C:\\Guias\\B.pdf"], new Set(["c:\\guias\\a.pdf"]))).toEqual(["C:\\Guias\\B.pdf"]);
    expect(batchSelection.removeRows(rows, new Set(["blocked"])).map((row) => row.id)).toEqual(["ready", "past"]);
  });
});
