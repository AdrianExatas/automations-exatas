@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0\..\.."

REM Uso: reprocessar_notas.bat
sieg-xml upload --pasta "C:\Users\Exatas\Downloads\XML SEFAZ\2026\01" --reprocessar-arquivo _local\work\chaves_reprocessar.txt --threads 10

pause
endlocal
