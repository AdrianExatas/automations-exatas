@echo off
chcp 65001 >nul
cd /d "%~dp0.."
python renomear_notas.py --tipo produtos %*
pause
