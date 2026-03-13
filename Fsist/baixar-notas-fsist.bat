@echo off
title Baixar notas FSIST - XML com certificado
cd /d "%~dp0"

echo.
echo ========================================
echo   Baixar notas (XML) - FSIST
echo ========================================
echo.
echo Fechando Chrome para abrir em modo depuracao...
taskkill /IM chrome.exe /F 2>nul
if %errorlevel% equ 0 (
  timeout /t 3 /nobreak >nul
) else (
  echo Se o Chrome nao fechar, feche manualmente e rode este script de novo.
  timeout /t 2 /nobreak >nul
)

echo.
echo Abrindo Chrome (perfil de automacao)...
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
start "" %CHROME% --remote-debugging-port=9222 --user-data-dir="%~dp0chrome-debug-profile"

echo Aguardando Chrome iniciar (8 s)...
timeout /t 8 /nobreak >nul

echo.
echo Iniciando automacao. Selecione a planilha .xlsx na janela que abrir.
echo.
set CHROME_DEBUG_URL=http://127.0.0.1:9222
node automation-com-perfil.js

echo.
pause
