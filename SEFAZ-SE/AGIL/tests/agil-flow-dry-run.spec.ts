import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { incluirNotasFiscaisAgil } from '../src/agil-flow';

const key = '35260343648971000155550090001065091392607031';

type FakePageOptions = {
  attentionMessage?: string;
  attentionVisibleAfterIsVisibleCalls?: number;
  bodyText?: string;
  inlineErrorMessage?: string;
  inlineErrorStage?: 'after-inserir' | 'after-enviar';
  insertedAfterInsert?: boolean;
  /** So considera a chave visivel apos N chamadas a isVisible (simula AGIL lento). */
  gridVisibleAfterProbeCount?: number;
  /** A grelha (linha com a chave) so e visivel dentro da child frame (iframe). */
  gridInChildFrame?: boolean;
  /** O modal de atencao so e visivel dentro da child frame (iframe). */
  attentionInChildFrame?: boolean;
  /** O erro inline so e visivel dentro da child frame (iframe). */
  inlineErrorInChildFrame?: boolean;
  keepAttentionVisible?: boolean;
  okMode?: 'role' | 'input' | 'keyboard';
  pdfBody?: Buffer;
  /** Faz o click em "Inserir" travar (Promise pendente para sempre) — testa hardDeadlineMs. */
  freezeOnInserirClick?: boolean;
  /**
   * Simula `<div id="alert">` residual visivel apos Inserir e antes de Salvar (overlay
   * que intercepta pointer events). Implica que o overlay nao some apos OK (persiste).
   */
  overlayBlockBeforeSalvar?: { message: string };
  /**
   * Apos `button:Enviar`, faz `#danfe.isVisible` retornar `false` ate que um novo
   * `link:Incluir Nota Fiscal` seja registrado. Simula a tela mudar pos-PDF e
   * obriga `abrirTelaInclusaoNotaFiscal` a passar pelo caminho de reabertura.
   */
  danfeHiddenUntilReopen?: boolean;
  /**
   * O link "Incluir Nota Fiscal" so se torna visivel apos `text:AGIL:main` (simula
   * menu lateral colapsado). Se `'never'`, o link nunca fica visivel — testa o erro
   * "Nao foi possivel abrir a tela ...".
   */
  incluirLinkRequiresAgilClick?: boolean | 'never';
};

type Scope = 'main' | 'child';

