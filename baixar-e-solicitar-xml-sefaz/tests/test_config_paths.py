"""
Testes para o layout local da automacao.
"""
import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))

from src.core.config import PATHS


class TestConfigPaths(unittest.TestCase):
    """Testa se os paths locais apontam para _local."""

    def test_paths_locais_em__local(self):
        local_dir = PROJECT_ROOT / "_local"

        self.assertEqual(PATHS.project_root, PROJECT_ROOT)
        self.assertEqual(PATHS.checkpoints_dir, local_dir / "checkpoints")
        self.assertEqual(PATHS.checkpoints_backup_dir, local_dir / "checkpoints" / "backups")
        self.assertEqual(PATHS.logs_dir, local_dir / "logs")
        self.assertEqual(PATHS.lock_dir, local_dir / "lock")

    def test_diretorios_locais_sao_criados(self):
        self.assertTrue(PATHS.checkpoints_dir.exists())
        self.assertTrue(PATHS.checkpoints_backup_dir.exists())
        self.assertTrue(PATHS.logs_dir.exists())
        self.assertTrue(PATHS.lock_dir.exists())


if __name__ == "__main__":
    unittest.main()
