"""
Utilitarios compartilhados pelos motores de auditoria/conciliacao do
Extrator da DIRF x eSocial (auditar_e_gerar_relatorio_fidedigno.py,
comparar_valor_sistema_esocial.py, auditar_divergencias_extrator.py).

Mantido em um unico lugar para evitar que os motores divirjam entre si
sem ninguem perceber (foi exatamente essa duplicacao que causou a
omissao de Plano de Saude/Isentos em uma versao anterior do motor novo).
"""
from pathlib import Path

import pyodbc


def load_env(env_path=".env"):
    config = {}
    p = Path(env_path)
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                config[k.strip()] = v.strip().strip('"').strip("'")
    return config


def get_connection(config=None):
    if not config:
        config = load_env()
    dsn = config.get("DOMINIO_ODBC_DSN", "Contabil Oficial")
    user = config.get("DOMINIO_USER", "EXTERNO")
    pwd = config.get("DOMINIO_PASSWORD", "externo")
    return pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")


def format_cpf(cpf_str):
    c = str(cpf_str or "").strip().zfill(11)
    if len(c) == 11 and c.isdigit():
        return f"{c[:3]}.{c[3:6]}.{c[6:9]}-{c[9:]}"
    return cpf_str


def format_cnpj(cnpj_str):
    c = str(cnpj_str or "").strip().zfill(14)
    if len(c) == 14 and c.isdigit():
        return f"{c[:2]}.{c[2:5]}.{c[5:8]}/{c[8:12]}-{c[12:]}"
    return cnpj_str
