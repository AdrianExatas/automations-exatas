@echo off
cd /d "%~dp0"
python -c "import PySide6" 2>nul || (pip install PySide6 -q)
python renomear_notas_gui.py
pause
