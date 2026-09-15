"""Resolucao de pastas de input (empresas/<slug>/MM-AAAA) e dossie."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.config import DOSSIES_DIR, EMPRESAS_DIR
from app.empresas import buscar_empresa
from app.util import competencia_para_pasta, competencia_valida, somente_digitos

SUBPASTAS_INPUT = ("XML", "SPED", "GUIAS")
MARKER_INPUTS = ".portal_inputs.json"

DOSSIE_SUBPASTAS = [
    "01 - Documentos fiscais",
    "02 - Relatorios de entradas",
    "03 - Relatorios de saidas",
    "04 - Apuracao ICMS proprio",
    "05 - ICMS-ST",
    "06 - DIFAL-FCP",
    "07 - CIAP",
    "08 - Ajustes e beneficios",
    "09 - Relatorio de conferencia",
    "10 - EFD transmitida",
    "11 - Recibo",
    "12 - Obrigacoes estaduais",
    "13 - Guias",
    "14 - Comprovantes",
    "15 - Evidencias de revisao",
]

TIPOS_INPUT = ("xml", "efd", "efd_contrib", "guias", "outros")


class PastaEmpresaErro(Exception):
    pass


def _slug_ou_erro(cnpj: str) -> str:
    empresa = buscar_empresa(cnpj)
    if not empresa or not empresa.get("slug"):
        raise PastaEmpresaErro(
            f"Empresa {somente_digitos(cnpj)} sem slug em config/empresas.json"
        )
    return str(empresa["slug"])


def pasta_competencia_empresa(cnpj: str, competencia: str, *, criar: bool = False) -> Path:
    """Retorna ``empresas/<slug>/<MM-AAAA>/``.

    Se ``criar`` for True, cria a pasta e as subpastas XML/SPED/GUIAS.
    """
    if not competencia_valida(competencia):
        raise PastaEmpresaErro(f"Competencia invalida: {competencia}")
    slug = _slug_ou_erro(cnpj)
    pasta_mm = competencia_para_pasta(competencia)
    base = EMPRESAS_DIR / slug / pasta_mm
    if criar:
        for sub in SUBPASTAS_INPUT:
            (base / sub).mkdir(parents=True, exist_ok=True)
    return base


def garantir_subpastas(base: Path) -> None:
    for sub in SUBPASTAS_INPUT:
        (base / sub).mkdir(parents=True, exist_ok=True)


def pasta_dossie(cnpj: str, competencia: str, *, criar: bool = False) -> Path:
    cnpj_n = somente_digitos(cnpj)
    root = DOSSIES_DIR / cnpj_n / competencia
    if criar:
        root.mkdir(parents=True, exist_ok=True)
        for nome in DOSSIE_SUBPASTAS:
            (root / nome).mkdir(parents=True, exist_ok=True)
    return root


def listar_arquivos_dossie(cnpj: str, competencia: str, pasta: str) -> list[dict[str, Any]]:
    """Lista arquivos de uma subpasta do dossie (whitelist ``DOSSIE_SUBPASTAS``)."""
    if pasta not in DOSSIE_SUBPASTAS:
        raise PastaEmpresaErro(f"Subpasta de dossie invalida: {pasta!r}")
    base = pasta_dossie(cnpj, competencia, criar=False)
    destino = base / pasta
    if not destino.is_dir():
        return []
    return [_stat_arquivo(path, "dossie") for path in sorted(destino.iterdir()) if path.is_file()]


def pasta_dossie_subpasta(cnpj: str, competencia: str, pasta: str, *, criar: bool = False) -> Path:
    """Resolve o caminho de uma subpasta do dossie (whitelist ``DOSSIE_SUBPASTAS``)."""
    if pasta not in DOSSIE_SUBPASTAS:
        raise PastaEmpresaErro(f"Subpasta de dossie invalida: {pasta!r}")
    base = pasta_dossie(cnpj, competencia, criar=criar)
    destino = base / pasta
    if criar:
        destino.mkdir(parents=True, exist_ok=True)
    return destino


def _safe_name(nome: str) -> str:
    nome = Path(nome).name
    if not nome or nome in {".", ".."} or "/" in nome or "\\" in nome:
        raise PastaEmpresaErro(f"Nome de arquivo invalido: {nome!r}")
    if nome.startswith("."):
        raise PastaEmpresaErro(f"Nome de arquivo nao permitido: {nome!r}")
    return nome


def ler_marker(base: Path) -> dict[str, Any]:
    path = base / "SPED" / MARKER_INPUTS
    if not path.is_file():
        # legado: marker na raiz
        path = base / MARKER_INPUTS
    if not path.is_file():
        return {}
    try:
        dados = json.loads(path.read_text(encoding="utf-8"))
        return dados if isinstance(dados, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def gravar_marker(base: Path, dados: dict[str, Any]) -> None:
    garantir_subpastas(base)
    path = base / "SPED" / MARKER_INPUTS
    atual = ler_marker(base)
    atual.update({k: v for k, v in dados.items() if v is not None})
    path.write_text(json.dumps(atual, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _stat_arquivo(path: Path, tipo: str, *, nome: str | None = None) -> dict[str, Any]:
    st = path.stat()
    return {
        "tipo": tipo,
        "nome": nome if nome is not None else path.name,
        "tamanho": st.st_size,
        "modificado_em": __import__("datetime").datetime.fromtimestamp(
            st.st_mtime, tz=__import__("datetime").timezone.utc
        ).isoformat(),
    }


def destino_xml_seguro(base: Path, filename: str) -> Path:
    """Resolve destino sob ``base/XML`` a partir de ``filename`` (plano ou relativo).

    Se ``filename`` contiver ``/`` ou ``\\``, cada segmento e sanitizado com
    ``sanitizar_nome_upload``; rejeita ``..`` e segmentos vazios. Garante que o
    path resolvido permanece dentro de ``XML/`` (bloqueia path traversal).
    """
    bruto = (filename or "arquivo.xml").replace("\\", "/")
    segmentos = [p for p in bruto.split("/")]
    if not segmentos or all(s == "" for s in segmentos):
        raise PastaEmpresaErro(f"Nome de arquivo invalido: {filename!r}")

    partes: list[str] = []
    for seg in segmentos:
        if seg in {"", ".", ".."}:
            raise PastaEmpresaErro(f"Segmento de caminho invalido em: {filename!r}")
        partes.append(sanitizar_nome_upload(seg))

    xml_dir = (base / "XML").resolve()
    destino = base.joinpath("XML", *partes)
    try:
        destino.resolve().relative_to(xml_dir)
    except ValueError as exc:
        raise PastaEmpresaErro(f"Caminho fora de XML/: {filename!r}") from exc
    return destino


def listar_inputs(cnpj: str, competencia: str) -> dict[str, list[dict[str, Any]]]:
    base = pasta_competencia_empresa(cnpj, competencia, criar=False)
    resultado: dict[str, list[dict[str, Any]]] = {t: [] for t in TIPOS_INPUT}
    if not base.is_dir():
        return resultado

    marker = ler_marker(base)
    efd_nome = marker.get("efd")
    efd_contrib_nome = marker.get("efd_contrib")

    xml_dir = base / "XML"
    if xml_dir.is_dir():
        for path in sorted(xml_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in {".xml", ".zip"}:
                rel = path.relative_to(xml_dir).as_posix()
                resultado["xml"].append(_stat_arquivo(path, "xml", nome=rel))

    sped = base / "SPED"
    if sped.is_dir():
        for path in sorted(sped.iterdir()):
            if not path.is_file() or path.name == MARKER_INPUTS:
                continue
            nome = path.name
            if efd_nome and nome == efd_nome:
                resultado["efd"].append(_stat_arquivo(path, "efd"))
            elif efd_contrib_nome and nome == efd_contrib_nome:
                resultado["efd_contrib"].append(_stat_arquivo(path, "efd_contrib"))
            elif path.suffix.lower() == ".txt":
                lower = nome.lower()
                if (
                    efd_nome is None
                    and not resultado["efd"]
                    and ("spedefd" in lower or ("efd" in lower and "contrib" not in lower))
                ):
                    resultado["efd"].append(_stat_arquivo(path, "efd"))
                elif (
                    efd_contrib_nome is None
                    and not resultado["efd_contrib"]
                    and "contrib" in lower
                ):
                    resultado["efd_contrib"].append(_stat_arquivo(path, "efd_contrib"))
                else:
                    resultado["outros"].append(_stat_arquivo(path, "outros"))
            else:
                resultado["outros"].append(_stat_arquivo(path, "outros"))

    guias_dir = base / "GUIAS"
    if guias_dir.is_dir():
        guias_json = guias_dir / "guias.json"
        if guias_json.is_file():
            resultado["guias"].append(_stat_arquivo(guias_json, "guias"))
        for path in sorted(guias_dir.iterdir()):
            if path.is_file() and path.name != "guias.json":
                resultado["outros"].append(_stat_arquivo(path, "outros"))

    return resultado


def resolver_path_input(cnpj: str, competencia: str, tipo: str, nome: str) -> Path:
    if tipo not in TIPOS_INPUT:
        raise PastaEmpresaErro(f"Tipo invalido: {tipo}")
    base = pasta_competencia_empresa(cnpj, competencia, criar=False)
    if tipo == "xml":
        xml_dir = base / "XML"
        # Caminho relativo (ex.: ENTRADAS/nota.xml): resolve sob XML/ com anti-traversal.
        if "/" in nome or "\\" in nome:
            candidato = destino_xml_seguro(base, nome)
            if candidato.is_file():
                return candidato
            raise PastaEmpresaErro(f"Arquivo nao encontrado: {nome}")
        # Legado flat: nome simples; fallback rglob em subpastas.
        nome_flat = _safe_name(nome)
        candidato = xml_dir / nome_flat
        if candidato.is_file():
            return candidato
        if xml_dir.is_dir():
            for path in xml_dir.rglob(nome_flat):
                if path.is_file():
                    try:
                        path.resolve().relative_to(xml_dir.resolve())
                    except ValueError:
                        continue
                    return path
        raise PastaEmpresaErro(f"Arquivo nao encontrado: {nome_flat}")
    nome = _safe_name(nome)
    if tipo in {"efd", "efd_contrib", "outros"}:
        path = base / "SPED" / nome
        if path.is_file():
            return path
        # outros tambem em GUIAS
        alt = base / "GUIAS" / nome
        if alt.is_file():
            return alt
        raise PastaEmpresaErro(f"Arquivo nao encontrado: {nome}")
    if tipo == "guias":
        path = base / "GUIAS" / nome
        if path.is_file():
            return path
        raise PastaEmpresaErro(f"Arquivo nao encontrado: {nome}")
    raise PastaEmpresaErro(f"Tipo invalido: {tipo}")


def caminhos_para_processar(cnpj: str, competencia: str) -> dict[str, Any]:
    """Retorna paths concretos para o worker do motor."""
    base = pasta_competencia_empresa(cnpj, competencia, criar=False)
    if not base.is_dir():
        raise PastaEmpresaErro("Pasta da competencia ainda nao existe; faca upload antes.")

    listagem = listar_inputs(cnpj, competencia)
    xml_dir = base / "XML"
    marker = ler_marker(base)

    efd_path = None
    if marker.get("efd"):
        candidato = base / "SPED" / marker["efd"]
        if candidato.is_file():
            efd_path = candidato
    if efd_path is None and listagem["efd"]:
        efd_path = base / "SPED" / listagem["efd"][0]["nome"]

    efd_contrib_path = None
    if marker.get("efd_contrib"):
        candidato = base / "SPED" / marker["efd_contrib"]
        if candidato.is_file():
            efd_contrib_path = candidato
    if efd_contrib_path is None and listagem["efd_contrib"]:
        efd_contrib_path = base / "SPED" / listagem["efd_contrib"][0]["nome"]

    guias_path = base / "GUIAS" / "guias.json"
    if not guias_path.is_file():
        guias_path = None

    tem_xml = xml_dir.is_dir() and any(xml_dir.rglob("*.xml"))
    if not tem_xml and not efd_path:
        raise PastaEmpresaErro("Informe pelo menos XML ou EFD ICMS/IPI para processar.")

    return {
        "base": base,
        "xml_dir": xml_dir if tem_xml else None,
        "efd": efd_path,
        "efd_contrib": efd_contrib_path,
        "guias": guias_path,
        "dossie": pasta_dossie(cnpj, competencia, criar=True),
    }


def nome_seguro(nome: str) -> str:
    return _safe_name(nome)


def sanitizar_nome_upload(nome: str) -> str:
    nome = _safe_name(nome)
    # remove caracteres problemáticos mantendo extensão
    stem = Path(nome).stem
    sufixo = Path(nome).suffix
    stem = re.sub(r"[^\w.\- ()\[\]]+", "_", stem, flags=re.UNICODE).strip("._ ")
    if not stem:
        stem = "arquivo"
    return f"{stem}{sufixo}"
