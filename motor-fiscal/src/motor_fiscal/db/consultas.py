"""Camada de consulta simples sobre o banco de uma empresa/competencia."""

from __future__ import annotations

import json
import sqlite3


def contar_documentos(con: sqlite3.Connection) -> dict[str, int]:
    """Contagem de documentos por (origem, tipo), ex.: {'xml/nfe': 3, ...}."""
    linhas = con.execute(
        "SELECT origem, tipo, COUNT(*) AS qtd FROM documentos GROUP BY origem, tipo"
    ).fetchall()
    return {f"{l['origem']}/{l['tipo']}": l["qtd"] for l in linhas}


def contar_itens(con: sqlite3.Connection) -> int:
    return con.execute("SELECT COUNT(*) FROM itens").fetchone()[0]


def contar_registros_efd(con: sqlite3.Connection, arquivo: str | None = None) -> dict[str, int]:
    """Contagem de registros EFD por codigo de registro."""
    sql = "SELECT registro, COUNT(*) AS qtd FROM registros_efd"
    params: tuple = ()
    if arquivo:
        sql += " WHERE arquivo = ?"
        params = (arquivo,)
    sql += " GROUP BY registro"
    return {l["registro"]: l["qtd"] for l in con.execute(sql, params).fetchall()}


def contar_eventos(con: sqlite3.Connection) -> int:
    return con.execute("SELECT COUNT(*) FROM eventos").fetchone()[0]


def contar_produtos(con: sqlite3.Connection) -> dict[str, int]:
    linhas = con.execute(
        "SELECT origem, COUNT(*) AS qtd FROM produtos GROUP BY origem"
    ).fetchall()
    return {l["origem"]: l["qtd"] for l in linhas}


def contar_apuracoes(con: sqlite3.Connection) -> dict[str, int]:
    linhas = con.execute(
        "SELECT tributo, registro, COUNT(*) AS qtd FROM apuracoes GROUP BY tributo, registro"
    ).fetchall()
    return {f"{l['tributo']}/{l['registro']}": l["qtd"] for l in linhas}


def documento_por_chave(con: sqlite3.Connection, chave: str, origem: str | None = None) -> sqlite3.Row | None:
    sql = "SELECT * FROM documentos WHERE chave = ?"
    params: list = [chave]
    if origem:
        sql += " AND origem = ?"
        params.append(origem)
    return con.execute(sql, params).fetchone()


def itens_do_documento(con: sqlite3.Connection, documento_id: int) -> list[sqlite3.Row]:
    return con.execute(
        "SELECT * FROM itens WHERE documento_id = ? ORDER BY n_item", (documento_id,)
    ).fetchall()


def registros_efd_por_tipo(
    con: sqlite3.Connection, registro: str, arquivo: str | None = None
) -> list[dict]:
    """Retorna os registros tipados (campo ``dados``) de um codigo de registro."""
    sql = "SELECT dados, campos FROM registros_efd WHERE registro = ?"
    params: list = [registro]
    if arquivo:
        sql += " AND arquivo = ?"
        params.append(arquivo)
    sql += " ORDER BY numero_linha"
    resultado = []
    for linha in con.execute(sql, params).fetchall():
        resultado.append(json.loads(linha["dados"]) if linha["dados"] else {"_campos": json.loads(linha["campos"])})
    return resultado


def resumo_importacao(con: sqlite3.Connection) -> dict:
    """Resumo geral usado pela CLI apos importar."""
    return {
        "documentos": contar_documentos(con),
        "itens": contar_itens(con),
        "eventos": contar_eventos(con),
        "produtos": contar_produtos(con),
        "apuracoes": contar_apuracoes(con),
        "registros_efd_icms_ipi": sum(contar_registros_efd(con, "efd_icms_ipi").values()),
        "registros_efd_contribuicoes": sum(contar_registros_efd(con, "efd_contribuicoes").values()),
    }
