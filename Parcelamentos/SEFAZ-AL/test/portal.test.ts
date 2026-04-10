import assert from "node:assert/strict";
import test from "node:test";
import type { Locator, Page } from "playwright";
import {
  EMPTY_CONSOLIDACOES_MESSAGE,
  buildCalculoIndisponivelMessage,
  calculateParcelaWithRetry,
  extractInlineParcelamentoDetalhe,
  waitForLoginOutcome,
  waitForCalculoParcelaState,
  waitForConsolidacoesState,
} from "../src/portal.js";

function createPageDouble(config: {
  rowsVisible?: boolean;
  warningVisible?: boolean;
  warningText?: string;
  bodyText?: string;
}): Page {
  const locator = (selector: string) => {
    const isRows = selector === "table.data-table tbody tr.data-table-row";
    const isWarning = selector === "p.alert.alert-warning, .alert.alert-warning";
    const isBody = selector === "body";

    return {
      first() {
        return this;
      },
      async waitFor(): Promise<void> {
        if ((isRows && config.rowsVisible) || (isWarning && config.warningVisible)) {
          return;
        }

        throw new Error("not visible");
      },
      async innerText(): Promise<string> {
        if (isBody) {
          return config.bodyText ?? "";
        }

        if (isWarning) {
          return config.warningText ?? "";
        }

        return "";
      },
    };
  };

  return { locator } as unknown as Page;
}

function createLoginPageDouble(config: {
  authenticatedVisible?: boolean;
  loginAlertVisible?: boolean;
  loginAlertText?: string;
}): Page {
  const createLocator = (kind: string): Record<string, unknown> => ({
    first() {
      return this;
    },
    locator(selector: string) {
      if (kind === "loginModal" && selector.includes(".alert")) {
        return createLocator("loginAlert");
      }

      return createLocator(selector);
    },
    filter() {
      if (kind === "body") {
        return createLocator("authenticatedBody");
      }

      return this;
    },
    async waitFor(): Promise<void> {
      if ((kind === "serviceTile" || kind === "authenticatedBody") && config.authenticatedVisible) {
        return;
      }

      if (kind === "loginAlert" && config.loginAlertVisible) {
        return;
      }

      throw new Error("not visible");
    },
    async isVisible(): Promise<boolean> {
      return kind === "loginAlert" ? Boolean(config.loginAlertVisible) : false;
    },
    async innerText(): Promise<string> {
      if (kind === "loginAlert") {
        return config.loginAlertText ?? "";
      }

      return "";
    },
  });

  const locator = (selector: string) => {
    if (selector === "ngb-modal-window") {
      return createLocator("loginModal");
    }

    if (selector === 'a.btn.btn-sq-lg.btn-primary[href="#/consolidacao"]') {
      return createLocator("serviceTile");
    }

    if (selector === "body") {
      return createLocator("body");
    }

    return createLocator(selector);
  };

  return { locator } as unknown as Page;
}

type CalculoStep = { kind: "timeout" | "rows" | "alert" | "modal_closed"; alertText?: string };

