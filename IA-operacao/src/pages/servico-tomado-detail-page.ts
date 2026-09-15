import type { Page } from "playwright";
import type { ServicoTomadoDetalhe } from "../types";

/**
 * Modal VisualizaServicoTomado — extrai dados sem responder Sim/Não.
 */
export class ServicoTomadoDetailPage {
  constructor(private readonly page: Page) {}

  async open(unecontId: string): Promise<void> {
    const id = String(unecontId).replace(/\D/g, "");
    if (!id) throw new Error("unecontId invalido para abrir detalhe");

    await this.close().catch(() => {});
    await this.page.evaluate(`(() => {
      if (typeof VisualizaServicoTomado === "function") {
        VisualizaServicoTomado(${id});
      } else {
        throw new Error("VisualizaServicoTomado nao disponivel na pagina");
      }
    })()`);

    await this.page.locator("#modalServicoTomado").waitFor({ state: "visible", timeout: 15_000 });
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  async extract(): Promise<ServicoTomadoDetalhe> {
    return this.page.evaluate(`(async () => {
      const modal = document.querySelector("#modalServicoTomado");
      if (!modal) {
        throw new Error("Modal #modalServicoTomado nao encontrado");
      }

      const valOf = (id) => {
        const el = document.querySelector("#" + id);
        if (!el) return "";
        const raw = el.value != null && el.value !== "" ? el.value : (el.textContent || "");
        return String(raw).replace(/\\s+/g, " ").trim();
      };

      const clickTab = async (href) => {
        const a = document.querySelector('#modalServicoTomado a[href="' + href + '"]');
        if (a) {
          a.click();
          await new Promise((r) => setTimeout(r, 450));
        }
        const pane = document.querySelector(href);
        return pane && pane.textContent
          ? pane.textContent.replace(/\\s+/g, " ").trim().slice(0, 4000)
          : "";
      };

      // Nao clicar em botoes Sim/Nao — apenas ler textos.
      await clickTab("#TabServicoTomadoValidacao");
      const validacoesTexto = (() => {
        const pane = document.querySelector("#TabServicoTomadoValidacao");
        return pane && pane.textContent
          ? pane.textContent.replace(/\\s+/g, " ").trim().slice(0, 4000)
          : "";
      })();

      const perguntasPendentes = [];
      const paneVal = document.querySelector("#TabServicoTomadoValidacao");
      if (paneVal) {
        // Prioriza blocos de Interacao (IRRF/CSRF/INSS) — nao clica Sim/Nao.
        const interacaoBlocks = Array.from(paneVal.querySelectorAll("div, section, fieldset, li")).filter((el) =>
          /Interação\\s*-\\s*Retenção|Interacao\\s*-\\s*Retencao/i.test(el.textContent || "")
        );
        for (const el of interacaoBlocks) {
          const t = (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 600);
          if (t.length > 30 && !perguntasPendentes.includes(t)) perguntasPendentes.push(t);
        }
        if (perguntasPendentes.length === 0) {
          const m = validacoesTexto.match(/Interação\\s*-\\s*Retenção[\\s\\S]{0,400}?Sim\\s*N[aã]o/gi) || [];
          for (const hit of m) {
            const t = hit.replace(/\\s+/g, " ").trim();
            if (!perguntasPendentes.includes(t)) perguntasPendentes.push(t);
          }
        }
      }

      const servicoTexto = await clickTab("#TabServicoTomadoDetalhes");
      const totaisTexto = await clickTab("#TabServicoTomadoTotais");
      const irrfTexto = await clickTab("#TabServicoTomadoIRRF");
      const csrfTexto = await clickTab("#TabServicoTomadoCSRF");
      const inssTexto = await clickTab("#TabServicoTomadoINSS");
      const eventosTexto = await clickTab("#TabServicoTomadoNFSeEvento");

      const pickRetencao = (texto, labels) => {
        for (const label of labels) {
          const re = new RegExp(label + "[\\\\s\\\\S]{0,40}?([R$\\\\s\\\\d.,\\\\-]+)", "i");
          const m = (texto || "").match(re);
          if (m && m[1]) return m[1].trim();
        }
        return "";
      };

      return {
        situacao: valOf("lblServicoTomadoSituacao"),
        dataCancelamento: valOf("txtServicoTomadoDataCancelamento"),
        codigoDescricaoServico: valOf("lblServicoTomadoCodigoDescricaoServico"),
        valorNfe: valOf("txtServicoTomadoValorNFe"),
        baseCalculo: valOf("txtServicoTomadoBaseCalculoNFe"),
        situacaoCalculoRetencao: valOf("lblServicoTomadoSituacaoCalculoRetencao"),
        regimeTributarioPrestador: valOf("lblServicoTomadoPrestadorRegimeTributario"),
        municipioPrestacao: valOf("txtServicoTomadoMunicipioLocalPrestacao"),
        validacoesTexto,
        perguntasPendentes,
        retencoes: {
          iss: pickRetencao(totaisTexto, ["ISS", "Reten[cç][aã]o ISS"]),
          irrf: pickRetencao(irrfTexto + " " + totaisTexto, ["IRRF", "Reten[cç][aã]o IRRF"]),
          csrf: pickRetencao(csrfTexto + " " + totaisTexto, ["CSRF", "Reten[cç][aã]o CSRF"]),
          inss: pickRetencao(inssTexto + " " + totaisTexto, ["INSS", "Reten[cç][aã]o INSS"]),
        },
        eventosTexto: (eventosTexto || "").slice(0, 2000),
        totaisTexto: (totaisTexto || "").slice(0, 2000),
        servicoTexto: (servicoTexto || "").slice(0, 2000),
      };
    })()`) as Promise<ServicoTomadoDetalhe>;
  }

  /**
   * Descarta o SweetAlert de alteracoes nao salvas (Fechar).
   * Nunca clica em Salvar — evita gravar interacao sem decisao fiscal.
   */
  private async dismissUnsavedChangesDialog(): Promise<boolean> {
    return this.page.evaluate(`(() => {
      const roots = Array.from(
        document.querySelectorAll(".swal2-container, .sweet-alert, .swal, .swal2-popup")
      );
      for (const root of roots) {
        const text = root.textContent || "";
        if (!/altera[cç][oõ]es\\s+n[aã]o\\s+salvas|Tem\\s+certeza\\s*\\?/i.test(text)) continue;

        const buttons = Array.from(root.querySelectorAll("button"));
        const fechar = buttons.find((b) => /^\\s*Fechar\\s*$/i.test((b.textContent || "").trim()));
        if (fechar) {
          fechar.click();
          return true;
        }

        // Fallback: deny/cancel, nunca Salvar.
        const discard = buttons.find((b) => {
          const t = (b.textContent || "").trim();
          return t.length > 0 && !/Salvar/i.test(t) && /Fechar|Cancelar|N[aã]o|Descartar/i.test(t);
        });
        if (discard) {
          discard.click();
          return true;
        }
      }
      return false;
    })()`) as Promise<boolean>;
  }

  private async forceHideModal(): Promise<void> {
    await this.page.evaluate(`(() => {
      document.querySelectorAll(".modal-backdrop, .swal2-container").forEach((b) => b.remove());
      document.body.classList.remove("modal-open", "swal2-shown", "swal2-height-auto");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      const modal = document.querySelector("#modalServicoTomado");
      if (modal) {
        modal.classList.remove("in", "show");
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
    })()`);
  }

  async close(): Promise<void> {
    await this.dismissUnsavedChangesDialog().catch(() => false);

    await this.page.evaluate(`(() => {
      const closeBtn = document.querySelector('#modalServicoTomado button.close[data-dismiss="modal"]');
      if (closeBtn) {
        closeBtn.click();
        return;
      }
      const sair = Array.from(document.querySelectorAll("#modalServicoTomado button")).find((b) =>
        /^\\s*Sair\\s*$/i.test((b.textContent || "").trim())
      );
      if (sair) sair.click();
    })()`);

    // SweetAlert pode surgir apos o clique de fechar.
    for (let i = 0; i < 4; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const dismissed = await this.dismissUnsavedChangesDialog().catch(() => false);
      if (dismissed) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        break;
      }
    }

    await this.forceHideModal();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
