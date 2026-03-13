import { describe, expect, it, vi } from "vitest";
import { EmpresaSelectionPage } from "./empresa-selection-page";

function createLocator(overrides?: {
  waitFor?: () => Promise<void>;
  click?: (options?: unknown) => Promise<void>;
  fill?: (value: string) => Promise<void>;
  press?: (value: string) => Promise<void>;
  check?: (options?: unknown) => Promise<void>;
}) {
  const locator = {
    filter: vi.fn(() => locator),
    first: vi.fn(() => locator),
    waitFor: overrides?.waitFor ?? vi.fn().mockResolvedValue(undefined),
    click: overrides?.click ?? vi.fn().mockResolvedValue(undefined),
    fill: overrides?.fill ?? vi.fn().mockResolvedValue(undefined),
    press: overrides?.press ?? vi.fn().mockResolvedValue(undefined),
    check: overrides?.check ?? vi.fn().mockResolvedValue(undefined),
  };

  return locator;
}

describe("EmpresaSelectionPage", () => {
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
