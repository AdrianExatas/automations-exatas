"""CLI ``auditar``: JSON estruturado sob _local/auditorias."""

import json
import sqlite3

from motor_fiscal.__main__ import main
from tests.conftest import COMPETENCIA, EMPRESA


def test_cli_auditar_gera_json(tmp_path, xml_dir, efd_icms_ipi_arquivo, capsys):
    codigo = main([
        "importar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--xml-dir", str(xml_dir),
        "--efd", str(efd_icms_ipi_arquivo),
        "--db-dir", str(tmp_path / "db"),
    ])
    assert codigo == 0

    saida = tmp_path / "out" / "auditoria.json"
    codigo = main([
        "auditar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--modulos", "documental,estoque,lmc,margens",
        "--db-dir", str(tmp_path / "db"),
        "--saida", str(saida),
    ])
    # fixtures M0 podem gerar avisos/erros documentais (XML sem EFD etc.)
    assert codigo in (0, 1)
    assert saida.exists()

    payload = json.loads(saida.read_text(encoding="utf-8"))
    assert payload["empresa_cnpj"] == EMPRESA
    assert payload["competencia"] == COMPETENCIA
    assert set(payload["modulos"]) == {"documental", "estoque", "lmc", "margens"}
    for nome, mod in payload["modulos"].items():
        assert mod["modulo"] == nome
        assert "resumo" in mod
        assert "achados" in mod
    assert "resumo" in payload
    assert "gerado_em" in payload

    # de-para persistido no banco
    banco = tmp_path / "db" / EMPRESA / f"{COMPETENCIA}.db"
    con = sqlite3.connect(banco)
    assert con.execute("SELECT COUNT(*) FROM de_para_produtos").fetchone()[0] >= 1
    con.close()

    out = capsys.readouterr().out
    assert "JSON:" in out
    assert "documental:" in out


def test_cli_auditar_modulo_invalido(tmp_path, capsys):
    # cria banco vazio minimo
    from motor_fiscal.db import caminho_banco, conectar
    banco = caminho_banco(EMPRESA, COMPETENCIA, tmp_path)
    conectar(banco).close()

    codigo = main([
        "auditar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--modulos", "modulo_inexistente",
        "--db-dir", str(tmp_path),
    ])
    assert codigo == 2
    assert "desconhecidos" in capsys.readouterr().err


def test_cli_auditar_banco_ausente(tmp_path, capsys):
    codigo = main([
        "auditar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--db-dir", str(tmp_path),
    ])
    assert codigo == 2
    assert "banco nao encontrado" in capsys.readouterr().err
