import fs from "fs";
import os from "os";
import path from "path";
import * as XLSX from "xlsx";
import { afterEach, describe, expect, test } from "vitest";
import {
  filtrarTarefasAnuaisAtivas,
  montarLevantamentoAnuais,
  salvarLevantamentoAnuaisXlsx,
} from "../src/levantamento-anuais";
import { TarefaGestta } from "../src/types";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "levantamento-anuais-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function tarefa(overrides: Partial<TarefaGestta> = {}): TarefaGestta {
  return {
    _id: "task-1",
    name: "DCTFWEB ANUAL",
    type: "RECURRENT",
    frequency: "YEARLY",
    active: true,
    company_department: { name: "Departamento Pessoal" },
    frequency_date: {
      month: 12,
      month_day: 20,
      business_day: 1,
    },
    ...overrides,
  };
}

describe("levantamento de tarefas anuais", () => {
  test("filtra apenas tarefas recorrentes, ativas e anuais", () => {
    const tarefas = filtrarTarefasAnuaisAtivas([
      tarefa({ _id: "yearly" }),
      tarefa({ _id: "monthly", frequency: "MONTHLY" }),
      tarefa({ _id: "inactive", active: false }),
      tarefa({ _id: "not-recurring", type: "SINGLE" }),
    ]);

    expect(tarefas.map((item) => item._id)).toEqual(["yearly"]);
  });

  test("normaliza setores da matriz e mantem setores sem tarefas no resumo", () => {
    const levantamento = montarLevantamentoAnuais([
      tarefa({ _id: "dp", name: "13o DCTFWEB", company_department: { name: "Departamento Pessoal" } }),
      tarefa({ _id: "contabil", name: "ECD", company_department: { name: "Contabil" } }),
      tarefa({ _id: "sem-setor", name: "Sem departamento", company_department: undefined }),
    ]);

    expect(levantamento.tarefas.map((item) => item.Setor)).toEqual(["Pessoal", "Contábil", "Sem setor"]);
    expect(levantamento.resumo).toContainEqual({ Setor: "Fiscal", "Total de tarefas anuais": 0 });
    expect(levantamento.resumo).toContainEqual({ Setor: "Pessoal", "Total de tarefas anuais": 1 });
    expect(levantamento.resumo).toContainEqual({ Setor: "Sem setor", "Total de tarefas anuais": 1 });
  });

  test("gera xlsx com abas Resumo e Tarefas", () => {
    const outputDir = createTempDir();
    const levantamento = montarLevantamentoAnuais([tarefa()]);

    const filePath = salvarLevantamentoAnuaisXlsx(levantamento, outputDir);
    const workbook = XLSX.readFile(filePath);
    const resumo = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Resumo);
    const tarefas = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Tarefas);

    expect(fs.existsSync(filePath)).toBe(true);
    expect(workbook.SheetNames).toEqual(["Resumo", "Tarefas"]);
    expect(resumo).toContainEqual({ Setor: "Pessoal", "Total de tarefas anuais": 1 });
    expect(tarefas[0]).toMatchObject({
      Setor: "Pessoal",
      Tarefa: "DCTFWEB ANUAL",
      "ID Gestta": "task-1",
      Frequência: "YEARLY",
      Status: "Ativa",
    });
  });
});
