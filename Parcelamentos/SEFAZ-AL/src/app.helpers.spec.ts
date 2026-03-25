import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { test, expect, type Page } from "@playwright/test";
import {
  collectLatestNotificationFromFrame,
  collectNotificationCandidates,
  formatCertificateSelectionTimings,
  getSelectedCertificateName,
  loginToCompanyPicker,
  hasNoNotifications,
  parseDisplayedDate,
  resolveCertificateReadyTimeoutMs,
  sanitizeFileName,
  selectCertificateByName,
  selectMostRecentNotification,
  shouldLogCertificateSelectionTimings,
  tryLoginWithPreselectedCertificate,
  waitForNotificationsContent,
  writeSpreadsheet,
  type CompanyRef,
  type NotificationRecord,
  type SpreadsheetEntry,
} from "./app.js";

function buildCertificateSelectMarkup(options?: {
  loading?: boolean;
  selectedCertificate?: string;
}): string {
  const isLoading = options?.loading ?? false;
  const selectedCertificate = options?.selectedCertificate ?? "";
  const selectionItem = selectedCertificate
    ? `<span class="audora-select-selection-item">${selectedCertificate}</span>`
    : "";
  const placeholder = selectedCertificate
    ? ""
    : '<span class="audora-select-selection-placeholder">Selecione o certificado...</span>';

  return `
    <div class="audora-select ${isLoading ? "audora-select-loading" : ""}">
      <div class="audora-select-selector">${selectionItem}${placeholder}</div>
      <span class="audora-select-arrow ${isLoading ? "audora-select-arrow-loading" : ""}"></span>
    </div>
    <div class="audora-select-dropdown" hidden>
      <div class="audora-select-item-option">EXATAS CONTABILIDADE LTDA:27939154000108</div>
      <div class="audora-select-item-option">OUTRO CERTIFICADO:123</div>
    </div>
    <script>
      window.__selectorClicks = 0;

      const select = document.querySelector(".audora-select");
      const selector = document.querySelector(".audora-select-selector");
      const dropdown = document.querySelector(".audora-select-dropdown");
      const options = Array.from(document.querySelectorAll(".audora-select-item-option"));

      selector.addEventListener("click", () => {
        if (select.classList.contains("audora-select-loading")) {
          return;
        }

        window.__selectorClicks += 1;
        dropdown.hidden = false;
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          dropdown.hidden = true;
        }
      });

      for (const option of options) {
        option.addEventListener("click", () => {
          dropdown.hidden = true;
          const placeholderNode = document.querySelector(".audora-select-selection-placeholder");
          if (placeholderNode) {
            placeholderNode.remove();
          }

          let selectedItem = document.querySelector(".audora-select-selection-item");
          if (!selectedItem) {
            selectedItem = document.createElement("span");
            selectedItem.className = "audora-select-selection-item";
            selector.prepend(selectedItem);
          }

          selectedItem.textContent = option.textContent;
        });
      }
    </script>
  `;
}

async function releaseCertificateLoading(
  page: Page,
  options: {
    selectedCertificate?: string;
  } = {},
): Promise<void> {
  await page.evaluate((selectedCertificate) => {
    window.setTimeout(() => {
      document.querySelector(".audora-select")?.classList.remove("audora-select-loading");
      document
        .querySelector(".audora-select-arrow")
        ?.classList.remove("audora-select-arrow-loading");

      if (!selectedCertificate) {
        return;
      }

      document.querySelector(".audora-select-selection-placeholder")?.remove();

      const selector = document.querySelector(".audora-select-selector");
      if (!selector) {
        return;
      }

      let selectedItem = document.querySelector(".audora-select-selection-item");
      if (!selectedItem) {
        selectedItem = document.createElement("span");
        selectedItem.className = "audora-select-selection-item";
        selector.appendChild(selectedItem);
      }

      selectedItem.textContent = selectedCertificate;
    }, 50);
  }, options.selectedCertificate ?? null);
}

