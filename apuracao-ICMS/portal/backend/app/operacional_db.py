"""Schema e acesso ao SQLite operacional do portal (status, gates, pendencias).

Um unico banco em ``portal/backend/_local/operacional.db`` (path configuravel
via env ``OPERACIONAL_DB_PATH``, ver ``app.config``). Estilo simples com
stdlib ``sqlite3``, no espirito de ``motor_fiscal/db/schema.py``.
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Iterator

from app.config import OPERACIONAL_DB_PATH
from app.util import agora_iso

DDL = """
CREATE TABLE IF NOT EXISTS workflow_status (
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    status_codigo INTEGER NOT NULL,
    atualizado_em TEXT,
    atualizado_por TEXT,
    PRIMARY KEY (empresa_cnpj, competencia)
);

CREATE TABLE IF NOT EXISTS gates (
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    gate INTEGER NOT NULL,
    liberado INTEGER NOT NULL DEFAULT 0,
    justificativa TEXT,
    liberado_por TEXT,
    liberado_em TEXT,
    PRIMARY KEY (empresa_cnpj, competencia, gate)
);

CREATE TABLE IF NOT EXISTS pendencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    etapa TEXT,
    fato TEXT,
    impacto TEXT,
    responsavel TEXT,
    proximo_passo TEXT,
    status TEXT NOT NULL DEFAULT 'aberta',
    criado_em TEXT,
    resolvido_em TEXT
);
CREATE INDEX IF NOT EXISTS idx_pendencias_empresa_comp ON pendencias (empresa_cnpj, competencia);
CREATE INDEX IF NOT EXISTS idx_pendencias_status ON pendencias (status);

CREATE TABLE IF NOT EXISTS auditoria_acoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_cnpj TEXT,
    competencia TEXT,
    acao TEXT NOT NULL,
    detalhe TEXT,
    autor TEXT,
    criado_em TEXT
);
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_comp ON auditoria_acoes (empresa_cnpj, competencia);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    etapa TEXT,
    mensagem TEXT,
    log_json TEXT,
    criado_em TEXT,
    atualizado_em TEXT,
    criado_por TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_empresa_comp ON jobs (empresa_cnpj, competencia);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
"""

STATUS_VALIDOS = {"aberta", "em_andamento", "resolvida"}
GATES_VALIDOS = (1, 2, 3)
JOB_STATUS_VALIDOS = {"queued", "running", "ok", "erro"}


def conectar(caminho: str | os.PathLike | None = None) -> sqlite3.Connection:
    """Abre (criando se preciso) o banco operacional e garante o schema."""
    caminho = Path(caminho) if caminho else OPERACIONAL_DB_PATH
    caminho.parent.mkdir(parents=True, exist_ok=True)
    # check_same_thread=False: FastAPI/uvicorn podem executar o Depends e o
    # handler em threads diferentes; a conexão continua sendo por request
    # (get_conn abre e fecha a cada chamada).
    con = sqlite3.connect(caminho, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode = WAL")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(DDL)
    return con


def get_conn() -> Iterator[sqlite3.Connection]:
    """Dependency do FastAPI: uma conexao por request, sempre fechada ao final."""
    con = conectar()
    try:
        yield con
    finally:
        con.close()


def registrar_auditoria(
    con: sqlite3.Connection,
    *,
    empresa_cnpj: str,
    competencia: str | None,
    acao: str,
    detalhe: str | None = None,
    autor: str | None = None,
) -> None:
    con.execute(
        """
        INSERT INTO auditoria_acoes (empresa_cnpj, competencia, acao, detalhe, autor, criado_em)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (empresa_cnpj, competencia, acao, detalhe, autor, agora_iso()),
    )


def obter_status(con: sqlite3.Connection, empresa_cnpj: str, competencia: str) -> dict[str, Any] | None:
    row = con.execute(
        "SELECT * FROM workflow_status WHERE empresa_cnpj = ? AND competencia = ?",
        (empresa_cnpj, competencia),
    ).fetchone()
    return dict(row) if row else None


def upsert_status(
    con: sqlite3.Connection,
    *,
    empresa_cnpj: str,
    competencia: str,
    status_codigo: int,
    atualizado_por: str | None,
) -> dict[str, Any]:
    atualizado_em = agora_iso()
    con.execute(
        """
        INSERT INTO workflow_status (empresa_cnpj, competencia, status_codigo, atualizado_em, atualizado_por)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (empresa_cnpj, competencia) DO UPDATE SET
            status_codigo = excluded.status_codigo,
            atualizado_em = excluded.atualizado_em,
            atualizado_por = excluded.atualizado_por
        """,
        (empresa_cnpj, competencia, status_codigo, atualizado_em, atualizado_por),
    )
    registrar_auditoria(
        con,
        empresa_cnpj=empresa_cnpj,
        competencia=competencia,
        acao="status_alterado",
        detalhe=f"status_codigo={status_codigo}",
        autor=atualizado_por,
    )
    con.commit()
    return {
        "status_codigo": status_codigo,
        "atualizado_em": atualizado_em,
        "atualizado_por": atualizado_por,
    }


