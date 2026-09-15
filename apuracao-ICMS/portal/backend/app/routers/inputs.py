"""Upload de inputs da competencia + disparo de processamento (motor_fiscal)."""

from __future__ import annotations

import io
import json
import sqlite3
import zipfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app import operacional_db
from app.config import MOTOR_FISCAL_ROOT, UPLOAD_MAX_BYTES
from app.empresas import buscar_empresa
from app.models import (
    DossieListagem,
    GuiasFormPayload,
    InputsListagem,
    JobStatus,
    ProcessarRequest,
)
from app.motor_worker import enfileirar_job
from app.operacional_db import get_conn
from app.paths_inputs import (
    DOSSIE_SUBPASTAS,
    PastaEmpresaErro,
    destino_xml_seguro,
    garantir_subpastas,
    gravar_marker,
    listar_arquivos_dossie,
    listar_inputs,
    nome_seguro,
    pasta_competencia_empresa,
    pasta_dossie_subpasta,
    resolver_path_input,
    sanitizar_nome_upload,
)
from app.util import competencia_valida, somente_digitos

TRIBUTOS_GUIA = ("icms", "fecoep", "icms_difal", "fecoep_difal")

# Codigos de receita default (usados quando a UF nao tem config/icms_<uf>.json
# com secao "fecoep", ou quando a propria secao nao define a chave).
CODIGOS_RECEITA_DEFAULT = {
    "icms": "13170",
    "fecoep": "50059",
    "icms_difal": "15610",
    "fecoep_difal": "50075",
}

router = APIRouter(prefix="/api/empresas/{cnpj}/competencias/{competencia}", tags=["inputs"])


def _cnpj_norm(cnpj: str) -> str:
    normalizado = somente_digitos(cnpj)
    if not normalizado:
        raise HTTPException(status_code=422, detail="CNPJ invalido")
    return normalizado


def _validar_competencia(competencia: str) -> str:
    if not competencia_valida(competencia):
        raise HTTPException(status_code=422, detail="Competencia invalida, esperado AAAA-MM")
    return competencia


async def _ler_upload(arquivo: UploadFile, acumulado: list[int]) -> bytes:
    data = await arquivo.read()
    acumulado[0] += len(data)
    if acumulado[0] > UPLOAD_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Upload excede o limite de {UPLOAD_MAX_BYTES} bytes",
        )
    return data


def _salvar_bytes(destino: Path, conteudo: bytes) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(conteudo)


def _codigos_receita(cnpj: str) -> dict[str, str]:
    """Resolve os codigos de receita (cod_rec) dos 4 tributos fixos do Gate 3.

    Le a secao "fecoep" de ``config/icms_<uf>.json`` (fallback ``icms_default.json``,
    mesmo padrao de ``motor_fiscal.icms.mapa.carregar_config_uf``); na ausencia de
    config ou de chave especifica, usa os defaults hardcoded de ``CODIGOS_RECEITA_DEFAULT``.
    """
    empresa = buscar_empresa(cnpj)
    uf = (empresa or {}).get("uf") or ""
    config_dir = MOTOR_FISCAL_ROOT / "config"

    candidatos = []
    if uf:
        candidatos.append(config_dir / f"icms_{uf.lower()}.json")
    candidatos.append(config_dir / "icms_default.json")

    fecoep_cfg: dict[str, Any] = {}
    for caminho in candidatos:
        if caminho.is_file():
            try:
                dados = json.loads(caminho.read_text(encoding="utf-8"))
                fecoep_cfg = dados.get("fecoep") or {}
            except (OSError, json.JSONDecodeError):
                fecoep_cfg = {}
            break

    return {
        "icms": str(fecoep_cfg.get("cod_rec_icms", CODIGOS_RECEITA_DEFAULT["icms"])),
        "fecoep": str(fecoep_cfg.get("cod_rec_normal", CODIGOS_RECEITA_DEFAULT["fecoep"])),
        "icms_difal": str(fecoep_cfg.get("cod_rec_icms_difal", CODIGOS_RECEITA_DEFAULT["icms_difal"])),
        "fecoep_difal": str(fecoep_cfg.get("cod_rec_difal", CODIGOS_RECEITA_DEFAULT["fecoep_difal"])),
    }


@router.get("/inputs", response_model=InputsListagem)
def get_inputs(cnpj: str, competencia: str) -> dict[str, Any]:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    try:
        return listar_inputs(cnpj, competencia)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/inputs", response_model=InputsListagem)
