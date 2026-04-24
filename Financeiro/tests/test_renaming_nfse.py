# -*- coding: utf-8 -*-
"""Testes para CNAE e descrição dos serviços na renomeação de NFS-e."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

_raiz = Path(__file__).resolve().parent.parent
if str(_raiz) not in sys.path:
    sys.path.insert(0, str(_raiz))

from financeiro_nfse.renaming import (
    TIPO_PRODUTOS,
    TIPO_SERVICO,
    extract_cnae_digits,
    extract_descricao_de_outras_informacoes,
    extract_descricao_servicos_itens_numerados,
    extract_descricao_servicos_primeira_linha,
    parse_competencia_prefixo_servico_1_2,
    rename_pdf_file,
    RESULTADO_NAO_ENCONTRADO,
    RESULTADO_RENOMEADO,
)

PREFIXO_PADRAO_12 = "NOTA FISCAL SERVICO CONTABIL 1-2 COMP 03-2026 "


class TestExtractCnaeDigits(unittest.TestCase):
    def test_codigo_com_barra_termina_em_zero(self):
        texto = "CNAE 6201-5/00\nOutro"
        self.assertEqual(extract_cnae_digits(texto), "6201500")
        self.assertEqual(extract_cnae_digits(texto)[-1], "0")

    def test_sem_cnae(self):
        self.assertIsNone(extract_cnae_digits("Sem codigo aqui"))


class TestExtractDescricaoOutrasInformacoes(unittest.TestCase):
    def test_descricao_apos_boilerplate_webiss(self):
        texto = (
            "OUTRAS INFORMAÇÕES\n"
            "Optante do Simples Nacional.Trib. aprox. R$ 538,00 Federal.\n"
            "Chave de Acesso da NFS-e Nacional: 28074021227939154000\n"
            "CST: 200, cClassTrib: 200052, cIndOp: 100301.\n"
            "BPO FINANCEIRO:\n"
            "Contrato N. 2025/00024 - Ref. Mar/2026\n"
        )
        self.assertEqual(
            extract_descricao_de_outras_informacoes(texto),
            "BPO FINANCEIRO:",
        )

    def test_descricao_sem_cst_apos_chave_acesso(self):
        texto = (
            "OUTRAS INFORMAÇÕES\n"
            "Optante do Simples Nacional.Trib. aprox. R$ 69,49 Federal.\n"
            "Chave de Acesso da NFS-e Nacional: 28074021227939154000\n"
            "BPO FINANCEIRO\n"
            "Ref. Mar/2026 - Vencto. 10/04/2026\n"
        )
        self.assertEqual(
            extract_descricao_de_outras_informacoes(texto),
            "BPO FINANCEIRO",
        )

    def test_descricao_sistema_dashboards(self):
        texto = (
            "OUTRAS INFORMAÇÕES\n"
            "Optante do Simples Nacional.Trib. aprox. R$ 7,18 Federal.\n"
            "Chave de Acesso da NFS-e Nacional: 28074021227939154000\n"
            "CST: 200, cClassTrib: 200052, cIndOp: 100301.\n"
            "SISTEMA DE DASHBOARDS DENTRO DA PLATAFORMA SIEG e CEFIS\n"
            "Contrato N. 2025/00054 - Ref. Mar/2026\n"
        )
        self.assertEqual(
            extract_descricao_de_outras_informacoes(texto),
            "SISTEMA DE DASHBOARDS DENTRO DA PLATAFORMA SIEG e CEFIS",
        )

    def test_sem_outras_informacoes_retorna_none(self):
        texto = "Descrição dos Serviços\n1. SERVICO X\n"
        self.assertIsNone(extract_descricao_de_outras_informacoes(texto))


class TestExtractDescricaoPrimeiraLinha(unittest.TestCase):
    def test_descricao_dos_servicos_com_numeracao(self):
        texto = (
            "Cabeçalho\nDescrição dos Serviços\n"
            "1. SISTEMA DE DASHBOARDS DENTRO DA PLATAFORMA SIEG\n"
            "2. BPO FINANCEIRO"
        )
        self.assertEqual(
            extract_descricao_servicos_primeira_linha(texto),
            "SISTEMA DE DASHBOARDS DENTRO DA PLATAFORMA SIEG",
        )

    def test_discriminacao_do_servico(self):
        texto = "Discriminação do Serviço:\nITEM UNICO SEM NUMERO"
        self.assertEqual(
            extract_descricao_servicos_primeira_linha(texto),
            "ITEM UNICO SEM NUMERO",
        )


class TestExtractDescricaoItensNumerados(unittest.TestCase):
    def test_ignora_linha_solta_antes_dos_numerados(self):
        texto = (
            "Descrição dos Serviços\n"
            "RETENCOES FEDERAIS\n"
            "1. SISTEMA DE DASHBOARDS DENTRO DA PLATAFORMA SIEG\n"
            "2. CEFIS EXTRA\n"
        )
        self.assertEqual(
            extract_descricao_servicos_itens_numerados(texto),
            "SISTEMA DE DASHBOARDS DENTRO DA PLATAFORMA SIEG e CEFIS EXTRA",
        )

    def test_sem_itens_numerados(self):
        texto = "Descrição dos Serviços\nSOMENTE TEXTO SEM NUMERO\n"
        self.assertIsNone(extract_descricao_servicos_itens_numerados(texto))


class TestParseCompetenciaPrefixo(unittest.TestCase):
    def test_extrai_competencia(self):
        self.assertEqual(
            parse_competencia_prefixo_servico_1_2(PREFIXO_PADRAO_12),
            "03-2026",
        )

    def test_prefixo_custom_sem_12_comp(self):
        self.assertIsNone(parse_competencia_prefixo_servico_1_2("NOTA TESTE 03-2026 "))


class TestRenamePdfFileCnaeBranch(unittest.TestCase):
    def test_cnae_zero_template_descricao_e_razao(self):
        texto = (
            "CNAE 6201-5/00\n"
            "Nome/Razão Social\n  EMPRESA LTDA\n"
            "Descrição dos Serviços\n"
            "1. SISTEMA DE DASHBOARDS TESTE\n"
            "2. SEGUNDO ITEM\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 1.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    PREFIXO_PADRAO_12,
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("SISTEMA DE DASHBOARDS TESTE", novo.name)
            self.assertNotIn("SEGUNDO ITEM", novo.name)
            self.assertIn("EMPRESA LTDA", novo.name)
            self.assertTrue(novo.name.startswith("NOTA FISCAL "))
            self.assertIn("03-2026", novo.name)
            self.assertNotIn("1-2 COMP", novo.name)
            self.assertNotIn("SERVICO CONTABIL", novo.name)

    def test_cnae_zero_formato_webiss_outras_informacoes(self):
        """Simula PDFs reais WebISS onde a descrição está em 'OUTRAS INFORMAÇÕES'."""
        texto = (
            "CNAE 6209100\n"
            "Nome/Razão Social\n  NF SHOWS E REPRESENTACOES LTDA\n"
            "DESCRIÇÃO DOS SERVIÇOS\n"
            "RETENÇÕES FEDERAIS\nPIS (R$)\n0,00\n"
            "OUTRAS INFORMAÇÕES\n"
            "Optante do Simples Nacional.Trib. aprox. R$ 69,49 Federal.\n"
            "Chave de Acesso da NFS-e Nacional: 28074021227939154000\n"
            "BPO FINANCEIRO\n"
            "Ref. Mar/2026 - Vencto. 10/04/2026\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e webiss.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    PREFIXO_PADRAO_12,
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("BPO FINANCEIRO", novo.name)
            self.assertNotIn("RETENCOES", novo.name)
            self.assertNotIn("REFERENCOES", novo.name)
            self.assertIn("NF SHOWS E REPRESENTACOES LTDA", novo.name)
            self.assertTrue(novo.name.startswith("NOTA FISCAL "))
            self.assertIn("03-2026", novo.name)
            self.assertNotIn("1-2 COMP", novo.name)
            self.assertNotIn("SERVICO CONTABIL", novo.name)

    def test_cnae_zero_descricao_livre_sem_numeracao(self):
        texto = (
            "CNAE 6201-5/00\n"
            "Nome/Razão Social\n  MAXX INDUSTRIA E COMERCIO DE PAPEL LTDA\n"
            "Descrição dos Serviços\n"
            "BPO FINANCEIRO:\n"
            "FASITEC - R$ 1000,00\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 8.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    PREFIXO_PADRAO_12,
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("BPO FINANCEIRO", novo.name)
            self.assertNotIn(":", novo.name)
            self.assertNotIn("FASITEC", novo.name)
            self.assertIn("MAXX INDUSTRIA E COMERCIO DE PAPEL LTDA", novo.name)
            self.assertTrue(novo.name.startswith("NOTA FISCAL "))
            self.assertIn("03-2026", novo.name)
            self.assertNotIn("1-2 COMP", novo.name)
            self.assertNotIn("SERVICO CONTABIL", novo.name)

    def test_cnae_zero_prefixo_sem_parse_fallback_desc_no_prefixo_contabil(self):
        texto = (
            "CNAE 6201-5/00\n"
            "Nome/Razão Social\n  EMPRESA LTDA\n"
            "Descrição dos Serviços\n"
            "1. SO DESC NUMERADA\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 1b.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    "NOTA TESTE 03-2026 ",
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("SO DESC NUMERADA", novo.name)

    def test_cnae_termina_diferente_de_zero_usa_razao(self):
        texto = (
            "CNAE 6920-6/01\n"
            "Nome/Razão Social\n  CONTABIL XYZ LTDA\n"
            "Descrição dos Serviços\n1. OUTRO SERVICO\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 2.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    "NOTA TESTE 03-2026 ",
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("CONTABIL XYZ LTDA", novo.name)

    def test_sem_cnae_usa_razao(self):
        texto = "Nome/Razão Social\n  SOH RAZAO LTDA\n"
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 3.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    "NOTA TESTE 03-2026 ",
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("SOH RAZAO LTDA", novo.name)

    def test_cnae_zero_sem_descricao_fallback_razao(self):
        texto = (
            "CNAE 6201-5/00\n"
            "Nome/Razão Social\n  FALLBACK LTDA\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 4.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    PREFIXO_PADRAO_12,
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("FALLBACK LTDA", novo.name)

    def test_tipo_produtos_ignora_cnae(self):
        texto = (
            "CNAE 6201-5/00\n"
            "NOME / RAZÃO SOCIAL: INDUSTRIA ABC LTDA\n"
            "Descrição dos Serviços\n1. NAO DEVE USAR ISSO\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 5.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_PRODUTOS,
                    "NOTA PROD 03-2026 ",
                )
            self.assertEqual(resultado, RESULTADO_RENOMEADO)
            assert novo is not None
            self.assertIn("INDUSTRIA ABC LTDA", novo.name)

    def test_cnae_zero_sem_descricao_sem_razao(self):
        texto = "CNAE 6201-5/00\n"
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 6.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    PREFIXO_PADRAO_12,
                )
            self.assertEqual(resultado, RESULTADO_NAO_ENCONTRADO)
            self.assertIsNone(novo)

    def test_cnae_zero_com_desc_sem_razao(self):
        texto = (
            "CNAE 6201-5/00\n"
            "Descrição dos Serviços\n1. SO SERVICO\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            origem = Path(tmp) / "NFS-e 7.pdf"
            origem.write_bytes(b"%PDF-1.4\n")
            with patch("financeiro_nfse.renaming.extract_text_from_pdf", return_value=texto):
                resultado, novo = rename_pdf_file(
                    origem,
                    "RENOMEADOS",
                    TIPO_SERVICO,
                    PREFIXO_PADRAO_12,
                )
            self.assertEqual(resultado, RESULTADO_NAO_ENCONTRADO)
            self.assertIsNone(novo)


if __name__ == "__main__":
    unittest.main()
