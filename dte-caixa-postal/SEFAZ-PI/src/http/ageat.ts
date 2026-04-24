/**
 * Navegação no e-AGEAT via HTTP puro.
 *
 * A página bemVindo.jsf carrega diretamente a tabela de notificações
 * dentro de form:divTableDTE (form id="form"). Não é preciso navegar
 * para "Caixa de Entrada" — ela já está visível na carga inicial.
 *
 * Fluxo:
 * 1. GET /eageat-siatweb → 302 → GET bemVindo.jsf (cookies de auth)
 * 2. POST com form:j_id316=TODAS e form:tipoLink=200 para exibir mais items
 * 3. Extrair linhas da tabela dentro de form:divTableDTE com cheerio
 * 4. Paginar via POST com javax.faces.ViewState e botão "Próximo"
 */

import { load as cheerioLoad } from "cheerio";
import type { HttpClient } from "./client.js";
import { AGEAT_BEM_VINDO_URL, AGEAT_ENTRY_URL, SIATWEB_HOST } from "../config/siatweb-urls.js";
import { isInCurrentOrPreviousMonth, mapRowCellsToNotification } from "../mailbox/parsing.js";
import type { MailboxNotification } from "../mailbox/types.js";

const AGEAT_ENTRY = AGEAT_ENTRY_URL;
const BEM_VINDO_URL = AGEAT_BEM_VINDO_URL;

type JsfPageState = {
  viewState: string;
  formId: string;
};

function extractJsfState(html: string, formId = "form"): JsfPageState | null {
  const $ = cheerioLoad(html);

  // Procura ViewState dentro do form específico, depois qualquer um
  let viewStateInput = $(`form[id="${formId}"] input[name="javax.faces.ViewState"]`);
  if (!viewStateInput.length) {
    viewStateInput = $('input[name="javax.faces.ViewState"]');
  }
  if (!viewStateInput.length) return null;

  const viewState = viewStateInput.first().val() as string;
  const closestForm = viewStateInput.first().closest("form");
  const actualFormId = closestForm.attr("id") ?? formId;

  return { viewState, formId: actualFormId };
}

function extractTableRowsFromDivTableDTE(html: string): MailboxNotification[] {
  const $ = cheerioLoad(html);
  const notifications: MailboxNotification[] = [];

  // Alvo específico: tabela dentro de form:divTableDTE (form id="form")
  const container = $('[id="form:divTableDTE"]');
  const tableSelector = container.length ? container.find("table tbody tr") : $("table tbody tr");

  tableSelector.each((_i, row) => {
    const cells = $(row)
      .find("td")
      .map((_j, td) => $(td).text().replace(/\s+/g, " ").trim())
      .get();
    const notification = mapRowCellsToNotification(cells);
    if (notification) {
      notifications.push(notification);
    }
  });

  return notifications;
}

function findNextPageButtonId(html: string): string | null {
  const $ = cheerioLoad(html);

  // RichFaces DataScroller: botão "Próximo" que não esteja disabled
  let nextId: string | null = null;

  // Padrão RichFaces 3.x: td/span/a com class rich-datascr-button que não seja disabled
  $('[id*="scroller"]').each((_i, el) => {
    const id = $(el).attr("id") ?? "";
    const text = $(el).text().trim();
    const classes = $(el).attr("class") ?? "";
    const isDisabled = classes.includes("dis") || classes.includes("disabled");

    if (!isDisabled && (text === ">" || /próximo|next/i.test(text)) && id) {
      nextId = id;
      return false;
    }
  });

  if (nextId) return nextId;

  // Fallback: qualquer link com texto "Próximo" habilitado
  $("a, span").each((_i, el) => {
    const text = $(el).text().trim();
    const classes = $(el).attr("class") ?? "";
    const id = $(el).attr("id") ?? "";

    if (/^Pr[oó]ximo$/i.test(text) && !classes.includes("disabled") && !classes.includes("dis") && id) {
      nextId = id;
      return false;
    }
  });

  return nextId;
}

function buildPostBody(
  formId: string,
  viewState: string,
  extraParams: Record<string, string>,
): string {
  const params = new URLSearchParams({
    AJAXREQUEST: "_viewRoot",
    [formId]: formId,
    ...extraParams,
    "javax.faces.ViewState": viewState,
  });
  return params.toString();
}

function extractHtmlFromAjaxXml(content: string): string {
  // RichFaces AJAX: pode devolver XML com declaração + HTML, ou apenas HTML
  if (content.trimStart().startsWith("<?xml")) {
    // Remove a declaração XML para que cheerio trate como HTML
    return content.replace(/^<\?xml[^?]*\?>/, "").trim();
  }
  return content;
}