function buildLoginMarkup(options?: {
  loading?: boolean;
  selectedCertificate?: string;
  delayProfilePickerMs?: number;
}): string {
  const delayProfilePickerMs = options?.delayProfilePickerMs ?? 0;

  return `
    <main>
      ${buildCertificateSelectMarkup({
        loading: options?.loading,
        selectedCertificate: options?.selectedCertificate,
      })}
      <button type="button" id="login-button">Entrar com certificado digital</button>
      <section id="profile-picker" hidden>
        <h1>Selecione um perfil</h1>
        <div id="form-contrato_idContratoHonorario">
          <label class="audora-radio-wrapper">Empresa A</label>
        </div>
        <button type="button">Selecionar</button>
      </section>
    </main>
    <script>
      window.__loginClicks = 0;

      const loginButton = document.querySelector("#login-button");
      const profilePicker = document.querySelector("#profile-picker");

      loginButton.addEventListener("click", () => {
        window.__loginClicks += 1;
        window.setTimeout(() => {
          profilePicker.hidden = false;
        }, ${delayProfilePickerMs});
      });
    </script>
  `;
}

function buildAuthenticatedSessionMarkup(): string {
  return `
    <main>
      <nav class="Audora__User">Usuario autenticado</nav>
      <section>
        <h1>Notificacoes da empresa</h1>
        <p>Sessao autenticada ja selecionada.</p>
      </section>
    </main>
  `;
}