async def post_inputs(
    cnpj: str,
    competencia: str,
    xml: list[UploadFile] | None = File(None),
    efd: UploadFile | None = File(None),
    efd_contrib: UploadFile | None = File(None),
    guias: UploadFile | None = File(None),
) -> dict[str, Any]:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)

    if not any([xml, efd, efd_contrib, guias]):
        raise HTTPException(status_code=422, detail="Envie ao menos um arquivo")

    try:
        base = pasta_competencia_empresa(cnpj, competencia, criar=True)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    garantir_subpastas(base)
    acumulado = [0]
    marker_update: dict[str, str] = {}

    for arquivo in xml or []:
        filename = arquivo.filename or "arquivo.xml"
        data = await _ler_upload(arquivo, acumulado)
        nome_final = Path(filename.replace("\\", "/")).name
        sufixo = Path(nome_final).suffix.lower()
        if sufixo == ".zip":
            nome = sanitizar_nome_upload(nome_final)
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as zf:
                    for info in zf.infolist():
                        if info.is_dir():
                            continue
                        member = Path(info.filename).name
                        if not member.lower().endswith(".xml"):
                            continue
                        member = sanitizar_nome_upload(member)
                        destino = base / "XML" / member
                        _salvar_bytes(destino, zf.read(info))
            except zipfile.BadZipFile as exc:
                raise HTTPException(status_code=422, detail=f"ZIP invalido: {nome}") from exc
        elif sufixo == ".xml":
            try:
                destino = destino_xml_seguro(base, filename)
            except PastaEmpresaErro as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            _salvar_bytes(destino, data)
        else:
            raise HTTPException(
                status_code=422,
                detail=f"XML deve ser .xml ou .zip (recebido: {filename})",
            )

    if efd is not None:
        nome = sanitizar_nome_upload(efd.filename or "efd.txt")
        if Path(nome).suffix.lower() != ".txt":
            raise HTTPException(status_code=422, detail="EFD ICMS/IPI deve ser .txt")
        data = await _ler_upload(efd, acumulado)
        _salvar_bytes(base / "SPED" / nome, data)
        marker_update["efd"] = nome

    if efd_contrib is not None:
        nome = sanitizar_nome_upload(efd_contrib.filename or "efd_contrib.txt")
        if Path(nome).suffix.lower() != ".txt":
            raise HTTPException(status_code=422, detail="EFD-Contribuicoes deve ser .txt")
        data = await _ler_upload(efd_contrib, acumulado)
        _salvar_bytes(base / "SPED" / nome, data)
        marker_update["efd_contrib"] = nome

    if guias is not None:
        nome = sanitizar_nome_upload(guias.filename or "guias.json")
        if Path(nome).suffix.lower() != ".json":
            raise HTTPException(status_code=422, detail="Guias deve ser .json")
        data = await _ler_upload(guias, acumulado)
        # Sempre salva como guias.json (nome canônico do motor)
        _salvar_bytes(base / "GUIAS" / "guias.json", data)

    if marker_update:
        gravar_marker(base, marker_update)

    return listar_inputs(cnpj, competencia)