export async function collectAgeatNotifications(
  client: HttpClient,
): Promise<MailboxNotification[]> {
  // 1. GET /eageat-siatweb → captura cookies EAGEATID e JSESSIONID (302)
  const entryRes = await client.fetch(AGEAT_ENTRY, {
    redirect: "manual",
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "upgrade-insecure-requests": "1",
    },
  });

  // 302 seta EAGEATID e JSESSIONID automaticamente via parseSetCookieHeaders no client
  let targetUrl = BEM_VINDO_URL;
  if (entryRes.status === 302) {
    const loc = entryRes.headers.get("location") ?? "";
    if (loc.startsWith("http")) targetUrl = loc;
    else if (loc.startsWith("/")) targetUrl = `https://${SIATWEB_HOST}${loc}`;
  }

  // 2. GET bemVindo.jsf → página com form "form" e form:divTableDTE
  const pageRes = await client.fetch(targetUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "upgrade-insecure-requests": "1",
      referer: AGEAT_ENTRY,
    },
    redirect: "follow",
  });

  if (!pageRes.ok) {
    throw new Error(`GET bemVindo.jsf falhou: ${pageRes.status} ${pageRes.statusText}`);
  }

  const initialHtml = await pageRes.text();
  let currentHtml = initialHtml;

  const jsfState = extractJsfState(initialHtml, "form");
  if (!jsfState) {
    throw new Error("ViewState não encontrado em bemVindo.jsf — página pode não ter carregado corretamente");
  }

  // 3. POST para aplicar filtro "Todas" e mostrar 200 itens por página
  try {
    const filterParams: Record<string, string> = {
      [`${jsfState.formId}:tipoLink`]: "200",
      [`${jsfState.formId}:j_id316`]: "TODAS",
      [`${jsfState.formId}:j_id320`]: "DT_EMISSAO_DESC",
      [`${jsfState.formId}:j_id324`]: "",
      [`${jsfState.formId}:j_id318`]: `${jsfState.formId}:j_id318`,
    };

    const filterRes = await client.fetch(BEM_VINDO_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "faces-request": "partial/ajax",
        origin: `https://${SIATWEB_HOST}`,
        referer: BEM_VINDO_URL,
      },
      body: buildPostBody(jsfState.formId, jsfState.viewState, filterParams),
      redirect: "follow",
    });

    if (filterRes.ok) {
      const rawHtml = extractHtmlFromAjaxXml(await filterRes.text());
      if (rawHtml.includes("javax.faces.ViewState")) {
        currentHtml = rawHtml;
      }
    }
  } catch {
    // Se falhar, prosseguir com a página inicial (filtragem de data ainda aplica)
  }

  // 4. Paginar e coletar todas as linhas
  const allNotifications: MailboxNotification[] = [];
  const seenSignatures = new Set<string>();
  let pageHtml = currentHtml;
  let pageState = extractJsfState(currentHtml, "form") ?? jsfState;
  let maxPages = 50;

  while (maxPages-- > 0) {
    const rows = extractTableRowsFromDivTableDTE(pageHtml);
    if (rows.length === 0) break;

    const sig = rows.map((r) => `${r.issuedAtText}|${r.subject}|${r.recipientRegistration}`).join("\n");
    if (seenSignatures.has(sig)) break;
    seenSignatures.add(sig);
    allNotifications.push(...rows);

    const nextBtnId = findNextPageButtonId(pageHtml);
    if (!nextBtnId) break;

    const nextParams: Record<string, string> = {
      [`${pageState.formId}:tipoLink`]: "200",
      [`${pageState.formId}:j_id316`]: "TODAS",
      [`${pageState.formId}:j_id320`]: "DT_EMISSAO_DESC",
      [`${pageState.formId}:j_id324`]: "",
      [nextBtnId]: nextBtnId,
    };

    const nextRes = await client.fetch(BEM_VINDO_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "faces-request": "partial/ajax",
        origin: `https://${SIATWEB_HOST}`,
        referer: BEM_VINDO_URL,
      },
      body: buildPostBody(pageState.formId, pageState.viewState, nextParams),
      redirect: "follow",
    });

    if (!nextRes.ok) break;

    const nextHtml = extractHtmlFromAjaxXml(await nextRes.text());
    const newState = extractJsfState(nextHtml, "form");
    if (!newState) break;

    pageHtml = nextHtml;
    pageState = newState;
  }

  // 5. Filtrar por mês atual e anterior
  return allNotifications.filter((n) => isInCurrentOrPreviousMonth(n.issuedAtText));
}