function buildNotificationsMarkup(state: "list" | "empty" | "loading" = "list"): string {
  if (state === "empty") {
    return `
      <div id="__appContainer__">
        <span>Entrada</span>
        <div class="content" style="font-weight: 100;">Sem Expedientes</div>
      </div>
    `;
  }

  if (state === "loading") {
    return `
      <div id="__appContainer__">
        <span>Entrada</span>
        <div class="ui basic segment">
          <button class="ui basic icon loading disabled button" role="button" disabled>
            <i class="refresh icon"></i>
          </button>
          <div class="ui text container">
            <i class="spinner massive disabled loading icon"></i>
            <h1 class="ui disabled header">
              <div class="content">Carregando...</div>
            </h1>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div id="__appContainer__">
      <span>Entrada</span>
      <div role="list">
        <div role="listitem">
          <div class="ui top right attached label">Expediente Nº 138/1/1.812/436/2022</div>
          <div class="header">NOTIFICACAO ANTIGA</div>
          <div class="description">Resumo antigo da notificacao.</div>
          <div class="meta">De TESTE em 16/02/2022</div>
        </div>
        <div role="listitem">
          <div class="ui top right attached label">Expediente Nº 343/1/1.812/3959/2026</div>
          <div class="header">NOTIFICACAO MAIS RECENTE</div>
          <div class="description">Notificacao acerca das pendencias detectadas no processo de renovacao do PRODESIN.</div>
          <div class="meta">De TESTE em 18/03/2026</div>
        </div>
      </div>
    </div>
  `;
}

test("parseDisplayedDate converte datas dd/mm/aaaa em timestamp UTC valido", () => {
  expect(parseDisplayedDate("18/03/2026")).toBe(Date.UTC(2026, 2, 18));
});

test("sanitizeFileName remove caracteres invalidos e acentos", () => {
  expect(sanitizeFileName('INDÚSTRIA/ALAGOANA:*?"<>|')).toBe("INDUSTRIA ALAGOANA");
});

test("selectMostRecentNotification escolhe a data mais recente", () => {
  const notifications: NotificationRecord[] = [
    {
      companyName: "Empresa A",
      date: "17/02/2022",
      expediente: "138/1/1.812/439/2022",
      subject: "Primeira",
      summary: "",
    },
    {
      companyName: "Empresa A",
      date: "18/03/2026",
      expediente: "343/1/1.812/3959/2026",
      subject: "Mais recente",
      summary: "",
    },
    {
      companyName: "Empresa A",
      date: "25/10/2024",
      expediente: "322/1/1.812/5442/2024",
      subject: "Intermediaria",
      summary: "",
    },
  ];

  expect(selectMostRecentNotification(notifications)).toEqual(notifications[1]);
});

test("resolveCertificateReadyTimeoutMs usa o default e respeita override valido", () => {
  expect(resolveCertificateReadyTimeoutMs({} as NodeJS.ProcessEnv)).toBe(60_000);
  expect(
    resolveCertificateReadyTimeoutMs({
      SEFAZ_CERTIFICATE_READY_TIMEOUT_MS: "15000",
    } as NodeJS.ProcessEnv),
  ).toBe(15_000);
});

test("shouldLogCertificateSelectionTimings habilita logs por default e aceita desligar", () => {
  expect(shouldLogCertificateSelectionTimings({} as NodeJS.ProcessEnv)).toBe(true);
  expect(
    shouldLogCertificateSelectionTimings({
      SEFAZ_TIMING_LOGS: "false",
    } as NodeJS.ProcessEnv),
  ).toBe(false);
});

test("formatCertificateSelectionTimings gera a mensagem ordenada por fase", () => {
  expect(
    formatCertificateSelectionTimings({
      page_opened: 1500,
      loading_finished: 38750,
      certificate_confirmed: 39210,
    }),
  ).toBe(
    "page_opened=1500ms, loading_finished=38750ms, certificate_confirmed=39210ms",
  );
});

test("selectCertificateByName espera o loading terminar e seleciona o certificado", async ({
  page,
}) => {
  await page.setContent(buildCertificateSelectMarkup({ loading: true }));

  await page.evaluate(() => {
    window.setTimeout(() => {
      document.querySelector(".audora-select")?.classList.remove("audora-select-loading");
      document
        .querySelector(".audora-select-arrow")
        ?.classList.remove("audora-select-arrow-loading");
    }, 50);
  });

  const selected = await selectCertificateByName(page, "EXATAS CONTABILIDADE LTDA", {
    timeoutMs: 2_000,
  });

  expect(selected).toContain("EXATAS CONTABILIDADE LTDA");
  expect(await getSelectedCertificateName(page)).toContain("EXATAS CONTABILIDADE LTDA");
  expect(
    await page.evaluate(() => (window as Window & { __selectorClicks?: number }).__selectorClicks),
  ).toBe(1);
});

test("getSelectedCertificateName reaproveita o certificado ja selecionado", async ({ page }) => {
  await page.setContent(
    buildCertificateSelectMarkup({
      selectedCertificate: "EXATAS CONTABILIDADE LTDA:27939154000108",
    }),
  );

  expect(await getSelectedCertificateName(page)).toBe(
    "EXATAS CONTABILIDADE LTDA:27939154000108",
  );
  expect(
    await page.evaluate(() => (window as Window & { __selectorClicks?: number }).__selectorClicks),
  ).toBe(0);
});

test("tryLoginWithPreselectedCertificate reaproveita o certificado sem abrir o dropdown", async ({
  page,
}) => {
  await page.setContent(
    buildLoginMarkup({
      selectedCertificate: "EXATAS CONTABILIDADE LTDA:27939154000108",
      delayProfilePickerMs: 25,
    }),
  );

  await expect(
    tryLoginWithPreselectedCertificate(page, "EXATAS CONTABILIDADE LTDA", 1_000),
  ).resolves.toBe(true);
  expect(
    await page.evaluate(() => (window as Window & { __selectorClicks?: number }).__selectorClicks),
  ).toBe(0);
  expect(await page.evaluate(() => (window as Window & { __loginClicks?: number }).__loginClicks)).toBe(
    1,
  );
});

test("tryLoginWithPreselectedCertificate aguarda o loading e reaproveita o certificado quando ele reaparece", async ({
  page,
}) => {
  await page.setContent(
    buildLoginMarkup({
      loading: true,
      delayProfilePickerMs: 25,
    }),
  );

  await releaseCertificateLoading(page, {
    selectedCertificate: "EXATAS CONTABILIDADE LTDA:27939154000108",
  });

  await expect(
    tryLoginWithPreselectedCertificate(page, "EXATAS CONTABILIDADE LTDA", 2_000),
  ).resolves.toBe(true);
  expect(
    await page.evaluate(() => (window as Window & { __selectorClicks?: number }).__selectorClicks),
  ).toBe(0);
  expect(await page.evaluate(() => (window as Window & { __loginClicks?: number }).__loginClicks)).toBe(
    1,
  );
});

test("tryLoginWithPreselectedCertificate aguarda o loading antes de desistir quando nao ha certificado reaproveitavel", async ({
  page,
}) => {
  await page.setContent(
    buildLoginMarkup({
      loading: true,
    }),
  );

  await releaseCertificateLoading(page);

  const didLogin = await tryLoginWithPreselectedCertificate(
    page,
    "EXATAS CONTABILIDADE LTDA",
    2_000,
  );

  expect(didLogin).toBe(false);
  expect(
    await page.evaluate(() => (window as Window & { __selectorClicks?: number }).__selectorClicks),
  ).toBe(0);
  expect(await page.evaluate(() => (window as Window & { __loginClicks?: number }).__loginClicks)).toBe(
    0,
  );
});

test("loginToCompanyPicker reaproveita a tela de login ja aberta sem navegar novamente", async ({
  page,
}) => {
  let loginPageRequests = 0;

  await page.route("**/dte/login/**", async (route) => {
    loginPageRequests += 1;
    await route.fulfill({
      body: buildLoginMarkup({
        selectedCertificate: "EXATAS CONTABILIDADE LTDA:27939154000108",
        delayProfilePickerMs: 25,
      }),
      contentType: "text/html",
    });
  });

  await page.setContent(
    buildLoginMarkup({
      selectedCertificate: "EXATAS CONTABILIDADE LTDA:27939154000108",
      delayProfilePickerMs: 25,
    }),
  );

  await expect(loginToCompanyPicker(page)).resolves.toBeUndefined();
  expect(loginPageRequests).toBe(0);
  expect(
    await page.evaluate(() => (window as Window & { __selectorClicks?: number }).__selectorClicks),
  ).toBe(0);
  expect(await page.evaluate(() => (window as Window & { __loginClicks?: number }).__loginClicks)).toBe(
    1,
  );
});

test("loginToCompanyPicker forca logout e volta ao login na primeira entrada", async ({ page }) => {
  let logoutRequests = 0;
  let loginPageRequests = 0;

  await page.route("**/dte/logout", async (route) => {
    logoutRequests += 1;
    await route.fulfill({
      headers: {
        location:
          "https://dte.sefaz.al.gov.br/dte/login/?redirect=/dte/client/nucleo/nova-base/public/",
      },
      status: 302,
    });
  });

  await page.route("**/dte/login/**", async (route) => {
    loginPageRequests += 1;
    await route.fulfill({
      body: buildLoginMarkup({
        selectedCertificate: "EXATAS CONTABILIDADE LTDA:27939154000108",
        delayProfilePickerMs: 25,
      }),
      contentType: "text/html",
    });
  });

  await page.setContent(buildAuthenticatedSessionMarkup());

  await expect(loginToCompanyPicker(page, { forceFreshSession: true })).resolves.toBeUndefined();
  expect(logoutRequests).toBe(1);
  expect(loginPageRequests).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: /Selecione um perfil/i })).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __loginClicks?: number }).__loginClicks)).toBe(
    1,
  );
});

