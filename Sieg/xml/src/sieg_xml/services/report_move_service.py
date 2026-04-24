"""Servico para separar XMLs referenciados em relatorios."""

from __future__ import annotations

from pathlib import Path

from ..core.chave_extractor import processar_arquivo


def encontrar_arquivo_xml_por_chave(chave: str, pasta_origem: Path) -> Path | None:
    padrao = f"**/{chave}.xml"
    arquivos = list(pasta_origem.glob(padrao))
    if not arquivos:
        return None
    return arquivos[0]


def gerar_destino_padrao(planilha: Path) -> str:
    nome_limpo = "".join(c if c.isalnum() or c in (" ", "_", "-") else "_" for c in planilha.stem).strip()
    return nome_limpo.replace(" ", "_")


def mover_xmls_por_chaves(
    chaves: list[str],
    pasta_origem: Path,
    pasta_destino: Path,
    dry_run: bool = False,
) -> dict[str, object]:
    pasta_destino.mkdir(parents=True, exist_ok=True)

    movidos = 0
    encontrados = 0
    nao_encontrados: list[str] = []

    for chave in chaves:
        arquivo_origem = encontrar_arquivo_xml_por_chave(chave, pasta_origem)
        if arquivo_origem is None:
            nao_encontrados.append(chave)
            continue

        encontrados += 1
        destino = pasta_destino / arquivo_origem.name
        if destino.exists():
            base = destino.stem
            suffix = 1
            while destino.exists():
                destino = pasta_destino / f"{base}_{suffix}.xml"
                suffix += 1

        if not dry_run:
            arquivo_origem.replace(destino)
        movidos += 1

    return {
        "total_chaves": len(chaves),
        "encontrados": encontrados,
        "movidos": movidos,
        "faltantes": len(nao_encontrados),
        "chaves_faltantes": nao_encontrados,
    }


def processar_relatorio_xmls(
    planilha: str | Path,
    pasta_origem: str | Path,
    pasta_destino: str | Path,
    dry_run: bool = False,
) -> dict[str, object]:
    planilha_path = Path(planilha)
    origem_path = Path(pasta_origem)
    destino_path = Path(pasta_destino)
    chaves = processar_arquivo(planilha_path)
    return mover_xmls_por_chaves(chaves, origem_path, destino_path, dry_run=dry_run)
