@echo off
chcp 65001 >nul
cd /d "%~dp0.."
python -m financeiro_nfse renomear --tipo servico %*
pause
