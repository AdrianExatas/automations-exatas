from __future__ import annotations

from decimal import Decimal
from io import BytesIO
import json

import pandas as pd

from src.models import ComparisonResult, RegistroNormalizado


def compare_registros(
    cliente_registros: list[RegistroNormalizado],
    dominio_registros: list[RegistroNormalizado],
) -> ComparisonResult:
    cliente_df = registros_to_dataframe(cliente_registros)
    dominio_df = registros_to_dataframe(dominio_registros)

    if cliente_df.empty:
        cliente_df = _empty_dataframe("cliente")
    if dominio_df.empty:
        dominio_df = _empty_dataframe("dominio")

    cliente_cancelado_df = cliente_df[cliente_df["status"].fillna("").str.lower() == "cancelada"].copy()
    cliente_autorizado_df = cliente_df[cliente_df["status"].fillna("").str.lower() != "cancelada"].copy()

    cliente_work = _with_note_key(cliente_autorizado_df)
    dominio_work = _with_note_key(dominio_df)

    pares_mesma_nota = cliente_work.merge(
        dominio_work,
        on="key_nota_data",
        how="inner",
        suffixes=("_cliente", "_dominio"),
    )
    valor_divergente = pares_mesma_nota[
        pares_mesma_nota["valor_cliente"] != pares_mesma_nota["valor_dominio"]
    ].copy()

    chaves_casadas = set(pares_mesma_nota["key_nota_data"].tolist())
    somente_no_cliente = cliente_work[~cliente_work["key_nota_data"].isin(chaves_casadas)].copy()
    somente_no_dominio = dominio_work[~dominio_work["key_nota_data"].isin(chaves_casadas)].copy()

    resumo = _build_summary(
        cliente_df=cliente_df,
        cliente_autorizado_df=cliente_autorizado_df,
        cliente_cancelado_df=cliente_cancelado_df,
        dominio_df=dominio_df,
        somente_no_cliente=somente_no_cliente,
        somente_no_dominio=somente_no_dominio,
        valor_divergente=valor_divergente,
    )
    motivos = _build_motivos(
        cliente_cancelado_df=cliente_cancelado_df,
        somente_no_cliente=somente_no_cliente,
        somente_no_dominio=somente_no_dominio,
        valor_divergente=valor_divergente,
    )
    analise_textual = _build_analysis_text(resumo, motivos)

    return ComparisonResult(
        resumo=resumo,
        motivos=motivos,
        analise_textual=analise_textual,
        notas_canceladas_cliente=_serialize_dataframe(cliente_cancelado_df),
        somente_no_cliente=_serialize_dataframe(somente_no_cliente),
        somente_no_dominio=_serialize_dataframe(somente_no_dominio),
        valor_divergente=_serialize_dataframe(valor_divergente),
    )


def registros_to_dataframe(registros: list[RegistroNormalizado]) -> pd.DataFrame:
    rows = []
    for registro in registros:
        rows.append(
            {
                "origem": registro.origem,
                "numero_nota": registro.numero_nota,
                "data_emissao": registro.data_emissao.isoformat(),
                "valor": float(registro.valor),
                "status": registro.status,
                "cliente_nome": registro.cliente_nome,
                "cliente_documento": registro.cliente_documento,
                "campos_brutos": json.dumps(registro.campos_brutos, ensure_ascii=False, default=str),
            }
        )
    return pd.DataFrame(rows)


def export_comparison_to_excel(result: ComparisonResult) -> bytes:
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        pd.DataFrame(result.resumo).to_excel(writer, index=False, sheet_name="resumo")
        pd.DataFrame(result.motivos).to_excel(writer, index=False, sheet_name="motivos")
        pd.DataFrame(result.notas_canceladas_cliente).to_excel(writer, index=False, sheet_name="canceladas_cliente")
        pd.DataFrame(result.somente_no_cliente).to_excel(writer, index=False, sheet_name="somente_no_cliente")
        pd.DataFrame(result.somente_no_dominio).to_excel(writer, index=False, sheet_name="somente_no_dominio")
        pd.DataFrame(result.valor_divergente).to_excel(writer, index=False, sheet_name="valor_divergente")
    output.seek(0)
    return output.read()


