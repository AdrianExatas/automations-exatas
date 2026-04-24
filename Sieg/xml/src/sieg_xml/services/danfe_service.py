"""Servico para gerar DANFEs a partir de XMLs."""

from __future__ import annotations

import csv
import re
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

from pypdf import PdfWriter

from ..config import DANFE_OUTPUT_DIR, PASTA_XMLS_BAIXADOS


STATUS_GERADO = "gerado"
STATUS_EXISTENTE = "existente"
STATUS_DUPLICADO = "duplicado_chave"
STATUS_ERRO_XML = "erro_xml"
STATUS_ERRO_GERACAO = "erro_geracao"
STATUS_IGNORADO_ANO = "ignorado_filtro_ano"
CHAVE_REGEX = re.compile(r"^\d{44}$")


@dataclass
class NotaXML:
    caminho_xml: Path
    caminho_relativo: str
    conteudo_xml: str
    chave: str
    data_emissao: datetime
    ano: int


def parse_filtro_anos(anos_arg: Optional[str]) -> Optional[set[int]]:
    if not anos_arg:
        return None
    anos: set[int] = set()
    for item in anos_arg.split(","):
        item_limpo = item.strip()
        if not item_limpo:
            continue
        if not item_limpo.isdigit() or len(item_limpo) != 4:
            raise ValueError(f"Ano invalido no filtro --anos: '{item_limpo}'")
        anos.add(int(item_limpo))
    if not anos:
        raise ValueError("Filtro --anos foi informado, mas nenhum ano valido foi encontrado.")
    return anos


def ler_xml(caminho_xml: Path) -> str:
    try:
        return caminho_xml.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return caminho_xml.read_text(encoding="latin-1")


