"""
Script CLI para extrair numero da nota (nNF), valor total (vNF) e totais anuais.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
import xml.etree.ElementTree as ET

import pandas as pd


TWOPLACES = Decimal("0.01")


@dataclass
class NotaExtraida:
    arquivo: str
    caminho_xml: str
    nNF: str | None
    emissao: str | None
    ano: str | None
    vNF: Decimal


def formatar_valor_br(valor: Decimal) -> str:
    """Formata Decimal em estilo brasileiro (ex.: 1234.56 -> 1.234,56)."""
    texto = f"{valor:,.2f}"
    return texto.replace(",", "X").replace(".", ",").replace("X", ".")


def parsear_decimal(valor: str | None) -> Decimal:
    """Converte texto decimal para Decimal com 2 casas."""
    if not valor:
        return Decimal("0.00")
    normalizado = valor.strip().replace(",", ".")
    try:
        return Decimal(normalizado).quantize(TWOPLACES)
    except InvalidOperation:
        return Decimal("0.00")


def selecionar_candidato(
    candidatos: list[Path], prefer_folder: str
) -> tuple[Path, list[str]]:
    """
    Seleciona XML candidato com prioridade para pasta preferida.
    Retorna o caminho escolhido e lista de caminhos alternativos (ambiguidade).
    """
    ordenados = sorted(
        candidatos,
        key=lambda p: (
            0 if prefer_folder and prefer_folder.lower() in str(p).lower() else 1,
            len(str(p)),
            str(p).lower(),
        ),
    )
    escolhido = ordenados[0]
    alternativas = [str(p) for p in ordenados[1:]]
    return escolhido, alternativas


def extrair_campos_xml(caminho_xml: Path) -> tuple[str | None, Decimal, str | None, str | None]:
    """
    Extrai nNF, vNF, emissao e ano de um XML NFe.
    """
    raiz = ET.parse(caminho_xml).getroot()
    inf_nfe = raiz.find(".//{*}infNFe")
    if inf_nfe is None:
        raise ValueError("Tag infNFe nao encontrada")

    def txt(xpath: str) -> str | None:
        no = inf_nfe.find(xpath)
        if no is None or no.text is None:
            return None
        return no.text.strip() or None

    nnf = txt("./{*}ide/{*}nNF")
    vnf = parsear_decimal(txt("./{*}total/{*}ICMSTot/{*}vNF"))
    emissao = txt("./{*}ide/{*}dhEmi") or txt("./{*}ide/{*}dEmi")
    ano = emissao[:4] if emissao else None

    return nnf, vnf, emissao, ano


def carregar_arquivos_planilha(caminho_xlsx: Path) -> list[str]:
    """
    Le os nomes de XML na coluna 'Arquivo' da aba 'Itens'.
    """
    df = pd.read_excel(caminho_xlsx, sheet_name="Itens", usecols=["Arquivo"])
    arquivos = sorted(
        {
            str(v).strip()
            for v in df["Arquivo"].dropna().tolist()
            if str(v).strip()
        }
    )
    return arquivos


def indexar_xmls(pasta_xml_root: Path) -> dict[str, list[Path]]:
    """
    Indexa XMLs recursivamente por nome do arquivo (basename).
    """
    indice: dict[str, list[Path]] = defaultdict(list)
    for caminho in pasta_xml_root.rglob("*.xml"):
        indice[caminho.name].append(caminho)
    return indice


def filtrar_por_ano(
    notas: list[NotaExtraida], year: str
) -> list[NotaExtraida]:
    """Filtra notas por ano quando solicitado."""
    if year == "all":
        return notas
    return [n for n in notas if n.ano == year]


def imprimir_tabela_notas(notas: list[NotaExtraida]) -> None:
    """Imprime tabela detalhada por nota."""
    print("\n" + "=" * 90)
    print("TABELA POR NOTA")
    print("=" * 90)
    print(f"{'arquivo':55} {'nNF':>10} {'emissao':>20} {'ano':>6} {'vNF':>14}")
    print("-" * 90)
    for n in notas:
        arquivo = n.arquivo[:55]
        nnf = (n.nNF or "")[:10]
        emissao = (n.emissao or "")[:20]
        ano = (n.ano or "")[:6]
        vnf = formatar_valor_br(n.vNF)
        print(f"{arquivo:55} {nnf:>10} {emissao:>20} {ano:>6} {vnf:>14}")


def calcular_resumo_anual(notas: list[NotaExtraida]) -> tuple[list[dict[str, object]], Decimal]:
    """Calcula resumo anual e total geral."""
    totais_por_ano: dict[str, Decimal] = defaultdict(lambda: Decimal("0.00"))
    qtd_por_ano: dict[str, int] = defaultdict(int)

    for nota in notas:
        chave_ano = nota.ano or "SEM_ANO"
        totais_por_ano[chave_ano] = (totais_por_ano[chave_ano] + nota.vNF).quantize(TWOPLACES)
        qtd_por_ano[chave_ano] += 1

    linhas_resumo: list[dict[str, object]] = []
    total_geral = Decimal("0.00")
    for ano in sorted(totais_por_ano):
        total_ano = totais_por_ano[ano].quantize(TWOPLACES)
        total_geral = (total_geral + total_ano).quantize(TWOPLACES)
        linhas_resumo.append(
            {
                "ano": ano,
                "qtd_notas": qtd_por_ano[ano],
                "total_ano": total_ano,
            }
        )

    return linhas_resumo, total_geral


def imprimir_resumo_anual(linhas_resumo: list[dict[str, object]], total_geral: Decimal) -> Decimal:
    """Imprime resumo anual e retorna total geral."""
    print("\n" + "=" * 90)
    print("RESUMO ANUAL")
    print("=" * 90)
    print(f"{'ano':>8} {'qtd_notas':>12} {'total_ano':>18}")
    print("-" * 90)

    for linha in linhas_resumo:
        print(
            f"{str(linha['ano']):>8} "
            f"{int(linha['qtd_notas']):>12} "
            f"{formatar_valor_br(linha['total_ano']):>18}"
        )

    print("-" * 90)
    print(f"{'TOTAL_GERAL':>20}: {formatar_valor_br(total_geral)}")
    return total_geral


def exportar_excel(
    caminho_saida: Path,
    notas: list[NotaExtraida],
    linhas_resumo: list[dict[str, object]],
    total_geral: Decimal,
) -> None:
    """Exporta dados detalhados e consolidados para arquivo Excel."""
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)

    notas_df = pd.DataFrame(
        [
            {
                "arquivo": n.arquivo,
                "caminho_xml": n.caminho_xml,
                "nNF": n.nNF,
                "emissao": n.emissao,
                "ano": n.ano,
                "vNF": float(n.vNF),
                "vNF_formatado": formatar_valor_br(n.vNF),
            }
            for n in notas
        ]
    )

    resumo_df = pd.DataFrame(
        [
            {
                "ano": r["ano"],
                "qtd_notas": r["qtd_notas"],
                "total_ano": float(r["total_ano"]),
                "total_ano_formatado": formatar_valor_br(r["total_ano"]),
            }
            for r in linhas_resumo
        ]
    )
    total_df = pd.DataFrame(
        [
            {
                "indicador": "TOTAL_GERAL",
                "valor": float(total_geral),
                "valor_formatado": formatar_valor_br(total_geral),
            }
        ]
    )

    with pd.ExcelWriter(caminho_saida, engine="openpyxl") as writer:
        notas_df.to_excel(writer, index=False, sheet_name="Notas")
        resumo_df.to_excel(writer, index=False, sheet_name="Resumo_Anual")
        resumo_df.to_excel(writer, index=False, sheet_name="Resumo Anual")
        total_df.to_excel(writer, index=False, sheet_name="Totais")


def validar_argumentos(args: argparse.Namespace) -> None:
    """
    Valida argumentos de entrada do CLI.
    """
    if args.year != "all" and (not args.year.isdigit() or len(args.year) != 4):
        raise ValueError("Parametro --year deve ser 'all' ou um ano no formato YYYY.")

    if not args.xlsx.exists():
        raise FileNotFoundError(f"Planilha nao encontrada: {args.xlsx}")
    if not args.xml_root.exists():
        raise FileNotFoundError(f"Pasta raiz de XML nao encontrada: {args.xml_root}")
    if not args.xml_root.is_dir():
        raise NotADirectoryError(f"--xml-root deve ser uma pasta: {args.xml_root}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Extrai nNF e vNF de XMLs referenciados em planilha, "
            "gerando tabela por nota e totais anuais."
        )
    )
    parser.add_argument(
        "--xlsx",
        type=Path,
        required=True,
        help="Caminho da planilha Excel com aba 'Itens' e coluna 'Arquivo'.",
    )
    parser.add_argument(
        "--xml-root",
        type=Path,
        required=True,
        help="Pasta base para busca recursiva de XMLs.",
    )
    parser.add_argument(
        "--prefer-folder",
        type=str,
        default="TODOS XMLS",
        help="Nome de pasta preferencial ao resolver XML duplicado (default: TODOS XMLS).",
    )
    parser.add_argument(
        "--year",
        type=str,
        default="all",
        help="Ano para filtro final (YYYY) ou 'all' (default).",
    )
    parser.add_argument(
        "--output-xlsx",
        type=Path,
        default=None,
        help=(
            "Caminho do arquivo Excel de saida (se omitido, nao exporta). "
            "Ex.: resultados\\resumo_nfe.xlsx"
        ),
    )
    args = parser.parse_args()

    validar_argumentos(args)

    print("=" * 90)
    print("EXTRATOR DE TOTAIS NFE")
    print("=" * 90)
    print(f"Planilha: {args.xlsx}")
    print(f"Pasta XML root: {args.xml_root}")
    print(f"Pasta preferencial: {args.prefer_folder}")
    print(f"Filtro ano: {args.year}")
    print(f"Exportar Excel: {str(args.output_xlsx) if args.output_xlsx else 'nao'}")

    arquivos_planilha = carregar_arquivos_planilha(args.xlsx)
    indice_xml = indexar_xmls(args.xml_root)

    notas_extraidas: list[NotaExtraida] = []
    ambiguidades: dict[str, list[str]] = {}
    ausentes: list[str] = []
    erros_parse: dict[str, str] = {}

    for arquivo in arquivos_planilha:
        candidatos = indice_xml.get(arquivo, [])
        if not candidatos:
            ausentes.append(arquivo)
            continue

        escolhido, alternativas = selecionar_candidato(candidatos, args.prefer_folder)
        if alternativas:
            ambiguidades[str(escolhido)] = alternativas

        try:
            nnf, vnf, emissao, ano = extrair_campos_xml(escolhido)
        except Exception as exc:
            erros_parse[str(escolhido)] = str(exc)
            continue

        notas_extraidas.append(
            NotaExtraida(
                arquivo=arquivo,
                caminho_xml=str(escolhido),
                nNF=nnf,
                emissao=emissao,
                ano=ano,
                vNF=vnf,
            )
        )

    notas_filtradas = filtrar_por_ano(notas_extraidas, args.year)

    print("\n" + "=" * 90)
    print("STATUS DE COBERTURA")
    print("=" * 90)
    print(f"XMLs referenciados na planilha : {len(arquivos_planilha)}")
    print(f"XMLs resolvidos                : {len(notas_extraidas)}")
    print(f"XMLs ausentes                  : {len(ausentes)}")
    print(f"Erros de parse                 : {len(erros_parse)}")
    print(f"Ambiguidades de caminho        : {len(ambiguidades)}")
    print(f"Notas apos filtro de ano       : {len(notas_filtradas)}")

    if ausentes:
        print("\nAmostra de XMLs ausentes (max 10):")
        for nome in ausentes[:10]:
            print(f"  - {nome}")

    if erros_parse:
        print("\nAmostra de erros de parse (max 10):")
        for caminho, erro in list(erros_parse.items())[:10]:
            print(f"  - {caminho}: {erro}")

    if ambiguidades:
        print("\nAmostra de ambiguidades (max 10):")
        for caminho_escolhido, alternativos in list(ambiguidades.items())[:10]:
            print(f"  - Escolhido: {caminho_escolhido}")
            for alt in alternativos[:3]:
                print(f"      alternativo: {alt}")

    if notas_filtradas:
        imprimir_tabela_notas(notas_filtradas)
        linhas_resumo, total_geral = calcular_resumo_anual(notas_filtradas)
        imprimir_resumo_anual(linhas_resumo, total_geral)

        if args.output_xlsx is not None:
            caminho_saida = args.output_xlsx
            if caminho_saida.suffix.lower() != ".xlsx":
                caminho_saida = caminho_saida.with_suffix(".xlsx")
            exportar_excel(caminho_saida, notas_filtradas, linhas_resumo, total_geral)
            print(f"\nArquivo Excel gerado: {caminho_saida.resolve()}")
    else:
        print("\nNenhuma nota encontrada para o filtro informado.")

    print("\nProcessamento concluido.")


if __name__ == "__main__":
    main()
