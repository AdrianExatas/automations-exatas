"""Helpers para montar bancos sinteticos nos testes dos modulos M1/M5/M6/M7."""

from __future__ import annotations

import json
import sqlite3

from motor_fiscal.ingestao import gravacao


EMPRESA = "12345678000199"
COMPETENCIA = "2026-06"


def doc(
    con: sqlite3.Connection,
    *,
    origem: str,
    tipo: str,
    chave: str | None = None,
    modelo: str = "55",
    serie: str = "1",
    numero: str = "1",
    ind_operacao: str = "1",
    situacao: str = "regular",
    data_emissao: str = "2026-06-10",
    valor_total: float = 100.0,
    valor_produtos: float | None = None,
    vicms: float = 0.0,
    vicms_st: float = 0.0,
    vipi: float = 0.0,
    vpis: float = 0.0,
    vcofins: float = 0.0,
    chaves_referenciadas: list[str] | None = None,
    **extra,
) -> int:
    valores = {
        "empresa_cnpj": EMPRESA,
        "competencia": COMPETENCIA,
        "origem": origem,
        "tipo": tipo,
        "chave": chave,
        "modelo": modelo,
        "serie": serie,
        "numero": numero,
        "ind_operacao": ind_operacao,
        "ind_emitente": "0",
        "data_emissao": data_emissao,
        "situacao": situacao,
        "valor_total": valor_total,
        "valor_produtos": valor_produtos if valor_produtos is not None else valor_total,
        "vicms": vicms,
        "vicms_st": vicms_st,
        "vipi": vipi,
        "vpis": vpis,
        "vcofins": vcofins,
        "chaves_referenciadas": json.dumps(chaves_referenciadas) if chaves_referenciadas else None,
    }
    valores.update(extra)
    return gravacao.inserir_documento(con, valores)


def item(
    con: sqlite3.Connection,
    documento_id: int,
    *,
    n_item: int = 1,
    codigo_produto: str = "P001",
    descricao: str = "PRODUTO",
    cfop: str = "5102",
    quantidade: float = 10.0,
    valor_produto: float = 100.0,
    cst_icms: str = "00",
    vbc_icms: float = 0.0,
    aliq_icms: float = 18.0,
    vicms: float = 0.0,
    vicms_st: float = 0.0,
    unidade: str = "UN",
    **extra,
) -> int:
    valores = {
        "documento_id": documento_id,
        "n_item": n_item,
        "codigo_produto": codigo_produto,
        "descricao": descricao,
        "cfop": cfop,
        "unidade": unidade,
        "quantidade": quantidade,
        "valor_unitario": valor_produto / quantidade if quantidade else None,
        "valor_produto": valor_produto,
        "cst_icms": cst_icms,
        "vbc_icms": vbc_icms,
        "aliq_icms": aliq_icms,
        "vicms": vicms,
        "vicms_st": vicms_st,
    }
    valores.update(extra)
    return gravacao.inserir_item(con, valores)


def produto(
    con: sqlite3.Connection,
    *,
    origem: str,
    codigo: str,
    descricao: str,
    unidade: str = "UN",
) -> None:
    gravacao.upsert_produto(
        con, EMPRESA, COMPETENCIA, origem, codigo, descricao=descricao, unidade=unidade,
    )


def reg_efd(
    con: sqlite3.Connection,
    registro: str,
    dados: dict,
    numero_linha: int = 1,
) -> int:
    from motor_fiscal.ingestao.sped import RegistroSped

    campos = list(dados.values())
    reg = RegistroSped(registro, [str(c) for c in campos], numero_linha)
    return gravacao.inserir_registro_efd(
        con, EMPRESA, COMPETENCIA, "efd_icms_ipi", reg, dados=dados,
    )


def commit(con: sqlite3.Connection) -> None:
    con.commit()
