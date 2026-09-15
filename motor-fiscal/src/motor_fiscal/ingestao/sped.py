"""Parser generico de arquivos SPED (linhas ``|REG|campo1|...|``).

- Encoding latin-1 (padrao dos arquivos SPED).
- Tolera registros desconhecidos: sao devolvidos crus e contabilizados.
- Valida as contagens do bloco 9 (9900) e o total de linhas (9999).
"""

from __future__ import annotations

import os
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class RegistroSped:
    registro: str          # codigo, ex.: 'C100'
    campos: list[str]      # campos apos o REG (sem o REG)
    numero_linha: int      # linha no arquivo (1-based)

    @property
    def bloco(self) -> str:
        return self.registro[:1]


@dataclass
class ResultadoSped:
    registros: list[RegistroSped] = field(default_factory=list)
    contagem: Counter = field(default_factory=Counter)          # por codigo de registro
    desconhecidos: Counter = field(default_factory=Counter)     # registros fora do layout conhecido
    avisos: list[str] = field(default_factory=list)             # divergencias bloco 9 / linhas malformadas
    total_linhas: int = 0


def parse_arquivo(
    caminho: str | os.PathLike,
    registros_conhecidos: set[str] | None = None,
    encoding: str = "latin-1",
) -> ResultadoSped:
    """Le um arquivo SPED inteiro e devolve os registros crus + validacoes.

    ``registros_conhecidos``: codigos que o chamador sabe tipificar; os demais
    entram em ``desconhecidos`` (mas sao mantidos em ``registros``).
    """
    resultado = ResultadoSped()
    with open(caminho, "r", encoding=encoding) as arquivo:
        for numero, linha in enumerate(arquivo, start=1):
            linha = linha.rstrip("\r\n")
            if not linha:
                continue
            resultado.total_linhas += 1
            if not (linha.startswith("|") and linha.endswith("|")):
                resultado.avisos.append(f"linha {numero}: formato invalido (sem delimitadores '|')")
                continue
            partes = linha.split("|")[1:-1]
            if not partes or not partes[0]:
                resultado.avisos.append(f"linha {numero}: registro vazio")
                continue
            reg = partes[0]
            resultado.registros.append(RegistroSped(reg, partes[1:], numero))
            resultado.contagem[reg] += 1
            if registros_conhecidos is not None and reg not in registros_conhecidos:
                resultado.desconhecidos[reg] += 1
    _validar_bloco_9(resultado)
    return resultado


def _validar_bloco_9(resultado: ResultadoSped) -> None:
    """Confere 9900 (contagem por registro) e 9999 (total de linhas)."""
    declarados: dict[str, int] = {}
    for reg in resultado.registros:
        if reg.registro == "9900" and len(reg.campos) >= 2:
            try:
                declarados[reg.campos[0]] = int(reg.campos[1])
            except ValueError:
                resultado.avisos.append(
                    f"linha {reg.numero_linha}: 9900 com quantidade nao numerica {reg.campos[1]!r}"
                )
        elif reg.registro == "9999" and reg.campos:
            try:
                total_declarado = int(reg.campos[0])
                if total_declarado != resultado.total_linhas:
                    resultado.avisos.append(
                        f"9999 declara {total_declarado} linhas, arquivo tem {resultado.total_linhas}"
                    )
            except ValueError:
                resultado.avisos.append("9999 com quantidade nao numerica")
    if not declarados:
        if resultado.registros:
            resultado.avisos.append("bloco 9 sem registros 9900 (contagens nao validadas)")
        return
    for reg_codigo, qtd_declarada in declarados.items():
        qtd_real = resultado.contagem.get(reg_codigo, 0)
        if qtd_real != qtd_declarada:
            resultado.avisos.append(
                f"9900 declara {qtd_declarada}x {reg_codigo}, arquivo tem {qtd_real}"
            )
    for reg_codigo, qtd_real in resultado.contagem.items():
        if reg_codigo not in declarados:
            resultado.avisos.append(f"registro {reg_codigo} ({qtd_real}x) sem 9900 correspondente")


def numero(valor: str | None) -> float | None:
    """Converte numero SPED ('1234,56') em float; vazio -> None."""
    if valor is None or valor == "":
        return None
    try:
        return float(valor.replace(".", "").replace(",", ".")) if "," in valor else float(valor)
    except ValueError:
        return None


def data_iso(valor: str | None) -> str | None:
    """Converte data SPED 'DDMMAAAA' em 'AAAA-MM-DD'; vazio -> None."""
    if not valor or len(valor) != 8 or not valor.isdigit():
        return None
    return f"{valor[4:8]}-{valor[2:4]}-{valor[0:2]}"


def tipificar(reg: RegistroSped, layout: list[str]) -> dict[str, str]:
    """Zipeia os campos crus com os nomes do layout; campos excedentes viram _extra_N."""
    dados: dict[str, str] = {}
    for i, nome in enumerate(layout):
        dados[nome] = reg.campos[i] if i < len(reg.campos) else ""
    for i in range(len(layout), len(reg.campos)):
        dados[f"_extra_{i + 1}"] = reg.campos[i]
    return dados


def caminho_str(caminho: str | os.PathLike) -> str:
    return str(Path(caminho))
