@echo off
setlocal

:: Define a pasta onde os XMLs estão localizados
set XML_FOLDER=C:\Users\Exatas\Downloads\XML SEFAZ\

:: Define o arquivo com os nomes dos arquivos a serem reprocessados
set ARQUIVOS_FILE=arquivos_reprocessar.txt

:: Define o número de threads (opcional, padrão é 20)
set NUM_THREADS=10

echo.
echo ==================================================
echo 🔄 Iniciando Reprocessamento de Arquivos com Erro
echo ==================================================
echo.
echo Pasta de XMLs: %XML_FOLDER%
echo Arquivo de Nomes: %ARQUIVOS_FILE%
echo Threads: %NUM_THREADS%
echo.

:: Navega para o diretório do script Python
cd %~dp0

:: Executa o script Python
python scripts/enviar_xmls.py --pasta "%XML_FOLDER%" --reprocessar-nomes "%ARQUIVOS_FILE%" --threads %NUM_THREADS% --sem-verificacao --sim

echo.
echo ==================================================
echo ✅ Reprocessamento Concluído
echo ==================================================
echo.
pause
endlocal
