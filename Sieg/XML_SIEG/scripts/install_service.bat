@echo off
REM Script para instalar o servidor como serviço Windows usando NSSM
REM Funciona no Windows 10 (Home ou Pro) e Windows Server

echo ========================================
echo Instalacao do Servico SIEG XML Web
echo Windows 10 / Windows Server
echo ========================================
echo.

REM Verificar se NSSM está disponível
where nssm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: NSSM nao encontrado!
    echo.
    echo Por favor, baixe e instale o NSSM:
    echo https://nssm.cc/download
    echo.
    echo Ou extraia nssm.exe na pasta do projeto
    echo.
    pause
    exit /b 1
)

REM Obter caminho do Python
set PYTHON_PATH=
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%i in ('where python') do set PYTHON_PATH=%%i
)

if "%PYTHON_PATH%"=="" (
    echo ERRO: Python nao encontrado!
    echo Certifique-se de que Python esta no PATH
    pause
    exit /b 1
)

REM Obter diretório do script
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

REM Obter caminho completo do script
set START_SCRIPT=%SCRIPT_DIR%start_server.py

echo Configurando servico...
echo Python: %PYTHON_PATH%
echo Script: %START_SCRIPT%
echo Diretorio: %PROJECT_DIR%
echo.

REM Remover serviço existente se houver
nssm stop SIEG_XML_Web >nul 2>&1
nssm remove SIEG_XML_Web confirm >nul 2>&1

REM Instalar serviço
nssm install SIEG_XML_Web "%PYTHON_PATH%" "%START_SCRIPT%"
if %ERRORLEVEL% NEQ 0 (
    echo ERRO ao instalar servico
    pause
    exit /b 1
)

REM Configurar diretório
nssm set SIEG_XML_Web AppDirectory "%PROJECT_DIR%"

REM Configurar descrição
nssm set SIEG_XML_Web Description "SIEG XML - Sistema Web de Gerenciamento de XMLs Fiscais"

REM Configurar para iniciar automaticamente
nssm set SIEG_XML_Web Start SERVICE_AUTO_START

REM Configurar stdout e stderr
nssm set SIEG_XML_Web AppStdout "%PROJECT_DIR%\logs\service_stdout.log"
nssm set SIEG_XML_Web AppStderr "%PROJECT_DIR%\logs\service_stderr.log"

echo.
echo ========================================
echo Servico instalado com sucesso!
echo ========================================
echo.
echo Comandos uteis:
echo   Iniciar:   nssm start SIEG_XML_Web
echo   Parar:     nssm stop SIEG_XML_Web
echo   Status:    nssm status SIEG_XML_Web
echo   Remover:   nssm remove SIEG_XML_Web confirm
echo.

REM Perguntar se deseja iniciar
set /p START_NOW="Deseja iniciar o servico agora? (S/N): "
if /i "%START_NOW%"=="S" (
    nssm start SIEG_XML_Web
    echo Servico iniciado!
)

pause
