# -*- coding: utf-8 -*-
"""Testes unitários para extração, limpeza de nome e resolução de colisão."""
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

# Permite importar o módulo do projeto quando os testes rodam a partir da raiz
_raiz = Path(__file__).resolve().parent.parent
if str(_raiz) not in sys.path:
    sys.path.insert(0, str(_raiz))

from renomear_notas import (
    TIPO_PRODUTOS,
    TIPO_SERVICO,
    build_prefix,
    clean_name,
    default_competencia,
    extract_razao_social,
    main,
    nome_sem_colisao,
    rename_pdf_file,
    resolve_processing_options,
    RESULTADO_NAO_ENCONTRADO,
    RESULTADO_RENOMEADO,
)


class TestExtractRazaoSocial(unittest.TestCase):
    """Testes para extract_razao_social com texto simulado."""

    def test_servico_nome_na_linha_seguinte(self):
        texto = "Alguns dados\nNome/Razão Social\n  FERTIL GRÃO LTDA\nCNPJ 00.000.000/0001-00"
        self.assertEqual(extract_razao_social(texto, TIPO_SERVICO), "FERTIL GRÃO LTDA")

    def test_servico_nome_razão_com_espaco(self):
        texto = "Nome/R azão Social\n  EMPRESA EXEMPLO LTDA"
        self.assertEqual(extract_razao_social(texto, TIPO_SERVICO), "EMPRESA EXEMPLO LTDA")

    def test_servico_nao_encontrado(self):
        self.assertIsNone(extract_razao_social("Sem campo aqui", TIPO_SERVICO))

    def test_produtos_nome_na_mesma_linha(self):
        texto = "NOME / RAZÃO SOCIAL: AQUAPLUS IND E COM DE PRODUTOS QUIMICOS LTDA"
        self.assertEqual(
            extract_razao_social(texto, TIPO_PRODUTOS),
            "AQUAPLUS IND E COM DE PRODUTOS QUIMICOS LTDA",
        )

    def test_produtos_nome_com_espacos(self):
        texto = "NOME  /  RAZÃO SOCIAL   BRUMAR BRASIL PRODUTOS NATURAIS LTDA"
        self.assertEqual(
            extract_razao_social(texto, TIPO_PRODUTOS),
            "BRUMAR BRASIL PRODUTOS NATURAIS LTDA",
        )

    def test_produtos_nao_encontrado(self):
        self.assertIsNone(extract_razao_social("Outro texto", TIPO_PRODUTOS))


class TestCleanName(unittest.TestCase):
    """Testes para clean_name: CNPJ/CPF, caracteres inválidos, normalização."""

    def test_remove_cnpj(self):
        self.assertEqual(clean_name("EMPRESA LTDA CNPJ 12.345.678/0001-90", True), "EMPRESA LTDA")

    def test_remove_cpf(self):
        # ascii_uppercase=True remove acentos
        self.assertEqual(clean_name("João Silva CPF 123.456.789-00", True), "JOAO SILVA")

    def test_caracteres_invalidos(self):
        self.assertEqual(clean_name("Empresa/Teste*LTDA", True), "EMPRESATESTELTDA")

    def test_ascii_uppercase_remove_acentos(self):
        self.assertEqual(clean_name("FERTIL GRÃO LTDA", True), "FERTIL GRAO LTDA")

    def test_mantem_acentos_quando_ascii_false(self):
        self.assertEqual(clean_name("FERTIL GRÃO LTDA", False), "FERTIL GRÃO LTDA")

    def test_vazio_apos_limpeza_nao_quebra(self):
        self.assertEqual(clean_name("", True), "")


class TestNomeSemColisao(unittest.TestCase):
    """Testes para nome_sem_colisao (sufixo numérico)."""

    def test_retorna_mesmo_nome_se_nao_existe(self):
        with tempfile.TemporaryDirectory() as tmp:
            nome = nome_sem_colisao(tmp, "NOTA EMPRESA LTDA.pdf")
            self.assertEqual(nome, "NOTA EMPRESA LTDA.pdf")
            self.assertFalse((Path(tmp) / "NOTA EMPRESA LTDA (2).pdf").exists())

    def test_retorna_sufixo_2_se_arquivo_existe(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "NOTA EMPRESA LTDA.pdf").touch()
            nome = nome_sem_colisao(tmp, "NOTA EMPRESA LTDA.pdf")
            self.assertEqual(nome, "NOTA EMPRESA LTDA (2).pdf")

    def test_retorna_sufixo_3_se_2_tambem_existe(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "NOTA EMPRESA LTDA.pdf").touch()
            (Path(tmp) / "NOTA EMPRESA LTDA (2).pdf").touch()
            nome = nome_sem_colisao(tmp, "NOTA EMPRESA LTDA.pdf")
            self.assertEqual(nome, "NOTA EMPRESA LTDA (3).pdf")


