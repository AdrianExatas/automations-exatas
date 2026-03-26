import { describe, expect, it, vi } from "vitest";
import { agruparPatches, executarSincronizacaoTarefa, type SyncTaskApi } from "./sync";
import { GrupoTarefaResolvida } from "./types";

function criarErroTimeout(message = "timeout of 30000ms exceeded") {
  return {
    isAxiosError: true,
    code: "ECONNABORTED",
    message,
  };
}

function criarErroHttp(status: number, statusText: string, data: unknown) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: {
      status,
      statusText,
      data,
    },
  };
}

function criarGrupo(): GrupoTarefaResolvida {
  return {
    taskId: "task-1",
    taskNomePlanilha: "PROVISAO",
    taskNomeGestta: "PROVISAO",
    itens: [
      {
        cod: "1",
        empresa: "Empresa 1",
        cnpj: "11111111000111",
        tarefa: "PROVISAO",
        responsavel: "Maria Silva",
        taskId: "task-1",
        taskNomeGestta: "PROVISAO",
        customerId: "customer-1",
        customerNomeGestta: "Empresa 1",
        userId: "user-2",
        userNomeGestta: "Maria Silva",
        userOrigem: "gestta",
      },
      {
        cod: "2",
        empresa: "Empresa 2",
        cnpj: "22222222000122",
        tarefa: "PROVISAO",
        responsavel: "Maria Silva",
        taskId: "task-1",
        taskNomeGestta: "PROVISAO",
        customerId: "customer-2",
        customerNomeGestta: "Empresa 2",
        userId: "user-2",
        userNomeGestta: "Maria Silva",
        userOrigem: "gestta",
      },
    ],
  };
}

