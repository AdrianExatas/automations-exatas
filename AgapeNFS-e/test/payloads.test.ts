import { describe, expect, test } from "bun:test";
import {
  buildDownloadPayload,
  buildListPayload,
  buildLoginPayload,
  buildLoginPollPayload,
  buildPagePayload,
} from "../src/agape/payloads";
import type { FilterFields } from "../src/agape/types";

function fields(): FilterFields {
  return {
    pesquisa: "form_conteudo:pesquisa",
    startDate: "form_conteudo:j_id42InputDate",
    startCurrentMonth: "form_conteudo:j_id42InputCurrentDate",
    endDate: "form_conteudo:j_id46InputDate",
    endCurrentMonth: "form_conteudo:j_id46InputCurrentDate",
    exercise: "form_conteudo:j_id51",
    status: "form_conteudo:comboStatusNota",
    formMarker: "form_conteudo",
    autoScroll: "autoScroll",
    viewState: "j_id4",
    submitName: "form_conteudo:lupa",
  };
}

describe("payloads Agape", () => {
  test("buildLoginPayload", () => {
    const payload = buildLoginPayload("123", "abc", "j_id2");

    expect(payload.AJAXREQUEST).toBe("regLogin");
    expect(payload.j_id53).toBe("123");
    expect(payload.j_id55).toBe("abc");
    expect(payload["javax.faces.ViewState"]).toBe("j_id2");
    expect(payload.j_id64).toBe("j_id64");
  });

  test("buildLoginPollPayload", () => {
    const payload = buildLoginPollPayload("j_id2");

    expect(payload.AJAXREQUEST).toBe("_viewRoot");
    expect(payload.ajaxSingle).toBe("pollAtualizaTemplateLogin");
    expect(payload["javax.faces.ViewState"]).toBe("j_id2");
  });

  test("buildListPayload usa finalizadas e datas BR", () => {
    const payload = buildListPayload(fields(), new Date(Date.UTC(2026, 3, 1)), new Date(Date.UTC(2026, 3, 30)));

    expect(payload.AJAXREQUEST).toBe("_viewRoot");
    expect(payload["form_conteudo:j_id42InputDate"]).toBe("01/04/2026");
    expect(payload["form_conteudo:j_id42InputCurrentDate"]).toBe("04/2026");
    expect(payload["form_conteudo:j_id46InputDate"]).toBe("30/04/2026");
    expect(payload["form_conteudo:comboStatusNota"]).toBe("F");
    expect(payload["form_conteudo:lupa"]).toBe("form_conteudo:lupa");
  });

  test("buildPagePayload", () => {
    const payload = buildPagePayload(fields(), new Date(Date.UTC(2026, 3, 1)), new Date(Date.UTC(2026, 3, 30)), "form_conteudo:j_id59", 2);

    expect(payload.ajaxSingle).toBe("form_conteudo:j_id59:ds");
    expect(payload["form_conteudo:j_id59:ds"]).toBe("2");
    expect(payload["AJAX:EVENTS_COUNT"]).toBe("1");
  });

  test("buildDownloadPayload", () => {
    const payload = buildDownloadPayload(fields(), new Date(Date.UTC(2026, 3, 1)), new Date(Date.UTC(2026, 3, 30)), "form_conteudo:j_id59:0:j_id97");

    expect(payload.AJAXREQUEST).toBeUndefined();
    expect(payload["form_conteudo:j_id59:0:j_id97"]).toBe("form_conteudo:j_id59:0:j_id97");
  });
});
