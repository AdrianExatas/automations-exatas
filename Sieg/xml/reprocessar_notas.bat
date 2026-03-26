@echo off
REM Script para reprocessar notas específicas
REM Uso: reprocessar_notas.bat

python scripts/enviar_xmls.py --pasta "C:\Users\Exatas\Downloads\XML SEFAZ\2026\01" --reprocessar-arquivo chaves_reprocessar.txt --threads 10

pause
