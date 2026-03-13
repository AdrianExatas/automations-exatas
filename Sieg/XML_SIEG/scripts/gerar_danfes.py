"""
Script CLI para gerar DANFEs a partir de XMLs e consolidar PDFs.
"""
from __future__ import annotations

import argparse
import csv
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional
import xml.etree.ElementTree as ET

from pypdf import PdfWriter


STATUS_GERADO = "gerado"
STATUS_EXISTENTE = "existente"
STATUS_DUPLICADO = "duplicado_chave"
STATUS_ERRO_XML = "erro_xml"
STATUS_ERRO_GERACAO = "erro_geracao"
STATUS_IGNORADO_ANO = "ignorado_filtro_ano"

NFE_MODELO_SUPORTADO = "55"
CHAVE_REGEX = re.compile(r"^\d{44}$")


@dataclass
class NotaXML:
    """Representa um XML de nota pronto para geracao do DANFE."""

    caminho_xml: Path
    caminho_relativo: str
    conteudo_xml: str
    chave: str
    data_emissao: datetime
    ano: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gerar DANFEs em PDF e consolidar por ano e geral."
    )
    parser.add_argument(
        "--entrada",
        default="xmls_baixados",
        help="Pasta raiz com XMLs (padrao: xmls_baixados).",
    )
    parser.add_argument(
        "--saida",
        default="danfes_gerados",
        help="Pasta de saida (padrao: danfes_gerados).",
    )
    parser.add_argument(
        "--sobrescrever",
        action="store_true",
        help="Sobrescreve PDFs individuais existentes.",
    )
    parser.add_argument(
        "--anos",
        default=None,
        help="Filtra anos de emissao (ex.: 2024,2025).",
    )
    return parser.parse_args()


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
    # 1) Tenta infNFe@Id (com prefixo NFe ou sem)
    for elem in root.iter():
        if local_name(elem.tag) != "infNFe":
            continue
        valor = (elem.attrib.get("Id") or "").strip()
        if valor.startswith("NFe"):
            valor = valor[3:]
        if chave_valida(valor):
            return valor

    # 2) Fallback: tag chNFe
    _, valor_chave = extrair_texto_primeira_tag(root, ("chNFe",))
    if chave_valida(valor_chave):
        return valor_chave

    raise ValueError("Nao foi possivel extrair uma chave de acesso valida (44 digitos).")


def parse_dh_emi(valor: str) -> datetime:
    valor_normalizado = valor.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(valor_normalizado)
    except ValueError:
        # Fallback para timezone no formato -0300 / +0000
        match_tz = re.match(r"^(.*)([+-]\d{2})(\d{2})$", valor_normalizado)
        if match_tz:
            valor_normalizado = f"{match_tz.group(1)}{match_tz.group(2)}:{match_tz.group(3)}"
            dt = datetime.fromisoformat(valor_normalizado)
        else:
            raise

    # Normaliza para datetime naive para ordenar junto com dEmi.
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def parse_d_emi(valor: str) -> datetime:
    valor_limpo = valor.strip()
    try:
        return datetime.fromisoformat(f"{valor_limpo}T00:00:00")
    except ValueError:
        # Alguns XMLs antigos podem trazer data em dd/mm/yyyy
        dt = datetime.strptime(valor_limpo, "%d/%m/%Y")
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def extrair_data_emissao(root: ET.Element) -> datetime:
    tag, valor = extrair_texto_primeira_tag(root, ("dhEmi", "dEmi"))
    if tag == "dhEmi":
        return parse_dh_emi(valor)
    return parse_d_emi(valor)