function createCalculoModalDouble(config: {
  initialState?: CalculoStep;
  sequence: CalculoStep[];
}): {
  modal: Locator;
  getClickCount(): number;
  getFilledValues(): string[];
} {
  let clickCount = 0;
  let currentValue = "";
  const filledValues: string[] = [];

  const initialState = config.initialState ?? { kind: "timeout" as const };
  const currentState = (): CalculoStep => {
    if (clickCount === 0) {
      return initialState;
    }

    return config.sequence[Math.min(clickCount - 1, config.sequence.length - 1)] ?? { kind: "timeout" };
  };

  const createLocator = (kind: string): Record<string, unknown> => ({
    first() {
      return this;
    },
    locator(selector: string) {
      if (kind === "modal" && selector === "#quantidade") {
        return createLocator("quantidade");
      }

      if (kind === "modal" && selector === "table.table-parcelas tbody tr") {
        return createLocator("rows");
      }

      if (kind === "modal" && selector.includes(".alert")) {
        return createLocator("alert");
      }

      if (kind === "rows" && selector === "button.btn.btn-primary") {
        return createLocator("download");
      }

      return createLocator(selector);
    },
    getByRole(role: string, options?: { name?: string | RegExp }) {
      if (kind !== "modal") {
        throw new Error(`unsupported getByRole for ${kind}`);
      }

      const buttonName = options?.name;
      const isCalcularButton =
        role === "button" &&
        (buttonName === "Calcular Parcela" || (buttonName instanceof RegExp && buttonName.test("Calcular Parcela")));

      if (isCalcularButton) {
        return {
          click: async () => {
            clickCount += 1;
          },
        };
      }

      throw new Error(`unsupported role ${role}`);
    },
    async waitFor(): Promise<void> {
      const state = currentState();
      if (kind === "quantidade" && state.kind !== "modal_closed") {
        return;
      }

      if ((kind === "rows" || kind === "download") && state.kind === "rows") {
        return;
      }

      if (kind === "alert" && state.kind === "alert") {
        return;
      }

      throw new Error("not visible");
    },
    async isVisible(): Promise<boolean> {
      const state = currentState();
      if (kind === "modal") {
        return state.kind !== "modal_closed";
      }

      if (kind === "quantidade") {
        return state.kind !== "modal_closed";
      }

      if (kind === "rows" || kind === "download") {
        return state.kind === "rows";
      }

      if (kind === "alert") {
        return state.kind === "alert";
      }

      return false;
    },
    async fill(value: string): Promise<void> {
      if (kind !== "quantidade") {
        throw new Error(`unsupported fill for ${kind}`);
      }

      currentValue = value;
      filledValues.push(value);
    },
    async inputValue(): Promise<string> {
      if (kind !== "quantidade") {
        throw new Error(`unsupported inputValue for ${kind}`);
      }

      return currentValue;
    },
    async innerText(): Promise<string> {
      const state = currentState();

      if (kind === "alert") {
        return state.kind === "alert" ? state.alertText ?? "alerta do portal" : "";
      }

      if (kind === "modal") {
        if (state.kind === "alert") {
          return state.alertText ?? "alerta do portal";
        }

        if (state.kind === "modal_closed") {
          throw new Error("modal hidden");
        }

        return "conteudo do modal";
      }

      return "";
    },
  });

  return {
    modal: createLocator("modal") as unknown as Locator,
    getClickCount: () => clickCount,
    getFilledValues: () => [...filledValues],
  };
}

test("retorna rows quando a tabela de consolidacoes fica visivel", async () => {
  const page = createPageDouble({ rowsVisible: true });

  const state = await waitForConsolidacoesState(page);

  assert.equal(state, "rows");
});

test("retorna empty quando o portal exibe o alerta de ausencia de consolidacoes", async () => {
  const page = createPageDouble({
    warningVisible: true,
    warningText: "Nenhuma consolidação encontrada para a situação selecionada.",
  });

  const state = await waitForConsolidacoesState(page);

  assert.equal(state, "empty");
});

test("captura a mensagem do alerta exibido no modal de login", async () => {
  const page = createLoginPageDouble({
    loginAlertVisible: true,
    loginAlertText: "Erro de autenticação! Por favor verifique suas credenciais e tente novamente.",
  });

  const outcome = await waitForLoginOutcome(page, "24335320", 100);

  assert.deepEqual(outcome, {
    status: "alert",
    message: "Erro de autenticacao! Por favor verifique suas credenciais e tente novamente.",
  });
});

test("usa mensagem padrao quando o alerta de login aparece sem texto util", async () => {
  const page = createLoginPageDouble({
    loginAlertVisible: true,
    loginAlertText: "   ",
  });

  const outcome = await waitForLoginOutcome(page, "24335320", 100);

  assert.deepEqual(outcome, {
    status: "alert",
    message: "Falha de autenticacao no portal.",
  });
});

test("falha com mensagem especifica quando o portal nao carrega a tabela e informa ausencia no body", async () => {
  const page = createPageDouble({ bodyText: "Nenhuma consolidação encontrada para a situação selecionada." });

  await assert.rejects(
    () => waitForConsolidacoesState(page),
    /Nenhuma consolidacao foi encontrada para a situacao selecionada no portal\./,
  );
});

test("classifica rows_immediate quando a tabela ja esta visivel", async () => {
  const { modal, getClickCount, getFilledValues } = createCalculoModalDouble({
    initialState: { kind: "rows" },
    sequence: [],
  });

  const state = await calculateParcelaWithRetry(modal);

  assert.equal(state.status, "rows");
  assert.equal(state.resultadoCalculo, "rows_immediate");
  assert.equal(state.tentativasCalculo, 0);
  assert.deepEqual(state.temposTentativasMs, []);
  assert.equal(getClickCount(), 0);
  assert.deepEqual(getFilledValues(), []);
});

