"""Orquestracao da auditoria/apuracao PIS-COFINS (contrato JSON para M8)."""

from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from motor_fiscal.pis_cofins import apuracao_m, cruzamento, exclusao_icms, mapa
from motor_fiscal.util import achado, agora_iso, resumir_achados


def auditar(
    con: sqlite3.Connection,
    empresa: str,
    competencia: str,
    **_kwargs: Any,
) -> dict[str, Any]:
    """Executa apuracao M, cruzamento, exclusao ICMS e mapa tributario."""
    cnpj = re.sub(r"\D", "", empresa)
    apuracao = apuracao_m.apurar(con)
    cruz = cruzamento.cruzar(con)
    exclusao = exclusao_icms.calcular(con)
    mapa_trib = mapa.montar(con)
    achados = _montar_achados(apuracao, cruz, exclusao)
    resumo_achados = resumir_achados(achados)

    conforme_apuracao = resumo_achados["erros"] == 0
    oportunidade = exclusao["oportunidade_competencia"]["total"]

    return {
        "modulo": "pis_cofins",
        "tributo": "pis_cofins",
        "empresa_cnpj": cnpj,
        "competencia": competencia,
        "gerado_em": agora_iso(),
        "ok": conforme_apuracao,
        "conforme_apuracao": conforme_apuracao,
        "apuracao": apuracao,
        "cruzamento": cruz,
        "exclusao_icms": exclusao,
        "mapa_tributario": mapa_trib,
        "achados": achados,
        "resumo": {
            **resumo_achados,
            "divergencias_pis": len(apuracao["pis"]["divergencias"]),
            "divergencias_cofins": len(apuracao["cofins"]["divergencias"]),
            "pares_documentos_divergentes": cruz["documentos"]["pares_divergentes"],
            "oportunidade_exclusao_icms": oportunidade,
            "combinacoes_mapa": mapa_trib["total_combinacoes"],
            "ha_oportunidade_exclusao": oportunidade > 0,
        },
        "conforme": conforme_apuracao and oportunidade <= 0,
    }


def gravar_json(relatorio: dict[str, Any], caminho: str | Path) -> Path:
    """Grava o relatorio JSON (cria diretorios). Retorna o path escrito."""
    path = Path(caminho)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(relatorio, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def caminho_saida_padrao(
    empresa: str,
    competencia: str,
    saida_dir: str | Path | None = None,
) -> Path:
    """``_local/relatorios/<cnpj>/<AAAA-MM>/pis_cofins.json``."""
    cnpj = re.sub(r"\D", "", empresa)
    raiz = Path(saida_dir) if saida_dir else Path.cwd() / "_local" / "relatorios"
    return raiz / cnpj / competencia / "pis_cofins.json"


def _montar_achados(apuracao: dict, cruz: dict, exclusao: dict) -> list[dict]:
    achados: list[dict] = []
    for trib in ("pis", "cofins"):
        for div in apuracao[trib]["divergencias"]:
            achados.append(achado(
                f"PISCOFINS_APUR_{trib.upper()}",
                "erro",
                f"Divergencia {trib} ({div['eixo']}/{div['campo']}): "
                f"declarado={div['declarado']} recomputado={div['recomputado']}",
                **div,
            ))
    for par in cruz["documentos"].get("divergencias") or []:
        achados.append(achado(
            "PISCOFINS_CRUZ_DOC",
            "erro",
            f"Divergencia XML x EFD-Contribuicoes na chave {par['chave']}",
            chave=par["chave"],
            qtd_campos=len(par.get("divergencias") or []),
        ))
    for inc in cruz.get("totais_cabecalho_x_itens") or []:
        achados.append(achado(
            "PISCOFINS_CRUZ_TOTAL",
            "aviso",
            f"Cabecalho x itens divergente ({inc['campo']}) doc {inc.get('numero')}",
            **inc,
        ))
    opp = exclusao["oportunidade_competencia"]["total"]
    if opp > 0:
        achados.append(achado(
            "PISCOFINS_EXCLUSAO_ICMS",
            "aviso",
            f"Oportunidade exclusao ICMS da base (RE 574.706): R$ {opp:.2f}",
            oportunidade=exclusao["oportunidade_competencia"],
            tese="RE 574.706",
        ))
    return achados