describe("sync", () => {
  it("monta o dry-run separando vinculos ausentes da validacao de responsavel", async () => {
    const api: SyncTaskApi = {
      listTaskCustomers: vi.fn().mockResolvedValue([
        {
          _id: "link-extra",
          customer: { _id: "customer-extra", name: "Extra", cnpj: "999" },
          approve_type: [],
          active: true,
        },
        {
          _id: "link-1",
          customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
          approve_type: [],
          active: true,
        },
      ]),
      deleteGroupCustomers: vi.fn(),
      addCustomersToTask: vi.fn(),
      listCustomerTasks: vi
        .fn()
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            company_task: { _id: "task-1", name: "PROVISAO" },
            company_user: { _id: "user-1", name: "Outro" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([]),
      patchTaskOwners: vi.fn(),
    };

    const result = await executarSincronizacaoTarefa(api, criarGrupo(), true, {
      wait: vi.fn(),
    });

    expect(result.sucesso).toBe(true);
    expect(result.extras).toBe(1);
    expect(result.inclusoes).toBe(1);
    expect(result.patchLinks).toBe(2);
    expect(result.patchGrupos).toBe(1);
    expect(result.vinculosEncontradosNaTarefa).toEqual([
      {
        customerId: "customer-1",
        customerName: "Empresa 1",
        cnpj: "11111111000111",
        linkId: "link-1",
      },
    ]);
    expect(result.clientesAusentesNaTarefa).toEqual([
      { customerId: "customer-2", customerName: "Empresa 2", cnpj: "22222222000122" },
    ]);
    expect(result.pendenciasConfiguracao).toEqual([
      { customerId: "customer-2", customerName: "Empresa 2", cnpj: "22222222000122" },
    ]);
    expect(result.pendenciasValidacaoResponsavel).toEqual([
      { customerId: "customer-2", customerName: "Empresa 2", cnpj: "22222222000122" },
    ]);
    expect(result.divergenciasResponsavel).toEqual([
      {
        customerId: "customer-1",
        customerName: "Empresa 1",
        cnpj: "11111111000111",
        expectedUserId: "user-2",
        expectedUserName: "Maria Silva",
        currentUserId: "user-1",
        currentUserName: "Outro",
      },
    ]);
    expect(result.timeline?.some((item) => item.etapa === "listar-vinculos")).toBe(true);
    expect(result.timeline?.some((item) => item.etapa === "finalizar")).toBe(true);
    expect(api.deleteGroupCustomers).not.toHaveBeenCalled();
    expect(api.addCustomersToTask).not.toHaveBeenCalled();
    expect(api.patchTaskOwners).not.toHaveBeenCalled();
  });

  it("executa inclusao pela listagem da tarefa, aplica patch e valida o responsavel no endpoint do cliente", async () => {
    const api: SyncTaskApi = {
      listTaskCustomers: vi
        .fn()
        .mockResolvedValueOnce([
          {
            _id: "link-extra",
            customer: { _id: "customer-extra", name: "Extra", cnpj: "999" },
            approve_type: [],
            active: true,
          },
          {
            _id: "link-1",
            customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
            approve_type: [],
            active: true,
          },
          {
            _id: "link-2",
            customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
            approve_type: [],
            active: true,
          },
          {
            _id: "link-2",
            customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" },
            approve_type: [],
            active: true,
          },
        ]),
      deleteGroupCustomers: vi.fn().mockResolvedValue(undefined),
      addCustomersToTask: vi.fn().mockResolvedValue(undefined),
      listCustomerTasks: vi
        .fn()
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            company_task: { _id: "task-1", name: "PROVISAO" },
            company_user: { _id: "user-1", name: "Outro" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "link-2",
            company_task: { _id: "task-1", name: "PROVISAO" },
            company_user: { _id: "user-1", name: "Outro" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            company_task: { _id: "task-1", name: "PROVISAO" },
            company_user: { _id: "user-2", name: "Maria Silva" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "link-2",
            company_task: { _id: "task-1", name: "PROVISAO" },
            company_user: { _id: "user-2", name: "Maria Silva" },
            approve_type: [],
            active: true,
          },
        ]),
      patchTaskOwners: vi.fn().mockResolvedValue(undefined),
    };

    const wait = vi.fn().mockResolvedValue(undefined);
    const result = await executarSincronizacaoTarefa(api, criarGrupo(), false, {
      wait,
      postAddAttempts: 3,
      postPatchAttempts: 2,
      pollIntervalMs: 1,
    });

    expect(result.sucesso).toBe(true);
    expect(api.addCustomersToTask).toHaveBeenCalledWith("task-1", ["customer-2"]);
    expect(api.patchTaskOwners).toHaveBeenCalledWith({
      ids: ["link-1", "link-2"],
      company_user: "user-2",
      approve_type: [],
    });
    expect(api.deleteGroupCustomers).toHaveBeenCalledWith(["link-extra"]);
    expect(result.vinculosEncontradosNaTarefa).toEqual([
      {
        customerId: "customer-1",
        customerName: "Empresa 1",
        cnpj: "11111111000111",
        linkId: "link-1",
      },
      {
        customerId: "customer-2",
        customerName: "Empresa 2",
        cnpj: "22222222000122",
        linkId: "link-2",
      },
    ]);
    expect(result.clientesAusentesNaTarefa).toEqual([]);
    expect(result.pendenciasValidacaoResponsavel).toEqual([]);
    expect(result.extrasRemovidos).toEqual([
      {
        id: "link-extra",
        customerId: "customer-extra",
        customerName: "Extra",
        cnpj: "999",
        approveType: [],
        active: true,
      },
    ]);
    expect(result.progressoEtapas).toEqual({
      inclusoesSolicitadas: 1,
      configuracoesConfirmadas: 2,
      responsaveisValidados: 2,
      empresasComErro: 0,
    });
    expect(result.timeline?.some((item) => item.etapa === "adicionar-empresas" && item.customerName === "Empresa 2")).toBe(true);
    expect(result.timeline?.some((item) => item.etapa === "aguardar-configuracao" && item.nivel === "success")).toBe(true);
    expect(result.timeline?.some((item) => item.etapa === "aguardar-propagacao" && item.nivel === "success")).toBe(true);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("falha quando os vinculos nao aparecem na listagem da tarefa apos a inclusao e nao remove extras", async () => {
    const api: SyncTaskApi = {
      listTaskCustomers: vi.fn().mockResolvedValue([
        {
          _id: "link-extra",
          customer: { _id: "customer-extra", name: "Extra", cnpj: "999" },
          approve_type: [],
          active: true,
        },
      ]),
      deleteGroupCustomers: vi.fn(),
      addCustomersToTask: vi.fn().mockResolvedValue(undefined),
      listCustomerTasks: vi.fn(),
      patchTaskOwners: vi.fn(),
    };

    const result = await executarSincronizacaoTarefa(api, criarGrupo(), false, {
      wait: vi.fn().mockResolvedValue(undefined),
      postAddAttempts: 2,
      pollIntervalMs: 1,
    });

    expect(result.sucesso).toBe(false);
    expect(result.etapaFalha).toBe("aguardarConfiguracoes");
    expect(result.clientesAusentesNaTarefa).toHaveLength(2);
    expect(result.pendenciasConfiguracao).toHaveLength(2);
    expect(result.mensagem).toContain("GET /admin/company/task/task-1/customer");
    expect(result.progressoEtapas?.empresasComErro).toBe(2);
    expect(result.timeline?.some((item) => item.etapa === "aguardar-configuracao" && item.nivel === "error")).toBe(true);
    expect(api.patchTaskOwners).not.toHaveBeenCalled();
    expect(api.deleteGroupCustomers).not.toHaveBeenCalled();
  });

  it("falha apenas na validacao final quando o endpoint do cliente nao reflete o responsavel", async () => {
    const api: SyncTaskApi = {
      listTaskCustomers: vi
        .fn()
        .mockResolvedValueOnce([
          {
            _id: "link-extra",
            customer: { _id: "customer-extra", name: "Extra", cnpj: "999" },
            approve_type: [],
            active: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
            approve_type: [],
            active: true,
          },
          {
            _id: "link-2",
            customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" },
            approve_type: [],
            active: true,
          },
        ]),
      deleteGroupCustomers: vi.fn(),
      addCustomersToTask: vi.fn().mockResolvedValue(undefined),
      listCustomerTasks: vi.fn().mockImplementation(async (customerId: string) => [
        {
          _id: customerId === "customer-1" ? "link-1" : "link-2",
          company_task: { _id: "task-1", name: "PROVISAO" },
          company_user: { _id: "user-1", name: "Outro" },
          approve_type: [],
          active: true,
        },
      ]),
      patchTaskOwners: vi.fn().mockResolvedValue(undefined),
    };

    const result = await executarSincronizacaoTarefa(api, criarGrupo(), false, {
      wait: vi.fn().mockResolvedValue(undefined),
      postPatchAttempts: 2,
      pollIntervalMs: 1,
    });

    expect(result.sucesso).toBe(false);
    expect(result.etapaFalha).toBe("aguardarResponsavel");
    expect(result.pendenciasValidacaoResponsavel).toEqual([]);
    expect(result.divergenciasResponsavel).toHaveLength(2);
    expect(result.progressoEtapas?.empresasComErro).toBe(2);
    expect(result.timeline?.some((item) => item.etapa === "aguardar-propagacao" && item.nivel === "error")).toBe(true);
    expect(api.patchTaskOwners).toHaveBeenCalledWith({
      ids: ["link-1", "link-2"],
      company_user: "user-2",
      approve_type: [],
    });
    expect(api.deleteGroupCustomers).not.toHaveBeenCalled();
  });

  it("pula o patch quando os responsaveis ja estao corretos no endpoint do cliente", async () => {
    const api: SyncTaskApi = {
      listTaskCustomers: vi.fn().mockResolvedValue([
        {
          _id: "link-1",
          customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
          approve_type: [],
          active: true,
        },
        {
          _id: "link-2",
          customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" },
          approve_type: [],
          active: true,
        },
      ]),
      deleteGroupCustomers: vi.fn(),
      addCustomersToTask: vi.fn(),
      listCustomerTasks: vi.fn().mockImplementation(async (customerId: string) => [
        {
          _id: customerId === "customer-1" ? "link-1" : "link-2",
          company_task: { _id: "task-1", name: "PROVISAO" },
          company_user: { _id: "user-2", name: "Maria Silva" },
          approve_type: [],
          active: true,
        },
      ]),
      patchTaskOwners: vi.fn(),
    };

    const wait = vi.fn().mockResolvedValue(undefined);
    const result = await executarSincronizacaoTarefa(api, criarGrupo(), false, {
      wait,
      postPatchAttempts: 2,
      pollIntervalMs: 1,
    });

    expect(result.sucesso).toBe(true);
    expect(result.patchLinks).toBe(0);
    expect(result.patchGrupos).toBe(0);
    expect(result.progressoEtapas?.responsaveisValidados).toBe(2);
    expect(result.timeline?.some((item) => item.etapa === "alterar-responsavel" && item.mensagem.includes("Nenhum patch necessario"))).toBe(true);
    expect(api.patchTaskOwners).not.toHaveBeenCalled();
    expect(api.addCustomersToTask).not.toHaveBeenCalled();
    expect(api.deleteGroupCustomers).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
  });

  it("agrupa patches separados quando o approveType difere", () => {
    const patchGroups = agruparPatches([
      {
        linkId: "link-1",
        customerId: "customer-1",
        customerName: "Empresa 1",
        desiredUserId: "user-2",
        desiredUserName: "Maria Silva",
        currentUserId: "user-1",
        approveType: [],
      },
      {
        linkId: "link-2",
        customerId: "customer-2",
        customerName: "Empresa 2",
        desiredUserId: "user-2",
        desiredUserName: "Maria Silva",
        currentUserId: "user-1",
        approveType: ["double-check"],
      },
    ]);

    expect(patchGroups).toEqual([
      {
        companyUserId: "user-2",
        companyUserName: "Maria Silva",
        approveType: [],
        ids: ["link-1"],
        customerIds: ["customer-1"],
      },
      {
        companyUserId: "user-2",
        companyUserName: "Maria Silva",
        approveType: ["double-check"],
        ids: ["link-2"],
        customerIds: ["customer-2"],
      },
    ]);
  });

  it("detalha o lote quando o patch retorna 404", async () => {
    const api: SyncTaskApi = {
      listTaskCustomers: vi.fn().mockResolvedValue([
        {
          _id: "link-1",
          customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
          approve_type: [],
          active: true,
        },
        {
          _id: "link-2",
          customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" },
          approve_type: [],
          active: true,
        },
      ]),
      deleteGroupCustomers: vi.fn(),
      addCustomersToTask: vi.fn(),
      listCustomerTasks: vi.fn().mockImplementation(async (customerId: string) => [
        {
          _id: customerId === "customer-1" ? "link-1" : "link-2",
          company_task: { _id: "task-1", name: "PROVISAO" },
          company_user: { _id: "user-1", name: "Outro" },
          approve_type: [],
          active: true,
        },
      ]),
      patchTaskOwners: vi
        .fn()
        .mockRejectedValue(
          criarErroHttp(404, "Not Found", { message: "Nao encontrado", path: "/admin/group/customer/config" }),
        ),
    };

    const result = await executarSincronizacaoTarefa(api, criarGrupo(), false, {
      wait: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.sucesso).toBe(false);
    expect(result.etapaFalha).toBe("alterarResponsavel");
    expect(result.mensagem).toContain("lote 1/1");
    expect(result.detalhes.some((item) => item.includes("PATCH /admin/group/customer/config falhou"))).toBe(true);
    expect(result.detalhes.some((item) => item.includes("company_user=user-2"))).toBe(true);
    expect(result.detalhes.some((item) => item.includes("ids=2 [link-1, link-2]"))).toBe(true);
    expect(result.timeline?.some((item) => item.etapa === "alterar-responsavel" && item.nivel === "error")).toBe(true);
    expect(api.patchTaskOwners).toHaveBeenCalledWith({
      ids: ["link-1", "link-2"],
      company_user: "user-2",
      approve_type: [],
    });
    expect(api.deleteGroupCustomers).not.toHaveBeenCalled();
  });

  it("faz retry de leitura com concorrencia limitada e preserva a ordem dos logs por empresa", async () => {
    const tentativas = new Map<string, number>();
    const api: SyncTaskApi = {
      listTaskCustomers: vi.fn().mockResolvedValue([
        {
          _id: "link-1",
          customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
          approve_type: [],
          active: true,
        },
        {
          _id: "link-2",
          customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" },
          approve_type: [],
          active: true,
        },
      ]),
      deleteGroupCustomers: vi.fn(),
      addCustomersToTask: vi.fn(),
      listCustomerTasks: vi.fn().mockImplementation(async (customerId: string) => {
        const tentativaAtual = (tentativas.get(customerId) ?? 0) + 1;
        tentativas.set(customerId, tentativaAtual);

        if (tentativaAtual === 1) {
          if (customerId === "customer-2") {
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          throw criarErroTimeout();
        }

        return [
          {
            _id: customerId === "customer-1" ? "link-1" : "link-2",
            company_task: { _id: "task-1", name: "PROVISAO" },
            company_user: { _id: "user-2", name: "Maria Silva" },
            approve_type: [],
            active: true,
          },
        ];
      }),
      patchTaskOwners: vi.fn(),
    };

    const wait = vi.fn().mockResolvedValue(undefined);
    const result = await executarSincronizacaoTarefa(api, criarGrupo(), true, {
      wait,
      readRetries: 2,
      customerTaskConcurrency: 2,
    });

    expect(result.sucesso).toBe(true);
    expect(result.falhasHttp).toEqual([]);
    expect(wait).toHaveBeenCalledTimes(2);

    const retryLogs = result.timeline?.filter(
      (item) => item.etapa === "aguardar-configuracao" && item.nivel === "warn",
    ) ?? [];

    expect(retryLogs.map((item) => item.customerName)).toEqual(["Empresa 1", "Empresa 2"]);
  });

  it("falha com diagnostico especifico quando a leitura do endpoint do cliente esgota os retries", async () => {
    const api: SyncTaskApi = {
      listTaskCustomers: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            _id: "link-1",
            customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" },
            approve_type: [],
            active: true,
          },
          {
            _id: "link-2",
            customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" },
            approve_type: [],
            active: true,
          },
        ]),
      deleteGroupCustomers: vi.fn(),
      addCustomersToTask: vi.fn().mockResolvedValue(undefined),
      listCustomerTasks: vi.fn().mockImplementation(async (customerId: string) => {
        if (customerId === "customer-1") {
          throw criarErroTimeout("timeout persistente");
        }

        return [
          {
            _id: "link-2",
            company_task: { _id: "task-1", name: "PROVISAO" },
            company_user: { _id: "user-2", name: "Maria Silva" },
            approve_type: [],
            active: true,
          },
        ];
      }),
      patchTaskOwners: vi.fn().mockResolvedValue(undefined),
    };

    const wait = vi.fn().mockResolvedValue(undefined);
    const result = await executarSincronizacaoTarefa(api, criarGrupo(), false, {
      wait,
      readRetries: 2,
      readRetryDelayMs: 1,
      customerTaskConcurrency: 2,
    });

    expect(result.sucesso).toBe(false);
    expect(result.etapaFalha).toBe("aguardarConfiguracoes");
    expect(result.falhasHttp).toEqual([
      {
        customerId: "customer-1",
        customerName: "Empresa 1",
        cnpj: "11111111000111",
        etapa: "aguardar-configuracao",
        tentativas: 3,
        ultimoErro: "timeout",
      },
    ]);
    expect(result.mensagem).toContain("antes do patch");
    expect(result.detalhes.some((item) => item.includes("Empresa 1 (customer-1 / 11111111000111)"))).toBe(true);
    expect(result.timeline?.some((item) => item.nivel === "warn" && item.customerName === "Empresa 1")).toBe(true);
    expect(result.timeline?.some((item) => item.nivel === "error" && item.customerName === "Empresa 1")).toBe(true);
    expect(api.patchTaskOwners).not.toHaveBeenCalled();
    expect(api.deleteGroupCustomers).not.toHaveBeenCalled();
    expect(wait).toHaveBeenCalledTimes(2);
  });
});