test("waitForNotificationsContent reconhece a lista de notificacoes", async ({ page }) => {
  await page.setContent(buildNotificationsMarkup());

  await expect(waitForNotificationsContent(page.mainFrame(), 2_000)).resolves.toBe("list");
  await expect(hasNoNotifications(page.mainFrame())).resolves.toBe(false);
});

test("waitForNotificationsContent aguarda o loading e reconhece a lista renderizada depois", async ({
  page,
}) => {
  await page.setContent(buildNotificationsMarkup("loading"));

  await page.evaluate((nextMarkup) => {
    window.setTimeout(() => {
      document.body.innerHTML = nextMarkup;
    }, 50);
  }, buildNotificationsMarkup("list"));

  await expect(waitForNotificationsContent(page.mainFrame(), 2_000)).resolves.toBe("list");
});

test("waitForNotificationsContent aguarda o loading e reconhece 'Sem Expedientes' depois", async ({
  page,
}) => {
  await page.setContent(buildNotificationsMarkup("loading"));

  await page.evaluate((nextMarkup) => {
    window.setTimeout(() => {
      document.body.innerHTML = nextMarkup;
    }, 50);
  }, buildNotificationsMarkup("empty"));

  await expect(waitForNotificationsContent(page.mainFrame(), 2_000)).resolves.toBe("empty");
});

test("collectNotificationCandidates continua lendo a lista renderizada", async ({ page }) => {
  await page.setContent(buildNotificationsMarkup());

  await expect(collectNotificationCandidates(page.mainFrame(), "Empresa Com Lista")).resolves.toEqual([
    {
      companyName: "Empresa Com Lista",
      date: "16/02/2022",
      expediente: "138/1/1.812/436/2022",
      key: "138/1/1.812/436/2022|NOTIFICACAO ANTIGA|Resumo antigo da notificacao.|16/02/2022",
      subject: "NOTIFICACAO ANTIGA",
      summary: "Resumo antigo da notificacao.",
    },
    {
      companyName: "Empresa Com Lista",
      date: "18/03/2026",
      expediente: "343/1/1.812/3959/2026",
      key:
        "343/1/1.812/3959/2026|NOTIFICACAO MAIS RECENTE|Notificacao acerca das pendencias detectadas no processo de renovacao do PRODESIN.|18/03/2026",
      subject: "NOTIFICACAO MAIS RECENTE",
      summary: "Notificacao acerca das pendencias detectadas no processo de renovacao do PRODESIN.",
    },
  ]);
});