def extrair_nota(caminho_xml: Path, entrada: Path) -> NotaXML:
    conteudo_xml = ler_xml(caminho_xml)
    root = ET.fromstring(conteudo_xml)
    chave = extrair_chave(root)
    data_emissao = extrair_data_emissao(root)
    caminho_relativo = str(caminho_xml.relative_to(entrada))

    return NotaXML(
        caminho_xml=caminho_xml,
        caminho_relativo=caminho_relativo,
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


def main() -> int:
    args = parse_args()

    entrada = Path(args.entrada).resolve()
    saida = Path(args.saida).resolve()

    if not entrada.exists() or not entrada.is_dir():
        print(f"ERRO: Pasta de entrada nao encontrada: {entrada}")
        return 1

    try:
        filtro_anos = parse_filtro_anos(args.anos)
    except ValueError as exc:
        print(f"ERRO: {exc}")
        return 1

    try:
        from brazilfiscalreport import danfe
    except ImportError:
        print("ERRO: Dependencia ausente: brazilfiscalreport")
        print("Instale com: pip install -r requirements.txt")
        return 1

    timestamp_execucao = datetime.now().strftime("%Y%m%d_%H%M%S")
    pasta_logs = saida / "logs"
    pasta_logs.mkdir(parents=True, exist_ok=True)
    caminho_log_csv = pasta_logs / f"processamento_{timestamp_execucao}.csv"

    caminhos_xml = sorted([p for p in entrada.rglob("*.xml") if p.is_file()])
    total_encontrados = len(caminhos_xml)

    logs: list[dict[str, str]] = []
    notas_aptas: list[NotaXML] = []

    for caminho_xml in caminhos_xml:
        caminho_relativo = str(caminho_xml.relative_to(entrada))
        try:
            nota = extrair_nota(caminho_xml, entrada)
        except Exception as exc:
            logs.append(
                make_log_row(
                    caminho_relativo=caminho_relativo,
                    status=STATUS_ERRO_XML,
                    mensagem=str(exc),
                )
            )
            continue

        if filtro_anos is not None and nota.ano not in filtro_anos:
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_IGNORADO_ANO,
                    mensagem="Ano fora do filtro --anos.",
                )
            )
            continue

        modelo = nota.chave[20:22]
        if modelo != NFE_MODELO_SUPORTADO:
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=f"nao_suportado_modelo_{modelo}",
                    mensagem="Apenas NF-e modelo 55 e suportado neste script.",
                )
            )
            continue

        notas_aptas.append(nota)

    # Ordenacao oficial global
    notas_aptas.sort(
        key=lambda n: (n.data_emissao, n.chave, n.caminho_relativo.lower())
    )

    # Duplicidade de chave: manter apenas a primeira apos ordenacao
    chaves_vistas: set[str] = set()
    notas_unicas: list[NotaXML] = []
    for nota in notas_aptas:
        if nota.chave in chaves_vistas:
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_DUPLICADO,
                    mensagem="Chave duplicada. Mantido apenas o primeiro XML ordenado.",
                )
            )
            continue
        chaves_vistas.add(nota.chave)
        notas_unicas.append(nota)

    notas_pdf_validas: list[tuple[NotaXML, Path]] = []

    for nota in notas_unicas:
        caminho_pdf = saida / "individuais" / str(nota.ano) / f"{nota.chave}.pdf"
        caminho_pdf_rel = str(caminho_pdf.relative_to(saida))
        caminho_pdf.parent.mkdir(parents=True, exist_ok=True)

        if caminho_pdf.exists() and not args.sobrescrever:
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_EXISTENTE,
                    caminho_pdf=caminho_pdf_rel,
                    mensagem="PDF ja existente. Mantido sem sobrescrever.",
                )
            )
            notas_pdf_validas.append((nota, caminho_pdf))
            continue

        try:
            danfe.Danfe(xml=nota.conteudo_xml).output(str(caminho_pdf))
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_GERADO,
                    caminho_pdf=caminho_pdf_rel,
                    mensagem="DANFE gerado com sucesso.",
                )
            )
            notas_pdf_validas.append((nota, caminho_pdf))
        except Exception as exc:
            logs.append(
                make_log_row(
                    caminho_relativo=nota.caminho_relativo,
                    chave=nota.chave,
                    ano=str(nota.ano),
                    data_emissao=nota.data_emissao.isoformat(),
                    status=STATUS_ERRO_GERACAO,
                    caminho_pdf=caminho_pdf_rel,
                    mensagem=str(exc),
                )
            )

    falhas_consolidacao = 0
    consolidados: dict[str, Path] = {}

    pdfs_por_ano: dict[int, list[Path]] = defaultdict(list)
    for nota, caminho_pdf in notas_pdf_validas:
        pdfs_por_ano[nota.ano].append(caminho_pdf)

    for ano in sorted(pdfs_por_ano):
        arquivo_ano = saida / "consolidados" / f"DANFE_{ano}_JUNTO.pdf"
        adicionados, falhas = consolidar_pdfs(pdfs_por_ano[ano], arquivo_ano)
        falhas_consolidacao += falhas
        if adicionados > 0:
            consolidados[str(ano)] = arquivo_ano

    todos_os_pdfs = [caminho_pdf for _, caminho_pdf in notas_pdf_validas]
    arquivo_geral = saida / "consolidados" / "DANFE_TODOS_JUNTO.pdf"
    adicionados_geral, falhas_geral = consolidar_pdfs(todos_os_pdfs, arquivo_geral)
    falhas_consolidacao += falhas_geral
    if adicionados_geral > 0:
        consolidados["TODOS"] = arquivo_geral

    campos_csv = [
        "caminho_relativo_xml",
        "chave",
        "ano",
        "data_emissao",
        "status",
        "caminho_pdf",
        "mensagem",
    ]
    with caminho_log_csv.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=campos_csv)
        writer.writeheader()
        writer.writerows(logs)

    status_counter = Counter(row["status"] for row in logs)
    total_falhas = (
        status_counter[STATUS_ERRO_XML]
        + status_counter[STATUS_ERRO_GERACAO]
        + falhas_consolidacao
    )

    total_por_ano = Counter(nota.ano for nota, _ in notas_pdf_validas)

    print("=" * 70)
    print("GERACAO DE DANFE - RESUMO")
    print("=" * 70)
    print(f"Entrada: {entrada}")
    print(f"Saida: {saida}")
    print(f"Total XMLs encontrados: {total_encontrados}")
    if filtro_anos is not None:
        anos_ordenados = ", ".join(str(a) for a in sorted(filtro_anos))
        print(f"Filtro de anos aplicado: {anos_ordenados}")
    print(f"Gerados: {status_counter[STATUS_GERADO]}")
    print(f"Existentes (reaproveitados): {status_counter[STATUS_EXISTENTE]}")
    print(f"Duplicados por chave: {status_counter[STATUS_DUPLICADO]}")
    print(f"Erros de XML: {status_counter[STATUS_ERRO_XML]}")
    print(f"Erros de geracao: {status_counter[STATUS_ERRO_GERACAO]}")
    print(f"Falhas na consolidacao: {falhas_consolidacao}")
    print(f"Total de falhas: {total_falhas}")
    print(f"Log CSV: {caminho_log_csv}")

    if total_por_ano:
        print("-" * 70)
        print("Total de notas com PDF valido por ano:")
        for ano in sorted(total_por_ano):
            print(f"  {ano}: {total_por_ano[ano]}")

    if consolidados:
        print("-" * 70)
        print("Arquivos consolidados gerados:")
        for chave_agrupamento in sorted(consolidados):
            print(f"  {chave_agrupamento}: {consolidados[chave_agrupamento]}")
    else:
        print("-" * 70)
        print("Nenhum consolidado foi gerado (sem PDFs validos).")

    print("=" * 70)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
