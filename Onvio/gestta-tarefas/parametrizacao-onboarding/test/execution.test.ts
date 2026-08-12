import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { afterAll, describe, expect, test } from "vitest";
import { executarParametrizacao, GesttaApi } from "../src/execution";
import {
  ClienteGestta,
  ConfiguracaoTarefaCliente,
  TarefaGestta,
  UsuarioGestta,
  VinculoTarefaCliente,
} from "../src/types";

const matrixPath = path.join(__dirname, "tmp-execution-matrix.xlsx");
const ambiguousMatrixPath = path.join(__dirname, "tmp-ambiguous-matrix.xlsx");
const ambiguousFiscalNormalMatrixPath = path.join(__dirname, "tmp-ambiguous-fiscal-normal-matrix.xlsx");
const dirbiFiscalMatrixPath = path.join(__dirname, "tmp-dirbi-fiscal-matrix.xlsx");
const dirbiContabilMatrixPath = path.join(__dirname, "tmp-dirbi-contabil-matrix.xlsx");
const parcelamentosMatrixPath = path.join(__dirname, "tmp-parcelamentos-matrix.xlsx");

afterAll(() => {
  for (const filePath of [
    matrixPath,
    ambiguousMatrixPath,
    ambiguousFiscalNormalMatrixPath,
    dirbiFiscalMatrixPath,
    dirbiContabilMatrixPath,
    parcelamentosMatrixPath,
  ]) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

function criarMatriz(filePath: string, taskName: string): string {
  if (fs.existsSync(filePath)) return filePath;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["TAREFAS DE PARAMETRIZACAO GESTTA"],
      ["Departamento", "", "Colaborador"],
      ["DP", "", "Tasso Nata Ramos de Jesus"],
      ["FISCAL NORMAL", "", "Emilly Adrielle"],
      ["FISCAL SN", "", "Emilly Adrielle"],
      ["FINANCEIRO", "", "Financeiro Exatas"],
      ["CONTABIL", "", "Thais Dantas"],
      ["SUCESSO DO CLIENTE", "", "Amanda Xavier"],
    ]),
    "CONTROLE",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["TAREFAS DE PARAMETRIZACAO GESTTA"],
      ["Tarefas", "Departamento Pessoal", "Anual?"],
      [taskName, "Sim", "Sim"],
    ]),
    "DP",
  );
  for (const sheetName of ["SIMPLES NACIONAL", "FISCAL - NORMAL", "FINANCEIRO", "CONTABIL", "SUCESSO DO CLIENTE"]) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["TAREFAS DE PARAMETRIZACAO GESTTA"],
        ["Tarefas", sheetName, "Anual?"],
      ]),
      sheetName,
    );
  }

  XLSX.writeFile(workbook, filePath);
  return filePath;
}

function ensureMatrix(): string {
  return criarMatriz(matrixPath, "13 DCTFWEB");
}

function ensureAmbiguousMatrix(): string {
  return criarMatriz(ambiguousMatrixPath, "VERIFICAÇÃO DE CAIXA POSTAL SEFAZ SN - MARANHÃO");
}

function ensureAmbiguousFiscalNormalMatrix(): string {
  return criarMatrizComTarefaNaAba(
    ambiguousFiscalNormalMatrixPath,
    "FISCAL - NORMAL",
    "VERIFICAÇÃO DE CAIXA POSTAL SEFAZ FISC NORMAL - MARANHÃO",
  );
}

function criarMatrizComTarefaNaAba(filePath: string, sheetWithTask: string, taskName: string): string {
  if (fs.existsSync(filePath)) return filePath;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["TAREFAS DE PARAMETRIZACAO GESTTA"],
      ["Departamento", "", "Colaborador"],
      ["DP", "", "Tasso Nata Ramos de Jesus"],
      ["FISCAL NORMAL", "", "Emilly Adrielle"],
      ["FISCAL SN", "", "Emilly Adrielle"],
      ["FINANCEIRO", "", "Financeiro Exatas"],
      ["CONTABIL", "", "Thais Dantas"],
      ["SUCESSO DO CLIENTE", "", "Amanda Xavier"],
    ]),
    "CONTROLE",
  );

  for (const sheetName of ["DP", "SIMPLES NACIONAL", "FISCAL - NORMAL", "FINANCEIRO", "CONTÁBIL", "SUCESSO DO CLIENTE"]) {
    const rows = [
      ["TAREFAS DE PARAMETRIZACAO GESTTA"],
      ["Tarefas", sheetName, "Anual?"],
    ];
    if (sheetName === sheetWithTask) rows.push([taskName, "Sim", "Sim"]);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  }

  XLSX.writeFile(workbook, filePath);
  return filePath;
}