function createFakePage(actions: string[], options: FakePageOptions = {}) {
  let attentionIsVisibleProbeCount = 0;
  let gridVisibilityProbeCount = 0;
  let attentionDismissed = false;

  const mainCanSeeKey = !options.gridInChildFrame;
  const childCanSeeKey = options.gridInChildFrame === true;
  const mainCanSeeAttention = !options.attentionInChildFrame;
  const childCanSeeAttention = options.attentionInChildFrame === true;
  const mainCanSeeInlineError = !options.inlineErrorInChildFrame;
  const childCanSeeInlineError = options.inlineErrorInChildFrame === true;

  function canScopeSeeKey(scope: Scope) {
    return scope === 'main' ? mainCanSeeKey : childCanSeeKey;
  }

  function canScopeSeeAttention(scope: Scope) {
    return scope === 'main' ? mainCanSeeAttention : childCanSeeAttention;
  }

  function canScopeSeeInlineError(scope: Scope) {
    return scope === 'main' ? mainCanSeeInlineError : childCanSeeInlineError;
  }

  async function gridKeyProbeVisible(scope: Scope) {
    if (!actions.includes('button:Inserir') || !options.insertedAfterInsert) {
      return false;
    }

    if (!canScopeSeeKey(scope)) {
      return false;
    }

    if (options.gridVisibleAfterProbeCount === undefined) {
      return true;
    }

    gridVisibilityProbeCount++;
    return gridVisibilityProbeCount > options.gridVisibleAfterProbeCount;
  }

  /**
   * Em producao, clicar AGIL + "Incluir Nota Fiscal" reabre a tela limpa e dispensa
   * qualquer overlay residual. Aqui consideramos que houve "reset" se algum desses
   * cliques foi registrado APOS o ultimo `button:Inserir`.
   */
  function inserirAtivoSemReset(): boolean {
    const ultimoReset = Math.max(
      actions.lastIndexOf('text:AGIL:main'),
      actions.lastIndexOf('link:Incluir Nota Fiscal'),
    );
    const ultimoInserir = actions.lastIndexOf('button:Inserir');

    return ultimoInserir > ultimoReset;
  }

  function overlayResidualBlockingActive(scope: Scope) {
    return (
      scope === 'main' &&
      options.overlayBlockBeforeSalvar !== undefined &&
      inserirAtivoSemReset() &&
      !actions.includes('button:Salvar')
    );
  }

  function divAlertVisible(scope: Scope) {
    // Em producao, o `<div id="alert">` so existe APOS o backend responder ao
    // Inserir (alerta "ja vinculada", etc.) e pode ser dispensado ao reabrir a
    // tela. O fake reflete ambos os comportamentos via `inserirAtivoSemReset`.
    if (!inserirAtivoSemReset()) {
      return false;
    }

    if (options.attentionMessage && canScopeSeeAttention(scope) && !attentionDismissed) {
      return true;
    }

    return overlayResidualBlockingActive(scope);
  }

  async function attentionTitleVisible(scope: Scope) {
    // Titulo "!!! Atenção !!!" so aparece quando ha attentionMessage configurada
    // e o ultimo Inserir nao foi seguido de reset (mesmo motivo que `divAlertVisible`).
    if (!options.attentionMessage || !canScopeSeeAttention(scope)) {
      return false;
    }

    if (!inserirAtivoSemReset() || attentionDismissed) {
      return false;
    }

    attentionIsVisibleProbeCount++;
    const delay = options.attentionVisibleAfterIsVisibleCalls ?? 0;

    return attentionIsVisibleProbeCount > delay;
  }

  function inlineErrorVisible(scope: Scope) {
    if (!options.inlineErrorMessage || !canScopeSeeInlineError(scope)) {
      return false;
    }

    if ((options.inlineErrorStage ?? 'after-inserir') === 'after-inserir') {
      return actions.includes('button:Inserir');
    }

    return actions.includes('button:Enviar');
  }

  function dismissAttention() {
    if (!options.keepAttentionVisible) {
      attentionDismissed = true;
    }
  }

  function danfeFieldVisible(): boolean {
    if (!options.danfeHiddenUntilReopen) {
      return true;
    }

    const ultimoEnviar = actions.lastIndexOf('button:Enviar');

    if (ultimoEnviar === -1) {
      return true;
    }

    const ultimoReopen = actions.lastIndexOf('link:Incluir Nota Fiscal');

    return ultimoReopen > ultimoEnviar;
  }

  function incluirLinkVisible(): boolean {
    if (options.incluirLinkRequiresAgilClick === 'never') {
      return false;
    }

    if (!options.incluirLinkRequiresAgilClick) {
      return true;
    }

    const ultimoAgil = actions.lastIndexOf('text:AGIL:main');
    const ultimoReopen = actions.lastIndexOf('link:Incluir Nota Fiscal');

    // Visivel apos um click em AGIL que ainda nao foi "consumido" por um click no link.
    return ultimoAgil > ultimoReopen;
  }

  const danfeInput = {
    click: async () => actions.push('danfe:click'),
    fill: async (value: string) => actions.push(`danfe:fill:${value}`),
    isVisible: async () => danfeFieldVisible(),
    waitFor: async ({ state, timeout }: { state?: string; timeout?: number } = {}) => {
      actions.push('wait:#danfe');

      if (state === 'visible' && !danfeFieldVisible()) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(timeout ?? 100, 100)));
        throw new Error('Timeout waiting for #danfe');
      }
    },
  };

  const acessoFrameLocator = {
    frameLocator: () => acessoFrameLocator,
    getByRole: (_role: string, opts: { name: string }) => ({
      click: async () => actions.push(`frame-button:${opts.name}`),
    }),
    locator: (selector: string) => ({
      fill: async (value: string) => actions.push(`frame:${selector}:fill:${value}`),
    }),
  };

  function buildInlineErrorLocator(scope: Scope) {
    const inlineErrorLocator = {
      evaluateAll: async () =>
        inlineErrorVisible(scope) && options.inlineErrorMessage ? [options.inlineErrorMessage] : [],
      filter: () => inlineErrorLocator,
      first: () => inlineErrorLocator,
      isVisible: async () => inlineErrorVisible(scope),
    };

    return inlineErrorLocator;
  }

  function buildOkInputLocator(scope: Scope) {
    const okInputLocator = {
      click: async () => {
        dismissAttention();
        actions.push(`global-input-out-of-container:OK:${scope}`);
      },
      isVisible: async () => (options.okMode ?? 'input') === 'input' && canScopeSeeAttention(scope),
      last: () => okInputLocator,
    };

    return okInputLocator;
  }

  function buildBodyLocator(scope: Scope) {
    return {
      evaluate: async () => {
        if (options.okMode === 'keyboard' || !canScopeSeeAttention(scope)) {
          return false;
        }

        dismissAttention();
        actions.push(`dom-click:OK:${scope}`);
        return true;
      },
      innerText: async () =>
        options.bodyText ?? 'Usuário › 10965766000164:SUPERMERCADO DORIA BOQUIM LTDA',
    };
  }

  function buildAttentionContainer(scope: Scope) {
    const okAvailable = () => canScopeSeeAttention(scope);
    const okInputSelector =
      'input[type="button"][value="OK"], input[type="submit"][value="OK"], input[value="OK"]';
    const effectiveOkMode = () => options.okMode ?? 'input';

    const attentionContainer = {
      // Suporta dois usos:
      //  1. capturarMensagemAtencao -> espera string (mensagem do dialogo).
      //  2. fecharAlertaAtencao (fallback DOM) -> espera boolean (clicado ou nao).
      // Diferencia inspecionando a fonte da funcao passada para .evaluate().
      evaluate: async (fn: unknown) => {
        const src = typeof fn === 'function' ? fn.toString() : '';

          if (src.includes("'input, button'") || src.includes('"input, button"')) {
          // Fallback DOM do fecharAlertaAtencao: simulamos como NAO conseguindo clicar
          // via DOM no fake (acoes via locator ja foram tentadas antes).
          if (okAvailable() && effectiveOkMode() === 'keyboard') {
            dismissAttention();
            actions.push(`dom-click:OK:${scope}`);
            return true;
          }

          return false;
        }

        return okAvailable() ? options.attentionMessage : undefined;
      },
      getByRole: (role: string, roleOptions: { name: string | RegExp }) => {
        const isOkRoleQuery =
          role === 'button' && roleOptions.name instanceof RegExp;
        const isCellQuery = role === 'cell';

        return {
          click: async () => {
            if (isOkRoleQuery) {
              dismissAttention();
            }

            actions.push(
              `container-${role}:${roleOptions.name instanceof RegExp ? 'OK' : roleOptions.name}`,
            );
          },
          first: () => ({
            click: async () => {
              if (isOkRoleQuery) {
                dismissAttention();
                actions.push(`container-${role}:OK:${scope}`);
                return;
              }

              actions.push(
                `container-${role}:${roleOptions.name instanceof RegExp ? 'OK' : roleOptions.name}`,
              );
            },
            isVisible: async () =>
              isOkRoleQuery ? effectiveOkMode() === 'role' && okAvailable() : okAvailable(),
            textContent: async () =>
              isCellQuery && okAvailable() ? options.attentionMessage : undefined,
          }),
          isVisible: async () =>
            isOkRoleQuery ? effectiveOkMode() === 'role' && okAvailable() : okAvailable(),
          last: () => ({
            click: async () => {
              if (isOkRoleQuery) {
                dismissAttention();
              }

              actions.push(`global-${role}:OK:${scope}`);
            },
            isVisible: async () => effectiveOkMode() === 'role' && okAvailable(),
          }),
          textContent: async () => (okAvailable() ? options.attentionMessage : undefined),
        };
      },
      last: () => attentionContainer,
      locator: (selector: string) => {
        const isOkInputQuery = selector === okInputSelector;

        return {
          click: async () => actions.push(`container-locator:${selector}`),
          first: () => ({
            click: async () => {
              if (isOkInputQuery) {
                dismissAttention();
                actions.push(`container-input:OK:${scope}`);
                return;
              }

              actions.push(`container-locator:${selector}`);
            },
            isVisible: async () =>
              isOkInputQuery && effectiveOkMode() === 'input' && okAvailable(),
          }),
          isVisible: async () =>
            isOkInputQuery && effectiveOkMode() === 'input' && okAvailable(),
        };
      },
    };

    return attentionContainer;
  }

  function buildFrameLike(scope: Scope) {
    const inlineErrorLocator = buildInlineErrorLocator(scope);
    const okInputLocator = buildOkInputLocator(scope);
    const bodyLocator = buildBodyLocator(scope);
    const attentionContainer = buildAttentionContainer(scope);

    return {
      isDetached: () => false,
      getByRole: (role: string, roleOptions: { name: string | RegExp }) => {
        const isIncluirLink =
          scope === 'main' &&
          role === 'link' &&
          typeof roleOptions.name === 'string' &&
          roleOptions.name === 'Incluir Nota Fiscal';

        const linkVisible = () => incluirLinkVisible();

        return {
          click: async () => {
            if (
              role === 'button' &&
              typeof roleOptions.name === 'string' &&
              roleOptions.name === 'Inserir' &&
              options.freezeOnInserirClick
            ) {
              actions.push(`${role}:${roleOptions.name}`);
              return new Promise<void>(() => undefined);
            }

            if (isIncluirLink && !linkVisible()) {
              throw new Error('Timeout waiting for link:Incluir Nota Fiscal');
            }

            if (
              role === 'button' &&
              typeof roleOptions.name === 'string' &&
              roleOptions.name === 'Inserir'
            ) {
              attentionDismissed = false;
            }

            actions.push(`${role}:${roleOptions.name}`);
          },
          first: () => ({
            textContent: async () =>
              canScopeSeeAttention(scope) ? options.attentionMessage : undefined,
          }),
          isVisible: async () => {
            if (isIncluirLink) {
              return linkVisible();
            }

            return options.okMode === 'role' && canScopeSeeAttention(scope);
          },
          last: () => ({
            click: async () => actions.push(`global-${role}:OK:${scope}`),
            isVisible: async () => options.okMode === 'role' && canScopeSeeAttention(scope),
          }),
          textContent: async () =>
            canScopeSeeAttention(scope) ? options.attentionMessage : undefined,
          waitFor: async ({ state, timeout }: { state?: string; timeout?: number } = {}) => {
            actions.push(`wait:${role}:${String(roleOptions.name)}`);

            if (
              isIncluirLink &&
              state === 'visible' &&
              !linkVisible()
            ) {
              await new Promise((resolve) => setTimeout(resolve, Math.min(timeout ?? 100, 100)));
              throw new Error('Timeout waiting for link');
            }
          },
        };
      },
      getByText: (text: string | RegExp, _textOptions?: { exact?: boolean }) => {
        const textMatchesKey =
          (typeof text === 'string' && text === key) || (text instanceof RegExp && text.test(key));
        const isAttentionTitle = typeof text === 'string' && text === '!!! Atenção !!!';
        const isAgil = scope === 'main' && typeof text === 'string' && text === 'AGIL';

        const visible = async () => {
          if (isAttentionTitle) {
            return await attentionTitleVisible(scope);
          }

          if (textMatchesKey) {
            return await gridKeyProbeVisible(scope);
          }

          // Textos genericos do menu (ex.: "AGIL") sao considerados visiveis por padrao.
          return isAgil;
        };

        const base = {
          click: async () => actions.push(`text:${String(text)}:${scope}`),
          evaluate: async () => undefined,
          isVisible: async () => visible(),
          waitFor: async () => {
            actions.push(`wait:${typeof text === 'string' ? text : 'RegExp'}`);

            if (
              typeof text === 'string' &&
              text === '!!! Atenção !!!' &&
              options.keepAttentionVisible
            ) {
              throw new Error('still visible');
            }
          },
        };

        return {
          ...base,
          filter: () => ({
            isVisible: async () =>
              textMatchesKey ? gridKeyProbeVisible(scope) : base.isVisible(),
            waitFor: async () => undefined,
          }),
        };
      },
      locator: (selector: string, locatorOptions?: { has?: unknown; hasText?: string | RegExp }) => {
        if (selector === '#danfe') {
          return danfeInput;
        }

        if (selector === 'table') {
          // capturarMensagemAtencao usa .locator('table', { has: attentionTitle }).last()
          if (locatorOptions?.has) {
            return attentionContainer;
          }

          return attentionContainer;
        }

        if (selector === 'div#alert') {
          // Quando ha `has: attentionTitle`, retorna o container do alerta (mesmo
          // contrato do `<table>`). Quando ha overlay residual sem attention, o
          // .first() ainda fica visivel para `localizarOverlayAlert` capturar.
          const overlayIsVisible = async () =>
            locatorOptions?.has
              ? canScopeSeeAttention(scope) &&
                Boolean(options.attentionMessage) &&
                inserirAtivoSemReset()
              : divAlertVisible(scope);

          const overlayLocator: Record<string, unknown> = {
            ...attentionContainer,
            isVisible: overlayIsVisible,
          };
          overlayLocator.first = () => ({
            ...attentionContainer,
            isVisible: overlayIsVisible,
          });
          overlayLocator.last = () => overlayLocator;

          return overlayLocator;
        }

        if (selector === 'body') {
          return bodyLocator;
        }

        if (selector === 'input[value="OK"]') {
          return okInputLocator;
        }

        if (
          selector === 'font[color="red"], font[color="#ff0000"], td:has-text("Não foi possível")'
        ) {
          return inlineErrorLocator;
        }

        if (selector === 'tr') {
          const trMatchesKey = (hasText: string | RegExp | undefined) =>
            (typeof hasText === 'string' && hasText === key) ||
            (hasText instanceof RegExp && hasText.test(key));

          return {
            filter: (opts: { hasText?: string | RegExp; hasNot?: unknown }) => {
              if (!trMatchesKey(opts.hasText)) {
                const invisible = {
                  first: () => ({ isVisible: async () => false }),
                  isVisible: async () => false,
                };

                return {
                  filter: () => invisible,
                  ...invisible,
                };
              }

              return {
                filter: (_opts2: { hasNot?: unknown }) => ({
                  first: () => ({
                    isVisible: () => gridKeyProbeVisible(scope),
                  }),
                  isVisible: () => gridKeyProbeVisible(scope),
                }),
              };
            },
          };
        }

        throw new Error(`Unexpected locator (${scope}): ${selector}`);
      },
    };
  }

  const mainFrameLike = buildFrameLike('main');
  const childFrameLike = buildFrameLike('child');

  const mainFrameSentinel = { __id: 'main-frame' };

  return {
    frameLocator: () => acessoFrameLocator,
    mainFrame: () => mainFrameSentinel,
    frames: () => [mainFrameSentinel, childFrameLike],
    getByRole: mainFrameLike.getByRole,
    getByText: mainFrameLike.getByText,
    locator: mainFrameLike.locator,
    goto: async (url: string) => actions.push(`goto:${url}`),
    keyboard: {
      press: async (keyName: string) => actions.push(`keyboard:${keyName}`),
    },
    waitForEvent: async (event: string) => {
      actions.push(`waitForEvent:${event}`);

      if (event !== 'popup' || !options.pdfBody) {
        if (event === 'popup' && options.inlineErrorMessage) {
          return new Promise(() => undefined);
        }

        return null;
      }

      return {
        close: async () => actions.push('popup:close'),
        context: () => ({
          request: {
            get: async (url: string) => {
              actions.push(`pdf:get:${url}`);

              return {
                body: async () => options.pdfBody,
                ok: () => true,
                status: () => 200,
                statusText: () => 'OK',
              };
            },
          },
        }),
        url: () => 'https://security.sefaz.se.gov.br/JasperPDF.jsp',
        waitForLoadState: async () => actions.push('popup:wait'),
      };
    },
  } as unknown as Page;
}

