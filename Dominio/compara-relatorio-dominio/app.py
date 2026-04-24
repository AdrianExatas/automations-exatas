from __future__ import annotations

from datetime import datetime

import pandas as pd
import streamlit as st

from src.parsers.cliente import parse_cliente_pdf_bytes
from src.parsers.dominio import parse_dominio_pdf_bytes
from src.services.compare import compare_registros, export_comparison_to_excel


st.set_page_config(
    page_title="Comparador de Relatorios",
    page_icon=":bar_chart:",
    layout="wide",
)

st.title("Analise de Divergencia Cliente x Dominio")
st.caption("O foco da tela e comparar totais e apontar os registros que explicam a diferenca de valores.")

with st.sidebar:
    st.subheader("Como funciona")
    st.markdown(
        """
        - Upload do relatorio do cliente e do relatorio da Dominio
        - Total da Dominio x total do Cliente Autorizado
        - Destaque para notas canceladas no cliente
        - Listagem dos registros que ajudam a explicar a divergencia
        """
    )

cliente_file = st.file_uploader(
    "Relatorio do cliente (PDF)",
    type=["pdf"],
    key="cliente_pdf",
)
dominio_file = st.file_uploader(
    "Relatorio da Dominio (PDF)",
    type=["pdf"],
    key="dominio_pdf",
)

if st.button("Processar comparacao", type="primary", disabled=not (cliente_file and dominio_file)):
    with st.spinner("Processando PDFs e comparando registros..."):
        cliente_parse = parse_cliente_pdf_bytes(cliente_file.getvalue())
        dominio_parse = parse_dominio_pdf_bytes(dominio_file.getvalue())
        comparison = compare_registros(cliente_parse.registros, dominio_parse.registros)
        excel_bytes = export_comparison_to_excel(comparison)

    st.success("Analise concluida.")

    resumo_df = pd.DataFrame(comparison.resumo)
    resumo_map = {item["tipo"]: item["valor_total"] for item in comparison.resumo}
    st.subheader("Resumo financeiro")
    metric_cols = st.columns(4)
    metrics = {
        "Cliente autorizado": f"R$ {resumo_map.get('total_cliente_autorizado', 0):,.2f}",
        "Cliente cancelado": f"R$ {resumo_map.get('total_cliente_cancelado', 0):,.2f}",
        "Dominio": f"R$ {resumo_map.get('total_dominio', 0):,.2f}",
        "Diferenca": f"R$ {resumo_map.get('diferenca_dominio_menos_cliente_autorizado', 0):,.2f}",
    }
    for column, (label, value) in zip(metric_cols, metrics.items(), strict=False):
        column.metric(label, value)
    st.info(comparison.analise_textual)
    st.dataframe(resumo_df, use_container_width=True, hide_index=True)

    st.subheader("Motivos provaveis da divergencia")
    st.dataframe(pd.DataFrame(comparison.motivos), use_container_width=True, hide_index=True)

    st.download_button(
        "Baixar Excel da analise",
        data=excel_bytes,
        file_name=f"comparacao-relatorios-{datetime.now().strftime('%Y%m%d-%H%M%S')}.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

    tabs = st.tabs(
        [
            "Canceladas no cliente",
            "Somente no cliente",
            "Somente no dominio",
            "Valor divergente",
            "Diagnosticos",
        ]
    )

    with tabs[0]:
        st.dataframe(pd.DataFrame(comparison.notas_canceladas_cliente), use_container_width=True, hide_index=True)
    with tabs[1]:
        st.dataframe(pd.DataFrame(comparison.somente_no_cliente), use_container_width=True, hide_index=True)
    with tabs[2]:
        st.dataframe(pd.DataFrame(comparison.somente_no_dominio), use_container_width=True, hide_index=True)
    with tabs[3]:
        st.dataframe(pd.DataFrame(comparison.valor_divergente), use_container_width=True, hide_index=True)
    with tabs[4]:
        st.markdown("**Cliente**")
        if cliente_parse.diagnosticos:
            st.code("\n".join(cliente_parse.diagnosticos[:50]))
        else:
            st.write("Sem diagnosticos.")
        st.markdown("**Dominio**")
        if dominio_parse.diagnosticos:
            st.code("\n".join(dominio_parse.diagnosticos[:50]))
        else:
            st.write("Sem diagnosticos.")
else:
    st.info("Envie os dois arquivos PDF para habilitar a comparacao.")
