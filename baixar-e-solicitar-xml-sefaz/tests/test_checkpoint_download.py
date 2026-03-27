"""
Testes unitarios para checkpoint de download.
"""
import json
import unittest
from pathlib import Path
import sys

# Adiciona path para importar modulos
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.download.checkpoint import (
    CHECKPOINT_FILE,
    CURSOR_CHECKPOINT_FILE,
    LEGACY_BACKUP_FILE,
    carregar_checkpoint,
    limpar_checkpoint,
    salvar_checkpoint,
    salvar_cursor_checkpoint,
)


class TestCheckpointDownload(unittest.TestCase):
    """Testes para checkpoint completo e cursor leve."""

    def setUp(self):
        self.arquivos_teste = [
            CHECKPOINT_FILE,
            CURSOR_CHECKPOINT_FILE,
            LEGACY_BACKUP_FILE,
        ]
        self.backup_dir = CHECKPOINT_FILE.parent / "backups"
        self.backups = {}
        for arquivo in self.arquivos_teste:
            if arquivo.exists():
                self.backups[arquivo] = arquivo.read_bytes()
        for backup in self.backup_dir.glob("download_checkpoint_*.json"):
            self.backups[backup] = backup.read_bytes()

        for arquivo in self.arquivos_teste:
            if arquivo.exists():
                arquivo.unlink()
        for backup in self.backup_dir.glob("download_checkpoint_*.json"):
            backup.unlink()

    def tearDown(self):
        for arquivo in self.arquivos_teste:
            if arquivo.exists():
                arquivo.unlink()
        for backup in self.backup_dir.glob("download_checkpoint_*.json"):
            if backup not in self.backups and backup.exists():
                backup.unlink()

        for arquivo, conteudo in self.backups.items():
            arquivo.parent.mkdir(parents=True, exist_ok=True)
            arquivo.write_bytes(conteudo)

    def test_salvar_carregar_checkpoint_compacto(self):
        arquivos = {
            '{"dt_solicitacao": "01012026010101", "nome": "arquivo1", "tipo_download": "NFE", "url": "https://exemplo/1"}',
            "arquivo1",
            "01012026010101",
        }

        sucesso = salvar_checkpoint(5, arquivos, 2, "01012026")
        self.assertTrue(sucesso)
        self.assertTrue(CHECKPOINT_FILE.exists())

        checkpoint = carregar_checkpoint()
        self.assertIsNotNone(checkpoint)
        self.assertEqual(checkpoint["pagina_atual"], 5)
        self.assertEqual(checkpoint["total_baixados"], 2)
        self.assertEqual(checkpoint["data_solicitacao"], "01012026")
        self.assertIn("https://exemplo/1", checkpoint["arquivos_baixados"])
        self.assertEqual(len(checkpoint["arquivos_info"]), 1)

    def test_cursor_e_usado_quando_checkpoint_principal_nao_existe(self):
        sucesso = salvar_cursor_checkpoint(17, 9, "02022026")
        self.assertTrue(sucesso)

        checkpoint = carregar_checkpoint()
        self.assertIsNotNone(checkpoint)
        self.assertEqual(checkpoint["pagina_atual"], 17)
        self.assertEqual(checkpoint["total_baixados"], 9)
        self.assertEqual(checkpoint["data_solicitacao"], "02022026")
        self.assertEqual(checkpoint["arquivos_baixados"], set())

    def test_recupera_backup_quando_checkpoint_principal_esta_corrompido(self):
        salvar_checkpoint(
            8,
            {'{"dt_solicitacao": "03032026030303", "nome": "arquivo2", "tipo_download": "CTE", "url": "https://exemplo/2"}'},
            1,
            "03032026",
        )
        backup_payload = CHECKPOINT_FILE.read_bytes()
        LEGACY_BACKUP_FILE.write_bytes(backup_payload)
        CHECKPOINT_FILE.write_text("{ invalido", encoding="utf-8")

        checkpoint = carregar_checkpoint()
        self.assertIsNotNone(checkpoint)
        self.assertEqual(checkpoint["pagina_atual"], 8)
        self.assertEqual(checkpoint["total_baixados"], 1)
        self.assertIn("https://exemplo/2", checkpoint["arquivos_baixados"])

    def test_limpar_checkpoint_remove_arquivos_atuais(self):
        salvar_checkpoint(1, set(), 0, None)
        salvar_cursor_checkpoint(2, 0, None)

        sucesso = limpar_checkpoint()
        self.assertTrue(sucesso)
        self.assertFalse(CHECKPOINT_FILE.exists())
        self.assertFalse(CURSOR_CHECKPOINT_FILE.exists())

    def test_checkpoint_com_checksum(self):
        sucesso = salvar_checkpoint(1, set(), 0, None)
        self.assertTrue(sucesso)

        with open(CHECKPOINT_FILE, "r", encoding="utf-8") as arquivo:
            data = json.load(arquivo)

        self.assertIn("checksum", data)
        self.assertTrue(data["checksum"])


if __name__ == "__main__":
    unittest.main()