function ensureDirbiFiscalMatrix(): string {
  return criarMatrizComTarefaNaAba(dirbiFiscalMatrixPath, "SIMPLES NACIONAL", "ENVIO DIRBI");
}

function ensureDirbiContabilMatrix(): string {
  return criarMatrizComTarefaNaAba(dirbiContabilMatrixPath, "CONTÁBIL", "ENVIO DIRBI");
}

function ensureParcelamentosMatrix(): string {
  return criarMatrizComTarefaNaAba(parcelamentosMatrixPath, "", "");
}

function createApiMock(options: {
  existingLink?: boolean;
  currentUserId?: string;
  customerConfigVisible?: boolean;
  tasks?: TarefaGestta[];
} = {}): GesttaApi & { calls: { add: number; patch: number; delete: number } } {
  const customer: ClienteGestta = {
    _id: "customer-1",
    name: "Cliente Teste",
    cnpj: "11222333000144",
  };
  const users: UsuarioGestta[] = [
    { _id: "user-dp", name: "Tasso Nata Ramos de Jesus", active: true },
    { _id: "user-fiscal", name: "Emilly Adrielle", active: true },
    { _id: "user-contabil", name: "Thais Dantas", active: true },
  ];
  const tasks: TarefaGestta[] = options.tasks ?? [
    { _id: "task-1", name: "13 DCTFWEB", active: true, type: "RECURRENT" },
  ];
  const currentUserByTask = new Map<string, string | undefined>(
    tasks.map((task) => [task._id, options.currentUserId]),
  );
  const state = {
    linkedTaskIds: new Set(options.existingLink ? tasks.map((task) => task._id) : []),
  };
  const customerConfigVisible = options.customerConfigVisible ?? true;
  const calls = { add: 0, patch: 0, delete: 0 };

  function config(): ConfiguracaoTarefaCliente[] {
    if (!customerConfigVisible) return [];
    return tasks
      .filter((task) => state.linkedTaskIds.has(task._id))
      .map((task) => ({
        _id: `group-${task._id}`,
        company_task: { _id: task._id, name: task.name },
        company_user: currentUserByTask.get(task._id)
          ? {
              _id: currentUserByTask.get(task._id),
              name: currentUserByTask.get(task._id) === "user-dp" ? "Tasso Nata Ramos de Jesus" : "Outro",
            }
          : undefined,
        approve_type: ["DONE"],
      }));
  }

  return {
    calls,
    listarClientes: async () => [customer],
    listarFuncionarios: async () => users,
    listarTarefasRecorrentesAtivas: async () => tasks,
    listarClientesDaTarefa: async (taskId): Promise<VinculoTarefaCliente[]> =>
      state.linkedTaskIds.has(taskId)
        ? [{
            _id: `group-${taskId}`,
            customer,
            company_task: { _id: taskId, name: tasks.find((task) => task._id === taskId)?.name ?? taskId },
            company_user: currentUserByTask.get(taskId)
              ? {
                  _id: currentUserByTask.get(taskId),
                  name: currentUserByTask.get(taskId) === "user-dp" ? "Tasso Nata Ramos de Jesus" : "Outro",
                }
              : undefined,
            approve_type: ["DONE"],
          }]
        : [],
    adicionarClienteNaTarefa: async (taskId) => {
      calls.add += 1;
      state.linkedTaskIds.add(taskId);
    },
    listarTarefasDoCliente: async () => config(),
    patchResponsavel: async (body) => {
      calls.patch += 1;
      for (const id of body.ids) {
        currentUserByTask.set(id.replace(/^group-/, ""), body.company_user);
      }
    },
  };
}

