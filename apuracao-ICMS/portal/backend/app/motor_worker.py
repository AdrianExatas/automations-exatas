"""Worker em background: importar + auditar via motor_fiscal."""

from __future__ import annotations

import logging
import threading
import traceback
from pathlib import Path
from typing import Any

from app import operacional_db
from app.config import MOTOR_DB_DIR, MOTOR_FISCAL_ROOT
from app.paths_inputs import caminhos_para_processar
from app.util import somente_digitos

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_threads: dict[int, threading.Thread] = {}


def _atualizar(job_id: int, **kwargs: Any) -> None:
    con = operacional_db.conectar()
    try:
        operacional_db.atualizar_job(con, job_id, **kwargs)
    finally:
        con.close()


def _executar_job(job_id: int, empresa_cnpj: str, competencia: str, modulos: str) -> None:
    cnpj = somente_digitos(empresa_cnpj)
    try:
        _atualizar(job_id, status="running", etapa="preparando", log_append="Iniciando processamento")
        paths = caminhos_para_processar(cnpj, competencia)

        # Importa motor_fiscal (deve estar instalado no venv do portal)
        from motor_fiscal.db import caminho_banco, conectar
        from motor_fiscal.ingestao import efd_contribuicoes, efd_icms_ipi, xml_importador
        from motor_fiscal import orquestracao

        db_dir = MOTOR_DB_DIR
        db_dir.mkdir(parents=True, exist_ok=True)

        _atualizar(job_id, etapa="importando", log_append=f"Banco em {db_dir}")
        banco = caminho_banco(cnpj, competencia, db_dir)
        # A tabela `documentos` do motor nao tem UNIQUE na chave (so indice); reimportar
        # sobre um banco existente duplicaria documentos/itens. Por isso, todo
        # reprocessamento parte de um banco limpo (idempotente por competencia).
        Path(banco).unlink(missing_ok=True)
        con = conectar(banco)
        try:
            if paths.get("xml_dir"):
                _atualizar(job_id, log_append=f"Importando XMLs de {paths['xml_dir']}")
                resumo = xml_importador.importar_diretorio(
                    con, paths["xml_dir"], cnpj, competencia
                )
                _atualizar(
                    job_id,
                    log_append=(
                        f"XMLs: {resumo.get('arquivos_lidos', 0)} arquivo(s); "
                        f"erros={len(resumo.get('erros') or [])}"
                    ),
                )
            if paths.get("efd"):
                _atualizar(job_id, log_append=f"Importando EFD ICMS/IPI: {Path(paths['efd']).name}")
                resumo = efd_icms_ipi.importar(con, paths["efd"], cnpj, competencia)
                _atualizar(
                    job_id,
                    log_append=f"EFD ICMS/IPI: {resumo.get('total_linhas', 0)} linha(s)",
                )
            if paths.get("efd_contrib"):
                _atualizar(
                    job_id,
                    log_append=f"Importando EFD-Contribuicoes: {Path(paths['efd_contrib']).name}",
                )
                resumo = efd_contribuicoes.importar(
                    con, paths["efd_contrib"], cnpj, competencia
                )
                _atualizar(
                    job_id,
                    log_append=f"EFD-Contribuicoes: {resumo.get('total_linhas', 0)} linha(s)",
                )
        finally:
            con.close()

        _atualizar(job_id, etapa="auditando", log_append="Rodando auditoria completa")
        lista_modulos = orquestracao.parse_modulos(modulos)
        kwargs: dict[str, Any] = {
            "db_dir": str(db_dir),
            "config_dir": str(MOTOR_FISCAL_ROOT / "config"),
        }
        if paths.get("guias"):
            kwargs["guias"] = str(paths["guias"])
            _atualizar(job_id, log_append=f"Guias: {Path(paths['guias']).name}")

        con = conectar(banco)
        try:
            resultado = orquestracao.auditar(
                con, cnpj, competencia, lista_modulos, **kwargs
            )
        finally:
            con.close()

        caminho_aud = orquestracao.caminho_saida_padrao(
            cnpj, competencia, MOTOR_FISCAL_ROOT / "_local" / "auditorias"
        )
        meta = orquestracao.persistir_saidas(
            resultado,
            caminho_auditoria=caminho_aud,
            dossie=str(paths["dossie"]),
            saida_relatorios=None,
            gerar_xlsx=True,
        )
        resumo = resultado.get("resumo") or {}
        ok = bool(resumo.get("ok"))
        msg = (
            f"Auditoria {'OK' if ok else 'COM PENDENCIAS'}: "
            f"erros={resumo.get('erros', 0)} avisos={resumo.get('avisos', 0)}; "
            f"relatorios={meta.get('relatorios', {}).get('destino')}"
        )
        _atualizar(
            job_id,
            status="ok",
            etapa="concluido",
            mensagem=msg,
            log_append=msg,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Job %s falhou", job_id)
        _atualizar(
            job_id,
            status="erro",
            etapa="erro",
            mensagem=str(exc),
            log_append=f"ERRO: {exc}\n{traceback.format_exc()[-1500:]}",
        )
    finally:
        with _lock:
            _threads.pop(job_id, None)


def enfileirar_job(
    job_id: int,
    empresa_cnpj: str,
    competencia: str,
    modulos: str = "completo",
) -> None:
    thread = threading.Thread(
        target=_executar_job,
        args=(job_id, empresa_cnpj, competencia, modulos),
        name=f"motor-job-{job_id}",
        daemon=True,
    )
    with _lock:
        _threads[job_id] = thread
    thread.start()
