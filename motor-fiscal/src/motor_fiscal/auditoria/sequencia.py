"""Quebras de sequencia numerica por modelo/serie."""

from __future__ import annotations

import sqlite3
from collections import defaultdict

from motor_fiscal.util import achado

# Limite da amostra de numeros faltantes no payload JSON.
_AMOSTRA_FALTANTES = 100
# Span absurdo com poucos documentos → anomalia de dados, nao quebra "normal".
_SPAN_ANOMALIA = 1_000_000
_PRESENTES_ANOMALIA = 50


def _gaps_faltantes(numeros: list[int]) -> tuple[list[int], int]:
    """Conta e amostra faltantes entre numeros presentes ordenados e unicos.

    Nunca materializa ``range(minimo, maximo)`` — so percorre pares consecutivos
    e preenche a amostra ate ``_AMOSTRA_FALTANTES``.
    """
    faltando: list[int] = []
    total = 0
    for a, b in zip(numeros, numeros[1:]):
        gap = b - a - 1
        if gap <= 0:
            continue
        total += gap
        if len(faltando) >= _AMOSTRA_FALTANTES:
            continue
        # Preenche so o necessario para completar a amostra.
        limite = min(b, a + 1 + (_AMOSTRA_FALTANTES - len(faltando)))
        faltando.extend(range(a + 1, limite))
    return faltando, total


def auditar_sequencia(con: sqlite3.Connection) -> dict:
    """Detecta lacunas na numeracao de documentos por (origem, modelo, serie).

    Usa documentos da EFD ICMS/IPI (escrituracao oficial) e, na ausencia,
    XMLs de emissao propria. Ignora canceladas/inutilizadas para o buraco
    em si, mas inclui o numero na faixa esperada.
    """
    docs = con.execute(
        """SELECT id, origem, tipo, modelo, serie, numero, situacao, chave
           FROM documentos
           WHERE modelo IS NOT NULL AND numero IS NOT NULL AND numero != ''
             AND origem IN ('efd_icms_ipi', 'xml')"""
    ).fetchall()

    grupos: dict[tuple, list] = defaultdict(list)
    for d in docs:
        try:
            num = int(str(d["numero"]).lstrip("0") or "0")
        except ValueError:
            continue
        serie = d["serie"] or ""
        origem = d["origem"]
        # Preferir EFD; XML so entra se nao houver EFD do mesmo modelo/serie
        grupos[(origem, d["modelo"], serie)].append({
            "id": d["id"],
            "numero": num,
            "situacao": d["situacao"],
            "chave": d["chave"],
        })

    # Se existir grupo efd para modelo/serie, ignora o xml correspondente
    modelos_efd = {(m, s) for (o, m, s) in grupos if o == "efd_icms_ipi"}
    achados: list[dict] = []
    quebras: list[dict] = []

    for (origem, modelo, serie), lista in sorted(grupos.items()):
        if origem == "xml" and (modelo, serie) in modelos_efd:
            continue
        numeros = sorted({x["numero"] for x in lista})
        if len(numeros) < 2:
            continue
        minimo, maximo = numeros[0], numeros[-1]
        span = maximo - minimo
        presentes = set(numeros)

        # Span enorme com poucos presentes: numeracao inconsistente (serie mista
        # ou parse errado) — nao enumerar como milhares de quebras normais.
        if span > _SPAN_ANOMALIA and len(presentes) < _PRESENTES_ANOMALIA:
            item = {
                "origem": origem,
                "modelo": modelo,
                "serie": serie,
                "primeiro": minimo,
                "ultimo": maximo,
                "quantidade_presente": len(presentes),
                "numeros_faltantes": [],
                "total_faltantes": span - len(presentes) + 1,
                "anomalia_span": True,
            }
            quebras.append(item)
            achados.append(achado(
                "QUEBRA_SEQUENCIA", "aviso",
                f"Numeracao anomala modelo {modelo} serie {serie or '(vazia)'}: "
                f"apenas {len(presentes)} documento(s) entre {minimo} e {maximo} "
                f"(span={span}). Verifique serie/modelo misturados ou numero invalido.",
                **item,
            ))
            continue

        faltando, total_faltantes = _gaps_faltantes(numeros)
        if total_faltantes == 0:
            continue
        item = {
            "origem": origem,
            "modelo": modelo,
            "serie": serie,
            "primeiro": minimo,
            "ultimo": maximo,
            "quantidade_presente": len(presentes),
            "numeros_faltantes": faltando,
            "total_faltantes": total_faltantes,
        }
        quebras.append(item)
        achados.append(achado(
            "QUEBRA_SEQUENCIA", "aviso",
            f"Quebra de sequencia modelo {modelo} serie {serie or '(vazia)'}: "
            f"{total_faltantes} numero(s) faltante(s) entre {minimo} e {maximo}",
            **item,
        ))

    return {
        "quebras": quebras,
        "achados": achados,
        "contagens": {
            "quebras": len(quebras),
            "numeros_faltantes": sum(q["total_faltantes"] for q in quebras),
        },
    }
