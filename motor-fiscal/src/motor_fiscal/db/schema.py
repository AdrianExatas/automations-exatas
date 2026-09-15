"""Schema SQLite do motor fiscal.

Um banco .db por empresa/competencia em ``<raiz>/_local/db/<cnpj>/<AAAA-MM>.db``.
A raiz e configuravel via parametro ``db_dir`` ou variavel de ambiente
``MOTOR_FISCAL_DB_DIR`` (padrao: ``_local/db`` relativo ao diretorio corrente).
"""

from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path

DDL = """
CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY,
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,           -- AAAA-MM
    origem TEXT NOT NULL,                -- 'xml' | 'efd_icms_ipi' | 'efd_contribuicoes'
    tipo TEXT NOT NULL,                  -- 'nfe','nfce','cte','cfe','nfse','outro'
    chave TEXT,                          -- chave de acesso (44 digitos) quando houver
    modelo TEXT,
    serie TEXT,
    numero TEXT,
    ind_operacao TEXT,                   -- '0' entrada | '1' saida
    ind_emitente TEXT,                   -- '0' emissao propria | '1' terceiros
    data_emissao TEXT,                   -- ISO AAAA-MM-DD
    data_entrada_saida TEXT,
    situacao TEXT,                       -- 'autorizada','cancelada','denegada','inutilizada','regular'
    participante_codigo TEXT,            -- COD_PART na EFD
    emitente_cnpj TEXT,
    emitente_nome TEXT,
    emitente_uf TEXT,
    destinatario_cnpj TEXT,
    destinatario_nome TEXT,
    destinatario_uf TEXT,
    tomador TEXT,                        -- CT-e: papel do tomador (0..4) ou CNPJ
    valor_total REAL,
    valor_produtos REAL,
    valor_desconto REAL,
    valor_frete REAL,
    vbc_icms REAL,
    vicms REAL,
    vbc_icms_st REAL,
    vicms_st REAL,
    vipi REAL,
    vpis REAL,
    vcofins REAL,
    vfcp REAL,
    vfcp_st REAL,
    vfcp_uf_dest REAL,
    chaves_referenciadas TEXT,           -- JSON: CT-e -> chaves de NF-e (infNFe/chave)
    arquivo_origem TEXT
);
CREATE INDEX IF NOT EXISTS idx_documentos_chave ON documentos (chave);
CREATE INDEX IF NOT EXISTS idx_documentos_origem_tipo ON documentos (origem, tipo);

CREATE TABLE IF NOT EXISTS itens (
    id INTEGER PRIMARY KEY,
    documento_id INTEGER NOT NULL REFERENCES documentos (id),
    n_item INTEGER,
    codigo_produto TEXT,
    descricao TEXT,
    ncm TEXT,
    cfop TEXT,
    unidade TEXT,
    quantidade REAL,
    valor_unitario REAL,
    valor_produto REAL,
    valor_desconto REAL,
    cst_icms TEXT,
    vbc_icms REAL,
    aliq_icms REAL,
    vicms REAL,
    vbc_icms_st REAL,
    aliq_icms_st REAL,
    vicms_st REAL,
    cst_ipi TEXT,
    vbc_ipi REAL,
    aliq_ipi REAL,
    vipi REAL,
    cst_pis TEXT,
    vbc_pis REAL,
    aliq_pis REAL,
    vpis REAL,
    cst_cofins TEXT,
    vbc_cofins REAL,
    aliq_cofins REAL,
    vcofins REAL,
    pfcp REAL,
    vfcp REAL,
    vfcp_st REAL,
    vfcp_uf_dest REAL,
    vbc_uf_dest REAL,
    vicms_uf_dest REAL,
    picms_inter REAL,
    picms_uf_dest REAL
);
CREATE INDEX IF NOT EXISTS idx_itens_documento ON itens (documento_id);
CREATE INDEX IF NOT EXISTS idx_itens_produto ON itens (codigo_produto);

CREATE TABLE IF NOT EXISTS registros_efd (
    id INTEGER PRIMARY KEY,
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    arquivo TEXT NOT NULL,               -- 'efd_icms_ipi' | 'efd_contribuicoes'
    bloco TEXT NOT NULL,                 -- primeiro caractere do registro
    registro TEXT NOT NULL,              -- ex.: 'C100'
    numero_linha INTEGER NOT NULL,
    pai_id INTEGER,                      -- id do registro hierarquicamente pai (quando rastreado)
    campos TEXT NOT NULL,                -- JSON: lista dos campos crus (sem o REG)
    dados TEXT                           -- JSON: dict campo->valor para registros tipados
);
CREATE INDEX IF NOT EXISTS idx_registros_efd_reg ON registros_efd (arquivo, registro);

CREATE TABLE IF NOT EXISTS apuracoes (
    id INTEGER PRIMARY KEY,
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    origem TEXT NOT NULL,                -- 'efd_icms_ipi' | 'efd_contribuicoes'
    tributo TEXT NOT NULL,               -- 'icms','icms_st','icms_difal_fcp','ciap','pis','cofins','contribuicoes'
    registro TEXT NOT NULL,              -- 'E110','E210','E310','G110','M100','M200',...
    uf TEXT,                             -- E200/E300: UF da apuracao ST/DIFAL
    dados TEXT NOT NULL,                 -- JSON: dict campo->valor do registro
    valor_recolher REAL                  -- valor a recolher quando o registro informa
);
CREATE INDEX IF NOT EXISTS idx_apuracoes_tributo ON apuracoes (tributo, registro);

CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY,
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    origem TEXT NOT NULL,                -- 'efd_0200' | 'xml'
    codigo TEXT NOT NULL,
    descricao TEXT,
    ncm TEXT,
    unidade TEXT,
    tipo_item TEXT,                      -- TIPO_ITEM do 0200
    cest TEXT,
    aliq_icms REAL,
    UNIQUE (empresa_cnpj, competencia, origem, codigo)
);

CREATE TABLE IF NOT EXISTS de_para_produtos (
    id INTEGER PRIMARY KEY,
    empresa_cnpj TEXT NOT NULL,
    codigo_xml TEXT NOT NULL,
    codigo_efd TEXT NOT NULL,
    descricao_xml TEXT,
    descricao_efd TEXT,
    metodo TEXT,                         -- 'exato','descricao','manual' (preenchido no M1)
    confianca REAL,
    atualizado_em TEXT,
    UNIQUE (empresa_cnpj, codigo_xml, codigo_efd)
);

CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY,
    empresa_cnpj TEXT NOT NULL,
    competencia TEXT NOT NULL,
    chave_documento TEXT NOT NULL,
    tipo_evento TEXT,                    -- tpEvento (ex.: 110111 = cancelamento)
    descricao TEXT,
    sequencia INTEGER,
    data_evento TEXT,
    protocolo TEXT,
    arquivo_origem TEXT
);
CREATE INDEX IF NOT EXISTS idx_eventos_chave ON eventos (chave_documento);
"""