describe("execucao parametrizacao", () => {
  test("dry-run nao adiciona nem altera", async () => {
    const api = createApiMock();
    const relatorio = await executarParametrizacao({
      matrixPath: ensureMatrix(),
      api,
      dryRun: true,
      input: {
        cnpj: "11.222.333/0001-44",
        areas: ["dp"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    expect(relatorio.resultados.find((item) => item.taskId === "task-1")?.inclusaoSolicitada).toBe(true);
    expect(api.calls.add).toBe(0);
    expect(api.calls.patch).toBe(0);
  });

  test("interrompe antes da proxima tarefa quando cancelamento e solicitado", async () => {
    const api = createApiMock();
    await expect(executarParametrizacao({
      matrixPath: ensureMatrix(),
      api,
      dryRun: true,
      shouldCancel: () => true,
      input: {
        cnpj: "11222333000144",
        areas: ["dp"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    })).rejects.toThrow("Execucao cancelada pelo usuario.");

    expect(api.calls.add).toBe(0);
    expect(api.calls.patch).toBe(0);
  });

  test("apply adiciona vinculo ausente e ajusta responsavel", async () => {
    const api = createApiMock();
    const relatorio = await executarParametrizacao({
      matrixPath: ensureMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: ["dp"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    const result = relatorio.resultados.find((item) => item.taskId === "task-1");
    expect(result?.sucesso).toBe(true);
    expect(api.calls.add).toBe(1);
    expect(api.calls.patch).toBe(1);
    expect(api.calls.delete).toBe(0);
  });

  test("apply preserva vinculo e responsavel quando ja conferem", async () => {
    const api = createApiMock({ existingLink: true, currentUserId: "user-dp" });
    await executarParametrizacao({
      matrixPath: ensureMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: ["dp"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    expect(api.calls.add).toBe(0);
    expect(api.calls.patch).toBe(0);
  });

  test("apply usa vinculo da tarefa quando endpoint do cliente ainda nao retorna configuracao", async () => {
    const api = createApiMock({ customerConfigVisible: false });
    const relatorio = await executarParametrizacao({
      matrixPath: ensureMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: ["dp"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    const result = relatorio.resultados.find((item) => item.taskId === "task-1");
    expect(result?.sucesso).toBe(true);
    expect(result?.detalhes.join(" ")).toContain("usando o ID do vinculo");
    expect(api.calls.add).toBe(1);
    expect(api.calls.patch).toBe(1);
  });

  test("desambigua tarefa recorrente pelo departamento fiscal", async () => {
    const api = createApiMock({
      tasks: [
        {
          _id: "task-dirbi-fiscal",
          name: "ENVIO DIRBI",
          active: true,
          type: "RECURRENT",
          company_department: { name: "Fiscal" },
        },
        {
          _id: "task-dirbi-contabil",
          name: "ENVIO DIRBI",
          active: true,
          type: "RECURRENT",
          company_department: { name: "Contabil" },
        },
      ],
    });

    const relatorio = await executarParametrizacao({
      matrixPath: ensureDirbiFiscalMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: ["fiscal"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    expect(relatorio.resultados.map((item) => item.taskId)).toEqual(["task-dirbi-fiscal"]);
    expect(api.calls.add).toBe(1);
    expect(api.calls.patch).toBe(1);
  });

  test("desambigua tarefa recorrente pelo departamento contabil", async () => {
    const api = createApiMock({
      tasks: [
        {
          _id: "task-dirbi-fiscal",
          name: "ENVIO DIRBI",
          active: true,
          type: "RECURRENT",
          company_department: { name: "Fiscal" },
        },
        {
          _id: "task-dirbi-contabil",
          name: "ENVIO DIRBI",
          active: true,
          type: "RECURRENT",
          company_department: { name: "Contabil" },
        },
      ],
    });

    const relatorio = await executarParametrizacao({
      matrixPath: ensureDirbiContabilMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: ["contabil"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    expect(relatorio.resultados.map((item) => item.taskId)).toEqual(["task-dirbi-contabil"]);
    expect(api.calls.add).toBe(1);
    expect(api.calls.patch).toBe(1);
  });

  test("mantem erro para tarefa duplicada que nao e de caixa postal SEFAZ", async () => {
    const api = createApiMock({
      tasks: [
        {
          _id: "task-dctfweb-1",
          name: "13 DCTFWEB",
          active: true,
          type: "RECURRENT",
          company_department: { name: "DP" },
        },
        {
          _id: "task-dctfweb-2",
          name: "13 DCTFWEB",
          active: true,
          type: "RECURRENT",
          company_department: { name: "DP" },
        },
      ],
    });

    await expect(executarParametrizacao({
      matrixPath: ensureMatrix(),
      api,
      dryRun: true,
      input: {
        cnpj: "11222333000144",
        areas: ["dp"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    })).rejects.toThrow("Tarefa recorrente ambigua no Gestta: 13 DCTFWEB.");

    expect(api.calls.add).toBe(0);
    expect(api.calls.patch).toBe(0);
  });

  test("tarefa de caixa postal SEFAZ SN ambigua do Maranhao e aplicada nas duas recorrentes do Gestta", async () => {
    const api = createApiMock({
      tasks: [
        {
          _id: "task-sefaz-1",
          name: "VERIFICAÇÃO DE CAIXA POSTAL SEFAZ SN - MARANHÃO",
          active: true,
          type: "RECURRENT",
        },
        {
          _id: "task-sefaz-2",
          name: "VERIFICAÇÃO DE CAIXA POSTAL SEFAZ SN - MARANHÃO",
          active: true,
          type: "RECURRENT",
        },
      ],
    });

    const relatorio = await executarParametrizacao({
      matrixPath: ensureAmbiguousMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: ["dp"],
        regimeFiscal: "simples_nacional",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    expect(relatorio.resultados.map((item) => item.taskId).sort()).toEqual(["task-sefaz-1", "task-sefaz-2"]);
    expect(api.calls.add).toBe(2);
    expect(api.calls.patch).toBe(2);
  });

  test("apply adiciona analise de parcelamentos fiscal sem areas selecionadas", async () => {
    const api = createApiMock({
      tasks: [
        {
          _id: "task-parcelamentos-fiscal",
          name: "ANÁLISE DE PARCELAMENTOS (EMPRESA ENTRANTE) - FISCAL",
          active: true,
          type: "RECURRENT",
          company_department: { name: "Fiscal" },
        },
      ],
    });

    const relatorio = await executarParametrizacao({
      matrixPath: ensureParcelamentosMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: [],
        regimeFiscal: "fiscal_normal",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: true,
      },
    });

    expect(relatorio.resultados.map((item) => item.taskId)).toEqual(["task-parcelamentos-fiscal"]);
    expect(relatorio.resultados).toEqual([
      expect.objectContaining({
        tarefaPlanilha: "ANÁLISE DE PARCELAMENTOS (EMPRESA ENTRANTE) - FISCAL",
        responsavelGestta: "Emilly Adrielle",
        sucesso: true,
      }),
    ]);
    expect(api.calls.add).toBe(1);
    expect(api.calls.patch).toBe(1);
  });

  test("tarefa de caixa postal SEFAZ fiscal normal ambigua do Maranhao e aplicada nas duas recorrentes do Gestta", async () => {
    const api = createApiMock({
      tasks: [
        {
          _id: "task-sefaz-fiscal-1",
          name: "VERIFICAÇÃO DE CAIXA POSTAL SEFAZ FISC NORMAL - MARANHÃO",
          active: true,
          type: "RECURRENT",
          company_department: { name: "Fiscal" },
        },
        {
          _id: "task-sefaz-fiscal-2",
          name: "VERIFICAÇÃO DE CAIXA POSTAL SEFAZ FISC NORMAL - MARANHÃO",
          active: true,
          type: "RECURRENT",
          company_department: { name: "Fiscal" },
        },
      ],
    });

    const relatorio = await executarParametrizacao({
      matrixPath: ensureAmbiguousFiscalNormalMatrix(),
      api,
      dryRun: false,
      wait: async () => undefined,
      readRetries: 0,
      readRetryDelayMs: 0,
      input: {
        cnpj: "11222333000144",
        areas: ["fiscal"],
        regimeFiscal: "fiscal_normal",
        incluirAnuais: true,
        planoPremium: false,
        supervisor: false,
        adicionarAnaliseParcelamentos: false,
      },
    });

    expect(relatorio.resultados.map((item) => item.taskId).sort()).toEqual([
      "task-sefaz-fiscal-1",
      "task-sefaz-fiscal-2",
    ]);
    expect(api.calls.add).toBe(2);
    expect(api.calls.patch).toBe(2);
  });
});