test("collectNotificationCandidates continua lendo a lista apos sair do loading", async ({
  page,
}) => {
  await page.setContent(buildNotificationsMarkup("loading"));

  await page.evaluate((nextMarkup) => {
    window.setTimeout(() => {
      document.body.innerHTML = nextMarkup;
    }, 50);
  }, buildNotificationsMarkup("list"));

  await expect(collectNotificationCandidates(page.mainFrame(), "Empresa Com Lista")).resolves.toEqual([
    {
      companyName: "Empresa Com Lista",
      date: "16/02/2022",
      expediente: "138/1/1.812/436/2022",
      key: "138/1/1.812/436/2022|NOTIFICACAO ANTIGA|Resumo antigo da notificacao.|16/02/2022",
      subject: "NOTIFICACAO ANTIGA",
      summary: "Resumo antigo da notificacao.",
    },
    {
      companyName: "Empresa Com Lista",
      date: "18/03/2026",
      expediente: "343/1/1.812/3959/2026",
      key:
        "343/1/1.812/3959/2026|NOTIFICACAO MAIS RECENTE|Notificacao acerca das pendencias detectadas no processo de renovacao do PRODESIN.|18/03/2026",
      subject: "NOTIFICACAO MAIS RECENTE",
      summary: "Notificacao acerca das pendencias detectadas no processo de renovacao do PRODESIN.",
    },
  ]);
});

test("collectNotificationCandidates retorna vazio para 'Sem Expedientes'", async ({ page }) => {
  await page.setContent(buildNotificationsMarkup("empty"));

  await expect(waitForNotificationsContent(page.mainFrame(), 2_000)).resolves.toBe("empty");
  await expect(hasNoNotifications(page.mainFrame())).resolves.toBe(true);
  await expect(collectNotificationCandidates(page.mainFrame(), "Empresa Sem Expedientes")).resolves.toEqual(
    [],
  );
});

test("collectLatestNotificationFromFrame devolve null quando nao ha notificacoes", async ({
  page,
}) => {
  await page.setContent(buildNotificationsMarkup("empty"));

  await expect(
    collectLatestNotificationFromFrame(page.mainFrame(), "Empresa Sem Expedientes"),
  ).resolves.toBeNull();
});

test("writeSpreadsheet gera uma planilha consolidada com empresas com e sem notificacoes", async () => {
  const companyWithoutNotifications: CompanyRef = {
    caceal: "000000000",
    name: "Empresa Sem Expedientes Teste",
    radioValue: "1",
    role: "Contribuinte",
  };
  const companyWithNotification: CompanyRef = {
    caceal: "111111111",
    name: "Empresa Com Expediente Teste",
    radioValue: "2",
    role: "Contribuinte",
  };
  const outputPath = path.join(
    process.cwd(),
    "output",
    "spreadsheets",
    "notificacoes-consolidadas.xlsx",
  );
  const entries: SpreadsheetEntry[] = [
    {
      company: companyWithNotification,
      notification: {
        companyName: companyWithNotification.name,
        date: "18/03/2026",
        expediente: "343/1/1.812/3959/2026",
        subject: "NOTIFICACAO MAIS RECENTE",
        summary: "Notificacao acerca das pendencias detectadas no processo de renovacao do PRODESIN.",
      },
    },
    {
      company: companyWithoutNotifications,
      notification: null,
    },
  ];

  try {
    await writeSpreadsheet(entries);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(outputPath);
    const worksheet = workbook.getWorksheet("Notificacoes");

    expect(worksheet).toBeDefined();
    expect(worksheet?.getCell("A2").value).toBe(companyWithNotification.name);
    expect(worksheet?.getCell("B2").value).toBe("");
    expect(worksheet?.getCell("C2").value).toBe("18/03/2026");
    expect(worksheet?.getCell("D2").value).toBe("343/1/1.812/3959/2026");
    expect(worksheet?.getCell("E2").value).toBe("NOTIFICACAO MAIS RECENTE");
    expect(worksheet?.getCell("F2").value).toBe(
      "Notificacao acerca das pendencias detectadas no processo de renovacao do PRODESIN.",
    );
    expect(worksheet?.getCell("A3").value).toBe(companyWithoutNotifications.name);
    expect(worksheet?.getCell("B3").value).toBe("SEM NOTIFICACOES");
    expect(worksheet?.getCell("C3").value).toBe("");
    expect(worksheet?.getCell("D3").value).toBe("");
    expect(worksheet?.getCell("E3").value).toBe("");
    expect(worksheet?.getCell("F3").value).toBe("");
  } finally {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
});
