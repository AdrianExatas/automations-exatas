"""
Testes unitários para sistema de histórico de consulta
"""
import unittest
import json
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
import sys

# Adiciona path para importar módulos
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.consulta.historico import (
    carregar_historico,
    salvar_historico,
    obter_ultima_data_empresa,
    atualizar_data_empresa,
    calcular_dias_pendentes,
    obter_resumo_historico,
    limpar_historico_empresa,
    obter_data_ontem,
    HISTORICO_FILE
)


class TestHistoricoConsulta(unittest.TestCase):
    """Testes para sistema de histórico de consulta"""
    
    def setUp(self):
        """Prepara ambiente de teste"""
        self.backup_file = None
        if HISTORICO_FILE.exists():
            self.backup_file = HISTORICO_FILE.read_bytes()
    
    def tearDown(self):
        """Limpa após teste"""
        if HISTORICO_FILE.exists():
            HISTORICO_FILE.unlink()
        if self.backup_file:
            HISTORICO_FILE.write_bytes(self.backup_file)
    
    def test_carregar_historico_vazio(self):
        """Testa carregamento quando histórico não existe"""
        if HISTORICO_FILE.exists():
            HISTORICO_FILE.unlink()
        
        historico = carregar_historico()
        self.assertIsNotNone(historico)
        self.assertEqual(historico.get("empresas"), {})
    
    def test_salvar_carregar_historico(self):
        """Testa salvamento e carregamento de histórico"""
        historico = {
            "empresas": {
                "123456_NFE_Emitida": {
                    "ultima_data_processada": "2026-01-08",
                    "tipo_arquivo": "NFE",
                    "pesquisar_por": "Emitida"
                }
            },
            "ultima_execucao": None,
            "versao": "1.0"
        }
        
        sucesso = salvar_historico(historico)
        self.assertTrue(sucesso)
        
        carregado = carregar_historico()
        self.assertIn("123456_NFE_Emitida", carregado.get("empresas", {}))
    
    def test_calcular_dias_pendentes_primeira_execucao(self):
        """Testa cálculo de dias pendentes na primeira execução"""
        from datetime import date
        data_alvo = date(2026, 1, 9)
        
        dias = calcular_dias_pendentes(None, data_alvo)
        self.assertEqual(len(dias), 1)
        self.assertEqual(dias[0], data_alvo)
    
    def test_calcular_dias_pendentes_recuperacao(self):
        """Testa cálculo de dias pendentes para recuperação"""
        from datetime import date
        ultima_data = date(2026, 1, 5)
        data_alvo = date(2026, 1, 9)
        
        dias = calcular_dias_pendentes(ultima_data, data_alvo)
        self.assertEqual(len(dias), 4)  # 6, 7, 8, 9
    
    def test_calcular_dias_pendentes_ja_processado(self):
        """Testa quando já está processado até a data alvo"""
        from datetime import date
        ultima_data = date(2026, 1, 9)
        data_alvo = date(2026, 1, 9)
        
        dias = calcular_dias_pendentes(ultima_data, data_alvo)
        self.assertEqual(len(dias), 0)
    
    def test_obter_data_ontem(self):
        """Testa função de obter data de ontem"""
        from datetime import date, timedelta
        ontem = obter_data_ontem()
        esperado = date.today() - timedelta(days=1)
        self.assertEqual(ontem, esperado)


if __name__ == '__main__':
    unittest.main()
