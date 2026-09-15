"""Helpers compartilhados do modulo PIS/COFINS."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

TOLERANCIA = 0.02  # centavos (arredondamento SPED/XML)

# CST com debito de contribuicao (operacao tributavel "cheia")
CST_DEBITO = frozenset({"01", "02", "03", "05"})
# CST com direito a credito (nao-cumulativo) — faixa 50-66
CST_CREDITO = frozenset({f"{i:02d}" for i in range(50, 67)})

ALIQ_PIS_PADRAO = 1.65
ALIQ_COFINS_PADRAO = 7.60


def agora_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def n(valor: Any) -> float:
    """Normaliza numero (float/None/str SPED) para float; None/vazio -> 0.0."""
    if valor is None or valor == "":
        return 0.0
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).strip()
    if not texto:
        return 0.0
    try:
        if "," in texto:
            return float(texto.replace(".", "").replace(",", "."))
        return float(texto)
    except ValueError:
        return 0.0


def arred2(valor: float) -> float:
    return round(valor + 0.0, 2)


def quase_igual(a: float, b: float, tol: float = TOLERANCIA) -> bool:
    return abs(a - b) <= tol


def cst_norm(cst: str | None) -> str | None:
    if cst is None or cst == "":
        return None
    digitos = "".join(c for c in str(cst) if c.isdigit())
    if not digitos:
        return None
    return digitos[-2:].zfill(2)


def carregar_dados_json(texto: str | None) -> dict:
    if not texto:
        return {}
    try:
        obj = json.loads(texto)
    except json.JSONDecodeError:
        return {}
    return obj if isinstance(obj, dict) else {}


def garantir_coluna_vicms_difal(con: sqlite3.Connection) -> None:
    """Garante coluna opcional ``itens.vicms_difal`` (variante DIFAL da exclusao)."""
    cols = {row[1] for row in con.execute("PRAGMA table_info(itens)")}
    if "vicms_difal" not in cols:
        con.execute("ALTER TABLE itens ADD COLUMN vicms_difal REAL")


def itens_contribuicao(con: sqlite3.Connection) -> list[sqlite3.Row]:
    """Itens de documentos aptos a entrar na apuracao PIS/COFINS."""
    garantir_coluna_vicms_difal(con)
    return con.execute(
        """
        SELECT i.*, d.origem, d.tipo, d.chave, d.ind_operacao, d.situacao,
               d.numero AS doc_numero, d.serie AS doc_serie, d.modelo AS doc_modelo,
               d.vicms AS doc_vicms, d.vicms_st AS doc_vicms_st,
               d.vpis AS doc_vpis, d.vcofins AS doc_vcofins,
               d.valor_total AS doc_valor_total
          FROM itens i
          JOIN documentos d ON d.id = i.documento_id
         WHERE COALESCE(d.situacao, 'regular') NOT IN ('cancelada', 'denegada', 'inutilizada')
         ORDER BY d.id, i.n_item
        """
    ).fetchall()


def apuracoes_m(con: sqlite3.Connection, tributo: str) -> list[dict]:
    """Apuracoes declaradas do bloco M para o tributo (pis|cofins)."""
    linhas = con.execute(
        """
        SELECT registro, dados, valor_recolher
          FROM apuracoes
         WHERE origem = 'efd_contribuicoes' AND tributo = ?
         ORDER BY registro, id
        """,
        (tributo,),
    ).fetchall()
    saida = []
    for lin in linhas:
        dados = carregar_dados_json(lin["dados"])
        saida.append({
            "registro": lin["registro"],
            "dados": dados,
            "valor_recolher": lin["valor_recolher"],
        })
    return saida


def registros_f100(con: sqlite3.Connection) -> list[dict]:
    linhas = con.execute(
        """
        SELECT dados FROM registros_efd
         WHERE arquivo = 'efd_contribuicoes' AND registro = 'F100'
         ORDER BY numero_linha
        """
    ).fetchall()
    return [carregar_dados_json(l["dados"]) for l in linhas]


def base_e_aliq_item(item: sqlite3.Row | dict, tributo: str) -> tuple[float, float, float]:
    """Retorna (base, aliquota_%, valor) para PIS ou COFINS a partir do item."""
    if tributo == "pis":
        base = n(item["vbc_pis"] if _has(item, "vbc_pis") else None)
        aliq = n(item["aliq_pis"] if _has(item, "aliq_pis") else None)
        valor = n(item["vpis"] if _has(item, "vpis") else None)
        padrao = ALIQ_PIS_PADRAO
    else:
        base = n(item["vbc_cofins"] if _has(item, "vbc_cofins") else None)
        aliq = n(item["aliq_cofins"] if _has(item, "aliq_cofins") else None)
        valor = n(item["vcofins"] if _has(item, "vcofins") else None)
        padrao = ALIQ_COFINS_PADRAO

    if base <= 0:
        base = n(item["valor_produto"] if _has(item, "valor_produto") else None)
    if aliq <= 0 and base > 0 and valor > 0:
        aliq = arred2(valor / base * 100)
    if aliq <= 0:
        aliq = padrao
    if valor <= 0 and base > 0 and aliq > 0:
        valor = arred2(base * aliq / 100)
    return base, aliq, valor


def _has(row: sqlite3.Row | dict, key: str) -> bool:
    if isinstance(row, dict):
        return key in row
    try:
        row[key]
        return True
    except (IndexError, KeyError):
        return False
