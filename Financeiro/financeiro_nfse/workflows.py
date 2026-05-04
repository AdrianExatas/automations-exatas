from __future__ import annotations

import json
from pathlib import Path

from . import omie, renaming, webiss
from .config import (
    competencia_to_slug,
    ensure_runtime_dirs,
    load_env,
    resolve_competencia,
    resolve_log_file,
    resolve_output_root,
    resolve_query_period,
)
from .models import DownloadResult, NFSeItem, ProcessResult, RenameResult


def load_nfse_items(path: Path) -> list[NFSeItem]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Arquivo JSON nao encontrado: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Arquivo JSON invalido: {path}") from exc

    if not isinstance(data, list):
        raise RuntimeError("O arquivo JSON deve conter uma lista de NFS-e.")

    items = [NFSeItem.from_json_dict(item) for item in data if isinstance(item, dict)]
    valid_items = [item for item in items if item.cnpj_emissor and item.codigo_verificacao and item.numero]
    if not valid_items:
        raise RuntimeError("Nenhuma NFS-e valida encontrada no JSON.")
    return valid_items


def save_nfse_items(items: list[NFSeItem], target_file: Path) -> Path:
    target_file.parent.mkdir(parents=True, exist_ok=True)
    payload = [item.to_json_dict() for item in items]
    target_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return target_file


def default_json_path(competencia: str, output_dir: str | Path | None, config_path: str | Path | None) -> Path:
    output_root = resolve_output_root(output_dir, competencia=competencia, config_path=config_path)
    return output_root / f"nfse_{competencia_to_slug(competencia)}.json"


def query_nfse_workflow(
    *,
    data_inicial: str = "",
    data_final: str = "",
    competencia: str = "",
    output_dir: str | Path | None = None,
    env_file: str | Path | None = None,
    config_path: str | Path | None = None,
) -> Path:
    ensure_runtime_dirs()
    period = resolve_query_period(
        data_inicial=data_inicial,
        data_final=data_final,
        competencia=competencia,
    )
    env = load_env(env_file)
    items = omie.fetch_all_nfse(env["APP_KEY"], env["APP_SECRET"], period.start_date, period.end_date)
    target_file = default_json_path(period.competencia, output_dir, config_path)
    save_nfse_items(items, target_file)
    return target_file


def _build_rename_callback(
    *,
    config_path: str | Path | None,
    rename_pdfs: bool,
    rename_dest_dir: str | Path | None,
    rename_prefix: str,
    competencia: str,
):
    if not rename_pdfs:
        return None

    prefixo, pasta_destino = renaming.resolve_processing_options(
        tipo=renaming.TIPO_SERVICO,
        config_path=config_path,
        pasta_destino=rename_dest_dir,
        competencia=competencia,
        prefixo=rename_prefix,
    )

    def callback(pdf_path: Path) -> None:
        resultado, _novo_caminho = renaming.rename_pdf_file(
            pdf_path,
            pasta_destino,
            renaming.TIPO_SERVICO,
            prefixo,
        )
        if resultado == renaming.RESULTADO_NAO_ENCONTRADO:
            raise RuntimeError(
                "PDF baixado, mas Nome/Razao Social nao foi encontrado para renomeacao automatica. "
                f"Arquivo original mantido em {pdf_path.name}."
            )
        if resultado != renaming.RESULTADO_RENOMEADO:
            raise RuntimeError(
                "PDF baixado, mas houve erro na renomeacao automatica. "
                f"Arquivo original mantido em {pdf_path.name}."
            )

    return callback


def download_from_json_workflow(
    *,
    input_path: str | Path,
    output_dir: str | Path | None = None,
    file_format: str = "ambos",
    headless: bool = True,
    limit: int | None = None,
    http_timeout: int = webiss.DEFAULT_HTTP_TIMEOUT,
    retries: int = webiss.DEFAULT_RETRIES,
    rename_pdfs: bool = True,
    rename_dest_dir: str | Path | None = None,
    rename_prefix: str = "",
    competencia: str = "",
    config_path: str | Path | None = None,
) -> DownloadResult:
    ensure_runtime_dirs()
    json_path = Path(input_path).resolve()
    items = load_nfse_items(json_path)
    if limit is not None:
        items = items[: max(limit, 0)]
    if not items:
        raise RuntimeError("Nenhuma NFS-e selecionada para processamento.")

    competencia_resolvida = resolve_competencia(
        competencia,
        input_path=json_path,
        items=items,
        config_path=config_path,
    )
    target_output_dir = resolve_output_root(output_dir, competencia=competencia_resolvida, config_path=config_path)
    rename_callback = _build_rename_callback(
        config_path=config_path,
        rename_pdfs=rename_pdfs and file_format in {"pdf", "ambos"},
        rename_dest_dir=rename_dest_dir,
        rename_prefix=rename_prefix,
        competencia=competencia_resolvida,
    )

    return webiss.download_documents(
        items,
        target_output_dir,
        file_format=file_format,
        headless=headless,
        http_timeout=max(http_timeout, 1),
        retries=max(retries, 0),
        rename_callback=rename_callback,
    )


def rename_existing_pdfs_workflow(
    *,
    pasta_origem: str | Path,
    tipo: str,
    pasta_destino: str | Path | None = None,
    competencia: str = "",
    prefixo: str = "",
    dry_run: bool = False,
    config_path: str | Path | None = None,
    log_file: str | Path | None = None,
    log_callback=None,
) -> RenameResult:
    resolved_log_path = resolve_log_file(log_file, stem="renomear_notas", config_path=config_path)
    return renaming.rename_directory(
        pasta_origem,
        tipo=tipo,
        config_path=config_path,
        pasta_destino=pasta_destino,
        competencia=competencia,
        prefixo=prefixo,
        dry_run=dry_run,
        log_path=resolved_log_path,
        log_callback=log_callback,
    )


def process_previous_month_workflow(
    *,
    data_inicial: str = "",
    data_final: str = "",
    competencia: str = "",
    output_dir: str | Path | None = None,
    env_file: str | Path | None = None,
    config_path: str | Path | None = None,
    file_format: str = "ambos",
    headless: bool = True,
    limit: int | None = None,
    http_timeout: int = webiss.DEFAULT_HTTP_TIMEOUT,
    retries: int = webiss.DEFAULT_RETRIES,
    rename_dest_dir: str | Path | None = None,
    rename_prefix: str = "",
) -> ProcessResult:
    period = resolve_query_period(
        data_inicial=data_inicial,
        data_final=data_final,
        competencia=competencia,
    )
    json_path = query_nfse_workflow(
        data_inicial=data_inicial,
        data_final=data_final,
        competencia=competencia,
        output_dir=output_dir,
        env_file=env_file,
        config_path=config_path,
    )
    download = download_from_json_workflow(
        input_path=json_path,
        output_dir=output_dir,
        file_format=file_format,
        headless=headless,
        limit=limit,
        http_timeout=http_timeout,
        retries=retries,
        rename_pdfs=True,
        rename_dest_dir=rename_dest_dir,
        rename_prefix=rename_prefix,
        competencia=period.competencia,
        config_path=config_path,
    )
    return ProcessResult(json_path=json_path, download=download)
