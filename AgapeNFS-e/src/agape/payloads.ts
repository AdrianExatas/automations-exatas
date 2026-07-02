import { formatBrDate, formatCurrentMonth } from "./dates";
import type { FilterFields } from "./types";

export type Payload = Record<string, string>;

export function buildLoginPollPayload(viewState: string): Payload {
  return {
    AJAXREQUEST: "_viewRoot",
    form2: "form2",
    j_id53: "",
    j_id55: "",
    "javax.faces.ViewState": viewState,
    pollAtualizaTemplateLogin: "pollAtualizaTemplateLogin",
    ajaxSingle: "pollAtualizaTemplateLogin",
  };
}

export function buildLoginPayload(login: string, password: string, viewState: string): Payload {
  return {
    AJAXREQUEST: "regLogin",
    form2: "form2",
    j_id53: login,
    j_id55: password,
    "javax.faces.ViewState": viewState,
    j_id64: "j_id64",
  };
}

export function buildListPayload(fields: FilterFields, start: Date, end: Date): Payload {
  return {
    ...baseFilterPayload(fields, start, end),
    AJAXREQUEST: "_viewRoot",
    [fields.submitName]: fields.submitName,
  };
}

export function buildPagePayload(
  fields: FilterFields,
  start: Date,
  end: Date,
  tableId: string,
  page: number,
): Payload {
  return {
    ...baseFilterPayload(fields, start, end),
    AJAXREQUEST: "_viewRoot",
    ajaxSingle: `${tableId}:ds`,
    [`${tableId}:ds`]: String(page),
    "AJAX:EVENTS_COUNT": "1",
  };
}

export function buildDownloadPayload(
  fields: FilterFields,
  start: Date,
  end: Date,
  actionName: string,
): Payload {
  return {
    ...baseFilterPayload(fields, start, end),
    [actionName]: actionName,
  };
}

function baseFilterPayload(fields: FilterFields, start: Date, end: Date): Payload {
  return {
    [fields.pesquisa]: "",
    [fields.startDate]: formatBrDate(start),
    [fields.startCurrentMonth]: formatCurrentMonth(start),
    [fields.endDate]: formatBrDate(end),
    [fields.endCurrentMonth]: formatCurrentMonth(end),
    [fields.exercise]: String(start.getUTCFullYear()),
    [fields.status]: "F",
    [fields.formMarker]: "form_conteudo",
    [fields.autoScroll]: "",
    "javax.faces.ViewState": fields.viewState,
  };
}