def local_name(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag


def extrair_texto_primeira_tag(root: ET.Element, tags: Iterable[str]) -> tuple[str, str]:
    for tag_buscada in tags:
        for elem in root.iter():
            if local_name(elem.tag) != tag_buscada:
                continue
            texto = (elem.text or "").strip()
            if texto:
                return tag_buscada, texto
    raise ValueError(f"Nao encontrou nenhuma das tags esperadas: {', '.join(tags)}")


def chave_valida(chave: str) -> bool:
    return bool(CHAVE_REGEX.match(chave))


def extrair_chave(root: ET.Element) -> str:
    for elem in root.iter():
        if local_name(elem.tag) != "infNFe":
            continue
        valor = (elem.attrib.get("Id") or "").strip()
        if valor.startswith("NFe"):
            valor = valor[3:]
        if chave_valida(valor):
            return valor

    _, valor_chave = extrair_texto_primeira_tag(root, ("chNFe",))
    if chave_valida(valor_chave):
        return valor_chave
    raise ValueError("Nao foi possivel extrair uma chave de acesso valida (44 digitos).")


def parse_dh_emi(valor: str) -> datetime:
    valor_normalizado = valor.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(valor_normalizado)
    except ValueError:
        match_tz = re.match(r"^(.*)([+-]\d{2})(\d{2})$", valor_normalizado)
        if not match_tz:
            raise
        valor_normalizado = f"{match_tz.group(1)}{match_tz.group(2)}:{match_tz.group(3)}"
        dt = datetime.fromisoformat(valor_normalizado)
    return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt


def parse_d_emi(valor: str) -> datetime:
    valor_limpo = valor.strip()
    try:
        return datetime.fromisoformat(f"{valor_limpo}T00:00:00")
    except ValueError:
        return datetime.strptime(valor_limpo, "%d/%m/%Y").replace(hour=0, minute=0, second=0, microsecond=0)


def extrair_data_emissao(root: ET.Element) -> datetime:
    tag, valor = extrair_texto_primeira_tag(root, ("dhEmi", "dEmi"))
    return parse_dh_emi(valor) if tag == "dhEmi" else parse_d_emi(valor)


def extrair_nota(caminho_xml: Path, entrada: Path) -> NotaXML:
    conteudo_xml = ler_xml(caminho_xml)
    root = ET.fromstring(conteudo_xml)
    chave = extrair_chave(root)
    data_emissao = extrair_data_emissao(root)
    return NotaXML(
        caminho_xml=caminho_xml,
        caminho_relativo=str(caminho_xml.relative_to(entrada)),
        conteudo_xml=conteudo_xml,
        chave=chave,
        data_emissao=data_emissao,
        ano=data_emissao.year,
    )


def make_log_row(
    *,
    caminho_relativo: str,
    chave: str = "",
    ano: str = "",
    data_emissao: str = "",
    status: str,
    caminho_pdf: str = "",
    mensagem: str = "",
) -> dict[str, str]:
    return {
        "caminho_relativo_xml": caminho_relativo,
        "chave": chave,
        "ano": ano,
        "data_emissao": data_emissao,
        "status": status,
        "caminho_pdf": caminho_pdf,
        "mensagem": mensagem,
    }


def consolidar_pdfs(caminhos_pdf: list[Path], arquivo_saida: Path) -> tuple[int, int]:
    writer = PdfWriter()
    total_adicionados = 0
    total_falhas = 0
    for caminho_pdf in caminhos_pdf:
        try:
            writer.append(str(caminho_pdf))
            total_adicionados += 1
        except Exception:
            total_falhas += 1

    if total_adicionados > 0:
        arquivo_saida.parent.mkdir(parents=True, exist_ok=True)
        with arquivo_saida.open("wb") as fp:
            writer.write(fp)

    writer.close()
    return total_adicionados, total_falhas


def gerar_danfes(
    entrada: str | Path = PASTA_XMLS_BAIXADOS,
    saida: str | Path = DANFE_OUTPUT_DIR,
    *,
    sobrescrever: bool = False,
    anos: Optional[str] = None,
) -> dict[str, object]:
    entrada_path = Path(entrada).resolve()
    saida_path = Path(saida).resolve()
    if not entrada_path.exists() or not entrada_path.is_dir():
        raise FileNotFoundError(f"Pasta de entrada nao encontrada: {entrada_path}")

    filtro_anos = parse_filtro_anos(anos)

    try:
        from brazilfiscalreport import danfe
    except ImportError as exc:
        raise RuntimeError("Dependencia ausente: brazilfiscalreport") from exc

    timestamp_execucao = datetime.now().strftime("%Y%m%d_%H%M%S")
    pasta_logs = saida_path / "logs"
    pasta_logs.mkdir(parents=True, exist_ok=True)
    caminho_log_csv = pasta_logs / f"processamento_{timestamp_execucao}.csv"

    caminhos_xml = sorted([p for p in entrada_path.rglob("*.xml") if p.is_file()])
    logs: list[dict[str, str]] = []
    notas_unicas: dict[str, NotaXML] = {}
    duplicados = 0

    for caminho_xml in caminhos_xml:
        caminho_relativo = str(caminho_xml.relative_to(entrada_path))
        try:
            nota = extrair_nota(caminho_xml, entrada_path)
            if filtro_anos and nota.ano not in filtro_anos:
                logs.append(
                    make_log_row(
                        caminho_relativo=caminho_relativo,
                        chave=nota.chave,
                        ano=str(nota.ano),
                        data_emissao=nota.data_emissao.isoformat(),
                        status=STATUS_IGNORADO_ANO,
                    )
                )
                continue
            if nota.chave in notas_unicas:
                duplicados += 1
                logs.append(
                    make_log_row(
                        caminho_relativo=caminho_relativo,
                        chave=nota.chave,
                        ano=str(nota.ano),
                        data_emissao=nota.data_emissao.isoformat(),
                        status=STATUS_DUPLICADO,
                        mensagem=f"Duplicado de {notas_unicas[nota.chave].caminho_relativo}",
                    )
                )
                continue
            notas_unicas[nota.chave] = nota
        except Exception as exc:
            logs.append(make_log_row(caminho_relativo=caminho_relativo, status=STATUS_ERRO_XML, mensagem=str(exc)))

    notas_ordenadas = sorted(notas_unicas.values(), key=lambda item: (item.ano, item.data_emissao, item.chave))
    pdfs_por_ano: dict[int, list[Path]] = defaultdict(list)
    pdfs_gerados: list[Path] = []

    for nota in notas_ordenadas:
        pasta_pdf_ano = saida_path / "individuais" / str(nota.ano)
        pasta_pdf_ano.mkdir(parents=True, exist_ok=True)
        caminho_pdf = pasta_pdf_ano / f"{nota.chave}.pdf"
        if caminho_pdf.exists() and not sobrescrever:
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_EXISTENTE,
                    caminho_pdf=str(caminho_pdf),
                )
            )
            pdfs_por_ano[nota.ano].append(caminho_pdf)
            pdfs_gerados.append(caminho_pdf)
            continue

        try:
            documento = danfe.Danfe(xml=nota.conteudo_xml)
            documento.output(str(caminho_pdf))
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_GERADO,
                    caminho_pdf=str(caminho_pdf),
                )
            )
            pdfs_por_ano[nota.ano].append(caminho_pdf)
            pdfs_gerados.append(caminho_pdf)
        except Exception as exc:
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_ERRO_GERACAO,
                    mensagem=str(exc),
                )
            )

    consolidados: dict[str, str] = {}
    for ano, pdfs in pdfs_por_ano.items():
        arquivo_saida = saida_path / "consolidados" / f"DANFE_{ano}_JUNTO.pdf"
        adicionados, _ = consolidar_pdfs(pdfs, arquivo_saida)
        if adicionados:
            consolidados[str(ano)] = str(arquivo_saida)

    arquivo_geral = saida_path / "consolidados" / "DANFE_TODOS_JUNTO.pdf"
    adicionados_geral, _ = consolidar_pdfs(pdfs_gerados, arquivo_geral)
    if adicionados_geral:
        consolidados["todos"] = str(arquivo_geral)

    with caminho_log_csv.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=list(make_log_row(caminho_relativo="", status="x").keys()))
        writer.writeheader()
        writer.writerows(logs)

    return {
        "entrada": str(entrada_path),
        "saida": str(saida_path),
        "log_csv": str(caminho_log_csv),
        "xmls_encontrados": len(caminhos_xml),
        "notas_processadas": len(notas_ordenadas),
        "duplicados": duplicados,
        "status": dict(Counter(row["status"] for row in logs)),
        "consolidados": consolidados,
    }
