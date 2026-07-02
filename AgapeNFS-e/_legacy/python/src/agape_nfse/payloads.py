from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Mapping

from .dates import format_br_date, format_current_month


@dataclass(frozen=True)
class FilterFields:
    pesquisa: str
    start_date: str
    start_current_month: str
    end_date: str
    end_current_month: str
    exercise: str
    status: str
    form_marker: str
    auto_scroll: str
    view_state: str
    submit_name: str


def build_login_poll_payload(view_state: str) -> dict[str, str]:
    return {
        "AJAXREQUEST": "_viewRoot",
        "form2": "form2",
        "j_id53": "",
        "j_id55": "",
        "javax.faces.ViewState": view_state,
        "pollAtualizaTemplateLogin": "pollAtualizaTemplateLogin",
        "ajaxSingle": "pollAtualizaTemplateLogin",
    }


def build_login_payload(login: str, password: str, view_state: str) -> dict[str, str]:
    return {
        "AJAXREQUEST": "regLogin",
        "form2": "form2",
        "j_id53": login,
        "j_id55": password,
        "javax.faces.ViewState": view_state,
        "j_id64": "j_id64",
    }


def build_list_payload(fields: FilterFields, start: date, end: date) -> dict[str, str]:
    payload = _base_filter_payload(fields, start, end)
    payload["AJAXREQUEST"] = "_viewRoot"
    payload[fields.submit_name] = fields.submit_name
    return payload


def build_page_payload(fields: FilterFields, start: date, end: date, table_id: str, page: int) -> dict[str, str]:
    payload = _base_filter_payload(fields, start, end)
    payload["AJAXREQUEST"] = "_viewRoot"
    payload["ajaxSingle"] = f"{table_id}:ds"
    payload[f"{table_id}:ds"] = str(page)
    payload["AJAX:EVENTS_COUNT"] = "1"
    return payload


def build_download_payload(fields: FilterFields, start: date, end: date, action_name: str) -> dict[str, str]:
    payload = _base_filter_payload(fields, start, end)
    payload[action_name] = action_name
    return payload


def _base_filter_payload(fields: FilterFields, start: date, end: date) -> dict[str, str]:
    return {
        fields.pesquisa: "",
        fields.start_date: format_br_date(start),
        fields.start_current_month: format_current_month(start),
        fields.end_date: format_br_date(end),
        fields.end_current_month: format_current_month(end),
        fields.exercise: str(start.year),
        fields.status: "F",
        fields.form_marker: "form_conteudo",
        fields.auto_scroll: "",
        "javax.faces.ViewState": fields.view_state,
    }


def payload_without_empty_values(payload: Mapping[str, str]) -> dict[str, str]:
    return {key: value for key, value in payload.items() if key}
