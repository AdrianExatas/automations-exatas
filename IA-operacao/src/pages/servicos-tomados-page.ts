import type { Page } from "playwright";
import type { CompetenciaTotais, NotaFiscalRow } from "../types";

export class ServicosTomadosPage {
  constructor(private readonly page: Page) {}

  async isLoaded(timeout = 5000): Promise<boolean> {
    try {
      await this.page.waitForSelector("#tabServicoTomado, #btDownloadExcel", { timeout });
      return true;
    } catch {
      return false;
    }
  }

  async waitForNotasTable(timeout = 15_000): Promise<void> {
    await this.page.locator("#tabServicoTomado").waitFor({ state: "attached", timeout });
  }

  async selectUltimoMes(): Promise<void> {
    await this.page.locator("#linkMesAnoReferenciaAnterior").click({ timeout: 5000 });
    await new Promise((resolve) => setTimeout(resolve, 800));
    await this.waitForNotasTable(10_000).catch(() => {});
  }

  async selectMesesAnteriores(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.selectUltimoMes();
    }
  }

  async clickDownloadExcel(): Promise<void> {
    await this.page.click("#btDownloadExcel");
  }

  async readTotaisCompetencia(): Promise<CompetenciaTotais> {
    return this.page.evaluate(`(() => {
      const textOf = (sel) => {
        const el = document.querySelector(sel);
        return el && el.textContent ? el.textContent.replace(/\\s+/g, " ").trim() : "";
      };
      const competenciaEl = document.querySelector("#linkMesAnoReferenciaAnterior");
      const competenciaLabel = competenciaEl && competenciaEl.parentElement
        ? (competenciaEl.parentElement.textContent || "").replace(/\\s+/g, " ").trim()
        : "";
      return {
        competenciaLabel,
        quantidadeServicos: textOf("#lblQuantidadeServicoTomado"),
        valorTotalNfe: textOf("#lblValorTotalNFe"),
        valorTotalLiquido: textOf("#lblTotalTotalLiquido") || textOf("#lblValorTotalLiquidoNFe"),
      };
    })()`) as Promise<CompetenciaTotais>;
  }

  async expandItemsPerPage(): Promise<void> {
    await this.page.evaluate(`(() => {
      const pickPreferred = (select) => {
        const options = Array.from(select.options || []);
        const preferred =
          (options.find((o) => Number(o.value) >= 100) ||
            options.find((o) => /100|todos|all/i.test(o.textContent || "")) ||
            options[options.length - 1] ||
            {}).value;
        if (!preferred) return false;
        select.value = preferred;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        if (typeof window.jQuery === "function") {
          try { window.jQuery(select).trigger("change"); } catch (e) {}
        }
        return true;
      };

      const candidates = [
        ...document.querySelectorAll("#tabServicoTomado_length select, .dataTables_length select"),
        ...document.querySelectorAll("select"),
      ];
      for (const select of candidates) {
        const near = (select.closest("label, div, span") || select.parentElement);
        const ctx = ((near && near.textContent) || "") + " " + (select.getAttribute("name") || "");
        if (/itens por p[aá]gina|length|page.?size|por p[aá]gina/i.test(ctx) || select.closest(".dataTables_length")) {
          if (pickPreferred(select)) return;
        }
      }

      const labels = Array.from(document.querySelectorAll("label, span, div")).filter((el) =>
        /itens por p[aá]gina/i.test(el.textContent || "")
      );
      for (const label of labels) {
        const container = label.parentElement;
        if (!container) continue;
        const select = container.querySelector("select");
        if (select && pickPreferred(select)) return;
      }
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  async listNotas(): Promise<NotaFiscalRow[]> {
    await this.waitForNotasTable();
    await this.expandItemsPerPage();

    const allNotas: NotaFiscalRow[] = [];
    let pageNumber = 1;
    const maxPages = 50;

    while (pageNumber <= maxPages) {
      const pageNotas = await this.readCurrentPageNotas();
      allNotas.push(...pageNotas);

      const moved = await this.goToNextPageIfAvailable();
      if (!moved) break;
      pageNumber += 1;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return allNotas;
  }

  private async readCurrentPageNotas(): Promise<NotaFiscalRow[]> {
    return this.page.evaluate(`(() => {
      const table = document.querySelector("#tabServicoTomado");
      if (!table) return [];

      const headerCells = Array.from(table.querySelectorAll("thead th, tr th"));
      const columnIndex = {};
      headerCells.forEach((th, index) => {
        const sortEl = th.querySelector("[data-sort-column]");
        const sort = sortEl ? sortEl.getAttribute("data-sort-column") : null;
        if (sort) columnIndex[sort] = index;
      });

      const textOf = (cell) => (cell && cell.textContent ? cell.textContent : "").replace(/\\s+/g, " ").trim();
      const tooltipOf = (cell) => {
        if (!cell) return "";
        const icon = cell.querySelector("i[data-original-title], i[title], span[data-original-title], a[data-original-title], a[title]");
        return (
          (icon && (icon.getAttribute("data-original-title") || icon.getAttribute("title"))) ||
          textOf(cell)
        );
      };

      let statusConferencia = "nao_conferido";
      const notas = [];
      const rows = Array.from(table.querySelectorAll("tr"));
      for (const row of rows) {
        const groupCell = row.querySelector("td.alert-danger, td.alert-success");
        if (groupCell) {
          const label = (groupCell.textContent || "").toLowerCase();
          if (label.includes("não confer") || label.includes("nao confer")) {
            statusConferencia = "nao_conferido";
          } else if (label.includes("confer")) {
            statusConferencia = "conferido";
          }
          continue;
        }

        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length < 5) continue;

        const getBySort = (key) => {
          const idx = columnIndex[key];
          if (idx == null) return "";
          return textOf(cells[idx]);
        };

        const numeroNfe = getBySort("NumeroNFeNumerico");
        if (!numeroNfe) continue;

        const html = row.innerHTML || "";
        const idMatch = html.match(/VisualizaServicoTomado\\((\\d+)\\)/);
        const badges = Array.from(row.querySelectorAll(".badge, .label")).map((b) =>
          (b.textContent || "").replace(/\\s+/g, " ").trim()
        );
        const hasBadgeC = badges.some((b) => b === "C" || /^C\\d+/i.test(b));
        const cancelada =
          hasBadgeC ||
          row.classList.contains("tachado") ||
          !!row.querySelector(".tachado, s, strike, [style*='line-through']") ||
          /tachado|line-through|Cancelad/i.test(html);

        const origemCell = cells[0];
        const origem =
          tooltipOf(origemCell) ||
          badges.filter((b) => b === "A" || b === "C" || /^[A-Z]$/.test(b)).join(" ");

        notas.push({
          numeroNfe,
          dataCompetencia: getBySort("DataCompetencia"),
          dataEmissaoNfe: getBySort("DataEmissaoNFe"),
          dataCadastro: getBySort("DataCadastro"),
          cnpjPrestador: getBySort("CnpjCpfFornecedor"),
          prestador: getBySort("RazaoSocialNomeFornecedor"),
          valorNfe: getBySort("ValorNFe"),
          valorLiquido: getBySort("ValorLiquidoNFe"),
          statusConferencia,
          situacaoRetencoes: tooltipOf(cells[1]),
          unecontId: idMatch ? idMatch[1] : "",
          cancelada,
          origem,
          situacaoNfts: tooltipOf(cells[2]),
        });
      }

      return notas;
    })()`) as Promise<NotaFiscalRow[]>;
  }

  private async goToNextPageIfAvailable(): Promise<boolean> {
    const moved = await this.page.evaluate(`(() => {
      const bodyText = document.body.innerText || "";
      const match = bodyText.match(/P[aá]gina\\s+(\\d+)\\s+de\\s+(\\d+)/i);
      if (!match) return false;
      const current = Number(match[1]);
      const total = Number(match[2]);
      if (!Number.isFinite(current) || !Number.isFinite(total) || current >= total) {
        return false;
      }

      const pagers = Array.from(
        document.querySelectorAll(
          ".pagination a, .pagination button, .dataTables_paginate a, ul.pagination li a, a.paginate_button"
        )
      );
      const byClass = pagers.find((el) => {
        const cls = (el.className || "").toLowerCase();
        const parentCls = (el.parentElement && el.parentElement.className || "").toLowerCase();
        const disabled = cls.includes("disabled") || parentCls.includes("disabled");
        return !disabled && (cls.includes("next") || parentCls.includes("next") || /›|»|>/.test(el.textContent || ""));
      });
      if (byClass) {
        byClass.click();
        return true;
      }

      const nextCandidates = Array.from(document.querySelectorAll("a, button"));
      const next = nextCandidates.find((el) => {
        const label = ((el.getAttribute("aria-label") || el.textContent || "")).toLowerCase().trim();
        const title = ((el.getAttribute("title") || el.getAttribute("data-original-title") || "")).toLowerCase();
        const parentCls = (el.parentElement && el.parentElement.className || "").toLowerCase();
        if (parentCls.includes("disabled") || (el.className || "").toLowerCase().includes("disabled")) {
          return false;
        }
        return (
          label === "próxima" ||
          label === "proxima" ||
          label === "next" ||
          label.includes("próxima") ||
          label.includes("proxima") ||
          title.includes("próxima") ||
          title.includes("proxima") ||
          title.includes("next")
        );
      });

      if (!next) return false;
      next.click();
      return true;
    })()`) as unknown as boolean;

    if (moved) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await this.waitForNotasTable(10_000).catch(() => {});
    }
    return moved;
  }
}