def _with_note_key(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    if work.empty:
        work["key_nota_data"] = pd.Series(dtype="object")
        return work

    work["key_nota_data"] = work["numero_nota"].astype(str) + "|" + work["data_emissao"].astype(str)
    return work


def _build_summary(**frames: pd.DataFrame) -> list[dict[str, object]]:
    total_cliente = _sum_column(frames["cliente_df"], "valor")
    total_cliente_autorizado = _sum_column(frames["cliente_autorizado_df"], "valor")
    total_cliente_cancelado = _sum_column(frames["cliente_cancelado_df"], "valor")
    total_dominio = _sum_column(frames["dominio_df"], "valor")
    diferenca = total_dominio - total_cliente_autorizado

    return [
        _summary_row("total_cliente_geral", frames["cliente_df"]),
        _summary_row("total_cliente_autorizado", frames["cliente_autorizado_df"]),
        _summary_row("total_cliente_cancelado", frames["cliente_cancelado_df"]),
        _summary_row("total_dominio", frames["dominio_df"]),
        {"tipo": "diferenca_dominio_menos_cliente_autorizado", "quantidade": None, "valor_total": float(diferenca)},
        _summary_row("somente_no_cliente", frames["somente_no_cliente"]),
        _summary_row("somente_no_dominio", frames["somente_no_dominio"]),
        _summary_row("valor_divergente", frames["valor_divergente"], value_col="valor_cliente"),
    ]


def _summary_row(tipo: str, df: pd.DataFrame, value_col: str = "valor") -> dict[str, object]:
    total = _sum_column(df, value_col)
    return {
        "tipo": tipo,
        "quantidade": int(len(df)),
        "valor_total": float(total),
    }


def _build_motivos(**frames: pd.DataFrame) -> list[dict[str, object]]:
    return [
        {
            "motivo": "notas_canceladas_no_cliente",
            "quantidade": int(len(frames["cliente_cancelado_df"])),
            "impacto_estimado": float(_sum_column(frames["cliente_cancelado_df"], "valor")),
        },
        {
            "motivo": "notas_somente_na_dominio",
            "quantidade": int(len(frames["somente_no_dominio"])),
            "impacto_estimado": float(_sum_column(frames["somente_no_dominio"], "valor")),
        },
        {
            "motivo": "notas_somente_no_cliente",
            "quantidade": int(len(frames["somente_no_cliente"])),
            "impacto_estimado": float(-_sum_column(frames["somente_no_cliente"], "valor")),
        },
        {
            "motivo": "notas_com_mesma_nota_data_e_valor_diferente",
            "quantidade": int(len(frames["valor_divergente"])),
            "impacto_estimado": float(_impacto_valor_divergente(frames["valor_divergente"])),
        },
    ]


def _build_analysis_text(resumo: list[dict[str, object]], motivos: list[dict[str, object]]) -> str:
    resumo_map = {item["tipo"]: item["valor_total"] for item in resumo}
    motivos_map = {item["motivo"]: item["impacto_estimado"] for item in motivos}
    diferenca = resumo_map["diferenca_dominio_menos_cliente_autorizado"]
    canceladas = motivos_map["notas_canceladas_no_cliente"]

    if abs(diferenca - canceladas) < 0.01 and canceladas:
        return (
            "A diferenca entre Dominio e Cliente Autorizado bate com o total das notas "
            "canceladas do cliente. Esse e o principal motivo da divergencia."
        )
    if diferenca > 0 and canceladas > 0:
        return (
            "A Dominio esta maior que o Cliente Autorizado. As notas canceladas do cliente "
            "sao um dos motivos mais provaveis e devem ser conferidas junto com as notas "
            "que aparecem apenas na Dominio."
        )
    if diferenca < 0:
        return (
            "A Dominio esta menor que o Cliente Autorizado. O principal foco deve ser "
            "conferir notas que aparecem apenas no cliente e notas com valor divergente."
        )
    return "Os totais entre Dominio e Cliente Autorizado estao alinhados."


def _serialize_dataframe(df: pd.DataFrame) -> list[dict[str, object]]:
    if df.empty:
        return []
    serializable = df.drop(columns=[col for col in ("key_exata", "key_nota_data") if col in df.columns])
    return serializable.to_dict(orient="records")


def _empty_dataframe(origem: str) -> pd.DataFrame:
    return pd.DataFrame(
        columns=[
            "origem",
            "numero_nota",
            "data_emissao",
            "valor",
            "status",
            "cliente_nome",
            "cliente_documento",
            "campos_brutos",
        ]
    )


def _format_float(value: float) -> str:
    return f"{value:.2f}"


def _sum_column(df: pd.DataFrame, column: str) -> Decimal:
    if df.empty or column not in df.columns:
        return Decimal("0")
    return Decimal(str(round(df[column].fillna(0).sum(), 2)))


def _impacto_valor_divergente(df: pd.DataFrame) -> Decimal:
    if df.empty:
        return Decimal("0")
    diferenca = (df["valor_dominio"] - df["valor_cliente"]).fillna(0).sum()
    return Decimal(str(round(diferenca, 2)))