test('dry-run preenche a chave e para antes de Salvar e Enviar', async () => {
  const actions: string[] = [];
  const page = createFakePage(actions);

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: true,
  });

  expect(actions).toContain(`danfe:fill:${key}`);
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message: 'Dry-run finalizado antes de Salvar.',
      status: 'success',
    },
  ]);
});

test('captura alerta de erro depois de Inserir e para antes de Salvar e Enviar', async () => {
  const actions: string[] = [];
  const message = `${key} já vinculado!`;
  const page = createFakePage(actions, { attentionMessage: message });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).toContain('container-input:OK:main');
  expect(actions).not.toContain('global-input-out-of-container:OK:main');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('captura alerta quando modal de atencao demora a ficar visivel', async () => {
  const actions: string[] = [];
  const message = `${key} já vinculado!`;
  const page = createFakePage(actions, {
    attentionMessage: message,
    attentionVisibleAfterIsVisibleCalls: 25,
  });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).toContain('container-input:OK:main');
  expect(actions).not.toContain('button:Salvar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('fecha alerta usando input OK do container quando role nao fica visivel', async () => {
  const actions: string[] = [];
  const message = `${key} já vinculado!`;
  const page = createFakePage(actions, { attentionMessage: message, okMode: 'input' });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).toContain('container-input:OK:main');
  expect(actions).not.toContain('global-input-out-of-container:OK:main');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('registra erro e segue mesmo se alerta nao sumir apos OK', async () => {
  const actions: string[] = [];
  const message = `${key} já vinculado!`;
  const page = createFakePage(actions, {
    attentionMessage: message,
    keepAttentionVisible: true,
  });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).toContain('container-input:OK:main');
  expect(actions).toContain('wait:!!! Atenção !!!');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('conclui Salvar e Enviar quando a grelha so aparece na segunda fase apos Inserir', async () => {
  const actions: string[] = [];
  const pdfDownloadDir = mkdtempSync(join(tmpdir(), 'agil-pdfs-2-'));
  const page = createFakePage(actions, {
    insertedAfterInsert: true,
    gridVisibleAfterProbeCount: 14,
    pdfBody: Buffer.from('%PDF-test'),
  });

  try {
    const results = await incluirNotasFiscaisAgil(page, {
      authMode: 'credentials',
      username: 'usuario',
      password: 'senha',
      danfes: [key],
      dryRun: false,
      pdfDownloadDir,
      inserirOutcomeTimeoutMs: 450,
      insertGridConfirmTimeoutMs: 3_000,
    });

    const companyDir = '10965766000164 - SUPERMERCADO DORIA BOQUIM LTDA';
    const pdfPath = join(pdfDownloadDir, companyDir, `${key}.pdf`);

    expect(actions).toContain('button:Salvar');
    expect(actions).toContain('button:Enviar');
    expect(existsSync(pdfPath)).toBe(true);
    expect(results[0]?.status).toBe('success');
  } finally {
    rmSync(pdfDownloadDir, { force: true, recursive: true });
  }
});

test('detecta chave dentro de iframe e conclui Salvar/Enviar', async () => {
  const actions: string[] = [];
  const pdfDownloadDir = mkdtempSync(join(tmpdir(), 'agil-pdfs-iframe-'));
  const page = createFakePage(actions, {
    insertedAfterInsert: true,
    gridInChildFrame: true,
    pdfBody: Buffer.from('%PDF-test'),
  });

  try {
    const results = await incluirNotasFiscaisAgil(page, {
      authMode: 'credentials',
      username: 'usuario',
      password: 'senha',
      danfes: [key],
      dryRun: false,
      pdfDownloadDir,
    });

    const companyDir = '10965766000164 - SUPERMERCADO DORIA BOQUIM LTDA';
    const pdfPath = join(pdfDownloadDir, companyDir, `${key}.pdf`);

    expect(actions).toContain('button:Inserir');
    expect(actions).toContain('button:Salvar');
    expect(actions).toContain('button:Enviar');
    expect(existsSync(pdfPath)).toBe(true);
    expect(results[0]?.status).toBe('success');
  } finally {
    rmSync(pdfDownloadDir, { force: true, recursive: true });
  }
});

test('detecta alerta de atencao dentro de iframe e nao avanca para Salvar', async () => {
  const actions: string[] = [];
  const message = `${key} já vinculado!`;
  const page = createFakePage(actions, {
    attentionMessage: message,
    attentionInChildFrame: true,
  });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).toContain('container-input:OK:child');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('detecta erro inline dentro de iframe e nao avanca para Salvar', async () => {
  const actions: string[] = [];
  const message = 'Não foi possível enviar pois não existe nenhuma nota associada!';
  const page = createFakePage(actions, {
    inlineErrorMessage: message,
    inlineErrorInChildFrame: true,
  });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('salva PDF e fecha popup depois de Enviar', async () => {
  const actions: string[] = [];
  const progressMessages: string[] = [];
  const pdfDownloadDir = mkdtempSync(join(tmpdir(), 'agil-pdfs-'));
  const page = createFakePage(actions, {
    insertedAfterInsert: true,
    pdfBody: Buffer.from('%PDF-test'),
  });

  try {
    const results = await incluirNotasFiscaisAgil(page, {
      authMode: 'credentials',
      username: 'usuario',
      password: 'senha',
      danfes: [key],
      dryRun: false,
      pdfDownloadDir,
      onProgress: (event) => {
        if (event.message) {
          progressMessages.push(event.message);
        }
      },
    });

    const companyDir = '10965766000164 - SUPERMERCADO DORIA BOQUIM LTDA';
    const pdfPath = join(pdfDownloadDir, companyDir, `${key}.pdf`);

    expect(actions).toContain('button:Inserir');
    expect(actions).toContain('button:Salvar');
    expect(actions).toContain('button:Enviar');
    expect(actions).toContain('waitForEvent:popup');
    expect(actions).toContain('popup:close');
    expect(existsSync(pdfPath)).toBe(true);
    expect(progressMessages.some((message) => message.startsWith('Abrir tela concluido em '))).toBe(
      true,
    );
    expect(progressMessages.some((message) => message.startsWith('Inserir concluido em '))).toBe(
      true,
    );
    expect(
      progressMessages.some((message) => message.startsWith('Detectar alerta/grelha concluido em ')),
    ).toBe(true);
    expect(progressMessages.some((message) => message.startsWith('Salvar concluido em '))).toBe(
      true,
    );
    expect(progressMessages.some((message) => message.startsWith('Enviar/PDF concluido em '))).toBe(
      true,
    );
    expect(results).toEqual([
      {
        danfe: key,
        message: `PDF salvo em ${pdfPath}.`,
        pdfPath,
        status: 'success',
      },
    ]);
  } finally {
    rmSync(pdfDownloadDir, { force: true, recursive: true });
  }
});

test('captura erro inline depois de Inserir e para antes de Salvar e Enviar', async () => {
  const actions: string[] = [];
  const message = 'Não foi possível enviar pois não existe nenhuma nota associada!';
  const page = createFakePage(actions, { inlineErrorMessage: message });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('captura erro inline depois de Enviar quando PDF nao abre', async () => {
  const actions: string[] = [];
  const message = 'Não foi possível enviar pois não existe nenhuma nota associada!';
  const page = createFakePage(actions, {
    inlineErrorMessage: message,
    inlineErrorStage: 'after-enviar',
    insertedAfterInsert: true,
  });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
  });

  expect(actions).toContain('button:Inserir');
  expect(actions).toContain('button:Salvar');
  expect(actions).toContain('button:Enviar');
  expect(results).toEqual([
    {
      danfe: key,
      message,
      status: 'error',
    },
  ]);
});

test('aborta chave por deadline absoluto se a Page travar apos Inserir', async () => {
  const actions: string[] = [];
  const page = createFakePage(actions, { freezeOnInserirClick: true });

  const start = Date.now();
  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
    inserirOutcomeTimeoutMs: 60_000,
    hardDeadlineMs: 800,
  });
  const elapsed = Date.now() - start;

  expect(actions).toContain('button:Inserir');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results[0]?.status).toBe('error');
  expect(results[0]?.message).toContain(`Tempo total excedido (800ms) processando chave ${key}`);
  expect(elapsed).toBeLessThan(5_000);
});

test('aborta click em Salvar quando <div id=alert> persiste (overlay residual)', async () => {
  const actions: string[] = [];
  const overlayMessage = `${key} ja vinculada!`;
  const page = createFakePage(actions, {
    insertedAfterInsert: true,
    overlayBlockBeforeSalvar: { message: overlayMessage },
  });

  const start = Date.now();
  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
    inserirOutcomeTimeoutMs: 500,
    insertGridConfirmTimeoutMs: 200,
  });
  const elapsed = Date.now() - start;

  expect(actions).toContain('button:Inserir');
  expect(actions).not.toContain('button:Salvar');
  expect(actions).not.toContain('button:Enviar');
  expect(results[0]?.status).toBe('error');
  expect(elapsed).toBeLessThan(5_000);
});

test('nao reabre tela preventivamente entre chaves apos erro previo quando opcao esta inativa', async () => {
  const actions: string[] = [];
  const progressMessages: string[] = [];
  const message = `${key} ja vinculada!`;
  const page = createFakePage(actions, { attentionMessage: message });

  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key, key],
    dryRun: false,
    onProgress: (event) => {
      if (event.message) {
        progressMessages.push(event.message);
      }
    },
  });

  expect(results).toHaveLength(2);
  expect(results[0]?.status).toBe('error');
  expect(results[1]?.status).toBe('error');

  const inserirIndices = actions
    .map((action, index) => (action === 'button:Inserir' ? index : -1))
    .filter((index) => index !== -1);
  expect(inserirIndices).toHaveLength(2);

  const between = actions.slice(inserirIndices[0] + 1, inserirIndices[1]);
  expect(between).not.toContain('text:AGIL:main');
  expect(between).not.toContain('link:Incluir Nota Fiscal');
  expect(
    progressMessages.some((progressMessage) =>
      progressMessage.includes('Preparacao da proxima nota apos erro anterior inativa'),
    ),
  ).toBe(true);
});

