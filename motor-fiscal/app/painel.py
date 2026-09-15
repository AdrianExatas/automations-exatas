"""Painel Streamlit — drill-down por empresa / competencia / modulo (M8).

Referencia de estilo: Dominio/compara-relatorio-dominio (layout wide, sidebar,
metricas e tabelas).

Uso:
    python -m motor_fiscal painel
    streamlit run app/painel.py -- --relatorios-dir _local/relatorios
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument(
        "--relatorios-dir",
        default=None,
        help="Raiz dos relatorios (padrao: <cwd>/_local/relatorios)",
    )
    args, _ = parser.parse_known_args(argv)
    return args


def _raiz_relatorios(cli_dir: str | None) -> Path:
    if cli_dir:
        return Path(cli_dir)
    # Prefer cwd; se painel for rodado de motor-fiscal/, aponta para _local/relatorios
    cwd = Path.cwd() / "_local" / "relatorios"
    if cwd.is_dir():
        return cwd
    # fallback: relativo ao app/
    alt = Path(__file__).resolve().parents[1] / "_local" / "relatorios"
    return alt if alt.is_dir() else cwd


def _listar_empresas(raiz: Path) -> list[str]:
    if not raiz.is_dir():
        return []
    return sorted(p.name for p in raiz.iterdir() if p.is_dir())


def _listar_competencias(raiz: Path, empresa: str) -> list[str]:
    pasta = raiz / empresa
    if not pasta.is_dir():
        return []
    return sorted(p.name for p in pasta.iterdir() if p.is_dir())


def _listar_modulos(pasta_comp: Path) -> list[str]:
    nomes = []
    for p in sorted(pasta_comp.glob("*.json")):
        if p.name == "consolidado.json":
            continue
        nomes.append(p.stem)
    return nomes


def _carregar_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _achados_para_tabela(achados: list[dict] | None) -> list[dict[str, Any]]:
    linhas = []
    for a in achados or []:
        linha = {
            "codigo": a.get("codigo"),
            "severidade": a.get("severidade"),
            "mensagem": a.get("mensagem"),
        }
        detalhes = a.get("detalhes")
        if isinstance(detalhes, dict):
            for k, v in list(detalhes.items())[:8]:
                linha[str(k)] = v if not isinstance(v, (dict, list)) else str(v)[:200]
        linhas.append(linha)
    return linhas


def main() -> None:
    try:
        import streamlit as st
    except ImportError:
        print(
            "erro: streamlit nao instalado. Rode: pip install -e \".[painel]\" "
            "ou pip install streamlit",
            file=sys.stderr,
        )
        raise SystemExit(2) from None

    cli = _parse_args()
    raiz = _raiz_relatorios(cli.relatorios_dir)

    st.set_page_config(
        page_title="Motor Fiscal — Painel",
        page_icon=":bar_chart:",
        layout="wide",
    )
    st.title("Motor Fiscal — Relatorios por competencia")
    st.caption(
        "Drill-down empresa → competencia → modulo. "
        "Fonte: JSON gerado por `python -m motor_fiscal auditar` / `relatorio`."
    )

    with st.sidebar:
        st.subheader("Fonte de dados")
        st.code(str(raiz), language=None)
        st.markdown(
            """
            - Selecione empresa e competencia
            - Abra o consolidado ou um modulo
            - Baixe o XLSX correspondente (se existir)
            """
        )
        empresas = _listar_empresas(raiz)
        if not empresas:
            st.warning("Nenhum relatorio encontrado. Rode `auditar` ou `relatorio` antes.")
            st.stop()
        empresa = st.selectbox("Empresa (CNPJ)", empresas)
        competencias = _listar_competencias(raiz, empresa)
        if not competencias:
            st.warning("Sem competencias para esta empresa.")
            st.stop()
        competencia = st.selectbox("Competencia", competencias)
        pasta = raiz / empresa / competencia
        modulos = ["(consolidado)"] + _listar_modulos(pasta)
        modulo = st.selectbox("Modulo", modulos)

    pasta = raiz / empresa / competencia
    if modulo == "(consolidado)":
        payload = _carregar_json(pasta / "consolidado.json")
        xlsx = pasta / "consolidado.xlsx"
        titulo = "Consolidado"
    else:
        payload = _carregar_json(pasta / f"{modulo}.json")
        xlsx = pasta / f"{modulo}.xlsx"
        titulo = f"Modulo `{modulo}`"

    if payload is None:
        st.error(f"JSON nao encontrado em {pasta}")
        st.stop()

    st.subheader(f"{titulo} — {empresa} / {competencia}")

    if modulo == "(consolidado)":
        resumo = payload.get("resumo") or {}
        cols = st.columns(4)
        cols[0].metric("OK", "sim" if resumo.get("ok") else "nao")
        cols[1].metric("Erros", resumo.get("erros", 0))
        cols[2].metric("Avisos", resumo.get("avisos", 0))
        cols[3].metric("Modulos", len(resumo.get("modulos") or {}))
        st.dataframe(
            [
                {"modulo": n, **info}
                for n, info in (resumo.get("modulos") or {}).items()
            ],
            use_container_width=True,
            hide_index=True,
        )
    else:
        resumo = payload.get("resumo") or {}
        cols = st.columns(4)
        cols[0].metric("OK", "sim" if payload.get("ok", True) else "nao")
        cols[1].metric("Erros", resumo.get("erros", 0))
        cols[2].metric("Avisos", resumo.get("avisos", 0))
        cols[3].metric("Achados", resumo.get("total", resumo.get("achados", len(payload.get("achados") or []))))
        tabs = st.tabs(["Achados", "JSON"])
        with tabs[0]:
            st.dataframe(
                _achados_para_tabela(payload.get("achados")),
                use_container_width=True,
                hide_index=True,
            )
        with tabs[1]:
            st.json(payload)

    if xlsx.is_file():
        st.download_button(
            f"Baixar {xlsx.name}",
            data=xlsx.read_bytes(),
            file_name=xlsx.name,
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    else:
        st.info("XLSX ainda nao gerado para esta selecao.")


if __name__ == "__main__":
    main()
