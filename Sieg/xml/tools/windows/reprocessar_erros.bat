@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0\..\.."

set XML_FOLDER=C:\Users\Exatas\Downloads\XML SEFAZ\
set ARQUIVOS_FILE=_local\work\arquivos_reprocessar.txt
set NUM_THREADS=10

echo.
echo ==================================================
echo  Iniciando reprocessamento de arquivos com erro
echo ==================================================
echo.
echo Pasta de XMLs: %XML_FOLDER%
echo Arquivo de nomes: %ARQUIVOS_FILE%
echo Threads: %NUM_THREADS%
echo.

sieg-xml upload --pasta "%XML_FOLDER%" --reprocessar-nomes "%ARQUIVOS_FILE%" --threads %NUM_THREADS% --sem-verificacao --sim

echo.
echo ==================================================
echo  Reprocessamento concluido
echo ==================================================
echo.
pause
endlocal