@router.delete("/inputs/{tipo}/{nome}", status_code=204)
def delete_input(cnpj: str, competencia: str, tipo: str, nome: str) -> None:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    try:
        # XML pode vir com caminho relativo (ENTRADAS/nota.xml); demais tipos usam nome flat.
        nome_res = nome if tipo == "xml" else nome_seguro(nome)
        path = resolver_path_input(cnpj, competencia, tipo, nome_res)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    # Nunca apagar fora das pastas de input
    base = pasta_competencia_empresa(cnpj, competencia, criar=False)
    try:
        path.resolve().relative_to(base.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Caminho fora da pasta de inputs") from exc

    path.unlink(missing_ok=True)

    from app.paths_inputs import MARKER_INPUTS, ler_marker
    import json

    marker = ler_marker(base)
    alterou = False
    if tipo == "efd" and marker.get("efd") == path.name:
        marker.pop("efd", None)
        alterou = True
    if tipo == "efd_contrib" and marker.get("efd_contrib") == path.name:
        marker.pop("efd_contrib", None)
        alterou = True
    if alterou:
        marker_path = base / "SPED" / MARKER_INPUTS
        if marker:
            marker_path.parent.mkdir(parents=True, exist_ok=True)
            marker_path.write_text(
                json.dumps(marker, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        elif marker_path.is_file():
            marker_path.unlink()


@router.post("/guias", response_model=InputsListagem)
def post_guias(
    cnpj: str,
    competencia: str,
    body: GuiasFormPayload,
) -> dict[str, Any]:
    """Lancamento manual dos valores das guias (DAR/GNRE), sem exigir upload de
    ``guias.json`` pronto. Grava (sobrescrevendo) em ``GUIAS/guias.json``, no
    mesmo formato/caminho canonico usado pelo upload em ``POST /inputs``."""
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)

    if not body.lancamentos:
        raise HTTPException(status_code=422, detail="Informe ao menos um lancamento de guia")

    try:
        base = pasta_competencia_empresa(cnpj, competencia, criar=True)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    garantir_subpastas(base)
    codigos = _codigos_receita(cnpj)

    lista_guias = [
        {
            "tributo": lancamento.tributo,
            "codigo_receita": codigos[lancamento.tributo],
            "valor": lancamento.valor,
            "vencimento": lancamento.vencimento,
        }
        for lancamento in body.lancamentos
        if lancamento.valor is not None
    ]
    if not lista_guias:
        raise HTTPException(status_code=422, detail="Nenhum lancamento com valor informado")

    destino = base / "GUIAS" / "guias.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        json.dumps({"guias": lista_guias}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    return listar_inputs(cnpj, competencia)


@router.post("/guias/{tributo}/anexo", response_model=InputsListagem)
async def post_guia_anexo(
    cnpj: str,
    competencia: str,
    tributo: str,
    arquivo: UploadFile = File(...),
) -> dict[str, Any]:
    """Anexa o PDF/comprovante da guia de um dos 4 tributos fixos do Gate 3."""
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    if tributo not in TRIBUTOS_GUIA:
        raise HTTPException(status_code=422, detail=f"Tributo invalido: {tributo}")

    try:
        base = pasta_competencia_empresa(cnpj, competencia, criar=True)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    nome = sanitizar_nome_upload(arquivo.filename or f"{tributo}.pdf")
    acumulado = [0]
    data = await _ler_upload(arquivo, acumulado)
    destino = base / "GUIAS" / "anexos" / f"{tributo}_{nome}"
    _salvar_bytes(destino, data)

    return listar_inputs(cnpj, competencia)


@router.get("/dossie/{pasta}", response_model=DossieListagem)
def get_dossie(cnpj: str, competencia: str, pasta: str) -> dict[str, Any]:
    """Lista arquivos de uma subpasta do dossie (whitelist ``DOSSIE_SUBPASTAS``)."""
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    if pasta not in DOSSIE_SUBPASTAS:
        raise HTTPException(status_code=422, detail=f"Subpasta de dossie invalida: {pasta}")
    try:
        arquivos = listar_arquivos_dossie(cnpj, competencia, pasta)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"pasta": pasta, "arquivos": arquivos}


@router.post("/dossie/{pasta}", response_model=DossieListagem)
async def post_dossie(
    cnpj: str,
    competencia: str,
    pasta: str,
    arquivos: list[UploadFile] = File(...),
) -> dict[str, Any]:
    """Upload de um ou mais arquivos (evidencias) para uma subpasta do dossie."""
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    if pasta not in DOSSIE_SUBPASTAS:
        raise HTTPException(status_code=422, detail=f"Subpasta de dossie invalida: {pasta}")

    try:
        destino_dir = pasta_dossie_subpasta(cnpj, competencia, pasta, criar=True)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    acumulado = [0]
    for arquivo in arquivos:
        nome = sanitizar_nome_upload(arquivo.filename or "arquivo")
        data = await _ler_upload(arquivo, acumulado)
        _salvar_bytes(destino_dir / nome, data)

    return {"pasta": pasta, "arquivos": listar_arquivos_dossie(cnpj, competencia, pasta)}


@router.post("/processar", response_model=JobStatus)
def post_processar(
    cnpj: str,
    competencia: str,
    body: ProcessarRequest | None = None,
    con: sqlite3.Connection = Depends(get_conn),
) -> dict[str, Any]:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    body = body or ProcessarRequest()

    em_andamento = operacional_db.job_em_andamento(con, cnpj, competencia)
    if em_andamento:
        raise HTTPException(
            status_code=409,
            detail=f"Ja existe job {em_andamento['id']} em andamento ({em_andamento['status']})",
        )

    try:
        from app.paths_inputs import caminhos_para_processar

        caminhos_para_processar(cnpj, competencia)
    except PastaEmpresaErro as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        import motor_fiscal  # noqa: F401
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Pacote motor_fiscal nao instalado neste ambiente. "
                f'Rode: pip install -e "{MOTOR_FISCAL_ROOT.resolve()}"'
            ),
        ) from exc

    job = operacional_db.criar_job(
        con,
        empresa_cnpj=cnpj,
        competencia=competencia,
        criado_por=body.criado_por,
    )
    enfileirar_job(job["id"], cnpj, competencia, body.modulos or "completo")
    return job


@router.get("/jobs/atual", response_model=JobStatus | None)
def get_job_atual(
    cnpj: str,
    competencia: str,
    con: sqlite3.Connection = Depends(get_conn),
) -> dict[str, Any] | None:
    """Ultimo job em andamento (queued/running) ou None."""
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    return operacional_db.job_em_andamento(con, cnpj, competencia)


@router.get("/jobs/{job_id}", response_model=JobStatus)
def get_job(
    cnpj: str,
    competencia: str,
    job_id: int,
    con: sqlite3.Connection = Depends(get_conn),
) -> dict[str, Any]:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    job = operacional_db.obter_job(con, job_id)
    if job is None or job["empresa_cnpj"] != cnpj or job["competencia"] != competencia:
        raise HTTPException(status_code=404, detail="Job nao encontrado")
    return job