def obter_gates(con: sqlite3.Connection, empresa_cnpj: str, competencia: str) -> dict[int, dict[str, Any]]:
    rows = con.execute(
        "SELECT * FROM gates WHERE empresa_cnpj = ? AND competencia = ?",
        (empresa_cnpj, competencia),
    ).fetchall()
    return {int(row["gate"]): dict(row) for row in rows}


def upsert_gate(
    con: sqlite3.Connection,
    *,
    empresa_cnpj: str,
    competencia: str,
    gate: int,
    liberado: bool,
    justificativa: str | None,
    liberado_por: str | None,
) -> dict[str, Any]:
    liberado_em = agora_iso()
    con.execute(
        """
        INSERT INTO gates (empresa_cnpj, competencia, gate, liberado, justificativa, liberado_por, liberado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (empresa_cnpj, competencia, gate) DO UPDATE SET
            liberado = excluded.liberado,
            justificativa = excluded.justificativa,
            liberado_por = excluded.liberado_por,
            liberado_em = excluded.liberado_em
        """,
        (empresa_cnpj, competencia, gate, int(liberado), justificativa, liberado_por, liberado_em),
    )
    registrar_auditoria(
        con,
        empresa_cnpj=empresa_cnpj,
        competencia=competencia,
        acao="gate_liberado" if liberado else "gate_bloqueado",
        detalhe=f"gate={gate} justificativa={justificativa or ''}",
        autor=liberado_por,
    )
    con.commit()
    return {
        "gate": gate,
        "liberado": liberado,
        "justificativa": justificativa,
        "liberado_por": liberado_por,
        "liberado_em": liberado_em,
    }


def listar_pendencias(
    con: sqlite3.Connection,
    *,
    empresa_cnpj: str | None = None,
    competencia: str | None = None,
    status: str | None = None,
    responsavel: str | None = None,
) -> list[dict[str, Any]]:
    condicoes = []
    parametros: list[Any] = []
    if empresa_cnpj:
        condicoes.append("empresa_cnpj = ?")
        parametros.append(empresa_cnpj)
    if competencia:
        condicoes.append("competencia = ?")
        parametros.append(competencia)
    if status:
        condicoes.append("status = ?")
        parametros.append(status)
    if responsavel:
        condicoes.append("responsavel = ?")
        parametros.append(responsavel)

    sql = "SELECT * FROM pendencias"
    if condicoes:
        sql += " WHERE " + " AND ".join(condicoes)
    sql += " ORDER BY criado_em DESC, id DESC"

    rows = con.execute(sql, parametros).fetchall()
    return [dict(row) for row in rows]


def obter_pendencia(con: sqlite3.Connection, pendencia_id: int) -> dict[str, Any] | None:
    row = con.execute("SELECT * FROM pendencias WHERE id = ?", (pendencia_id,)).fetchone()
    return dict(row) if row else None


def criar_pendencia(con: sqlite3.Connection, dados: dict[str, Any]) -> dict[str, Any]:
    criado_em = agora_iso()
    cursor = con.execute(
        """
        INSERT INTO pendencias (
            empresa_cnpj, competencia, etapa, fato, impacto, responsavel,
            proximo_passo, status, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'aberta', ?)
        """,
        (
            dados["empresa_cnpj"],
            dados["competencia"],
            dados.get("etapa"),
            dados.get("fato"),
            dados.get("impacto"),
            dados.get("responsavel"),
            dados.get("proximo_passo"),
            criado_em,
        ),
    )
    pendencia_id = cursor.lastrowid
    registrar_auditoria(
        con,
        empresa_cnpj=dados["empresa_cnpj"],
        competencia=dados["competencia"],
        acao="pendencia_criada",
        detalhe=f"id={pendencia_id} etapa={dados.get('etapa') or ''}",
        autor=dados.get("responsavel"),
    )
    con.commit()
    return obter_pendencia(con, pendencia_id)  # type: ignore[return-value]


