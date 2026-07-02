import { describe, expect, it, vi } from "vitest";
import { EmpresaSelectionPage } from "./empresa-selection-page";

function createLocator(overrides?: {
  waitFor?: (options?: unknown) => Promise<void>;
  click?: (options?: unknown) => Promise<void>;
  fill?: (value: string) => Promise<void>;
  type?: (value: string, options?: unknown) => Promise<void>;
  press?: (value: string) => Promise<void>;
  check?: (options?: unknown) => Promise<void>;
  locator?: (selector: string) => unknown;
}) {
  const locator = {
    filter: vi.fn(() => locator),
    first: vi.fn(() => locator),
    waitFor: overrides?.waitFor ?? vi.fn().mockResolvedValue(undefined),
    click: overrides?.click ?? vi.fn().mockResolvedValue(undefined),
    fill: overrides?.fill ?? vi.fn().mockResolvedValue(undefined),
    type: overrides?.type ?? vi.fn().mockResolvedValue(undefined),
    press: overrides?.press ?? vi.fn().mockResolvedValue(undefined),
    check: overrides?.check ?? vi.fn().mockResolvedValue(undefined),
    locator: vi.fn(overrides?.locator ?? (() => locator)),
  };

  return locator;
}

describe("EmpresaSelectionPage", () => {
  it("usa o campo de busca visivel dentro do modal de selecao", async () => {
    const modalWaitFor = vi.fn().mockResolvedValue(undefined);
    const searchWaitFor = vi.fn().mockResolvedValue(undefined);
    const searchFill = vi.fn().mockResolvedValue(undefined);
    const searchType = vi.fn().mockResolvedValue(undefined);
    const searchPress = vi.fn().mockResolvedValue(undefined);
    const openSelectionClick = vi.fn().mockResolvedValue(undefined);
    const hiddenGlobalInput = createLocator({
      waitFor: vi.fn().mockRejectedValue(new Error("input global oculto")),
    });
    const modalSearchInput = createLocator({
      waitFor: searchWaitFor,
      fill: searchFill,
      type: searchType,
      press: searchPress,
    });
    const selectionModal = createLocator({
      waitFor: modalWaitFor,
      locator: vi.fn((selector: string) => {
        expect(selector).toBe(
          "input[type='search']:visible, #txtBuscaConteudoMenuLateral:visible",
        );
        return modalSearchInput;
      }),
    });

    const page = {
      evaluate: vi.fn().mockResolvedValue(undefined),
      getByPlaceholder: vi.fn(() => hiddenGlobalInput),
      locator: vi.fn((selector: string) => {
        if (selector === "#naoAvisarNovamenteProgramaIndicacaoFase02") {
          return createLocator({
            check: vi.fn().mockRejectedValue(new Error("modal ausente")),
          });
        }
        if (
          selector ===
          "#LeftSideBarControl_divEmpresaSelecionadaPrincipal button.btSelecionaParceiroEmpresa"
        ) {
          return createLocator({ click: openSelectionClick });
        }
        if (selector === "#modalSelecionaParceiroEmpresaSelecao") {
          return selectionModal;
        }
        return createLocator();
      }),
    } as never;

    const empresaPage = new EmpresaSelectionPage(page);

    await empresaPage.clickSelecionarEmpresa();
    await empresaPage.searchCnpj("10.965.766/0001-64");

    expect(openSelectionClick).toHaveBeenCalled();
    expect(modalWaitFor).toHaveBeenCalledWith({ state: "visible", timeout: 2_000 });
    expect(searchWaitFor).toHaveBeenCalledWith({ state: "visible", timeout: 15_000 });
    expect(searchFill).toHaveBeenCalledWith("");
    expect(searchType).toHaveBeenCalledWith("10965766000164", { delay: 20 });
    expect(searchPress).toHaveBeenCalledWith("Enter");
    expect(page.evaluate).toHaveBeenLastCalledWith(expect.any(Function), "10965766000164");
    expect(page.getByPlaceholder).not.toHaveBeenCalled();
    expect(hiddenGlobalInput.waitFor).not.toHaveBeenCalled();
  });

  it("chama a funcao do site quando o clique nao abre o modal", async () => {
    const openSelectionClick = vi.fn().mockResolvedValue(undefined);
    const fallbackOpen = vi.fn();
    const searchInput = createLocator();
    const selectionModal = createLocator({
      waitFor: vi
        .fn()
        .mockRejectedValueOnce(new Error("modal nao abriu pelo clique"))
        .mockResolvedValueOnce(undefined),
      locator: vi.fn(() => searchInput),
    });

    const page = {
      evaluate: vi.fn().mockImplementation((callback: () => void) => {
        if (!String(callback).includes("ExibeModalSelecionaParceiroEmpresaMenuLateral")) {
          return undefined;
        }
          Object.assign(globalThis, {
            window: {
              ExibeModalSelecionaParceiroEmpresaMenuLateral: fallbackOpen,
            },
          });
          try {
            return callback();
          } finally {
            Reflect.deleteProperty(globalThis, "window");
          }
        }),
      locator: vi.fn((selector: string) => {
        if (selector === "#naoAvisarNovamenteProgramaIndicacaoFase02") {
          return createLocator({
            check: vi.fn().mockRejectedValue(new Error("modal ausente")),
          });
        }
        if (
          selector ===
          "#LeftSideBarControl_divEmpresaSelecionadaPrincipal button.btSelecionaParceiroEmpresa"
        ) {
          return createLocator({ click: openSelectionClick });
        }
        if (selector === "#modalSelecionaParceiroEmpresaSelecao") {
          return selectionModal;
        }
        return createLocator();
      }),
    } as never;

    const empresaPage = new EmpresaSelectionPage(page);

    await empresaPage.clickSelecionarEmpresa();

    expect(openSelectionClick).toHaveBeenCalled();
    expect(fallbackOpen).toHaveBeenCalled();
    expect(selectionModal.waitFor).toHaveBeenNthCalledWith(1, { state: "visible", timeout: 2_000 });
    expect(selectionModal.waitFor).toHaveBeenNthCalledWith(2, {
      state: "visible",
      timeout: 15_000,
    });
  });

  it("fecha o modal quando o CNPJ nao retorna resultados", async () => {
    const closeModalClick = vi.fn().mockResolvedValue(undefined);
    const emptyAlert = createLocator();
    const tableCell = createLocator({
      waitFor: vi.fn(
        () =>
          new Promise<void>(() => {
            // Mantem pendente para o alerta vencer o race.
          }),
      ),
    });

    const page = {
      evaluate: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn((selector: string) => {
        if (selector === "#naoAvisarNovamenteProgramaIndicacaoFase02") {
          return createLocator({
            check: vi.fn().mockRejectedValue(new Error("modal ausente")),
          });
        }
        if (selector === "td.text-nowrap") {
          return tableCell;
        }
        if (selector === "#modalSelecionaParceiroEmpresaSelecao div.alert.alert-warning") {
          return emptyAlert;
        }
        if (selector === "#modalSelecionaParceiroEmpresaSelecao button.close[data-dismiss='modal']") {
          return createLocator({ click: closeModalClick });
        }
        return createLocator();
      }),
    } as never;

    const empresaPage = new EmpresaSelectionPage(page);

    await expect(empresaPage.selectEmpresaByCnpj("03932909000176")).rejects.toThrow(
      "CNPJ não encontrado nos resultados: 03932909000176",
    );
    expect(closeModalClick).toHaveBeenCalled();
    expect(tableCell.click).not.toHaveBeenCalled();
  });
});
