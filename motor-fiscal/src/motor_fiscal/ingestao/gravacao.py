"""Helpers de gravacao no SQLite compartilhados pelos modulos de ingestao."""

from __future__ import annotations

import json
import sqlite3

from motor_fiscal.ingestao.sped import RegistroSped


def inserir_registro_efd(
    con: sqlite3.Connection,
    empresa: str,
    competencia: str,
    arquivo: str,
    reg: RegistroSped,
    dados: dict | None = None,
    pai_id: int | None = None,
) -> int:
    cur = con.execute(
        """INSERT INTO registros_efd
           (empresa_cnpj, competencia, arquivo, bloco, registro, numero_linha, pai_id, campos, dados)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            empresa,
            competencia,
            arquivo,
            reg.bloco,
            reg.registro,
            reg.numero_linha,
            pai_id,
            json.dumps(reg.campos, ensure_ascii=False),
            json.dumps(dados, ensure_ascii=False) if dados is not None else None,
        ),
    )
    return cur.lastrowid


def inserir_documento(con: sqlite3.Connection, valores: dict) -> int:
    colunas = ", ".join(valores)
    marcadores = ", ".join("?" for _ in valores)
    cur = con.execute(
        f"INSERT INTO documentos ({colunas}) VALUES ({marcadores})",
        tuple(valores.values()),
    )
    return cur.lastrowid


def inserir_item(con: sqlite3.Connection, valores: dict) -> int:
    colunas = ", ".join(valores)
    marcadores = ", ".join("?" for _ in valores)
    cur = con.execute(
        f"INSERT INTO itens ({colunas}) VALUES ({marcadores})",
        tuple(valores.values()),
    )
    return cur.lastrowid


def inserir_apuracao(
    con: sqlite3.Connection,
    empresa: str,
    competencia: str,
    origem: str,
    tributo: str,
    registro: str,
    dados: dict,
    uf: str | None = None,
    valor_recolher: float | None = None,
) -> int:
    cur = con.execute(
        """INSERT INTO apuracoes
           (empresa_cnpj, competencia, origem, tributo, registro, uf, dados, valor_recolher)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            empresa,
            competencia,
            origem,
            tributo,
            registro,
            uf,
            json.dumps(dados, ensure_ascii=False),
            valor_recolher,
        ),
    )
    return cur.lastrowid


def upsert_produto(
    con: sqlite3.Connection,
    empresa: str,
    competencia: str,
    origem: str,
    codigo: str,
    descricao: str | None = None,
    ncm: str | None = None,
    unidade: str | None = None,
    tipo_item: str | None = None,
    cest: str | None = None,
    aliq_icms: float | None = None,
) -> None:
    con.execute(
        """INSERT INTO produtos
           (empresa_cnpj, competencia, origem, codigo, descricao, ncm, unidade, tipo_item, cest, aliq_icms)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (empresa_cnpj, competencia, origem, codigo) DO UPDATE SET
             descricao = COALESCE(excluded.descricao, descricao),
             ncm = COALESCE(excluded.ncm, ncm),
             unidade = COALESCE(excluded.unidade, unidade),
             tipo_item = COALESCE(excluded.tipo_item, tipo_item),
             cest = COALESCE(excluded.cest, cest),
             aliq_icms = COALESCE(excluded.aliq_icms, aliq_icms)""",
        (empresa, competencia, origem, codigo, descricao, ncm, unidade, tipo_item, cest, aliq_icms),
    )


def inserir_evento(
    con: sqlite3.Connection,
    empresa: str,
    competencia: str,
    chave_documento: str,
    tipo_evento: str | None,
    descricao: str | None = None,
    sequencia: int | None = None,
    data_evento: str | None = None,
    protocolo: str | None = None,
    arquivo_origem: str | None = None,
) -> int:
    cur = con.execute(
        """INSERT INTO eventos
           (empresa_cnpj, competencia, chave_documento, tipo_evento, descricao,
            sequencia, data_evento, protocolo, arquivo_origem)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            empresa,
            competencia,
            chave_documento,
            tipo_evento,
            descricao,
            sequencia,
            data_evento,
            protocolo,
            arquivo_origem,
        ),
    )
    return cur.lastrowid