test('reabre tela apos sucesso quando #danfe nao fica visivel pos-Enviar', async () => {
  const actions: string[] = [];
  const pdfDownloadDir = mkdtempSync(join(tmpdir(), 'agil-pdfs-reopen-'));
  const page = createFakePage(actions, {
    insertedAfterInsert: true,
    pdfBody: Buffer.from('%PDF-test'),
    danfeHiddenUntilReopen: true,
    incluirLinkRequiresAgilClick: true,
  });

  try {
    const start = Date.now();
    const results = await incluirNotasFiscaisAgil(page, {
      authMode: 'credentials',
      username: 'usuario',
      password: 'senha',
      danfes: [key, key],
      dryRun: false,
      pdfDownloadDir,
    });
    const elapsed = Date.now() - start;

    expect(results).toHaveLength(2);
    expect(results[0]?.status).toBe('success');
    expect(results[1]?.status).toBe('success');

    const inserirIndices = actions
      .map((action, index) => (action === 'button:Inserir' ? index : -1))
      .filter((index) => index !== -1);
    expect(inserirIndices).toHaveLength(2);

    const between = actions.slice(inserirIndices[0] + 1, inserirIndices[1]);
    expect(between).toContain('text:AGIL:main');
    expect(between).toContain('link:Incluir Nota Fiscal');
    expect(elapsed).toBeLessThan(20_000);
  } finally {
    rmSync(pdfDownloadDir, { force: true, recursive: true });
  }
});