test("retorna rows_after_retry_1 quando a primeira tentativa responde", async () => {
  const { modal, getClickCount, getFilledValues } = createCalculoModalDouble({
    sequence: [{ kind: "rows" }],
  });

  const state = await calculateParcelaWithRetry(modal);

  assert.equal(state.status, "rows");
  assert.equal(state.resultadoCalculo, "rows_after_retry_1");
  assert.equal(state.tentativasCalculo, 1);
  assert.equal(state.temposTentativasMs.length, 1);
  assert.equal(getClickCount(), 1);
  assert.deepEqual(getFilledValues(), ["1"]);
});

test("retorna rows_after_retry_2 quando a segunda tentativa responde", async () => {
  const { modal, getClickCount, getFilledValues } = createCalculoModalDouble({
    sequence: [{ kind: "timeout" }, { kind: "rows" }],
  });

  const state = await calculateParcelaWithRetry(modal);

  assert.equal(state.status, "rows");
  assert.equal(state.resultadoCalculo, "rows_after_retry_2");
  assert.equal(state.tentativasCalculo, 2);
  assert.equal(state.temposTentativasMs.length, 2);
  assert.equal(getClickCount(), 2);
  assert.deepEqual(getFilledValues(), ["1"]);
});

test("retorna alert quando o portal responde com alerta", async () => {
  const { modal } = createCalculoModalDouble({
    sequence: [{ kind: "alert", alertText: "Emissao indisponivel no momento." }],
  });

  const state = await calculateParcelaWithRetry(modal);

  assert.equal(state.status, "alert");
  assert.equal(state.resultadoCalculo, "alert");
  assert.equal(state.tentativasCalculo, 1);
  assert.equal(state.temposTentativasMs.length, 1);
  assert.equal(state.message, "Emissao indisponivel no momento.");
});

test("retorna timeout apos duas tentativas sem resposta", async () => {
  const { modal } = createCalculoModalDouble({
    sequence: [{ kind: "timeout" }, { kind: "timeout" }],
  });

  const state = await calculateParcelaWithRetry(modal);

  assert.equal(state.status, "timeout");
  assert.equal(state.resultadoCalculo, "timeout");
  assert.equal(state.tentativasCalculo, 2);
  assert.equal(state.temposTentativasMs.length, 2);
  assert.match(state.message, /nao retornou apos 2 tentativas/i);
});

test("classifica modal_closed quando o modal some apos o clique", async () => {
  const { modal } = createCalculoModalDouble({
    sequence: [{ kind: "modal_closed" }],
  });

  const state = await calculateParcelaWithRetry(modal);

  assert.equal(state.status, "alert");
  assert.equal(state.resultadoCalculo, "modal_closed");
  assert.equal(state.tentativasCalculo, 1);
  assert.match(state.message, /modal de emissao foi fechado/i);
});

test("extrai parcelamento e quantidade total da linha expandida", () => {
  const detalhe = extractInlineParcelamentoDetalhe(`
    Qtde Parcelas: 44
    Parcelamento: 18196621
  `);

  assert.deepEqual(detalhe, {
    parcelamento: "18196621",
    totalParcelas: 44,
  });
});

test("classifica alerta do modal sem depender de timeout bruto", async () => {
  const { modal } = createCalculoModalDouble({
    initialState: { kind: "alert", alertText: "Emissão indisponível no momento." },
    sequence: [],
  });

  const state = await waitForCalculoParcelaState(modal, 100);

  assert.deepEqual(state, {
    status: "alert",
    message: "Emissão indisponível no momento.",
  });
});

test("monta mensagem especifica quando o parcelamento foi identificado, mas a emissao falhou", () => {
  const message = buildCalculoIndisponivelMessage(
    { consolidacao: "3499404", parcelamento: "18196621" },
    "o calculo da parcela nao retornou apos 2 tentativas.",
  );

  assert.match(message, /parcelamento 18196621/i);
  assert.match(message, /consolidacao 3499404/i);
  assert.match(message, /nao retornou apos 2 tentativas/i);
});

test("mantem a mensagem vazia como referencia normalizada", () => {
  assert.equal(EMPTY_CONSOLIDACOES_MESSAGE, "Nenhuma consolidacao encontrada para a situacao selecionada.");
});