def atualizar_pendencia(
    con: sqlite3.Connection, pendencia_id: int, campos: dict[str, Any]
) -> dict[str, Any] | None:
    atual = obter_pendencia(con, pendencia_id)
    if atual is None:
        return None

    campos_permitidos = {
        "empresa_cnpj",
        "competencia",
        "etapa",
        "fato",
        "impacto",
        "responsavel",
        "proximo_passo",
        "status",
    }
    atualizacoes = {k: v for k, v in campos.items() if k in campos_permitidos and v is not None}
    if not atualizacoes:
        return atual

    if atualizacoes.get("status") == "resolvida" and atual.get("status") != "resolvida":
        atualizacoes["resolvido_em"] = agora_iso()
    elif atualizacoes.get("status") not in (None, "resolvida"):
        atualizacoes["resolvido_em"] = None

    colunas = ", ".join(f"{campo} = ?" for campo in atualizacoes)
    valores = list(atualizacoes.values()) + [pendencia_id]
    con.execute(f"UPDATE pendencias SET {colunas} WHERE id = ?", valores)

    registrar_auditoria(
        con,
        empresa_cnpj=atualizacoes.get("empresa_cnpj", atual["empresa_cnpj"]),
        competencia=atualizacoes.get("competencia", atual["competencia"]),
        acao="pendencia_atualizada",
        detalhe=f"id={pendencia_id} campos={sorted(atualizacoes.keys())}",
        autor=atualizacoes.get("responsavel", atual.get("responsavel")),
    )
    con.commit()
    return obter_pendencia(con, pendencia_id)


def excluir_pendencia(con: sqlite3.Connection, pendencia_id: int) -> bool:
    atual = obter_pendencia(con, pendencia_id)
    if atual is None:
        return False
    con.execute("DELETE FROM pendencias WHERE id = ?", (pendencia_id,))
    registrar_auditoria(
        con,
        empresa_cnpj=atual["empresa_cnpj"],
        competencia=atual["competencia"],
        acao="pendencia_excluida",
        detalhe=f"id={pendencia_id}",
        autor=None,
    )
    con.commit()
    return True


def contar_pendencias_abertas(con: sqlite3.Connection) -> int:
    row = con.execute(
        "SELECT COUNT(*) AS total FROM pendencias WHERE status != 'resolvida'"
    ).fetchone()
    return int(row["total"]) if row else 0


def _job_row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    dados = dict(row)
    log_raw = dados.pop("log_json", None)
    log: list[Any] = []
    if log_raw:
        try:
            parsed = json.loads(log_raw)
            if isinstance(parsed, list):
                log = parsed
        except json.JSONDecodeError:
            log = [log_raw]
    dados["log"] = log
    return dados


def criar_job(
    con: sqlite3.Connection,
    *,
    empresa_cnpj: str,
    competencia: str,
    criado_por: str | None = None,
) -> dict[str, Any]:
    agora = agora_iso()
    cursor = con.execute(
        """
        INSERT INTO jobs (
            empresa_cnpj, competencia, status, etapa, mensagem, log_json,
            criado_em, atualizado_em, criado_por
        ) VALUES (?, ?, 'queued', 'enfileirado', NULL, '[]', ?, ?, ?)
        """,
        (empresa_cnpj, competencia, agora, agora, criado_por),
    )
    job_id = cursor.lastrowid
    registrar_auditoria(
        con,
        empresa_cnpj=empresa_cnpj,
        competencia=competencia,
        acao="job_criado",
        detalhe=f"id={job_id}",
        autor=criado_por,
    )
    con.commit()
    return obter_job(con, job_id)  # type: ignore[return-value]


def obter_job(con: sqlite3.Connection, job_id: int) -> dict[str, Any] | None:
    row = con.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    return _job_row_to_dict(row)


def job_em_andamento(con: sqlite3.Connection, empresa_cnpj: str, competencia: str) -> dict[str, Any] | None:
    row = con.execute(
        """
        SELECT * FROM jobs
        WHERE empresa_cnpj = ? AND competencia = ? AND status IN ('queued', 'running')
        ORDER BY id DESC LIMIT 1
        """,
        (empresa_cnpj, competencia),
    ).fetchone()
    return _job_row_to_dict(row)


def atualizar_job(
    con: sqlite3.Connection,
    job_id: int,
    *,
    status: str | None = None,
    etapa: str | None = None,
    mensagem: str | None = None,
    log_append: str | None = None,
) -> dict[str, Any] | None:
    atual = obter_job(con, job_id)
    if atual is None:
        return None
    log = list(atual.get("log") or [])
    if log_append:
        log.append({"em": agora_iso(), "msg": log_append})
    campos: dict[str, Any] = {"atualizado_em": agora_iso()}
    if status is not None:
        campos["status"] = status
    if etapa is not None:
        campos["etapa"] = etapa
    if mensagem is not None:
        campos["mensagem"] = mensagem
    campos["log_json"] = json.dumps(log, ensure_ascii=False)
    colunas = ", ".join(f"{k} = ?" for k in campos)
    con.execute(f"UPDATE jobs SET {colunas} WHERE id = ?", list(campos.values()) + [job_id])
    con.commit()
    return obter_job(con, job_id)