test('aborta com mensagem clara quando link Incluir Nota Fiscal nao aparece', async () => {
  const actions: string[] = [];
  const pdfDownloadDir = mkdtempSync(join(tmpdir(), 'agil-pdfs-no-link-'));
  const page = createFakePage(actions, {
    insertedAfterInsert: true,
    pdfBody: Buffer.from('%PDF-test'),
    danfeHiddenUntilReopen: true,
    incluirLinkRequiresAgilClick: 'never',
  });

  try {
    const start = Date.now();
    const results = await incluirNotasFiscaisAgil(page, {
      authMode: 'credentials',
      username: 'usuario',
      password: 'senha',
      danfes: [key, key],
      dryRun: false,
      pdfDownloadDir,
    });
    const elapsed = Date.now() - start;

    expect(results).toHaveLength(2);
    expect(results[0]?.status).toBe('success');
    expect(results[1]?.status).toBe('error');
    expect(results[1]?.message).toContain('Nao foi possivel abrir a tela "Incluir Nota Fiscal"');
    expect(elapsed).toBeLessThan(25_000);
  } finally {
    rmSync(pdfDownloadDir, { force: true, recursive: true });
  }
});

test('erro de timeout apos Inserir menciona limite total em ms (duas fases)', async () => {
  const actions: string[] = [];
  const page = createFakePage(actions);

  const inserirOutcomeTimeoutMs = 300;
  const results = await incluirNotasFiscaisAgil(page, {
    authMode: 'credentials',
    username: 'usuario',
    password: 'senha',
    danfes: [key],
    dryRun: false,
    inserirOutcomeTimeoutMs,
    insertGridConfirmTimeoutMs: 200,
  });

  expect(results[0]?.status).toBe('error');
  expect(results[0]?.message).toContain(`ate ${2 * inserirOutcomeTimeoutMs}ms`);
  expect(actions).not.toContain('button:Salvar');
});
