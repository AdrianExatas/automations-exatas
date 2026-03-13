@echo off
chcp 65001 >nul
title Certificado Manager
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Erro: Node.js nao encontrado. Instale em https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo Erro ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo.
echo Iniciando Certificado Manager em http://localhost:3000
echo Pressione Ctrl+C para encerrar.
echo.
call npm run web

pause
