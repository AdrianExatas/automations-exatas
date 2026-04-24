import ast
from pathlib import Path


def test_services_nao_importam_gui():
    services_dir = Path(__file__).resolve().parents[1] / "src" / "sieg_xml" / "services"

    for path in services_dir.glob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))

        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                module = node.module or ""
                assert "gui" not in module.split("."), f"Importacao de GUI encontrada em {path.name}: {module}"
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    assert "sieg_xml.gui" not in alias.name, f"Importacao de GUI encontrada em {path.name}: {alias.name}"