class TestBuildPrefix(unittest.TestCase):
    """Testes para build_prefix."""

    def test_servico_com_competencia(self):
        p = build_prefix(
            TIPO_SERVICO,
            "12-2025",
            "NOTA FISCAL SERVIÇO CONTÁBIL 1-2 COMP",
            "NOTA FISCAL SERVIÇO CONTÁBIL 2-2 COMP",
        )
        self.assertEqual(p, "NOTA FISCAL SERVIÇO CONTÁBIL 1-2 COMP 12-2025 ")

    def test_produtos_com_competencia(self):
        p = build_prefix(
            TIPO_PRODUTOS,
            "09-2025",
            "PREF SERV",
            "PREF PROD",
        )
        self.assertEqual(p, "PREF PROD 09-2025 ")

    def test_competencia_vazia(self):
        p = build_prefix(TIPO_SERVICO, "", "PREF SERV", "PREF PROD")
        self.assertEqual(p, "PREF SERV ")


class TestResolveProcessingOptions(unittest.TestCase):
    """Testes para resolucao de prefixo e destino."""

    def test_default_competencia_usa_mes_anterior(self):
        self.assertEqual(default_competencia(reference=datetime(2026, 4, 9)), "03-2026")

    def test_resolve_processing_options_sem_config_usa_defaults(self):
        with tempfile.TemporaryDirectory() as tmp:
            prefixo, pasta_destino = resolve_processing_options(
                config_base=tmp,
                tipo=TIPO_SERVICO,
                competencia="03-2026",
            )

        self.assertEqual(prefixo, "NOTA FISCAL SERVIÇO CONTÁBIL 1-2 COMP 03-2026 ")
        self.assertEqual(pasta_destino, "RENOMEADOS")


class TestRenamePdfFile(unittest.TestCase):
    """Testes para renomeacao de um unico PDF."""

    def test_renomeia_pdf_unico_arquivo(self):
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 1 ABC.pdf"
            origem.write_bytes(b"%PDF-1.4\n")

            with patch(
                "renomear_notas.extract_text_from_pdf",
                return_value="Nome/Razão Social\nEMPRESA EXEMPLO LTDA\nCNPJ 00.000.000/0001-00",
            ):
                resultado, novo_caminho = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    "NOTA TESTE 03-2026 ",
                )

            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            self.assertEqual(novo_caminho, Path(tmp) / "RENOMEADOS" / "NOTA TESTE 03-2026 EMPRESA EXEMPLO LTDA.pdf")
            self.assertFalse(origem.exists())
            self.assertTrue(novo_caminho.exists())

    def test_mantem_pdf_original_quando_razao_nao_encontrada(self):
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 2 DEF.pdf"
            origem.write_bytes(b"%PDF-1.4\n")

            with patch("renomear_notas.extract_text_from_pdf", return_value="Sem campo esperado"):
                resultado, novo_caminho = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    "NOTA TESTE 03-2026 ",
                )

            self.assertEqual(resultado, RESULTADO_NAO_ENCONTRADO)
            self.assertIsNone(novo_caminho)
            self.assertTrue(origem.exists())


class TestMainValidacao(unittest.TestCase):
    """Validação de entrada na CLI."""

    def test_retorna_1_quando_pasta_origem_nao_existe(self):
        argv_original = sys.argv
        try:
            sys.argv = [
                "renomear_notas.py",
                "--tipo", "servico",
                "--pasta-origem", str(Path(__file__).resolve() / "pasta_inexistente_xyz"),
            ]
            self.assertEqual(main(), 1)
        finally:
            sys.argv = argv_original


if __name__ == "__main__":
    unittest.main()
