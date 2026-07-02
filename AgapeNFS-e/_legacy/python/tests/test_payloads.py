from __future__ import annotations

from datetime import date

from agape_nfse.payloads import (
    FilterFields,
    build_download_payload,
    build_list_payload,
    build_login_payload,
    build_page_payload,
)


def fields() -> FilterFields:
    return FilterFields(
        pesquisa="form_conteudo:pesquisa",
        start_date="form_conteudo:j_id42InputDate",
        start_current_month="form_conteudo:j_id42InputCurrentDate",
        end_date="form_conteudo:j_id46InputDate",
        end_current_month="form_conteudo:j_id46InputCurrentDate",
        exercise="form_conteudo:j_id51",
        status="form_conteudo:comboStatusNota",
        form_marker="form_conteudo",
        auto_scroll="autoScroll",
        view_state="j_id4",
        submit_name="form_conteudo:lupa",
    )


def test_build_login_payload() -> None:
    payload = build_login_payload("123", "abc", "j_id2")

    assert payload["AJAXREQUEST"] == "regLogin"
    assert payload["j_id53"] == "123"
    assert payload["j_id55"] == "abc"
    assert payload["javax.faces.ViewState"] == "j_id2"
    assert payload["j_id64"] == "j_id64"


def test_build_list_payload_uses_finalized_status_and_dates() -> None:
    payload = build_list_payload(fields(), date(2026, 4, 1), date(2026, 4, 30))

    assert payload["AJAXREQUEST"] == "_viewRoot"
    assert payload["form_conteudo:j_id42InputDate"] == "01/04/2026"
    assert payload["form_conteudo:j_id42InputCurrentDate"] == "04/2026"
    assert payload["form_conteudo:j_id46InputDate"] == "30/04/2026"
    assert payload["form_conteudo:comboStatusNota"] == "F"
    assert payload["form_conteudo:lupa"] == "form_conteudo:lupa"


def test_build_page_payload() -> None:
    payload = build_page_payload(fields(), date(2026, 4, 1), date(2026, 4, 30), "form_conteudo:j_id59", 2)

    assert payload["ajaxSingle"] == "form_conteudo:j_id59:ds"
    assert payload["form_conteudo:j_id59:ds"] == "2"
    assert payload["AJAX:EVENTS_COUNT"] == "1"


def test_build_download_payload() -> None:
    payload = build_download_payload(fields(), date(2026, 4, 1), date(2026, 4, 30), "form_conteudo:j_id59:0:j_id97")

    assert "AJAXREQUEST" not in payload
    assert payload["form_conteudo:j_id59:0:j_id97"] == "form_conteudo:j_id59:0:j_id97"
