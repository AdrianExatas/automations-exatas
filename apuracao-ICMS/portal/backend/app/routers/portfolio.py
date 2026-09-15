"""Resumo agregado para o dashboard de portfolio.

Varre todas as empresas cadastradas e suas competencias disponiveis. Sem
cache nesta fase (pode ficar lento conforme o volume de dossies cresce).
"""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends

from app import operacional_db, relatorios
from app.empresas import listar_empresas
from app.models import PortfolioResumo
from app.operacional_db import get_conn

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("", response_model=PortfolioResumo)
def get_portfolio(con: sqlite3.Connection = Depends(get_conn)) -> dict:
    empresas = listar_empresas()
    total_competencias = 0
    competencias_com_erro = 0
    vl_icms_recolher_total = 0.0
    vl_sld_credor_transportar_total = 0.0

    for empresa in empresas:
        cnpj = empresa["cnpj"]
        for competencia in relatorios.listar_competencias_disponiveis(cnpj):
            total_competencias += 1
            _fonte, consolidado = relatorios.carregar_consolidado(cnpj, competencia)
            resumo_geral = relatorios.extrair_resumo_geral(consolidado)
            if resumo_geral.get("ok") is False or (resumo_geral.get("erros") or 0) > 0:
                competencias_com_erro += 1

            kpis = relatorios.extrair_kpis(consolidado)
            vl_icms_recolher_total += kpis.get("vl_icms_recolher") or 0.0
            vl_sld_credor_transportar_total += kpis.get("vl_sld_credor_transportar") or 0.0

    return {
        "total_empresas": len(empresas),
        "total_competencias": total_competencias,
        "pendencias_abertas": operacional_db.contar_pendencias_abertas(con),
        "competencias_com_erro": competencias_com_erro,
        "valores_totais": {
            "vl_icms_recolher": round(vl_icms_recolher_total, 2),
            "vl_sld_credor_transportar": round(vl_sld_credor_transportar_total, 2),
        },
    }