def diretorio_padrao(db_dir: str | os.PathLike | None = None) -> Path:
    """Resolve a raiz dos bancos: parametro > env MOTOR_FISCAL_DB_DIR > _local/db."""
    if db_dir:
        return Path(db_dir)
    env = os.environ.get("MOTOR_FISCAL_DB_DIR")
    if env:
        return Path(env)
    return Path.cwd() / "_local" / "db"


def caminho_banco(
    empresa_cnpj: str,
    competencia: str,
    db_dir: str | os.PathLike | None = None,
) -> Path:
    """Caminho do banco da empresa/competencia: <raiz>/<cnpj somente digitos>/<AAAA-MM>.db."""
    cnpj = re.sub(r"\D", "", empresa_cnpj)
    if not cnpj:
        raise ValueError(f"CNPJ invalido: {empresa_cnpj!r}")
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", competencia):
        raise ValueError(f"Competencia invalida (esperado AAAA-MM): {competencia!r}")
    return diretorio_padrao(db_dir) / cnpj / f"{competencia}.db"


_COLS_DOCUMENTOS_EXTRA = [
    ("vfcp", "REAL"),
    ("vfcp_st", "REAL"),
    ("vfcp_uf_dest", "REAL"),
]

_COLS_ITENS_EXTRA = [
    ("pfcp", "REAL"),
    ("vfcp", "REAL"),
    ("vfcp_st", "REAL"),
    ("vfcp_uf_dest", "REAL"),
    ("vbc_uf_dest", "REAL"),
    ("vicms_uf_dest", "REAL"),
    ("picms_inter", "REAL"),
    ("picms_uf_dest", "REAL"),
]


def _garantir_colunas(con: sqlite3.Connection, tabela: str, colunas: list[tuple[str, str]]) -> None:
    existentes = {r[1] for r in con.execute(f"PRAGMA table_info({tabela})").fetchall()}
    for nome, tipo in colunas:
        if nome not in existentes:
            con.execute(f"ALTER TABLE {tabela} ADD COLUMN {nome} {tipo}")


def conectar(caminho: str | os.PathLike) -> sqlite3.Connection:
    """Abre (criando se preciso) o banco e garante o schema."""
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(caminho)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode = WAL")
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(DDL)
    _garantir_colunas(con, "documentos", _COLS_DOCUMENTOS_EXTRA)
    _garantir_colunas(con, "itens", _COLS_ITENS_EXTRA)
    return con
