from __future__ import annotations

from datetime import date
import unittest
from unittest.mock import patch

from financeiro_nfse.omie import fetch_all_nfse


class TestOmie(unittest.TestCase):
    def test_fetch_all_nfse_percorre_paginas(self):
        responses = [
            {
                "nTotPaginas": 2,
                "nfseEncontradas": [
                    {
                        "Cabecalho": {
                            "cStatusNFSe": "F",
                            "cCNPJEmissor": "1",
                            "cCodigoVerifNFSe": "A",
                            "nNumeroNFSe": "10",
                        },
                        "Emissao": {"cDataEmissao": "01/03/2026", "cHoraEmissao": "10:00:00"},
                    }
                ],
            },
            {
                "nTotPaginas": 2,
                "nfseEncontradas": [
                    {
                        "Cabecalho": {
                            "cStatusNFSe": "F",
                            "cCNPJEmissor": "2",
                            "cCodigoVerifNFSe": "B",
                            "nNumeroNFSe": "11",
                        },
                        "Emissao": {"cDataEmissao": "02/03/2026", "cHoraEmissao": "11:00:00"},
                    }
                ],
            },
        ]

        with patch("financeiro_nfse.omie.call_omie", side_effect=responses):
            items = fetch_all_nfse("key", "secret", date(2026, 3, 1), date(2026, 3, 31))

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0].numero, "10")
        self.assertEqual(items[1].numero, "11")
