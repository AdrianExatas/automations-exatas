import { describe, expect, it, vi } from "vitest";
import {
  calcularInclusoesAditivas,
  EmpresaTobiasResolvida,
  executarInclusaoAditiva,
  InclusaoAditivaApi,
  TarefaTobiasResolvida,
} from "./tobias-sync";

const tarefa: TarefaTobiasResolvida = {
  taskId: "task-financeiro",
  taskName: "EMISSÃO NOTA FISCAL - PRODUTO",
};

const empresas: EmpresaTobiasResolvida[] = [
  { customerId: "customer-1", customerName: "Empresa 1", cnpj: "11111111000111" },
  { customerId: "customer-2", customerName: "Empresa 2", cnpj: "22222222000122" },
];

describe("inclusao aditiva Tobias", () => {
  it("calcula somente empresas ausentes e preserva vinculos fora da planilha no dry-run", async () => {
    const api: InclusaoAditivaApi = {
      listTaskCustomers: vi.fn().mockResolvedValue([
        { _id: "link-extra", customer: { _id: "customer-extra", name: "Extra", cnpj: "999" } },
        { _id: "link-1", customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" } },
      ]),
      addCustomersToTask: vi.fn(),
    };

    const result = await executarInclusaoAditiva(api, tarefa, empresas, true);

    expect(calcularInclusoesAditivas(empresas, await api.listTaskCustomers(tarefa.taskId))).toEqual([
      empresas[1],
    ]);
    expect(result.sucesso).toBe(true);
    expect(result.inclusoes).toBe(1);
    expect(result.extras).toBe(0);
    expect(result.vinculosAtuais).toBe(2);
    expect(result.vinculosAtuaisDetalhes).toHaveLength(2);
    expect(result.timeline).toHaveLength(2);
    expect(result.timeline?.find((event) => event.customerId === "customer-2")?.mensagem).toContain(
      "inclusao aditiva planejada",
    );
    expect(api.addCustomersToTask).not.toHaveBeenCalled();
  });

  it("adiciona somente ausentes e valida a leitura final sem remover ou alterar vinculos existentes", async () => {
    const api: InclusaoAditivaApi = {
      listTaskCustomers: vi
        .fn()
        .mockResolvedValueOnce([
          { _id: "link-extra", customer: { _id: "customer-extra", name: "Extra", cnpj: "999" } },
          { _id: "link-1", customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" } },
        ])
        .mockResolvedValueOnce([
          { _id: "link-extra", customer: { _id: "customer-extra", name: "Extra", cnpj: "999" } },
          { _id: "link-1", customer: { _id: "customer-1", name: "Empresa 1", cnpj: "111" } },
          { _id: "link-2", customer: { _id: "customer-2", name: "Empresa 2", cnpj: "222" } },
        ]),
      addCustomersToTask: vi.fn().mockResolvedValue(undefined),
    };

    const result = await executarInclusaoAditiva(api, tarefa, empresas, false, {
      wait: vi.fn(),
    });

    expect(result.sucesso).toBe(true);
    expect(result.vinculosFinais).toBe(3);
    expect(result.patchLinks).toBe(0);
    expect(result.patchGrupos).toBe(0);
    expect(result.timeline?.filter((event) => event.etapa === "finalizar" && event.nivel === "success")).toHaveLength(2);
    expect(api.addCustomersToTask).toHaveBeenCalledWith("task-financeiro", ["customer-2"]);
    expect(api.listTaskCustomers).toHaveBeenCalledTimes(2);
  });
});
